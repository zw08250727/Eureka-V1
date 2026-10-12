import { test, expect } from "@playwright/test";
import "./market-context";
import M from "../../src/features/spaces/model/core";
import { marketConfig } from "../../src/features/markets/config";
import {
  claimReward,
  countMonthlyFeedbackRewards,
  type RewardEntry,
} from "../../src/features/account/rewards";
import { submitMeetingFeedback } from "../../src/features/meetings/feedback-model";

const now = new Date("2026-10-12T04:00:00.000Z");
const rating = { score: 8, reasons: [], content: "", time: now.toISOString() };
const setup = () => {
  const state = M.seed();
  const personal = M.get(state, "personal");
  personal.rewards = { entries: [] };
  return { state, personal };
};

test("CN-POINTS-03: meeting rewards consume the account feedback allowance, capped at ten", () => {
  const { state, personal } = setup();
  const before = personal.credits.total;
  expect(marketConfig().rewardLimits.feedback).toBe(10);
  for (let i = 0; i < 9; i += 1) {
    submitMeetingFeedback(state, "personal", `meeting-${i}`, "zhang", rating);
  }
  claimReward(personal, "zhang", "feedback", "希望增加录音快捷操作", now);
  expect(countMonthlyFeedbackRewards(personal.rewards!.entries, now)).toBe(10);
  expect(personal.credits.total).toBe(before + 5000);
  // Meeting rewards must not become the account-feedback sequence number.
  expect(personal.rewards!.entries[0].id).toBe("feedback:2026-10:0");
  const snapshot = JSON.stringify(personal);
  expect(() => claimReward(personal, "zhang", "feedback", "希望增加文字查找功能", now)).toThrow("本月反馈奖励已达上限");
  expect(JSON.stringify(personal)).toBe(snapshot);
});

test("CN-POINTS-03: a meeting rating still saves after account feedback exhausts rewards", () => {
  const { state, personal } = setup();
  for (let i = 0; i < 10; i += 1) {
    claimReward(personal, "zhang", "feedback", `录音使用建议第${i}条`, now);
  }
  const credits = JSON.stringify(personal.credits);
  const rewards = JSON.stringify(personal.rewards);
  expect(() => submitMeetingFeedback(state, "personal", "unrewarded-meeting", "zhang", rating)).not.toThrow();
  expect(personal.meetingFeedback?.["unrewarded-meeting"]).toEqual(rating);
  expect(JSON.stringify(personal.credits)).toBe(credits);
  expect(JSON.stringify(personal.rewards)).toBe(rewards);
  expect(() => submitMeetingFeedback(state, "personal", "unrewarded-meeting", "zhang", rating)).toThrow("已提交评价");
});

test("CN-POINTS-03: account feedback sequences remain unique with gaps and mixed rewards", () => {
  const { state, personal } = setup();
  const entry = (id: string): RewardEntry => ({
    id, amount: 500, label: "已有奖励", time: now.toISOString(),
    expires: "2027-10-12T04:00:00.000Z",
  });
  personal.rewards!.entries = [entry("feedback:2026-10:0"), entry("feedback:2026-10:2")];
  submitMeetingFeedback(state, "personal", "mixed-meeting", "zhang", rating);
  claimReward(personal, "zhang", "feedback", "改善上传文件的交互体验", now);
  expect(personal.rewards!.entries[0].id).toBe("feedback:2026-10:3");
  claimReward(personal, "zhang", "feedback", "改善搜索结果的排序方式", now);
  expect(personal.rewards!.entries[0].id).toBe("feedback:2026-10:4");
  const ids = personal.rewards!.entries.map(entry => entry.id);
  expect(new Set(ids).size).toBe(ids.length);
  const snapshot = JSON.stringify(personal);
  expect(() => claimReward(personal, "zhang", "feedback", "改善搜索结果的排序方式", now)).toThrow("已经领取");
  expect(JSON.stringify(personal)).toBe(snapshot);
});

test("CN-POINTS-03: shared count deduplicates reward IDs and uses Beijing calendar months", () => {
  const entries = [
    { id: "feedback:2026-10:0", time: "2026-09-30T16:00:00.000Z" },
    { id: "meeting-feedback:personal:october:zhang", time: "2026-10-31T15:59:59.999Z" },
    { id: "meeting-feedback:personal:october:zhang", time: "2026-10-31T15:59:59.999Z" },
    { id: "meeting-feedback:personal:september:zhang", time: "2026-09-30T15:59:59.999Z" },
    { id: "meeting-feedback:personal:november:zhang", time: "2026-10-31T16:00:00.000Z" },
    { id: "signin:2026-10-12", time: now.toISOString() },
    { id: "register", time: now.toISOString() },
    { id: "meeting-feedback:invalid", time: "invalid" },
  ];
  expect(countMonthlyFeedbackRewards(entries, now)).toBe(2);
  expect(countMonthlyFeedbackRewards(entries, new Date("2026-10-31T16:00:00.000Z"))).toBe(1);
});

test("CN-POINTS-03: account rewards reset at Beijing midnight without reusing prior-month IDs", () => {
  const { personal } = setup();
  const monthEnd = new Date("2026-10-31T15:59:59.999Z");
  for (let i = 0; i < 10; i += 1) {
    claimReward(personal, "zhang", "feedback", `月底使用反馈第${i}条`, monthEnd);
  }
  const before = personal.credits.total;
  const monthStart = new Date("2026-10-31T16:00:00.000Z");
  claimReward(personal, "zhang", "feedback", "新月份的录音使用反馈", monthStart);
  expect(personal.rewards!.entries[0].id).toBe("feedback:2026-11:0");
  expect(countMonthlyFeedbackRewards(personal.rewards!.entries, monthStart)).toBe(1);
  expect(personal.credits.total).toBe(before + 500);
});
