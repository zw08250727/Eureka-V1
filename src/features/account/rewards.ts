import { grantCredits } from "@/features/spaces/model/credit-ledger";
import { marketConfig } from "@/features/markets/config";
import type { Workspace } from "@/features/spaces/model/types";
import { M } from "@/features/spaces/model/store";
export type RewardEntry = {
  id: string;
  amount: number;
  label: string;
  time: string;
  expires: string;
};
export type RewardState = {
  entries: RewardEntry[];
  profileComplete?: boolean;
  appInstalled?: boolean;
};
export function rewardState(w: Workspace): RewardState {
  return w.rewards || { entries: [] };
}
function feedbackRewardMonth(date: Date) {
  return date.toLocaleDateString(
    "sv-SE",
    marketConfig().id === "cn" ? { timeZone: "Asia/Shanghai" } : undefined,
  ).slice(0, 7);
}
function feedbackRewardInMonth(time: string, month: string) {
  const date = new Date(time);
  return Number.isFinite(date.getTime()) && feedbackRewardMonth(date) === month;
}
/** Account feedback and meeting ratings share one monthly reward allowance. */
export function countMonthlyFeedbackRewards(
  entries: readonly Pick<RewardEntry, "id" | "time">[],
  now = new Date(),
): number {
  const month = feedbackRewardMonth(now);
  return new Set(entries.filter(entry =>
    (entry.id.startsWith("feedback:") || entry.id.startsWith("meeting-feedback:")) &&
    feedbackRewardInMonth(entry.time, month),
  ).map(entry => entry.id)).size;
}
function nextFeedbackRewardId(entries: readonly RewardEntry[], month: string) {
  const prefix = `feedback:${month}:`;
  const ids = new Set(entries.map(entry => entry.id));
  let sequence = entries.filter(entry => entry.id.startsWith(prefix)).length;
  while (ids.has(`${prefix}${sequence}`)) sequence += 1;
  return `${prefix}${sequence}`;
}
export function claimReward(
  w: Workspace,
  actor: string,
  kind: "register" | "profile" | "app" | "signin" | "feedback",
  feedback = "",
  now = new Date(),
) {
  if (w.type !== "personal" || !M.member(w, actor))
    throw Error("任务奖励仅适用于个人工作区");
  const s = (w.rewards ||= { entries: [] }),
    day = now.toLocaleDateString("sv-SE"),
    month = day.slice(0, 7),
    feedbackMonth = feedbackRewardMonth(now);
  const id =
    kind === "signin"
      ? `signin:${day}`
      : kind === "feedback"
        ? nextFeedbackRewardId(s.entries, feedbackMonth)
        : kind;
  if (s.entries.some((e) => e.id === id)) return;
  if (kind === "profile" && !s.profileComplete) throw Error("请先完善个人信息");
  if (kind === "app" && !s.appInstalled) throw Error("请先登录 App");
  if (
    kind === "signin" &&
    s.entries.filter((e) => e.id.startsWith("signin:" + month)).length >= marketConfig().rewardLimits.signin
  )
    throw Error("本月签到奖励已达上限");
  if (kind === "feedback") {
    if (feedback.trim().length < 5) throw Error("请填写至少 5 个字的反馈");
    if (
      countMonthlyFeedbackRewards(s.entries, now) >= marketConfig().rewardLimits.feedback
    )
      throw Error("本月反馈奖励已达上限");
    if (
      s.entries.some(
        (e) =>
          e.label === `用户反馈：${feedback.trim()}` &&
          feedbackRewardInMonth(e.time, feedbackMonth),
      )
    )
      throw Error("这条反馈已经领取过奖励");
  }
  const amounts = marketConfig().rewards;
  const labels = {
    register: "新用户注册",
    profile: "完善个人信息",
    app: "下载 App",
    signin: "每日签到",
    feedback: `用户反馈：${feedback.trim()}`,
  };
  const expires = new Date(now);
  expires.setFullYear(expires.getFullYear() + 1);
  s.entries.unshift({
    id,
    amount: amounts[kind],
    label: labels[kind],
    time: now.toISOString(),
    expires: expires.toISOString(),
  });
  if (marketConfig().id === "cn") grantCredits(w, { id: `reward:${id}`, category: "task", label: labels[kind], amount: amounts[kind], remaining: amounts[kind], time: now.toISOString(), expires: expires.toISOString() });
  else w.credits.total += amounts[kind];
}
