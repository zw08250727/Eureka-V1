import { expect, test } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
const rebind = (s: ReturnType<typeof M.seed>, wid: string) => { M.unbind(s, "dev-personal"); M.bind(s, "dev-personal", wid); };
import { createWorkspaceStore } from "../../src/features/spaces/model/store";
import { createContacts, createThoughts, type Contact, type ContactsState } from "../../src/features/personal/store";
import { ingestCustomer, editCustomer, customerPayload, type CustomerSource } from "../../src/features/personal/contact-identity";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); }, clear: () => data.clear(), key: (i: number) => [...data.keys()][i] ?? null,
    get length() { return data.size; } } satisfies Storage;
}
test.beforeAll(() => Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent() {} } }));
test.afterAll(() => Reflect.deleteProperty(globalThis, "window"));

test("workspace devices remain bound after removal; owner must rebind before new captures", () => {
  const s = M.seed(), team = M.get(s, "team-eureka");
  expect(M.deviceList(s, "personal").map((d) => d.id)).toEqual(["dev-personal"]);
  expect(M.deviceList(s, team.id).map((d) => d.id)).not.toContain("dev-personal");
  M.setDeviceSharing(s, team.id, "zhang", "meetings", true, ["lin"]);
  rebind(s, team.id);
  const first = M.sync(s, "dev-personal", "zhang", { sourceId: "meeting-1" });
  const thought = M.syncThought(s, "dev-personal", "zhang", { sourceId: "thought-1" });
  expect(first.space.id).toBe(team.id);
  expect(first.sharedTeam?.id).toBe(team.id);
  const history = structuredClone(team.files), thoughts = structuredClone(team.thoughts);
  M.memberAction(s, team, "zhang", "remove", undefined, "lin");
  expect(s.devices.find((d) => d.id === "dev-personal")?.bound).toBe(true);
  expect(M.accountTeam(s)).toBeUndefined();
  expect(M.deviceList(s, team.id, "lin").map((d) => d.id)).toContain("dev-personal");
  expect(() => M.sync(s, "dev-personal")).toThrow(/访问权限/);
  rebind(s, "personal");
  expect(M.visible(team, "lin").some((f) => f.id === first.file.id)).toBe(true);
  expect(() => M.visible(team, "zhang")).toThrow();
  M.sync(s, "dev-personal", "zhang", { sourceId: "meeting-2" });
  M.syncThought(s, "dev-personal", "zhang", { sourceId: "thought-2" });
  expect(team.files).toEqual(history.map(f => ({ ...f, shared: f.shared.filter(id => id !== "zhang") })));
  expect(team.thoughts).toEqual(thoughts);
  expect(M.get(s, "personal").files.some((f) => f.id === first.file.id)).toBe(false);
  expect([...M.visibleThoughts(M.get(s, "personal")), ...M.get(s, "personal").files].map((t) => t.id)).toContain(thought.thought.id);
  expect(M.enrich(s).devices.find((d) => d.id === "dev-personal")?.bound).toBe(true);
});

test("sync retries are idempotent and never back-share pre-join or removed data", () => {
  const s = M.seed(), team = M.get(s, "team-eureka");
  M.memberAction(s, team, "zhang", "remove", undefined, "lin");
  const a = M.sync(s, "dev-personal", "zhang", { sourceId: "offline" });
  const b = M.syncThought(s, "dev-personal", "zhang", { sourceId: "offline-thought" });
  const newTeam = M.acceptInvite(s, "invite-growth");
  const before = newTeam.files.length;
  expect(M.sync(s, "dev-personal", "zhang", { sourceId: "offline" }).file.id).toBe(a.file.id);
  expect(M.syncThought(s, "dev-personal", "zhang", { sourceId: "offline-thought" }).thought.id).toBe(b.thought.id);
  expect(newTeam.files).toHaveLength(before);
  expect(newTeam.thoughts || []).toHaveLength(0);
  const recipient = newTeam.members.find(m => m.id !== "zhang" && m.status === "active")!.id;
  M.setDeviceSharing(s, newTeam.id, "zhang", "meetings", true, [recipient]);
  rebind(s, newTeam.id);
  M.sync(s, "dev-personal", "zhang", { sourceId: "new" });
  M.syncThought(s, "dev-personal", "zhang", { sourceId: "new-thought" });
  expect(newTeam.files).toHaveLength(before + 1);
  expect(newTeam.thoughts || []).toHaveLength(0);
});

