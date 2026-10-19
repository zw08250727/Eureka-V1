/** Application adapter contract; map AgentPlatform's agreed wire format at the gateway. */
export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  source?: "simulated" | "agentplatform";
  model?: string;
  rateVersion?: string;
};
export type UsageReceipt = TokenUsage & {
  runId: string;
  source: "simulated" | "agentplatform";
  model: string;
  rateVersion: string;
  final: boolean;
};
export type AgentRun = {
  runId: string;
  actor: string;
  scene: string;
  task: string;
  time: string;
  status: "settled" | "pending" | "insufficient";
  receipt: UsageReceipt | null;
  cost: number | null;
  reason: string;
};
export type TokenRates = { input: number; output: number; perTokens: number };
export const DEMO_RATE_VERSION = "token-demo-v1";
// Fixed upstream usage fixtures. Never infer token consumption from displayed text.
export function mockUsageReceipt(runId: string, zero = false): UsageReceipt {
  return { runId, inputTokens: zero ? 0 : 1200, outputTokens: zero ? 0 : 600,
    source: "simulated", model: "AgentPlatform · 模拟回执", rateVersion: DEMO_RATE_VERSION, final: true };
}
export function tokenCost(usage: TokenUsage, rates: TokenRates) {
  if (!usage || !Number.isSafeInteger(usage.inputTokens) || !Number.isSafeInteger(usage.outputTokens)
    || usage.inputTokens < 0 || usage.outputTokens < 0) throw Error("Token 用量无效");
  if (![rates.input, rates.output, rates.perTokens].every(Number.isFinite)
    || rates.input < 0 || rates.output < 0 || rates.perTokens <= 0) throw Error("计费配置无效");
  const units = Math.round((usage.inputTokens * rates.input + usage.outputTokens * rates.output) * 1000 / rates.perTokens);
  if (!Number.isSafeInteger(units) || units < 0) throw Error("Token 用量超出可结算范围");
  return units / 1000;
}
export function validateReceipt(receipt: UsageReceipt | null, runId: string, rates: TokenRates) {
  if (!receipt || receipt.final !== true) throw Error("等待最终用量回执，暂未扣费");
  if (receipt.runId !== runId || !receipt.model || !["simulated", "agentplatform"].includes(receipt.source))
    throw Error("用量回执不匹配，等待核对");
  if (receipt.rateVersion !== DEMO_RATE_VERSION) throw Error("费率版本待核对，暂未扣费");
  return tokenCost(receipt, rates);
}

export function sameReceipt(a: UsageReceipt | null, b: UsageReceipt | null) {
  if (!a || !b) return a === b;
  return (["runId", "source", "model", "rateVersion", "inputTokens", "outputTokens", "final"] as const)
    .every(key => a[key] === b[key]);
}
