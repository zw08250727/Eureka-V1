import { expect, test } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import { createWorkspaceStore } from "../../src/features/spaces/model/store";
const rebind = (s: ReturnType<typeof M.seed>, wid: string) => { M.unbind(s, "dev-personal"); M.bind(s, "dev-personal", wid); };

for (const [bound, viewed] of [["personal", "team-eureka"], ["team-eureka", "personal"]]) {
  test(`device bound to ${bound} keeps its target and usage after viewing ${viewed} and reloading`, () => {
    const state = M.seed();
    if (bound !== "personal") rebind(state, bound);
    const binding = structuredClone(state.devices[0].bindings);
    const otherBefore = structuredClone(M.get(state, viewed));
    state.activeId = viewed;
    M.setCaptureSpace(state, viewed);
    const s = M.enrich(JSON.parse(JSON.stringify(state)));
    const result = M.sync(s, "dev-personal", "zhang", { sourceId: "fixed-workspace" });
    expect(result.space.id).toBe(bound);
    expect(result.file.recordedWorkspaceId).toBe(bound);
    expect(s.devices[0].bindings).toEqual(binding);
    expect(M.get(s, bound).transcriptionUsage?.used).toBe(12);
    expect(M.get(s, viewed).files).toEqual(otherBefore.files);
    expect(M.get(s, viewed).credits).toEqual(otherBefore.credits);
    expect(M.get(s, viewed).transcriptionUsage).toEqual(otherBefore.transcriptionUsage);
    M.sync(s, "dev-personal", "zhang", { sourceId: "fixed-workspace" });
    expect(M.get(s, bound).transcriptionUsage?.used).toBe(12);
  });
}

test("ACCOUNT-01 / SPACE-01: team binding survives viewing personal; rebind moves only future recordings", () => {
  const s = M.seed(), a = M.get(s, "team-eureka"), b = M.get(s, "personal");
  rebind(s, a.id);
  const oldBinding = s.devices[0].bindings!.at(-1)!.id;
  M.setCaptureSpace(s, b.id); s.activeId = b.id;
  const old = M.sync(s, "dev-personal", "zhang", { sourceId: "A" });
  expect(old.space.id).toBe(a.id);
  M.share(a, old.file.id, ["kevin"]);
  expect(M.canEdit(a, old.file, "kevin")).toBe(false);
  expect(() => M.sync(s, "dev-personal", "zhang", { sourceId: "spoof", workspaceId: b.id })).toThrow(/只能进入/);
  expect(() => M.bind(s, "dev-personal", b.id)).toThrow(/先解绑/);
  rebind(s, b.id);
  expect(M.sync(s, "dev-personal", "zhang", { sourceId: "B" }).space.id).toBe(b.id);
  expect(M.sync(s, "dev-personal", "zhang", { sourceId: "offline-A", bindingId: oldBinding }).space.id).toBe(a.id);
  expect(a.files.find(f => f.id === old.file.id)?.shared).toEqual(["kevin"]);
  expect(M.accountTeams(s)).toHaveLength(1);
  expect(b.files.some(f => f.id === old.file.id)).toBe(false);
  expect(M.deviceList(s, a.id).some(d => d.id === "dev-personal")).toBe(false);
});

test("unbound devices stop new captures; former binding handles pending audio without redirecting", () => {
  const s = M.seed(); rebind(s, "team-eureka");
  const bindingId = s.devices[0].bindings!.at(-1)!.id;
  M.unbind(s, "dev-personal");
  expect(() => M.sync(s, "dev-personal")).toThrow(/尚未绑定/);
  expect(M.sync(s, "dev-personal", "zhang", { sourceId: "pending", bindingId }).space.id).toBe("team-eureka");
  expect(() => M.bind(s, "dev-personal", "team-eureka", "lin")).toThrow(/自己/);
  expect(() => M.unbind(s, "dev-team")).toThrow(/自己/);
});

test("legacy account bindings require owner confirmation while known workspace bindings survive reload", () => {
  const s = M.seed(), d = s.devices[0];
  delete d.spaceId; delete d.bindings;
  M.enrich(s); expect(d.spaceId).toBeUndefined();
  expect(() => M.sync(s, d.id)).toThrow(/确认绑定/);
  M.bind(s, d.id, "team-eureka");
  const binding = structuredClone(d.bindings);
  M.enrich(s); expect(d.bindings).toEqual(binding); expect(d.spaceId).toBe("team-eureka");
  expect(M.sync(s, d.id).space.id).toBe("team-eureka");
});

