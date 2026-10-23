import type { ActionRecord, ThoughtRecord } from "@/features/workbench/model/types";
import type { Contact } from "./store";
import type { Market } from "@/features/markets/config";
import { appUrl } from "@/lib/routes";
import { buildSchedulePrompt } from "./schedule-prompts";

export type SchedulePhase = "before" | "during" | "after" | "unscheduled";
export const scheduleAssistCopy = {
  before: { heading: "会前准备", button: "准备这场日程", description: "了解参与方，找回历史沟通和待跟进事项。", task: "整理日程背景、历史交集及时间线、已承诺事项与未解决问题，提炼3～5个准备要点" },
  during: { heading: "相关上下文", button: "查看相关上下文", description: "快速查阅当前沟通所需的背景、历史结论与待确认事项。", task: "优先呈现直接相关的背景、历史关键结论、尚未解决的问题、承诺与待办，并关联原始记录；不假设已经产生本次录音或总结" },
  after: { heading: "会后回顾", button: "回顾这场日程", description: "结合实际会议记录，梳理沟通结果和后续行动。", task: "优先查看本次关联会议的实际记录，再比对历史上下文；整理结论、关键变化和后续行动，没有依据的责任人与截止时间标记待确认" },
  unscheduled: { heading: "日程资料", button: "梳理这次日程", description: "先整理已有资料，补齐日程状态和时间。", task: "整理已有背景与历史交集，指出时间无效、缺失或日程已取消，不假设日程正在进行或已经完成" },
} as const;

export function schedulePhase(record: Pick<ActionRecord, "start" | "end" | "status">, now = new Date()): SchedulePhase {
  const start = Date.parse(record.start), end = Date.parse(record.end);
  if (record.status === "canceled" || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "unscheduled";
  return +now < start ? "before" : +now < end ? "during" : "after";
}
export interface ScheduleMeeting { id: string; title: string; created: string; summary: string; transcript: string; deleted?: boolean }
export interface ScheduleAsset { id: string; kind: "会议" | "日程" | "待办" | "灵感" | "记账" | "其他" | "联系人"; title: string; at: string; text: string; url: string }
export interface ScheduleContext {
  record: ActionRecord;
  phase: SchedulePhase;
  entities: string[];
  assets: ScheduleAsset[];
  publicSearches: { name: string; url: string }[];
  prompt: string;
}
const normalize = (text: string) => text.toLocaleLowerCase().replace(/[\s，。、“”「」,.;:：()（）]/g, "");
export function scheduleEntities(record: ActionRecord, contacts: Contact[]) {
  const text = [record.title, record.participants, record.location, record.notes, record.capture].filter(Boolean).join(" ");
  const known = contacts.filter(c => c.id === record.contactId || [c.name, c.company].some(name => name && normalize(text).includes(normalize(name))));
  const organizations = [...text.matchAll(/[\u4e00-\u9fffA-Za-z0-9·&-]{2,32}(?:集团|公司|科技|银行|医院|大学|学校)/g)]
    .map(m => m[0].replace(/^.*(?:与|跟|拜访|对接|会见|关于)/, ""));
  return [...new Set([...known.flatMap(c => [c.company, c.name]), ...organizations].map(s => s?.trim()).filter((s): s is string => !!s && s.length > 1))];
}
export function buildScheduleContext(input: {
  record: ActionRecord; actions: ActionRecord[]; thoughts: ThoughtRecord[]; contacts: Contact[]; meetings: ScheduleMeeting[];
  space: string; actor: string; market: Market; now?: Date; additionalActionIds?:string[];
}): ScheduleContext {
  const { record, space, actor } = input;
  const phase = schedulePhase(record, input.now);
  const entities = scheduleEntities(record, input.contacts);
  const matches = (text: string) => entities.some(entity => normalize(text).includes(normalize(entity)));
  const linkedMeetings = new Set([...record.links, ...input.contacts
    .filter(c => c.id === record.contactId || matches(`${c.name} ${c.company}`))
    .flatMap(c => (c.interactions || []).filter(i => i.verifiedParticipation && i.sourceAvailable).map(i => i.id))]);
  const additionalActionIds = new Set(input.additionalActionIds || []);
  const excerpt = (text: string) => {
    const at = entities.map(e => text.indexOf(e)).find(i => i >= 0) || 0;
    const start = Math.max(0, at - 60);
    return `${start ? "…" : ""}${text.slice(start, start + 400)}${text.length > start + 400 ? "…" : ""}`;
  };
  const assets: ScheduleAsset[] = [];
  for (const m of input.meetings) if (!m.deleted && (linkedMeetings.has(m.id) || matches(`${m.title} ${m.summary} ${m.transcript}`)))
    assets.push({ id:m.id,kind:"会议",title:m.title,at:m.created,text:excerpt(m.summary || m.transcript),url:appUrl("meeting",m.id,space,actor) });
  for (const r of input.actions) if (!r.deleted && r.id !== record.id && (additionalActionIds.has(r.id) || matches(`${r.title} ${r.notes} ${r.participants} ${r.location} ${r.capture || ""}`) || !!record.contactId && r.contactId === record.contactId))
    assets.push({id:r.id,kind:r.type === "schedule" ? "日程" : "待办",title:r.title,at:r.start || r.created,text:excerpt([r.type === "todo" ? r.done ? "已完成" : "未完成" : "",r.status === "canceled" ? "已取消" : "",r.notes,r.capture].filter(Boolean).join(" · ")),url:appUrl("calendar",r.id,space,actor)});
  for (const r of input.thoughts) if (!r.deleted && matches(`${r.title} ${r.detail} ${r.capture || ""}`))
    assets.push({id:r.id,kind:{inspiration:"灵感",ledger:"记账",other:"其他"}[r.type] as ScheduleAsset["kind"],title:r.title,at:`${r.date} ${r.time}`,text:excerpt(r.detail || r.capture || ""),url:appUrl("thoughts",r.id,space,actor)});
  for (const c of input.contacts) if (c.id === record.contactId || matches(`${c.name} ${c.company}`))
    assets.push({id:c.id,kind:"联系人",title:c.name,at:c.updatedAt || c.createdAt || "",text:excerpt([c.company,c.role,c.summary,...(c.promises || []).map(p => `${p.title}（${p.status}）`)].filter(Boolean).join(" · ")),url:appUrl("contacts",c.id,space,actor)});
  const unique = [...new Map(assets.map(a => [`${a.kind}:${a.id}`, a])).values()].sort((a,b) => b.at.localeCompare(a.at));
  const publicSearches = entities.map(name => ({name,url:input.market === "cn" ? `https://www.baidu.com/s?wd=${encodeURIComponent(`${name} 官网 最新动态`)}` : `https://www.google.com/search?q=${encodeURIComponent(`${name} official latest news`)}`}));
  const prompt = buildSchedulePrompt(record,phase,input.meetings);
  return { record,phase,entities,assets:unique,publicSearches,prompt };
}
