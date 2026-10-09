import { expect, test } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
const rebind = (s: ReturnType<typeof M.seed>, wid: string) => { M.unbind(s, "dev-personal"); M.bind(s, "dev-personal", wid); };

test("device meetings follow binding while thoughts remain personal across teams and removal", () => {
  const s = M.seed(), a = M.get(s, "team-eureka"), b = M.acceptInvite(s, "invite-growth"), p = M.get(s, "personal");
  rebind(s, a.id);
  const bindingId = s.devices[0].bindings!.at(-1)!.id;
  M.setDeviceSharing(s, a.id, "zhang", "meetings", true, ["lin"]);
  const first = M.syncThought(s, "dev-personal", "zhang", { sourceId: "thought-A" });
  expect(first.space.id).toBe(p.id); expect(first.thought.shared).toEqual([]);
  expect(M.sync(s, "dev-personal", "zhang", { sourceId: "meeting-A" }).space.id).toBe(a.id);
  rebind(s, b.id);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "thought-A", bindingId }).thought.id).toBe(first.thought.id);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "thought-B" }).space.id).toBe(p.id);
  expect(M.sync(s, "dev-personal", "zhang", { sourceId: "meeting-B" }).space.id).toBe(b.id);
  rebind(s, a.id); M.memberAction(s, a, "zhang", "remove", undefined, "lin");
  expect(() => M.sync(s, "dev-personal")).toThrow(/访问权限/);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "thought-after-removal" }).space.id).toBe(p.id);
  expect(a.thoughts || []).toEqual([]); expect(b.thoughts || []).toEqual([]);
  expect(() => M.syncThought(s, "dev-personal", "lin")).toThrow(/自己的设备/);
});

test("team membership does not suspend personal thought capture or charge a team", () => {
  const s = M.seed(), a = M.get(s, "team-eureka"), p = M.get(s, "personal");
  rebind(s, a.id); M.reconcileEntitlements(s);
  const before = JSON.stringify([p.credits, a.credits, p.transcriptionUsage, a.transcriptionUsage]);
  const result = M.syncThought(s, "dev-personal", "zhang", { sourceId: "raw-thought" });
  expect(result.space.id).toBe(p.id); expect(result.rawAudio).toBeUndefined();
  expect(result.thought.shared).toEqual([]); expect(result.thought.detail).toContain("设备闪念同步演示");
  expect(a.files.some(f => f.id === result.thought.id)).toBe(false);
  expect(JSON.stringify([p.credits, a.credits, p.transcriptionUsage, a.transcriptionUsage])).toBe(before);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "raw-thought" }).thought.id).toBe(result.thought.id);
});

test("legacy team thoughts return to the correct owner once; existing personal edits win", () => {
  const s = M.seed(), a = M.get(s, "team-eureka"), p = M.get(s, "personal");
  const original = M.addThought(p, { title: "本人已修改的闪念", detail: "保留最新个人版本" });
  a.thoughts = [
    { ...structuredClone(original), title: "旧共享副本", shared: ["lin"], editors: ["lin"] },
    { ...structuredClone(original), id: "legacy-only", owner: "lin", title: "林晓的旧闪念", shared: ["zhang"], editors: ["zhang"] },
  ];
  a.contentSharing = { zhang: { thoughts: { enabled: true, users: ["lin"] } } };
  M.enrich(s); M.enrich(s);
  expect(a.thoughts).toEqual([]); expect(M.contentPreferences(a).thoughts).toBeUndefined();
  expect(p.thoughts?.filter(t => t.id === original.id)).toHaveLength(1);
  expect(p.thoughts?.find(t => t.id === original.id)?.title).toBe("本人已修改的闪念");
  const lin = M.accountSpace(s, "lin");
  expect(lin.thoughts?.filter(t => t.id === "legacy-only")).toHaveLength(1);
  expect(lin.thoughts?.[0].shared).toEqual([]); expect(lin.thoughts?.[0].editors).toEqual([]);
  expect(p.thoughts?.some(t => t.id === "legacy-only")).toBe(false);
  expect(M.visibleThoughts(a, "zhang")).toEqual([]);
  expect(() => M.setDeviceSharing(s, a.id, "zhang", "thoughts", true, ["lin"])).toThrow(/不参与团队共享/);
});
