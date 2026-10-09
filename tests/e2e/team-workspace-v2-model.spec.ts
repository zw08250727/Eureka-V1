import { expect, test } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
const rebind = (s: ReturnType<typeof M.seed>, wid: string) => { M.unbind(s, "dev-personal"); M.bind(s, "dev-personal", wid); };
import { createWorkspaceStore } from "../../src/features/spaces/model/store";

test("current workspace policy covers web, upload and hardware, never another workspace or owner", () => {
  const s = M.seed(), a = M.get(s, "team-eureka"), p = M.get(s, "personal");
  const before = M.addFile(a, { title: "历史私有" });
  M.setDeviceSharing(s, a.id, "zhang", "meetings", true, ["lin"]);
  expect(() => M.setDeviceSharing(s, a.id, "zhang", "thoughts", true, ["lin"])).toThrow(/个人工作区/);
  for (const source of ["网页录音", "文件上传", "笔记"]) {
    const f = M.addFile(a, { title: source, source });
    expect(f.shared).toEqual(["lin"]);
    expect(M.visible(a, "kevin").some(v => v.id === f.id)).toBe(false);
  }
  const thought = M.addThought(p, { title: "个人想法", detail: "仅本人可见" });
  expect(thought.shared).toEqual([]);
  expect(before.shared).toEqual([]);
  expect(M.addFile(a, { title: "另一个成员" }, "kevin").shared).toEqual([]);
  expect(M.addFile(p, { title: "个人文件" }).shared).toEqual([]);
  const length = a.files.length;
  M.sync(s, "dev-personal", "zhang", { sourceId: "personal" });
  expect(a.files).toHaveLength(length);
  rebind(s, a.id);
  expect(M.sync(s, "dev-personal", "zhang", { sourceId: "team" }).file.shared).toEqual(["lin"]);
  expect(() => M.setDeviceSharing(s, a.id, "zhang", "meetings", true, ["kevin"], "lin")).toThrow(/本人/);
});

test("expired and cancelled teams accept only bound-device raw audio without AI or charging", () => {
  for (const status of ["expired", "cancelled"] as const) {
    const s = M.seed(), w = M.get(s, "team-eureka"), p = M.get(s, "personal");
    M.setDeviceSharing(s, w.id, "zhang", "meetings", true, ["lin"]);
    rebind(s, w.id);
    w.status = status;
    M.reconcileEntitlements(s);
    const credits = structuredClone([w.credits, p.credits]);
    const original = structuredClone(w.files[0]);
    const result = M.sync(s, "dev-personal", "zhang", { sourceId: status });
    expect(result.space.id).toBe(w.id);
    expect(result.file.rawAudio).toBe(true);
    expect(result.file.processingPaused).toBe(true);
    expect(result.file.transcript).toBe(""); expect(result.file.summary).toBe("");
    expect(result.file.shared).toEqual([]);
    expect(result.duplicate).toBeUndefined();
    expect(M.sync(s, "dev-personal", "zhang", { sourceId: status }).duplicate).toBe(true);
    expect(s.devices[0].bound).toBe(true);
    expect(w.files.find(f => f.id === original.id)).toEqual(original);
    expect([w.credits, p.credits]).toEqual(credits);
    expect(w.transcriptionUsage).toBeUndefined();
    expect(() => M.addFile(w, { title: "手动" })).toThrow(/只读/);
    expect(() => M.addThought(w, { title: "手动", detail: "" })).toThrow(/个人工作区/);
    expect(() => M.edit(w, original.id, { title: "修改" })).toThrow(/只读/);
    expect(() => M.consumeMinutes(w, "bad", 1)).toThrow(/只读/);
    expect(() => M.settleCredits(w, "bad", "AI", { inputTokens: 1, outputTokens: 1 })).toThrow(/只读/);
    const bindingId = s.devices[0].bindings!.at(-1)!.id;
    rebind(s, "personal");
    const personal = M.sync(s, "dev-personal", "zhang", { sourceId: `new-${status}` });
    expect(personal.space.id).toBe("personal");
    expect(p.transcriptionUsage?.used).toBe(12);
    // A delayed device upload preserves its capture workspace, not the newly selected view.
    expect(M.sync(s, "dev-personal", "zhang", { sourceId: `late-${status}`, workspaceId: w.id, bindingId }).space.id).toBe(w.id);
    const rawThought = M.syncThought(s, "dev-personal", "zhang", { workspaceId: w.id, bindingId, sourceId: "paused-thought" });
    expect(rawThought.space.id).toBe("personal");
    w.status = "active"; M.enrich(s);
    expect(M.syncThought(s, "dev-personal", "zhang", { workspaceId: w.id, bindingId, sourceId: "paused-thought" }).thought.id).toBe(rawThought.thought.id);
    expect(result.file.processingPaused).toBe(false);
    expect(result.file.status).toBe("待处理");
    expect(result.file.transcript).toBe("");
  }
});

