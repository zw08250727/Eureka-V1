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
    month = day.slice(0, 7);
  const id =
    kind === "signin"
      ? `signin:${day}`
      : kind === "feedback"
        ? `feedback:${month}:${s.entries.filter((e) => e.id.startsWith("feedback:" + month)).length}`
        : kind;
  if (s.entries.some((e) => e.id === id)) return;
  if (kind === "profile" && !s.profileComplete) throw Error("请先完善个人信息");
  if (kind === "app" && !s.appInstalled) throw Error("请先完成 App 登录演示");
  if (
    kind === "signin" &&
    s.entries.filter((e) => e.id.startsWith("signin:" + month)).length >= 15
  )
    throw Error("本月签到奖励已达上限");
  if (kind === "feedback") {
    if (feedback.trim().length < 5) throw Error("请填写至少 5 个字的反馈");
    if (
      s.entries.filter((e) => e.id.startsWith("feedback:" + month)).length >= 10
    )
      throw Error("本月反馈奖励已达上限");
    if (
      s.entries.some(
        (e) =>
          e.label === `用户反馈：${feedback.trim()}` &&
          e.time.startsWith(month),
      )
    )
      throw Error("这条反馈已经领取过奖励");
  }
  const amounts = {
    register: 1000,
    profile: 500,
    app: 200,
    signin: 1000,
    feedback: 500,
  };
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
  w.credits.total += amounts[kind];
}
