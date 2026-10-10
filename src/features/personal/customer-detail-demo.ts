import { createWorkspaceStore, M } from "@/features/spaces/model/store";
import type { WorkspaceFile } from "@/features/spaces/model/types";
import { createContacts, type Contact, type ContactsState } from "./store";
import seeds from "./contact-seeds.json";

const key = "baizhi-v14-contacts";

function scenario(person: Contact) {
  const name = person.name;
  if (/SolarHub/.test(person.company)) return {
    background: `${name}面向德国工商业客户提供光伏与储能方案，由本地渠道负责交付。`,
    goal: "先在柏林与慕尼黑各选择一家经销商试点，验证储能方案的部署和售后流程。",
    decision: "Michael 负责商务决策，技术团队确认兼容性，采购团队复核合同与付款条件。",
    budget: "试点预算暂定 3 万欧元，须包含培训与首年支持；正式扩点需单独审批。",
    milestone: "10 月 16 日完成方案评审，10 月 23 日启动试点，11 月中旬复盘后决定扩点。",
    preference: "偏好邮件中的中英双语对照表，会前发材料，会议控制在 30 分钟内。",
    stage: "已完成需求确认，处于试点方案与商务条款评估阶段。", themes: ["德国渠道", "储能试点", "售后支持", "预算评审", "部署计划"],
  };
  if (person.id === "lisa") return {
    background: "关注 AI 硬件与知识工作者工具的早期投资，主要评估亚太市场机会。",
    goal: "了解设备活跃、用户留存及付费路径，验证软硬件组合的持续使用价值。",
    decision: "Lisa 发起项目研究，投资合伙人参加下一轮评审，研究团队核对数据口径。",
    budget: "本轮仅为投资研究交流，投资金额尚未确定；需先完成数据核验与尽调。",
    milestone: "10 月 15 日提供指标说明，10 月 22 日安排产品演示，再决定是否进入尽调。",
    preference: "偏好英文一页纸摘要及带口径说明的数据，先异步阅读再开会。",
    stage: "初步交流完成，正在安排产品体验与投资评审。", themes: ["AI 硬件", "用户留存", "付费转化", "产品演示", "投资评审"],
  };
  if (person.id === "emma") return {
    background: "负责内部产品协作，协调客户档案、知识组织与录音流程的体验设计。",
    goal: "打通会议记录与客户跟进，减少重复录入，并清晰呈现个人与团队内容边界。",
    decision: "Emma 协调产品方案，设计负责人确认交互，研发负责人评估实现与排期。",
    budget: "本轮使用既定迭代资源，优先复用现有组件，不引入额外系统采购。",
    milestone: "10 月 14 日完成原型评审，10 月 21 日确认开发范围，月底组织内部体验。",
    preference: "偏好可点击原型和逐条问题清单，会后同步决策及负责人。",
    stage: "方案共创与交互评审中。", themes: ["客户跟进", "内容权限", "录音流程", "原型评审", "迭代排期"],
  };
  const energy = /ABC Energy/.test(person.company);
  return {
    background: energy ? `${name}参与 ABC Energy 的储能渠道业务，协同销售、采购与技术团队推进德国试点。` : `${name}参与${person.company || "企业"}的业务协作，当前重点是提升客户访谈与跟进效率。`,
    goal: energy ? "验证三家经销商试点的认证、交付和培训流程，再评估渠道扩展。" : "先在两个业务小组试用会议记录和客户跟进功能，减少重复整理并验证 CRM 衔接。",
    decision: energy ? "销售明确场景，Alice 审批采购预算，David 负责技术与接口评估。" : "业务负责人协调试点，IT 评估接入和权限，采购负责人确认最终合同。",
    budget: energy ? "试点费用上限暂定 5 万欧元，需先完成供应商准入与采购评审。" : "试点预算暂定 5 万元，须沿用现有 CRM，客户数据不跨成员自动合并。",
    milestone: "10 月 15 日核对需求清单，10 月 22 日演示并确认试点范围，11 月上旬复盘结果。",
    preference: energy ? "偏好认证清单、费用明细和交期对照表，会前通过邮件确认问题。" : "偏好会前发送一页方案与问题清单，会后明确双方待办及下一次沟通时间。",
    stage: "需求访谈已完成，处于方案验证与试点准备阶段。", themes: energy ? ["储能试点", "供应商准入", "技术集成", "预算评审", "交付周期"] : ["会议记录", "客户跟进", "CRM 集成", "内容权限", "试点计划"],
  };
}