test("expired team keeps fixed binding and raw audio; member removal blocks rather than redirecting", () => {
  const s = M.seed(), w = M.get(s, "team-eureka"); rebind(s, w.id);
  w.status = "expired"; M.reconcileEntitlements(s); M.setCaptureSpace(s, "personal");
  const capture = M.sync(s, "dev-personal", "zhang", { sourceId: "expired" });
  expect(capture.space.id).toBe(w.id); expect(capture.file.processingPaused).toBe(true); expect(capture.file.transcript).toBe("");
  w.status = "active"; M.memberAction(s, w, "zhang", "remove", undefined, "lin");
  expect(s.devices[0].spaceId).toBe(w.id); expect(s.devices[0].bound).toBe(true);
  expect(() => M.sync(s, "dev-personal", "zhang", { sourceId: "removed" })).toThrow(/访问权限/);
  expect(() => M.sync(s, "dev-personal", "zhang", { sourceId: "expired" })).toThrow(/访问权限/);
  rebind(s, "personal"); expect(M.sync(s, "dev-personal").space.id).toBe("personal");
});

test("view and edit grants apply per recipient; editing never grants deletion or resharing", () => {
  const s = M.seed(), w = M.get(s, "team-eureka");
  const f = M.addFile(w, { title: "私有原文" });
  M.share(w, f.id, ["lin", "kevin"], "zhang", ["kevin"]);
  expect(M.canEdit(w, f, "lin")).toBe(false); expect(M.canEdit(w, f, "kevin")).toBe(true);
  expect(() => M.edit(w, f.id, { title: "禁止查看者改写" }, "lin")).toThrow(/编辑权限/);
  M.saveDetail(w, f.id, { title: "协作标题", summary: "协作笔记", transcript: "校对转录" }, "kevin");
  expect(f.owner).toBe("zhang"); expect(f.summary).toBe("协作笔记");
  expect(() => M.share(w, f.id, ["lin"], "kevin", ["lin"])).toThrow(/所有者/);
  expect(() => M.trash(w, f.id, false, "kevin")).toThrow(/所有者/);
  expect(() => M.share(w, f.id, ["lin"], "zhang", ["kevin"])).toThrow(/查看权限/);
  M.share(w, f.id, ["lin", "kevin"]);
  expect(() => M.edit(w, f.id, { title: "旧页面保存" }, "kevin")).toThrow(/编辑权限/);
  M.share(w, f.id, ["kevin"], "zhang", ["kevin"]); w.status = "expired";
  expect(M.canEdit(w, f, "kevin")).toBe(false);
  expect(() => M.edit(w, f.id, { title: "到期" }, "kevin")).toThrow(/只读/);
});

test("ACCOUNT-01 / SHARE-01: per-record sharing does not grant future or personal recordings", () => {
  const s = M.seed(), team = M.get(s, "team-eureka"), personal = M.get(s, "personal");
  const shared = M.addFile(team, { title: "明确共享的会议" });
  M.share(team, shared.id, ["kevin"]);
  expect(M.getFile(team, shared.id, "kevin").id).toBe(shared.id);
  expect(M.canEdit(team, shared, "kevin")).toBe(false);
  for (const source of ["网页录音", "文件上传", "笔记"]) {
    const next = M.addFile(team, { title: source, source });
    expect(next.shared).toEqual([]);
    expect(() => M.getFile(team, next.id, "kevin")).toThrow();
  }
  expect(M.addFile(personal, { title: "个人会议" }).shared).toEqual([]);
  expect(personal.files.some(f => f.id === shared.id)).toBe(false);
  expect(M.accountTeams(s)).toHaveLength(1);
});

test("rebind is atomic when saving fails, and old permissions never become editing grants by migration", () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent() {} } });
  try {
    let data = JSON.stringify(M.seed()); const before = data;
    const storage = { getItem: () => data, setItem: (_: string, value: string) => { data = value; } } as unknown as Storage;
    const store = createWorkspaceStore(storage);
    storage.setItem = () => { throw Error("quota"); };
    expect(() => store.change(s => rebind(s, "team-eureka"))).toThrow(/保存失败/);
    expect(data).toBe(before); expect(store.read().devices[0].spaceId).toBe("personal");
    const w = M.get(store.read(), "team-eureka");
    expect(w.files.filter(f => f.owner !== "zhang").every(f => !M.canEdit(w, f, "zhang"))).toBe(true);
  } finally { Reflect.deleteProperty(globalThis, "window"); }
});