test("legacy bindings migrate once without resurrecting unbound devices or copying private team data", () => {
  const s = M.seed(); delete s.accountDevicesVersion;
  const d = s.devices[0]; delete (d as Partial<typeof d>).bound; d.spaceId = "personal";
  const other = s.devices[1]; delete (other as Partial<typeof other>).bound; other.spaceId = null;
  M.enrich(s);
  expect(d.bound).toBe(true); expect(other.bound).toBe(false);
  expect(d.spaceId).toBe("personal");
  expect(M.accountSpace(s, "lin").files.some((f) => f.id === "team-private")).toBe(false);
  const files = M.get(s, "personal").files.length;
  M.enrich(s); expect(M.get(s, "personal").files).toHaveLength(files);
  M.unbind(s, d.id); expect(() => M.sync(s, d.id)).toThrow("尚未绑定工作区");
  expect(() => M.unbind(s, other.id)).toThrow("自己的设备");
});

test("failed and stale writes do not partially remove membership or modify device history", () => {
  const storage = memory(); storage.setItem(M.KEY, JSON.stringify(M.seed()));
  const repo = createWorkspaceStore(storage), stale = createWorkspaceStore(storage);
  repo.change((s) => M.sync(s, "dev-personal"));
  expect(() => stale.change((s) => M.memberAction(s, M.get(s, "team-eureka"), "zhang", "remove", undefined, "lin"))).toThrow("其他页面");
  const before = storage.getItem(M.KEY); storage.setItem = () => { throw Error("quota"); };
  expect(() => repo.change((s) => M.memberAction(s, M.get(s, "team-eureka"), "zhang", "remove", undefined, "lin"))).toThrow("保存失败");
  expect(storage.getItem(M.KEY)).toBe(before);
  expect(M.accountTeam(repo.read())?.id).toBe("team-eureka");
});

test("device thoughts remain personally editable across team binding and member removal", () => {
  const storage = memory(), s = M.seed();
  rebind(s, "team-eureka");
  const teamThought = M.syncThought(s, "dev-personal");
  M.memberAction(s, M.get(s, "team-eureka"), "zhang", "remove", undefined, "lin");
  rebind(s, "personal");
  const result = M.syncThought(s, "dev-personal");
  storage.setItem(M.KEY, JSON.stringify(s));
  const repo = createThoughts(storage);
  const thought = repo.read().records.find((t) => t.id === result.thought.id)!;
  repo.save({ ...thought, title: "移除后本人修改" });
  const saved = createWorkspaceStore(storage).read();
  expect(M.get(saved, "personal").thoughts?.[0].title).toBe("移除后本人修改");
  expect(M.get(saved, "team-eureka").thoughts || []).toHaveLength(0);
  expect([...M.get(saved, "personal").thoughts || [], ...M.get(saved, "personal").files].some(t => t.id === teamThought.thought.id)).toBe(true);
});

