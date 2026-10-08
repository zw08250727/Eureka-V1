import { localDay } from "./selectors";
import type { ActionState, ThoughtRecord } from "./types";
import type { WorkspaceFile, WorkspaceState } from "../../spaces/model/types";

// A bounded sample week, not a rolling rewrite of users' saved business dates.
export const demoWeek = [
  {
    date: "2026-10-08",
    topic: "节后目标对齐",
    task: "整理本周产品优先级",
    idea: "把节后反馈整理成问题地图",
    expense: "工作午餐",
    amount: 38,
    evidence: [
      "产品侧确认本周优先梳理录音、检索与团队协作的反馈。",
      "设计侧将沿用同一份反馈清单，补齐关键页面的交互说明。",
    ],
  },
  {
    date: "2026-10-09",
    topic: "客户访谈复盘",
    task: "补齐客户访谈的原话依据",
    idea: "用客户原话串起产品演示",
    expense: "客户拜访交通",
    amount: 46,
    evidence: [
      "客户访谈中，用户希望从会议结论直接找到原始讨论。",
      "设计复盘提出为会议结论保留来源入口，并验证返回路径。",
    ],
  },
  {
    date: "2026-10-10",
    topic: "知识整理",
    task: "归档本周会议与待确认问题",
    idea: "为相同议题建立跨会议索引",
    expense: "阅读咖啡",
    amount: 26,
    evidence: [
      "产品复盘发现，同一议题分散在多次讨论中，需要保留关联来源。",
      "设计整理建议把议题与会议原文连接，避免只展示无依据的结论。",
    ],
  },
  {
    date: "2026-10-11",
    topic: "下周准备",
    task: "列出下周演示所需素材",
    idea: "让演示从用户的一天开始",
    expense: "资料购买",
    amount: 59,
    evidence: [
      "演示准备确定以记录、整理和协作三个场景串联下周讲解。",
      "设计侧准备对应的页面与素材，并逐项核对演示路径。",
    ],
  },
  {
    date: "2026-10-12",
    topic: "方案评审",
    task: "更新方案评审结论与负责人",
    idea: "用一张检查表对齐方案边界",
    expense: "通勤交通",
    amount: 18,
    evidence: [
      "产品评审确认先完成核心操作，再处理可选扩展能力。",
      "设计评审沿用相同范围，优先明确表单状态、取消路径和错误反馈。",
    ],
  },
  {
    date: "2026-10-13",
    topic: "交付验收",
    task: "核对交付清单中的异常场景",
    idea: "把异常恢复也纳入演示脚本",
    expense: "团队午餐",
    amount: 128,
    evidence: [
      "交付检查要求补充保存失败、重复提交与权限失效的验收场景。",
      "设计验收同步检查这些异常状态，保证提示与下一步操作对应。",
    ],
  },
  {
    date: "2026-10-14",
    topic: "一周复盘",
    task: "汇总本周结论与下一步行动",
    idea: "把每周复盘变成可追溯的知识卡片",
    expense: "复盘茶饮",
    amount: 32,
    evidence: [
      "本周复盘将已确认结论与待核实问题分开整理，并保留会议依据。",
      "设计侧对照本周修改记录，列出下轮需要共同验证的页面。",
    ],
  },
] as const;

export interface WeekThoughtState {
  version: 1;
  records: ThoughtRecord[];
  demoWeekDays?: string[];
}

export function fillWeekActions<T extends ActionState>(
  state: T,
  now = new Date(),
): T {
  if (localDay(now) < demoWeek[0].date) return state;
  const completed = new Set(state.demoWeekDays || []);
  for (const plan of demoWeek) {
    if (completed.has(plan.date)) continue;
    for (const type of ["schedule", "todo"] as const) {
      const id = `demo-week-${plan.date}-${type}`;
      if (state.records.some((r) => r.id === id)) continue;
      const start = `${plan.date}T${type === "schedule" ? "10:00" : "17:00"}`;
      state.records.push({
        id,
        type,
        title: type === "schedule" ? plan.topic : plan.task,
        start,
        end: type === "schedule" ? `${plan.date}T10:45` : "",
        done: false,
        source: "capture",
        notes: plan.evidence.join("\n"),
        reminder: "none",
        location: type === "schedule" ? "线上会议" : "",
        participants: type === "schedule" ? "张伟、林晓" : "",
        capture: plan.task,
        created: `${plan.date}T08:00:00+08:00`,
        updated: "seed",
        revision: 0,
        links: [],
      });
    }
    completed.add(plan.date);
  }
  state.demoWeekDays = [...completed];
  return state;
}

