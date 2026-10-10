import { contactPromises } from "./contact-rules";
import type { Contact, ContactsState } from "./store";

export const customerFields = ["name", "company", "role", "region", "email", "phone", "tag", "summary"] as const;
export type CustomerField = (typeof customerFields)[number];
export const channelNames = { manual: "手动创建", meeting: "手动创建", thought: "手动创建", agent: "手动创建", crm: "CRM 系统导入", phone: "手机通讯录导入" };
export const customerSourceFilters = { manual: "手动创建", crm: "CRM 系统导入", phone: "手机通讯录导入" };
export interface CustomerSource {
  id: string;
  channel: keyof typeof channelNames;
  fields: Partial<Record<CustomerField, string>>;
  verifiedEmail?: string;
  verifiedPhone?: string;
  crmId?: string;
  crmSystem?: string;
  updatedAt: string;
}
const emailKey = (value = "") => value.trim().toLowerCase();
const meaningful = (value?: string) => !!value?.trim() && value !== "待补充";
const sourceKey = (s: CustomerSource) => `${s.channel}:${s.crmSystem || ""}:${s.id}`;
const owned = (p: Contact, actor: string) => (p.ownerId || "zhang") === actor;

function applySources(person: Contact) {
  const sources = person.sources || [];
  person.fieldSources ||= {};
  person.sourceConflicts = [];
  for (const field of customerFields) {
    const candidates = sources.filter((s) => meaningful(s.fields[field]));
    // A CRM value is authoritative regardless of import order. Missing CRM fields are not inferred.
    const chosen = candidates.findLast((s) => s.channel === "crm") || candidates.findLast((s) => s.channel === "manual") || candidates.at(-1);
    if (!chosen) continue;
    person[field] = chosen.fields[field]!;
    person.fieldSources[field] = sourceKey(chosen);
    for (const source of candidates) {
      if (source.fields[field] !== chosen.fields[field])
        person.sourceConflicts.push({ field, value: source.fields[field]!, source: sourceKey(source) });
    }
  }
  person.initials = person.name.slice(0, 2);
}

/** No name-only matching and no matching across account boundaries, including CRM IDs. */
export function ingestCustomer(
  state: ContactsState,
  incoming: Contact,
  source: CustomerSource,
  actor = "zhang",
  crmState: "ready" | "unavailable" = "ready",
) {
  if (incoming.ownerId && incoming.ownerId !== actor) throw Error("不能写入其他成员的客户档案");
  if (crmState === "unavailable") throw Error("CRM 数据不可用，请核实后重试；不能按无客户数据处理");
  if (!source.id.trim()) throw Error("请填写来源记录编号");
  if (source.channel === "crm" && (!source.crmId?.trim() || !source.crmSystem?.trim()))
    throw Error("请填写 CRM 系统及客户编号");
  const email = emailKey(source.verifiedEmail);
  const phone = (source.verifiedPhone || "").replace(/[\s()-]/g, "");
  if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) throw Error("手机号格式无效");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("已核实邮箱格式无效");
  const matches = state.contacts.filter((p) => owned(p, actor) && (!p.previousOwnerId || p.previousOwnerId === actor) && (p.subjectType || "person") === (incoming.subjectType || "person") && (p.sources || []).some((s) =>
    sourceKey(s) === sourceKey(source) ||
    (email && emailKey(s.verifiedEmail) === email) ||
    (phone && (s.verifiedPhone || "").replace(/[\s()-]/g, "") === phone) ||
    (source.crmId && source.crmSystem && s.crmId === source.crmId && s.crmSystem === source.crmSystem),
  ));
  if (matches.length > 1) throw Error("身份匹配存在歧义，请核实客户档案后重试");
  const target = matches[0] || incoming;
  const existingCRM = (target.sources || []).filter((s) => s.crmId && s.crmSystem);
  if (source.crmId && existingCRM.some((s) => s.crmSystem === source.crmSystem && s.crmId !== source.crmId))
    throw Error("同一身份匹配到不同 CRM 客户，请先核实");
  if (matches.length) {
    // All merges stay inside this account; repeated evidence IDs contribute only once.
    const unique = <T extends { id: string }>(a: T[] = [], b: T[] = []) =>
      [...new Map([...a, ...b].map((item) => [item.id, item])).values()];
    target.interactions = unique(target.interactions, incoming.interactions);
    if (incoming.promises) target.promises = unique(contactPromises(target), incoming.promises);
    target.themes = [...new Set([...target.themes, ...incoming.themes])];
    target.memories = [...new Set([...target.memories, ...incoming.memories])];
    target.inferences = [...new Set([...target.inferences, ...incoming.inferences])];
  }
  target.subjectType ||= incoming.subjectType || "person";
  target.createdAt ||= incoming.createdAt || source.updatedAt;
  target.ownerId = actor;
  target.sources ||= [];
  const index = target.sources.findIndex((s) => sourceKey(s) === sourceKey(source));
  if (index >= 0) target.sources[index] = structuredClone(source);
  else target.sources.push(structuredClone(source));
  applySources(target);
  target.updatedAt = source.updatedAt;
  if (!matches.length) state.contacts.push(target);
  return target;
}

export function editCustomer(person: Contact, values: Partial<Record<CustomerField, string>>, actor = "zhang") {
  if (!owned(person, actor)) throw Error("不能编辑其他成员的客户档案");
  // Keep the correction as evidence; it must not silently replace CRM-owned fields.
  const source: CustomerSource = {
    id: `manual-edit:${person.id}`, channel: "manual", fields: values, updatedAt: new Date().toISOString(),
  };
  person.sources ||= [];
  person.sources = person.sources.filter((s) => s.id !== source.id);
  person.sources.push(source);
  person.confirmedFields = [...customerFields];
  applySources(person);
}

export function customerPayload(person: Contact, actor = "zhang") {
  if (!owned(person, actor)) throw Error("不能推送其他成员的客户档案");
  return {
    ownerAccountId: actor, contactId: person.id,
    fields: Object.fromEntries(customerFields.map((field) => [field, person[field]])),
    sources: structuredClone(person.sources || []),
    mergeAcrossMembers: false,
  };
}
