import { createWorkspaceStore, M } from "@/features/spaces/model/store";
import type {
  ActionState,
  ActionRecord,
} from "@/features/workbench/model/types";
export function ensureTeamDailyDemo(
  storage: Storage,
  space: string,
  now = new Date(),
) {
  if (space === "personal") return;
  const w = M.get(createWorkspaceStore(storage).read(), space);
  if (
    !["team-eureka", "team-growth"].includes(space) &&
    !w.files.some((f) => f.id.includes("demo"))
  )
    return;
  const key = `eureka:daily-demo:${space}:v1`;
  if (storage.getItem(key)) return;
  const date = now.toLocaleDateString("sv-SE");
  const members = w.members.filter((m) => m.status === "active");
  const titles = [
    ["客户试点方案评审", "确认试点验收标准", "整理移动端搜索反馈"],
    ["研发排期沟通", "跟进 CRM 接入风险", "发送客户演示材料"],
    ["试点进度复盘", "确认下周交付负责人", "补充用户访谈结论"],
  ];
  members.forEach((m, i) => {
    const storeKey = `eureka:actions:${space}:${m.id}:v1`;
    const s: ActionState = JSON.parse(
      storage.getItem(storeKey) ||
        '{"version":1,"records":[],"meetings":[],"sessions":[],"settings":{}}',
    );
    const own = titles[i % titles.length];
    const shared = members.filter((x) => x.id !== m.id).map((x) => x.id);
    const records: ActionRecord[] = own.map((title, j) => ({
      id: `daily-${space}-${m.id}-${j}`,
      ownerId: m.id,
      type: j === 0 ? "schedule" : "todo",
      title,
      start: `${date}T${j === 0 ? `${String(10 + i * 2).padStart(2, "0")}:00` : "18:00"}`,
      end: j === 0 ? `${date}T${String(10 + i * 2).padStart(2, "0")}:45` : "",
      done: false,
      source: "manual",
      notes:
        j === 0
          ? "对齐客户目标、范围与下一步行动。"
          : "明确负责人，完成后勾选归档。",
      reminder: "none",
      location: j === 0 ? "线上会议" : "",
      participants: members.map((m) => m.name).join("、"),
      created: now.toISOString(),
      updated: now.toISOString(),
      revision: 1,
      links: [],
      sharedWith: j < 2 ? shared : [],
    }));
    s.records.push(
      ...records.filter((r) => !s.records.some((e) => e.id === r.id)),
    );
    storage.setItem(storeKey, JSON.stringify(s));
  });
  storage.setItem(key, "1");
}

/** Add explicit calendar examples without rewriting existing records or grants. */
export function ensureSharedCalendarDemo(storage: Storage, space: string, now = new Date()) {
  if (!["team-eureka", "team-growth"].includes(space)) return;
  const key = `eureka:calendar-examples:${space}:v1`;
  if (storage.getItem(key)) return;
  const workspace = M.get(createWorkspaceStore(storage).read(), space);
  const members = workspace.members.filter(m => m.status === "active");
  const date = now.toLocaleDateString("sv-SE");
  const examples = [
    {owner:"lin", source:"dingtalk", title:"客户联调同步", time:"15:00", end:"15:30", shared:true},
    {owner:"kevin", source:"feishu", title:"设计方案评审", time:"16:00", end:"16:30", shared:true},
    {owner:"zhang", source:"system", title:"交付节点提醒", time:"17:00", end:"17:15", shared:false},
    {owner:"zhang", source:"manual", title:"项目联合周会", time:"14:30", end:"15:00", shared:true},
  ];
  for (const example of examples) {
    if (!members.some(m=>m.id===example.owner)) continue;
    const storeKey=`eureka:actions:${space}:${example.owner}:v1`;
    const state: ActionState=JSON.parse(storage.getItem(storeKey)||'{"version":1,"records":[],"meetings":[],"sessions":[],"settings":{}}');
    const id=`calendar-example-${space}-${example.source}`;
    if (state.records.some(r=>r.id===id)) continue;
    state.records.push({id,ownerId:example.owner,type:"schedule",title:example.title,
      start:`${date}T${example.time}`,end:`${date}T${example.end}`,source:example.source,
      done:false,notes:"示例日程，用于演示来源与成员共享；未连接外部日历。",reminder:"none",
      location:example.source==="manual"?"项目会议室":"线上会议",
      participants:(example.shared?members:members.filter(m=>m.id===example.owner)).map(m=>m.name).join("、"),
      sharedWith:example.shared?members.filter(m=>m.id!==example.owner).map(m=>m.id):[],
      created:now.toISOString(),updated:now.toISOString(),revision:1,links:[]});
    storage.setItem(storeKey,JSON.stringify(state));
  }
  storage.setItem(key,"1");
}
