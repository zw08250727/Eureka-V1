/** Shared labels across archive rows, previews and calendar details. */
export const creationSources: Record<string, string> = {
  manual: "手动创建",
  agent: "Agent 创建",
  capture: "闪念提取",
  device: "闪念提取",
  dingtalk: "钉钉",
  feishu: "飞书",
  system: "系统",
};
export const creationSourceLabel = (source?: string) => creationSources[source || ""] || "其他来源";

/** Device describes the capture channel, not how a thought was created. */
export const thoughtCreationSourceLabel = (source?: string) =>
  source === "device" ? "" : creationSourceLabel(source);
