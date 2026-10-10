import { expect, test } from "@playwright/test";
import { meetingKeywords, type CustomerMeeting } from "../../src/features/personal/contact-insights";
import M from "../../src/features/spaces/model/core";
import { createActions, createContacts, type Contact, type ContactsState } from "../../src/features/personal/store";
import { ingestCustomer } from "../../src/features/personal/contact-identity";
import type { ActionRecord } from "../../src/features/workbench/model/types";
const memory = () => { const entries = new Map<string, string>(); return { getItem: (k: string) => entries.get(k) ?? null, setItem: (k: string, v: string) => { entries.set(k, v); }, removeItem: (k: string) => { entries.delete(k); }, clear: () => entries.clear(), key: (i: number) => [...entries.keys()][i] || null, get length() { return entries.size; } } satisfies Storage; };
const draft = (): ActionRecord => ({ id: "", contactId: "client-a", type: "schedule", title: "Private followup", start: "2026-10-10T09:00", end: "2026-10-10T10:00", done: false, source: "manual", notes: "", reminder: "none", location: "", participants: "Client", created: "", updated: "", links: [] });
test.beforeAll(() => Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent() {} } }));
test.afterAll(() => Reflect.deleteProperty(globalThis, "window"));

test("team schedules retain original scope and owner; expiry and removal reject stale writes", () => {
  const storage = memory(), state = M.seed();
  storage.setItem(M.KEY, JSON.stringify(state));
  storage.setItem("eureka:actions:team-eureka:zhang:v1", JSON.stringify({ version: 1, records: [{ ...draft(), id: "legacy-team" }], meetings: [], sessions: [], settings: {} }));
  const team = createActions(storage, () => new Date(), "zhang", "team-eureka");
  expect(team.read().records[0].id).toBe("legacy-team");
  const saved = team.save(draft());
  expect(team.read().records).toHaveLength(2);
  expect(createActions(storage, () => new Date(), "lin", "team-eureka").read().records).toEqual([]);
  expect(createActions(storage).read().records.some(r => r.id === saved.id || r.id === "legacy-team")).toBe(false);
  state.spaces.find(w => w.id === "team-eureka")!.status = "expired";
  storage.setItem(M.KEY, JSON.stringify(state));
  expect(team.read().records).toHaveLength(2);
  expect(() => team.save({ ...saved, done: true })).toThrow(/只读/);
  state.spaces.find(w => w.id === "team-eureka")!.status = "active";
  M.memberAction(state, M.get(state, "team-eureka"), "zhang", "remove", undefined, "lin");
  storage.setItem(M.KEY, JSON.stringify(state));
  expect(() => team.read()).toThrow(/访问权限/);
  expect(() => team.save(saved)).toThrow(/访问权限/);
});

test("customer identity does not merge a company with a person, and keeps original creation date", () => {
  const state: ContactsState = { contacts: [], notes: {}, tasks: [] };
  const customer = (id: string, subjectType: "person" | "enterprise"): Contact => ({ id, subjectType, name: "Same Name", company: "", role: "", region: "", email: "", summary: "", tag: "", count: 0, recent: "", initials: "S", themes: [], memories: [], inferences: [], createdAt: "2026-01-01" });
  const source = { id: "crm-1", channel: "crm" as const, fields: { name: "Same Name" }, crmSystem: "Demo", crmId: "ID-1", updatedAt: "2026-10-01" };
  ingestCustomer(state, customer("person", "person"), source);
  ingestCustomer(state, customer("company", "enterprise"), source);
  expect(state.contacts).toHaveLength(2);
  ingestCustomer(state, { ...customer("again", "person"), createdAt: "2026-10-01" }, source);
  expect(state.contacts).toHaveLength(2);
  expect(state.contacts[0].createdAt).toBe("2026-01-01");
});

test("demo migration preserves edited personal fields and does not seed empty team/customer data", () => {
  const storage = memory();
  storage.setItem(M.KEY, JSON.stringify(M.seed()));
  const original = createContacts(storage).read().personal;
  const john = original.contacts.find((p) => p.id === "john")!;
  john.company = "Manually edited company"; delete john.sources;
  storage.setItem("baizhi-v14-contacts", JSON.stringify({ personal: original }));
  const migrated = createContacts(storage).read().personal.contacts.find((p) => p.id === "john")!;
  expect(migrated.company).toBe("Manually edited company");
  expect(migrated.sources?.[0].fields.company).toBe("Manually edited company");
  expect(createContacts(storage, "zhang", "team-eureka").read().personal.contacts).toHaveLength(0);
  storage.setItem("baizhi-v14-contacts", JSON.stringify({ personal: { contacts: [], notes: {}, tasks: [] } }));
  expect(createContacts(storage).read().personal.contacts).toHaveLength(0);
});

test("keywords count distinct meetings, normalize synonyms and break frequency ties by recency", () => {
  const m = (id: string, date: string, themes: string[]): CustomerMeeting => ({ id, title: id, summary: "", occurredAt: date, verifiedParticipation: true, sourceAvailable: true, themes });
  const first = m("one", "2026-09-01", ["Pilot", "试点", "认证"]);
  const result = meetingKeywords([first, first, m("two", "2026-10-01", ["试点", "交期", "交付周期"])]);
  expect(result).toEqual([
    { word: "试点", count: 2, latest: "2026-10-01" },
    { word: "交付周期", count: 1, latest: "2026-10-01" },
    { word: "认证", count: 1, latest: "2026-09-01" },
  ]);
});