const contact = (id: string): Contact => ({ id, name: "客户甲", initials: "客", company: "渠道公司", role: "", region: "", email: "a@example.com", tag: "客户", summary: "", count: 0, recent: "", themes: [], memories: [], inferences: [] });
const source = (id: string, channel: CustomerSource["channel"], extra = {}): CustomerSource => ({ id, channel, fields: { name: "客户甲", company: "渠道公司" }, verifiedEmail: "a@example.com", updatedAt: "2026-10-09T10:00:00Z", ...extra });
const empty = (): ContactsState => ({ contacts: [], notes: {}, tasks: [] });
test("same account deduplicates channels and CRM wins regardless of import order, preserving evidence", () => {
  for (const crmFirst of [true, false]) {
    const state = empty();
    const crm = source("CRM-1", "crm", { crmId: "C1", crmSystem: "demo", fields: { name: "客户甲", company: "CRM公司" } });
    const meeting = source("M1", "meeting");
    for (const item of crmFirst ? [crm, meeting] : [meeting, crm]) ingestCustomer(state, contact(item.id), item);
    expect(state.contacts).toHaveLength(1);
    const p = state.contacts[0]; expect(p.company).toBe("CRM公司"); expect(p.sources).toHaveLength(2);
    editCustomer(p, { company: "手工修正" });
    expect(p.company).toBe("CRM公司"); expect(p.sourceConflicts?.some((c) => c.value === "手工修正")).toBe(true);
    ingestCustomer(state, contact("retry"), meeting); expect(p.sources).toHaveLength(3);
  }
});
test("same CRM or email across members never merges their records, relationships or export", () => {
  const state = empty(), crm = source("crm", "crm", { crmId: "C1", crmSystem: "demo" });
  const a = ingestCustomer(state, contact("a"), crm, "zhang");
  const b = ingestCustomer(state, { ...contact("b"), memories: ["另一成员私有记忆"] }, crm, "lin");
  expect(state.contacts).toHaveLength(2); expect(a.memories).toEqual([]); expect(b.memories).toHaveLength(1);
  const payload = customerPayload(a, "zhang"); expect(payload.ownerAccountId).toBe("zhang"); expect(payload.mergeAcrossMembers).toBe(false);
  expect(() => customerPayload(b, "zhang")).toThrow(); expect(() => editCustomer(b, { company: "串账号" }, "zhang")).toThrow();
});
test("name-only or unverified email is not merged; CRM failure and ambiguous identity retain input", () => {
  const s = empty();
  ingestCustomer(s, contact("1"), source("s1", "meeting", { verifiedEmail: undefined }));
  ingestCustomer(s, contact("2"), source("s2", "thought", { verifiedEmail: undefined }));
  expect(s.contacts).toHaveLength(2);
  expect(() => ingestCustomer(s, contact("3"), source("s3", "manual"), "zhang", "unavailable")).toThrow("不可用");
  expect(s.contacts).toHaveLength(2);
  s.contacts[0].sources![0].verifiedEmail = "a@example.com"; s.contacts[1].sources![0].verifiedEmail = "a@example.com";
  expect(() => ingestCustomer(s, contact("3"), source("s3", "manual"))).toThrow("歧义");
});
test("contact persistence isolates members without erasing legacy notes or rewriting another member", () => {
  const storage = memory();
  const a = createContacts(storage, "zhang");
  a.change((s) => ingestCustomer(s.personal, contact("own"), source("own", "manual"), "zhang"));
  const before = JSON.parse(storage.getItem("baizhi-v14-contacts")!).personal;
  const b = createContacts(storage, "lin");
  expect(b.read().personal.contacts).toHaveLength(0);
  b.change((s) => ingestCustomer(s.personal, contact("other"), source("other", "manual"), "lin"));
  expect(JSON.parse(storage.getItem("baizhi-v14-contacts")!).personal).toEqual(before);
  expect(createContacts(storage, "zhang").read().personal.contacts.some((c) => c.id === "other")).toBe(false);
});

