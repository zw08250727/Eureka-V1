/** Local interaction fixtures only. Neither text length nor playback time determines billing. */
export type AgentProcessEvent = { id: string; kind: "skill" | "mcp" | "file"; title: string; state: "running" | "completed" | "stopped" | "failed"; detail: string };
export type AgentProcess = { kind: "thinking" | "skill" | "mcp" | "file" | "writing"; label: string; events?: AgentProcessEvent[] };
export type AgentProgress = { text: string; process: AgentProcess };
export type DemoProcessMode = "auto" | "text" | "skill" | "mcp" | "file" | "combined";
export const DEMO_DURATION = 6400;
type DemoScript = { intro: string; answer: string; skill: string | null; mcp: string | null; file: string | null };

export function createDemoScript(prompt: string, mode: DemoProcessMode = "auto"): DemoScript {
  const review = /复盘|报告|总结/.test(prompt);
  const needs = /需求|客户|联系人/.test(prompt);
  const actions = /行动|待办|日程|安排|会议/.test(prompt);
  const skill = review ? "复盘整理" : needs ? "需求分析" : "行动项整理";
  const mcp = /知识|资料|文件/.test(prompt) ? "知识库检索" : needs ? "客户资料检索" : "会议记录检索";
  const intro = review ? "我会按目标、进展和改进建议组织这份复盘。" : needs ? "我会先区分客户明确提出的需求和需要进一步确认的想法。" : actions ? "我会把讨论结论整理成可跟进的行动清单。" : "我会先理清问题，再给出可以继续推进的步骤。";
  const detail = review
    ? "复盘提纲\n1. 目标回看：对照最初目标，列出已完成与未完成的事项。\n2. 关键进展：补充结论、对应材料和仍有分歧的地方。\n3. 下一步：为每项改进明确负责人和复查时间。\n\n还需要项目目标与实际结果，才能补齐具体结论。你想先完善哪一部分？"
    : needs
      ? "建议先这样梳理\n1. 使用场景：客户在什么情况下遇到了问题？\n2. 核心诉求：想达成什么结果，现在卡在哪里？\n3. 优先级：影响范围、发生频率和期望时间分别是什么？\n\n尚未确认的需求先标为“待核实”，避免直接变成开发承诺。提供一段客户原话后，我可以继续帮你拆解。"
      : actions
        ? "行动清单草案\n1. 汇总已确认的决定，并补上对应的会议来源。\n2. 将待办拆成具体动作，逐项确认负责人。\n3. 为每项行动补充截止时间，单列尚待确认的问题。\n\n负责人和日期还需要你确认；这份草案尚未创建待办。要先细化哪一项？"
        : "建议从这三步开始\n1. 明确希望得到的结果和适用场景。\n2. 把已知事实与待确认的信息分开。\n3. 选择一个可以立刻推进的小步骤。\n\n可以补充一段背景，或指定希望我分析的资料，我会据此继续细化。";
  const hasTools = mode === "auto" ? review || needs || actions || /知识|资料|文件/.test(prompt) : mode !== "text";
  return { intro, answer: `${intro}\n\n${detail}`, skill: hasTools && !["mcp", "file"].includes(mode) ? skill : null, mcp: hasTools && !["skill", "file"].includes(mode) ? mcp : null, file: hasTools && mode !== "skill" ? review ? "项目资料.md" : needs ? "客户会议纪要.md" : "会议记录.md" : null };
}

/** Pause the text for process events; resume in small deltas after tool/skill completion. */
export function demoFrame(script: DemoScript, elapsed: number): AgentProgress {
  const skillEnd = script.skill ? 2400 : 800;
  const toolsEnd = script.mcp ? 4200 : skillEnd;
  const fileEnd = script.file ? toolsEnd + 600 : toolsEnd;
  const count = elapsed < 800
    ? Math.floor(script.intro.length * elapsed / 800)
    : elapsed < fileEnd ? script.intro.length
      : script.intro.length + Math.floor((script.answer.length - script.intro.length) * Math.min(1, (elapsed - fileEnd) / (DEMO_DURATION - fileEnd - 160)));
  const process: AgentProcess = elapsed < 800 ? { kind: "thinking", label: "梳理问题" }
    : script.skill && elapsed < skillEnd ? { kind: "skill", label: `加载 skill · ${script.skill}` }
      : script.mcp && elapsed < toolsEnd ? { kind: "mcp", label: `调用 MCP · ${script.mcp}` }
        : script.file && elapsed < fileEnd ? { kind: "file", label: `读取文件 · ${script.file}` }
          : { kind: "writing", label: "组织回答" };
  const events: AgentProcessEvent[] = [];
  if (script.skill && elapsed >= 800) events.push({ id: "skill", kind: "skill", title: script.skill, state: elapsed < skillEnd ? "running" : "completed", detail: "加载整理方法与输出结构" });
  if (script.mcp && elapsed >= skillEnd) events.push({ id: "mcp", kind: "mcp", title: script.mcp, state: elapsed < toolsEnd ? "running" : "completed", detail: "检索本轮引用范围内的资料" });
  if (script.file && elapsed >= toolsEnd) events.push({ id: "file", kind: "file", title: script.file, state: elapsed < fileEnd ? "running" : "completed", detail: "读取文档内容，用于组织当前回答" });
  return { text: script.answer.slice(0, count), process: { ...process, events } };
}

/** The mock gateway uses the same event contract a real streaming adapter can emit. */
export function playDemo(script: DemoScript, signal: AbortSignal, onProgress?: (value: AgentProgress) => void): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const cleanup = () => { clearInterval(timer); signal.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); reject(new DOMException("已停止生成", "AbortError")); };
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      onProgress?.(demoFrame(script, elapsed));
      if (elapsed >= DEMO_DURATION) { cleanup(); resolve(); }
    }, 80);
    signal.addEventListener("abort", abort, { once: true });
    onProgress?.(demoFrame(script, 0));
  });
}
