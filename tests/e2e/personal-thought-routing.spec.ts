import { expect, test } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
const rebind = (s: ReturnType<typeof M.seed>, wid: string) => { M.unbind(s, "dev-personal"); M.bind(s, "dev-personal", wid); };

test("ACCOUNT-01 / SPACE-01: thoughts keep their personal or sole-team capture destination across rebind and removal", () => {
  const s = M.seed(), team = M.get(s, "team-eureka"), personal = M.get(s, "personal");
  rebind(s, team.id);
  const bindingId = s.devices[0].bindings!.at(-1)!.id;
  s.activeId = personal.id;
  const first = M.syncThought(s, "dev-personal", "zhang", { sourceId: "team-thought" });
  expect(first.space.id).toBe(team.id);
  expect(first.thought.shared).toEqual([]);
  expect(M.visibleThoughts(team, "kevin")).toEqual([]);
  expect(M.visibleThoughts(team, "lin").map(t => t.id)).toContain(first.thought.id);
  rebind(s, personal.id);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "team-thought", bindingId }).thought.id).toBe(first.thought.id);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "team-thought" }).space.id).toBe(team.id);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "late-team", bindingId }).space.id).toBe(team.id);
  const own = M.syncThought(s, "dev-personal", "zhang", { sourceId: "personal-thought" });
  expect(own.space.id).toBe(personal.id);
  expect(M.visibleThoughts(personal).map(t => t.id)).toEqual([own.thought.id]);
  rebind(s, team.id);
  M.memberAction(s, team, "zhang", "remove", undefined, "lin");
  expect(s.devices[0].bound).toBe(false);
  expect(() => M.syncThought(s, "dev-personal")).toThrow(/尚未绑定/);
  expect(() => M.syncThought(s, "dev-personal", "zhang", { sourceId: "late-revoked", bindingId })).toThrow();
  expect(() => M.visibleThoughts(team)).toThrow(/访问权限/);
  expect(M.visibleThoughts(team, "lin").map(t => t.id)).toContain(first.thought.id);
  expect(M.visibleThoughts(personal).map(t => t.id)).toEqual([own.thought.id]);
  expect(M.accountTeams(s)).toHaveLength(0);
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