test("default private content, explicit recipient invitations, revocation and admin boundaries", () => {
  const s = M.seed(), w = M.get(s, "team-eureka");
  const before = w.files.length;
  expect(M.sync(s, "dev-personal").sharedTeam).toBeUndefined();
  expect(M.syncThought(s, "dev-personal").sharedTeam).toBeUndefined();
  expect(w.files).toHaveLength(before);
  const file = M.addFile(w, { title: "保密讨论", summary: "仅我可见", source: "笔记" }, "kevin");
  expect(M.visible(w, "zhang").some(f => f.id === file.id)).toBe(false);
  expect(() => M.getFile(w, file.id, "zhang")).toThrow();
  expect(() => M.share(w, file.id, ["lin"], "zhang")).toThrow();
  M.share(w, file.id, ["lin"], "kevin");
  expect(M.visible(w, "lin").some(f => f.id === file.id)).toBe(true);
  expect(M.visible(w, "zhang").some(f => f.id === file.id)).toBe(false);
  M.share(w, file.id, [], "kevin");
  expect(() => M.getFile(w, file.id, "lin")).toThrow();
  expect(w.audit.some(entry => entry.action.includes("保密讨论"))).toBe(false);
  expect(() => M.unbind(s, "dev-team", "zhang")).toThrow();
  expect(() => M.setDeviceSharing(s, w.id, "lin", "meetings", true, ["kevin"], "zhang")).toThrow();
  expect(() => M.registerDevice(s, w.id, { serial: "foreign", model: "W2", user: "lin" }, "zhang")).toThrow();
});
test("meeting-only switch, fixed recording destination, no backfill and no future member grants", () => {
  const s = M.seed(), w = M.get(s, "team-eureka");
  const before = w.files.length;
  const privateFile = M.sync(s, "dev-personal");
  expect(() => M.setDeviceSharing(s, w.id, "zhang", "meetings", true, [])).toThrow();
  M.setDeviceSharing(s, w.id, "zhang", "meetings", true, ["lin"]);
  expect(w.files).toHaveLength(before);
  rebind(s, w.id);
  const captured = M.sync(s, "dev-personal");
  const snapshot = w.files.find(f => f.id === captured.file.id)!;
  expect(snapshot.shared).toEqual(["lin"]);
  expect(w.files.some(f => f.sourceFileId === privateFile.file.id)).toBe(false);
  expect(M.syncThought(s, "dev-personal").sharedTeam).toBeUndefined();
  expect(M.visible(w, "kevin").some(f => f.id === snapshot.id)).toBe(false);
  M.setDeviceSharing(s, w.id, "zhang", "meetings", false, []);
  expect(M.sync(s, "dev-personal").sharedTeam).toBeUndefined();
  expect(M.visible(w, "lin").some(f => f.id === snapshot.id)).toBe(true);
  rebind(s, w.id);
  M.get(s, "personal"); M.deviceList(s, "personal"); M.enrich(s);
  const teamCapture = M.sync(s, "dev-personal");
  expect(teamCapture.space.id).toBe(w.id);
  expect(teamCapture.file.shared).toEqual([]);
  expect(M.get(s, "personal").files.some(f => f.id === teamCapture.file.id)).toBe(false);
  const personal = M.get(s, "personal"), thought = M.addThought(personal, { title: "私有想法", detail: "想法详情" });
  expect(M.visibleThoughts(w, "lin")).toEqual([]);
  expect(() => M.shareThought(personal, thought.id, ["lin"])).toThrow(/不参与共享/);
  expect(() => M.addThought(w, { title: "旧团队页面", detail: "" })).toThrow(/个人工作区/);

});
test("workspace contacts stay separate even for the same verified CRM identity, including after removal", () => {
  const storage = memory(); storage.setItem(M.KEY, JSON.stringify(M.seed()));
  const personal = createContacts(storage);
  personal.change(s => ingestCustomer(s.personal, contact("personal-only"), source("same", "crm", { crmId: "C1", crmSystem: "demo" })));
  const team = createContacts(storage, "zhang", "team-eureka");
  expect(team.read().personal.contacts).toHaveLength(0);
  team.change(s => ingestCustomer(s.personal, { ...contact("team-only"), company: "团队档案" }, source("same", "crm", { crmId: "C1", crmSystem: "demo" })));
  expect(createContacts(storage).read().personal.contacts.some(c => c.id === "team-only")).toBe(false);
  expect(createContacts(storage, "lin", "team-eureka").read().personal.contacts).toHaveLength(0);
  createWorkspaceStore(storage).change(s => M.memberAction(s, M.get(s, "team-eureka"), "zhang", "remove", undefined, "lin"));
  expect(() => team.change(s => { s.personal.contacts = []; })).toThrow("访问权限");
  expect(createContacts(storage).read().personal.contacts.some(c => c.id === "personal-only")).toBe(true);
});