export function fillWeekThoughts<T extends WeekThoughtState>(
  state: T,
  now = new Date(),
): T {
  const today = localDay(now),
    completed = new Set(state.demoWeekDays || []);
  for (const plan of demoWeek) {
    if (plan.date > today || completed.has(plan.date)) continue;
    for (const type of ["inspiration", "ledger"] as const) {
      const id = `demo-week-${plan.date}-${type}`;
      if (state.records.some((r) => r.id === id)) continue;
      state.records.push({
        id,
        type,
        title: type === "inspiration" ? plan.idea : plan.expense,
        date: plan.date,
        time: type === "inspiration" ? "08:30" : "08:45",
        detail:
          type === "inspiration"
            ? plan.evidence.join("\n")
            : `${plan.topic}相关支出（示例）。`,
        capture: type === "inspiration" ? plan.idea : plan.expense,
        source: "capture",
        revision: 0,
        ...(type === "ledger"
          ? { amount: plan.amount, direction: "expense" }
          : {}),
      });
    }
    completed.add(plan.date);
  }
  state.demoWeekDays = [...completed];
  return state;
}

export function fillWeekWorkspaces(state: WorkspaceState, now = new Date()) {
  const today = localDay(now);
  for (const w of state.spaces) {
    if (
      !["personal", "team-eureka", "team-design"].includes(w.id) ||
      w.status === "dissolved" ||
      (w.type === "team" && w.status !== "active")
    )
      continue;
    const owners = ["zhang", "lin"].filter((id) =>
      w.members.some((m) => m.id === id && m.status === "active"),
    );
    if (!owners.includes("zhang") || (w.type === "team" && owners.length < 2))
      continue;
    const completed = new Set(w.demoWeekDays || []);
    for (const plan of demoWeek) {
      // Future schedules are useful; future recordings/expenses are not historical facts.
      if (plan.date > today || completed.has(plan.date)) continue;
      const count = w.type === "team" ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const id = `demo-week-${w.id}-${plan.date}-${i}`;
        if (w.files.some((f) => f.id === id)) continue;
        const owner = owners[i],
          creator = w.members.find((m) => m.id === owner)!.name;
        const created = `${plan.date} 08:${i === 0 ? "00" : "30"}`;
        w.files.push({
          id,
          title: `${plan.topic} · ${w.type === "personal" ? "个人工作记录" : i === 0 ? "产品讨论" : "设计共创"}`,
          owner,
          creator,
          shared:
            w.type === "team"
              ? w.members
                  .filter((m) => m.status === "active" && m.id !== owner)
                  .map((m) => m.id)
              : [],
          duration: i === 0 ? 24 : 18,
          created,
          updated: created,
          source: "网页录音",
          size: i === 0 ? "19.7 MB" : "14.8 MB",
          status: "已总结",
          tags: ["每日示例", plan.topic],
          summary: `${plan.evidence[i]}\n\n下一步：${plan.task}。`,
          transcript: `00:00 ${creator}：今天回顾${plan.topic}。\n02:10 ${creator}：${plan.evidence[i]}\n05:30 ${creator}：下一步，${plan.task}。`,
          deleted: false,
          detail: {},
        });
      }
      completed.add(plan.date);
    }
    w.demoWeekDays = [...completed];
  }
  return state;
}

export function weekInsights(files: WorkspaceFile[], now = new Date()) {
  const plan = demoWeek.find((day) => day.date === localDay(now));
  if (!plan) return [];
  const sources = plan.evidence.flatMap((quote) => {
    const f = files.find(
      (f) =>
        f.id.startsWith("demo-week-") &&
        f.created.slice(0, 10) === plan.date &&
        !f.deleted &&
        f.status === "已总结" &&
        f.summary.includes(quote),
    );
    return f
      ? [
          {
            fileId: f.id,
            title: f.title,
            owner: f.owner,
            created: f.created,
            quote,
          },
        ]
      : [];
  });
  if (
    sources.length < 2 ||
    new Set(sources.map((s) => s.owner)).size < 2 ||
    new Set(sources.map((s) => s.fileId)).size < 2
  )
    return [];
  return [
    {
      id: `demo-week-insight-${plan.date}`,
      title: `${plan.topic} · 今日协作共识`,
      label: "今日协作",
      topic: plan.topic,
      kind: "opportunity",
      description: sources.map((s) => s.quote).join(""),
      impact: "两场会议的讨论可以结合核对。",
      next: `${plan.task}，并回到会议原文确认具体分工。`,
      sources,
    },
  ];
}

export function isWeekInsightPrompt(prompt: string) {
  return demoWeek.some((plan) =>
    prompt.includes(`${plan.topic} · 今日协作共识`),
  );
}
