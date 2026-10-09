import { test, expect } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import { createContacts, type Contact } from "../../src/features/personal/store";
import { createWorkspaceStore } from "../../src/features/spaces/model/store";
const memory = () => { const values = new Map<string, string>(); return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } } as Storage; };
export const customer = (ownerId: string, company = ownerId): Contact => ({ id: "same-id", ownerId, name: "同一客户", company, role: "采购", summary: "客户资料", initials: "客", email: "same@example.com", tag: "客户", count: 0, recent: "", region: "上海", subjectType: "enterprise", createdAt: "2026-10-09", themes: [], memories: [], inferences: [], sources: [{ id: "same-crm-source", channel: "crm", crmSystem: "demo", crmId: "same-crm-id", fields: { company }, updatedAt: "2026-10-09" }] });
const scope = (c: Contact) => ({ contacts: [c], notes: { [c.id]: [{ text: c.company + "的备注", time: "2026-10-09" }] }, tasks: [] });
test.beforeEach(() => Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent() {} } }));
test.afterEach(() => Reflect.deleteProperty(globalThis, "window"));

test("all-member sharing shows owned plus shared records without deduplicating IDs or CRM identities", () => {
  const storage = memory(), s = M.seed(), w = M.get(s, "team-eureka");
  M.setCustomerSharing(s, w.id, true, "lin");
  storage.setItem(M.KEY, JSON.stringify(s));
  const all = { personal: scope(customer("zhang", "个人区")), "workspace:team-eureka:account:zhang": scope(customer("zhang", "张伟公司")), "workspace:team-eureka:account:lin": scope(customer("lin", "林晓公司")), "workspace:team-design:account:lin": scope(customer("lin", "另一区")) };
  storage.setItem("baizhi-v14-contacts", JSON.stringify(all));
  const own = createContacts(storage, "zhang", w.id), other = createContacts(storage, "lin", w.id);
  expect(own.readVisible().personal.contacts.map(c => c.company)).toEqual(["张伟公司", "林晓公司"]);
  expect(other.readVisible().personal.contacts.map(c => c.company)).toEqual(["林晓公司"]);
  expect(own.readVisible().personal.notes["lin:same-id"][0].text).toBe("林晓公司的备注");
  expect(own.read().personal.contacts).toHaveLength(1);
  createWorkspaceStore(storage).change(state => M.setCustomerSharing(state, w.id, true));
  expect(other.readVisible().personal.contacts).toHaveLength(2);
  createWorkspaceStore(storage).change(state => M.setCustomerSharing(state, w.id, false));
  expect(other.readVisible().personal.contacts).toHaveLength(1);
  expect(own.readVisible().personal.contacts).toHaveLength(2);
  expect(createContacts(storage).readVisible().personal.contacts.map(c => c.company)).toEqual(["个人区"]);
  expect(JSON.parse(storage.getItem("baizhi-v14-contacts")!)).toEqual(all);
});

test("closure, removal and failed persistence cannot expose or rewrite another owner's customers", () => {
  const storage = memory(), s = M.seed(), w = M.get(s, "team-eureka");
  M.setCustomerSharing(s, w.id, true, "kevin"); storage.setItem(M.KEY, JSON.stringify(s));
  storage.setItem("baizhi-v14-contacts", JSON.stringify({ "workspace:team-eureka:account:kevin": scope(customer("kevin")) }));
  const viewer = createContacts(storage, "zhang", w.id);
  expect(viewer.readVisible().personal.contacts).toHaveLength(1);
  expect(() => viewer.change(all => all.personal.contacts.push(customer("kevin")))).toThrow(/其他成员/);
  createWorkspaceStore(storage).change(state => M.memberAction(state, M.get(state, w.id), "kevin", "remove"));
  expect(viewer.readVisible().personal.contacts).toHaveLength(0);
  expect(createWorkspaceStore(storage).read().spaces.find(v => v.id === w.id)?.customerSharing?.kevin).toBeUndefined();
  const repo = createWorkspaceStore(storage), before = storage.getItem(M.KEY);
  storage.setItem = () => { throw Error("quota"); };
  expect(() => repo.change(state => M.setCustomerSharing(state, w.id, true))).toThrow(/保存失败/);
  expect(storage.getItem(M.KEY)).toBe(before);
});

test("legacy invited customer snapshots cannot bypass the new switch or confer editing", () => {
  const s = M.seed(), w = M.get(s, "team-eureka"), file = M.addFile(w, { title: "旧客户快照", source: "联系人" });
  file.shared = ["lin"]; file.editors = ["lin"];
  expect(() => M.getFile(w, file.id, "lin")).toThrow(/访问权限/);
  expect(M.canEdit(w, file, "lin")).toBe(false);
  expect(() => M.share(w, file.id, ["lin"])).toThrow(/内容权限/);
  expect(() => M.setCustomerSharing(s, "personal", true)).toThrow(/团队/);
  w.status = "expired"; expect(() => M.setCustomerSharing(s, w.id, true)).toThrow(/只读/);
});
