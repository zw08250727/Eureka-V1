import { mockUsageReceipt } from "@/features/agent/usage";
import { createDemoScript, playDemo } from "@/features/agent/demo-stream";
import type { AgentGateway } from "./types";
/** Replace this adapter with the agreed Agentplatform API; never call a model directly from UI. */
export const mockAgent: AgentGateway = {
  async send(prompt, context, options, signal) {
    signal.throwIfAborted();
    const usage = mockUsageReceipt(options.runId || crypto.randomUUID());
    const script = createDemoScript(prompt);
    if (!context.widget) await playDemo(script, signal, options.onProgress);
    return !!context.widget
      ? {
          usage,
          title:
            context.widget === "thoughts"
              ? "回顾当前闪念"
              : "把今天的记录连成下一步",
          text: "AI 建议",
          items:
            context.records?.map((r) =>
              context.widget === "thoughts"
                ? `${r.date} ${r.time} · ${r.title}：${r.detail}`
                : `${r.time} · ${r.title}：${r.done ? "已完成，可在今日复盘中回顾。" : r.detail}`,
            ) || context.lines,
        }
      : {
          usage,
          title: "Ask Agent",
          text: script.answer,
          items: [

            options.audio ? "已引用当前会议列表。" : "",
            options.apps ? "已引用应用数据。" : "",
          ].filter(Boolean),
        };
  },
};
