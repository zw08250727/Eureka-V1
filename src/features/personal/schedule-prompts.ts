import type { ActionRecord } from "@/features/workbench/model/types";
import type { SchedulePhase, ScheduleMeeting } from "./schedule-context";

/** Approved concise copy; schedule details and authorized assets travel in ScheduleContext. */
const schedulePrompts = {
  before: `请根据当前日程信息，识别相关企业、机构、人物或产品，帮助我做好会前准备。

1. **检索历史交集：** 搜索我有权限访问的相关历史会议、日程、闪念、待办及其他资产，梳理历史沟通、关键结论、承诺事项、未解决问题及后续跟进情况。
2. **补充外部信息：** 如具备联网能力，检索相关对象的最新公开信息，优先采用官方及可信来源，并标注来源与时间。
3. **生成准备材料：** 汇总日程背景、相关对象动态、历史交集、待确认问题及建议沟通清单，提炼3～5个重点准备事项。

优先检索与当前日程直接相关的信息，并结合正文、参与人及关联关系扩展检索。存在对象歧义时说明判断依据；未检索到的信息明确说明。所有结论应区分事实、推断与建议，不得编造。`,
  during: `请围绕当前日程，帮助我快速获取现场沟通所需的历史背景、已有结论及待确认事项。

1. **检索历史资产：** 搜索相关历史会议、日程、闪念、待办及其他可访问资料，重点提取已确认的需求与方案、历史结论、承诺事项、未解决问题及相关责任人。
2. **识别关键事项：** 对比历史约定与当前信息，优先提示尚未兑现的承诺、逾期事项、结论差异及潜在风险。
3. **简洁呈现结果：** 优先展示关键背景、历史事实、待确认问题及相关原始记录，便于现场快速查阅。如需外部信息且具备联网能力，可补充可信公开资料并注明来源。

优先呈现与当前日程直接相关的内容，不要假设本次日程已有录音或会议纪要。明确区分事实与推断；后续对话应持续结合当前日程上下文回答，无需重复完整报告。`,
  after: `请结合当前日程、本次实际产生的会议记录及相关历史资产，梳理沟通结果与后续行动。

1. **总结本次沟通：** 优先检索关联会议的录音、转写、总结等记录，提炼核心议题、达成共识、明确决策及遗留问题。
2. **关联历史上下文：** 检索相关历史会议、日程、闪念、待办及其他资产，识别历史约定的变化、已解决的问题、未完成的承诺及新增风险。
3. **整理后续行动：** 输出复盘摘要及行动清单，包含行动事项、责任人、截止时间、关联结论、来源和状态；缺少依据的信息标记为“待确认”，区分历史待办与本次新增事项。

优先依据实际记录，不得仅凭日程标题推断会议结论。若无本次会议记录，应说明材料限制，并基于现有信息整理背景与待确认事项。默认只提供分析和建议，未经我明确要求，不得直接创建、修改或关闭待办，也不得代发消息。`,
};

export function buildSchedulePrompt(record: ActionRecord, phase: SchedulePhase, meetings: ScheduleMeeting[]) {
  if (phase !== "unscheduled") return schedulePrompts[phase];

  const linked = meetings.filter(m => !m.deleted && record.links.includes(m.id));
  const information = `当前日程信息
- 日程标题：${record.title}
- 日程时间：${record.start.replace("T", " ") || "未设置"}—${record.end.replace("T", " ") || "未设置"}
- 地点：${record.location || "未设置"}
- 参与人：${record.participants || "未设置"}
- 我的备注：${record.notes || "无"}
- 已关联会议：${linked.length ? linked.map(m => `${m.title}（${m.created}）`).join("；") : "暂无当前可查看的关联会议"}`;

  return `请梳理这次日程的已有资料，核实时间与状态，不假设日程已经发生或完成。

${information}

仅检索当前工作区内有权访问的相关记录，列出已知背景、历史交集、原始来源及待补充信息。不要编造缺失内容，不自动创建或修改资产。`;
}
