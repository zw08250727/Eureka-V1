import { marketStorage } from "@/features/markets/storage";

// Local fixtures; production identity verification belongs to the enterprise service.
export type EnterpriseTenant = { code: string; name: string; realm: string; members: { name: string; phone: string; email: string }[] };
export const enterprise: EnterpriseTenant = {
  code: "bairong", name: "百融智能", realm: "baizhi-enterprise:bairong",
  members: [{ name: "林晓", phone: "13800138000", email: "lin@bairong.example" }],
};
// Preserve the original fixture and its stored records; do not migrate user data.
const legacyEnterprise: EnterpriseTenant = {
  code: "100001", name: "青禾科技", realm: "baizhi-enterprise:100001",
  members: [{ name: "林晓", phone: "13800138000", email: "lin@qinghe.example" }],
};
export function findEnterprise(code: string) {
  return [enterprise, legacyEnterprise].find(tenant => tenant.code === code.trim().toLowerCase());
}
const sessionKey = "enterprise:auth:v1";
export type EnterpriseIdentity = { realm: string; code: string; identity: string; name: string };
export function enterpriseMember(identity: string, tenant = enterprise) {
  return tenant.members.find(member => member.phone === identity || member.email === identity.toLowerCase());
}
export function signInEnterprise(code: string, identity: string, storage: Storage = marketStorage) {
  const tenant = findEnterprise(code);
  const member = tenant && enterpriseMember(identity, tenant);
  if (!tenant || !member) throw new Error("该账号不在企业成员名单中，请联系企业管理员。");
  const session: EnterpriseIdentity = { realm: tenant.realm, code: tenant.code, identity: member.email, name: member.name };
  storage.setItem(sessionKey, JSON.stringify(session));
}
export function readEnterpriseIdentity(storage: Storage = marketStorage): EnterpriseIdentity | null {
  try {
    const session = JSON.parse(storage.getItem(sessionKey) || "null");
    const tenant = typeof session?.code === "string" ? findEnterprise(session.code) : undefined;
    const member = tenant && typeof session?.identity === "string" ? enterpriseMember(session.identity, tenant) : undefined;
    return tenant && member && session.realm === tenant.realm ? { ...session, name: member.name } : null;
  } catch { return null; }
}
export function signOutEnterprise(storage: Storage = marketStorage) { storage.removeItem(sessionKey); }
export const enterpriseTasksKey = (identity: EnterpriseIdentity) => `enterprise:${identity.code}:${identity.identity}:tasks:v1`;
export type EnterpriseTask = { id: string; title: string; done: boolean };