test("personal benefits resume only when all memberships lose active entitlements", () => {
  const s = M.seed(), a = M.get(s, "team-eureka"), b = M.acceptInvite(s, "invite-growth"), p = M.get(s, "personal");
  const balance = structuredClone(p.credits);
  a.status = "expired"; M.reconcileEntitlements(s);
  expect(p.entitlementFreeze?.teamIds).toEqual([b.id]);
  b.status = "cancelled"; M.reconcileEntitlements(s);
  expect(p.entitlementFreeze).toBeUndefined();
  expect(p.credits).toEqual(balance);
  expect(M.accountTeams(s)).toHaveLength(2);
  b.status = "active"; M.reconcileEntitlements(s);
  expect(p.entitlementFreeze?.teamIds).toEqual([b.id]);
});

test("team device metadata is admin-only; member removal does not revive future sharing", () => {
  const s = M.seed(), w = M.get(s, "team-eureka");
  expect(M.deviceList(s, w.id, "zhang").length).toBeGreaterThan(0);
  expect(() => M.deviceList(s, w.id, "kevin")).toThrow(/管理员/);
  expect(() => M.unbind(s, "dev-personal", "lin")).toThrow(/自己/);
  M.setDeviceSharing(s, w.id, "zhang", "meetings", true, ["kevin"]);
  M.memberAction(s, w, "kevin", "remove", undefined, "zhang");
  expect(M.contentPreferences(w, "zhang").meetings?.users).toEqual([]);
});

test("failed persistence does not partially change content sharing", () => {
  const value = JSON.stringify(M.seed());
  const storage = { getItem: () => value, setItem: () => { throw Error("quota"); } } as unknown as Storage;
  const repo = createWorkspaceStore(storage), before = repo.read();
  expect(() => repo.change(s => M.setDeviceSharing(s, "team-eureka", "zhang", "meetings", true, ["lin"]))).toThrow(/保存失败/);
  expect(repo.read()).toEqual(before);
});

test("renewing a previously expired team freezes from renewal, not the original join date", () => {
  const s = M.seed(), w = M.get(s, "team-eureka"), p = M.get(s, "personal");
  p.entitlementFreeze = { since: "2026-10-01T00:00:00.000Z", teamIds: [w.id] };
  p.personalSubscription = { plan: "Pro", cycle: "month", endsAt: "2026-11-01T00:00:00.000Z", nextRefresh: "2026-11-01T00:00:00.000Z", minutes: 99999, credits: 5000, renew: true };
  w.status = "expired";
  M.reconcileEntitlements(s, new Date("2026-10-05T00:00:00Z"));
  expect(p.personalSubscription.endsAt).toBe("2026-11-05T00:00:00.000Z");
  w.status = "active";
  M.reconcileEntitlements(s, new Date("2026-10-10T00:00:00Z"));
  expect(p.entitlementFreeze?.since).toBe("2026-10-10T00:00:00.000Z");
  w.status = "cancelled";
  M.reconcileEntitlements(s, new Date("2026-10-12T00:00:00Z"));
  expect(p.personalSubscription.endsAt).toBe("2026-11-07T00:00:00.000Z");
});
