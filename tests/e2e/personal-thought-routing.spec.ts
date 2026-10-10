import { expect, test } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
const rebind = (s: ReturnType<typeof M.seed>, wid: string) => { M.unbind(s, "dev-personal"); M.bind(s, "dev-personal", wid); };

test("device thoughts follow capture binding, stay private, and stop syncing after removal", () => {
  const s = M.seed(), a = M.get(s, "team-eureka"), b = M.acceptInvite(s, "invite-growth"), p = M.get(s, "personal");
  rebind(s, a.id);
  const bindingId = s.devices[0].bindings!.at(-1)!.id;
  M.setDeviceSharing(s, a.id, "zhang", "meetings", true, ["lin"]);
  s.activeId = p.id;
  const first = M.syncThought(s, "dev-personal", "zhang", { sourceId: "thought-A" });
  expect(first.space.id).toBe(a.id); expect(first.thought.shared).toEqual([]);
  expect(M.visibleThoughts(a, "lin")).toEqual([]);
  expect(() => M.editThought(a, first.thought.id, { title: "管理员修改", detail: "" }, "lin")).toThrow(/本人/);
  expect(() => M.shareThought(a, first.thought.id, ["lin"])).toThrow(/不参与共享/);
  rebind(s, b.id);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "thought-A", bindingId }).thought.id).toBe(first.thought.id);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "thought-A" }).space.id).toBe(a.id);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "late-A", bindingId }).space.id).toBe(a.id);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "thought-B" }).space.id).toBe(b.id);
  expect(M.visibleThoughts(p)).toEqual([]);
  rebind(s, a.id); M.memberAction(s, a, "zhang", "remove", undefined, "lin");
  expect(() => M.syncThought(s, "dev-personal")).toThrow(/访问权限/);
  expect(s.devices[0].bound).toBe(true);
  expect(() => M.visibleThoughts(a)).toThrow(/访问权限/);
  expect(M.visibleThoughts(a, "lin")).toEqual([]);
  expect(() => M.syncThought(s, "dev-personal", "lin")).toThrow(/自己的设备/);
});

test("expired team retains raw private thought audio without AI, migration or repeat ingestion", () => {
  const s = M.seed(), a = M.get(s, "team-eureka"), p = M.get(s, "personal");
  rebind(s, a.id); a.status = "expired"; M.reconcileEntitlements(s);
  const before = JSON.stringify([p.credits, a.credits, p.transcriptionUsage, a.transcriptionUsage]);
  const result = M.syncThought(s, "dev-personal", "zhang", { sourceId: "raw-thought" });
  expect(result.space.id).toBe(a.id); expect(result.rawAudio?.processingPaused).toBe(true);
  expect(result.rawAudio?.transcript).toBe(""); expect(result.rawAudio?.summary).toBe("");
  expect(result.thought.shared).toEqual([]);
  expect(a.files.some(f => f.id === result.thought.id)).toBe(false);
  expect(M.visibleThoughts(a, "lin")).toEqual([]);
  expect(JSON.stringify([p.credits, a.credits, p.transcriptionUsage, a.transcriptionUsage])).toBe(before);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "raw-thought" }).thought.id).toBe(result.thought.id);
  expect(() => M.addThought(a, { title: "手动", detail: "" })).toThrow(/只读/);
  a.status = "active"; M.enrich(s);
  expect(a.thoughts).toHaveLength(1);
  expect(result.rawAudio?.processingPaused).toBe(false);
  expect(result.rawAudio?.transcript).toBe("");
});

test("upgrade preserves existing workspace and edits, clears obsolete grants, and never moves copies", () => {
  const s = M.seed(), a = M.get(s, "team-eureka"), p = M.get(s, "personal");
  const original = M.addThought(p, { title: "已迁到个人区的记录", detail: "保留本人修改" });
  a.thoughts = [
    { ...structuredClone(original), title: "原团队版本", shared: ["lin"], editors: ["lin"] },
    { ...structuredClone(original), id: "legacy-only", owner: "lin", title: "林晓的旧闪念", shared: ["zhang"], editors: ["zhang"] },
  ];
  a.contentSharing = { zhang: { thoughts: { enabled: true, users: ["lin"] } } };
  M.enrich(s); M.enrich(s);
  expect(a.thoughts).toHaveLength(2); expect(M.contentPreferences(a).thoughts).toBeUndefined();
  expect(p.thoughts).toHaveLength(1); expect(p.thoughts![0].title).toBe("已迁到个人区的记录");
  expect(M.visibleThoughts(a, "zhang").map(t => t.title)).toEqual(["原团队版本"]);
  expect(M.visibleThoughts(a, "lin").map(t => t.title)).toEqual(["林晓的旧闪念"]);
  expect(a.thoughts.every(t => !t.shared?.length && !t.editors?.length)).toBe(true);
  expect(() => M.setDeviceSharing(s, a.id, "zhang", "thoughts", true, ["lin"])).toThrow(/不参与团队共享/);
});
