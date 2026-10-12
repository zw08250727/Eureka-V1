import { expect, test } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
const rebind = (s: ReturnType<typeof M.seed>, wid: string) => { M.unbind(s, "dev-personal"); M.bind(s, "dev-personal", wid); };
import PS from "../../src/features/spaces/model/subscription";
import { createWorkspaceStore } from "../../src/features/spaces/model/store";
const draft = (orderId: string) => ({ orderId, name: `工作区 ${orderId}`, country: "中国", cycle: "month" as const, seats: 3 });
// ACCOUNT-01: old multi-team records may be retained, but never created through current flows.
function legacySecond(s: ReturnType<typeof M.seed>) {
  const second = structuredClone(M.get(s, "team-eureka"));
  second.id = "legacy-second"; second.name = "历史第二团队";
  s.spaces.push(second); return second;
}
test("ACCOUNT-01: new second memberships are refused without changing existing billing", () => {
  const s = M.seed(), before = structuredClone(s);
  expect(() => M.create(s, draft("second"))).toThrow("最多只能");
  expect(() => M.acceptInvite(s, "invite-growth")).toThrow("最多只能");
  expect(s).toEqual(before);
});
test("legacy data compatibility: consumption never changes personal or retained historical team pools", () => {
  const s = M.seed(), a = M.get(s, "team-eureka"), b = legacySecond(s), personal = M.get(s, "personal");
  const original = structuredClone([b.credits, personal.credits]);
  M.settleCredits(a, "usage-a", "本区任务", { inputTokens: 100, outputTokens: 200 });
  M.consumeMinutes(a, "record-a", 12);
  M.consumeMinutes(a, "record-a", 12);
  expect(a.transcriptionUsage?.used).toBe(12);
  expect([b.credits, personal.credits]).toEqual(original);
  M.consumeMinutes(b, "record-a", 7);
  expect(b.transcriptionUsage?.used).toBe(7);
  a.credits.used = a.credits.total;
  expect(() => M.settleCredits(a, "exhausted", "无法执行", { inputTokens: 10, outputTokens: 10 })).toThrow("Credits 不足");
  expect([b.credits, personal.credits]).toEqual(original);
  a.status = "expired";
  expect(() => M.consumeMinutes(a, "expired", 1)).toThrow("只读");
  M.settleCredits(personal, "personal", "个人任务", { inputTokens: 1, outputTokens: 1 });
  M.consumeMinutes(personal, "personal", 1);
  expect(personal.transcriptionUsage?.used).toBe(1);
  expect(b.transcriptionUsage?.used).toBe(7);
});
test("legacy paused time is preserved once; memberships no longer block personal subscription or consumption", () => {
  const s = M.seed(new Date("2026-10-01T00:00:00Z")), p = M.get(s, "personal");
  p.entitlementFreeze = { since: "2026-10-01T00:00:00.000Z", teamIds: ["team-eureka"] };
  p.personalSubscription = { plan: "Pro", minutes: 99999, credits: 5000, renew: true, cycle: "month", endsAt: "2026-11-01T00:00:00.000Z", nextRefresh: "2026-11-01T00:00:00.000Z" };
  const credits = structuredClone(p.credits);
  M.reconcileEntitlements(s, new Date("2026-10-11T00:00:00Z"));
  expect(p.entitlementFreeze).toBeUndefined();
  expect(p.personalSubscription.endsAt).toBe("2026-11-11T00:00:00.000Z");
  M.reconcileEntitlements(s, new Date("2026-10-12T00:00:00Z"));
  expect(() => M.create(s, draft("second"))).toThrow("最多只能");
  expect(p.personalSubscription.endsAt).toBe("2026-11-11T00:00:00.000Z");
  expect(p.credits).toEqual(credits);
  expect(PS.create(p, "year").status).toBe("pending");
  expect(PS.current(p, "2027-01-01T00:00:00Z").plan).toBe("标准版");
});
test("legacy data compatibility: removal does not erase unrelated retained team data", () => {
  const s = M.seed(), a = M.get(s, "team-eureka"), b = legacySecond(s);
  // SHARE-01: sharing is per record; no workspace-wide meeting switch.
  const aFile = a.files.find(f => f.owner === "zhang");
  if (aFile) M.share(a, aFile.id, ["lin"], "zhang");
  rebind(s, b.id);
  const recorded = M.sync(s, "dev-personal");
  expect(recorded.space.id).toBe(b.id);
  expect(recorded.file.shared).toEqual([]);
  expect(a.files.some(f => f.sourceFileId === recorded.file.id)).toBe(false);
  const before = structuredClone(b);
  M.memberAction(s, a, "zhang", "remove", undefined, "lin");
  expect(b).toEqual(before);
  expect(M.accountTeams(s).map(w => w.id)).toEqual([b.id]);
  expect(M.get(s, "personal").entitlementFreeze).toBeUndefined();
  expect(M.member(a,"zhang")).toBeFalsy();
  expect(M.member(b,"zhang")).toBeTruthy();
  expect(s.devices[0].bound).toBe(true);
});
test("personal and team device captures consume only their bound workspace pool", () => {
  const s = M.seed(), p = M.get(s, "personal"), a = M.get(s, "team-eureka");
  expect(M.sync(s, "dev-personal").file.status).not.toBe("原始音频 · 待处理");
  expect(p.transcriptionUsage?.used).toBe(12);
  rebind(s, a.id);
  const first = M.sync(s, "dev-personal", "zhang", { sourceId: "once" });
  M.sync(s, "dev-personal", "zhang", { sourceId: "once" });
  expect(first.file.shared).toEqual([]);
  expect(a.transcriptionUsage?.used).toBe(12);
  expect(p.transcriptionUsage?.used).toBe(12);
});
test("failed writes cannot partially join a workspace or change entitlement snapshots", () => {
  const state = M.seed(); state.spaces = state.spaces.filter(w => w.type === "personal");
  const data = new Map<string, string>(); data.set(M.KEY, JSON.stringify(state));
  const storage = { getItem: (key: string) => data.get(key) || null, setItem: () => { throw Error("quota"); } } as unknown as Storage;
  const repo = createWorkspaceStore(storage), before = repo.read();
  expect(() => repo.change(s => M.acceptInvite(s, "invite-growth"))).toThrow("保存失败");
  expect(repo.read()).toEqual(before);
});