/** Enrich known fictional examples only; never overwrite edits or restore deleted evidence. */
export function ensureCustomerDetailDemo(storage: Storage, workspaceId: string, actor: string) {
  const repository = createWorkspaceStore(storage), state = repository.read(), w = M.get(state, workspaceId);
  if ((w.type === "team" && w.status !== "active") || !M.member(w, actor)) return;
  const raw = storage.getItem(key);
  const data: Record<string, ContactsState> = raw ? JSON.parse(raw) : { personal: { contacts: structuredClone(seeds) as Contact[], notes: {}, tasks: [] } };
  // Include examples added by the existing legacy contact migration before enriching them.
  if (workspaceId === "personal" && actor === state.account.id)
    data.personal = createContacts(storage, actor, workspaceId).read().personal;
  const additions: WorkspaceFile[] = [];
  for (const [scopeKey, scope] of Object.entries(data)) {
    const personal = workspaceId === "personal" && actor === state.account.id && scopeKey === "personal";
    const team = w.type === "team" && scopeKey.startsWith(`workspace:${w.id}:account:`);
    if (!personal && !team) continue;
    const owner = personal ? state.account.id : scopeKey.split("account:").pop()!;
    if (!M.member(w, owner)) continue;
    for (const person of scope.contacts) {
      const known = personal ? seeds.some(s => s.id === person.id) : person.id.startsWith(`demo-customer-${owner}-`) && person.tag === "示例客户";
      if (!known || person.detailDemoVersion || person.interactions?.length) continue;
      const story = scenario(person);
      const rounds: { title: string; date: string; profile: Record<string, string>; mine: string; theirs: string; due: string }[] = [
        { title: "需求访谈", date: "2026-10-05", profile: { "业务背景": story.background, "需求与目标": story.goal, "沟通偏好": story.preference }, mine: "整理需求与范围确认清单", theirs: "提供试点业务场景与参与人名单", due: "2026-10-12" },
        { title: "方案与预算评审", date: "2026-10-07", profile: { "决策与协作": story.decision, "预算与约束": story.budget }, mine: "发送方案、费用明细及接入说明", theirs: "确认内部审批人和预算意见", due: "2026-10-15" },
        { title: "试点计划对齐", date: "2026-10-09", profile: { "时间与里程碑": story.milestone, "合作阶段": story.stage }, mine: "准备演示环境与试点验收表", theirs: "确认试点名单与下一次评审时间", due: "2026-10-16" },
      ];
      person.interactions = rounds.map((round, index) => {
        const id = `customer-demo-${owner}-${person.id}-${index + 1}`;
        const summary = `${Object.values(round.profile).map(text => text.replace(/。$/, "")).join("；")}。我方将${round.mine}，客户将${round.theirs}。双方约定于 ${round.due} 前同步进展。`;
        const shared = team && w.customerSharing?.[owner] ? w.members.filter(m => m.status === "active" && m.id !== owner).map(m => m.id) : [];
        if (!w.files.some(f => f.id === id)) additions.push({
          id, title: `${person.name} · ${round.title}（演示）`, owner, shared, editors: [], duration: 30,
          created: `${round.date}T09:00:00+08:00`, updated: `${round.date}T09:30:00+08:00`,
          source: "网页录音", summary, transcript: `以下为虚构的客户会议演示内容。\n\n00:00 客户：${Object.values(round.profile).join("\n\n05:00 客户：")}\n\n20:00 我方：我们会${round.mine}。\n\n25:00 客户：我会${round.theirs}，在 ${round.due} 前同步。`,
          deleted: false, size: "24.6 MB", creator: w.members.find(m => m.id === owner)!.name,
          status: "已总结", tags: ["客户演示", story.themes[index]], detail: {}, recordedWorkspaceId: w.id,
          visibility: shared.length ? "invited" : "private",
        });
        return { id, occurredAt: `${round.date}T09:00:00+08:00`, verifiedParticipation: true, sourceAvailable: true,
          extractedSummary: summary, themes: story.themes, profile: round.profile,
          todos: [{ side: "mine" as const, title: round.mine, due: round.due }, { side: "theirs" as const, title: round.theirs, due: round.due }] };
      });
      person.detailDemoVersion = 1;
      scope.notes ||= {};
      if (!scope.notes[person.id]?.length) scope.notes[person.id] = [{ text: "演示备注：下次沟通先确认试点范围，再逐项核对双方待办；不将未确认事项写成客户承诺。", time: "2026-10-09 10:00" }];
    }
  }
  if (!additions.length) return;
  const updated = JSON.stringify(data);
  try {
    storage.setItem(key, updated);
    repository.change(s => M.get(s, workspaceId).files.push(...additions));
  } catch (error) {
    if (storage.getItem(key) === updated) { if (raw === null) storage.removeItem(key); else storage.setItem(key, raw); }
    throw error;
  }
}
