import type { AgentGateway } from "./types";
/** Replace this adapter with the agreed Agentplatform API; never call a model directly from UI. */
export const mockAgent: AgentGateway = {
  async send(prompt, context, options, signal) {
    signal.throwIfAborted();
    return context.kind === "daily"
      ? {
          title: "把今天的记录连成下一步",
          text: "AI · 演示建议",
          items: context.lines,
        }
      : {
          title: "Ask Agent · 本地模拟",
          text: `已收到你的问题：${prompt}。可以继续补充背景，或引用资料展开讨论。`,
          items: [
            options.web
              ? "联网搜索尚未连接外部服务。"
              : "当前未连接真实模型服务。",
            options.audio ? "已引用当前会议列表。" : "",
            options.apps ? "应用数据为本地演示引用。" : "",
          ].filter(Boolean),
        };
  },
};
