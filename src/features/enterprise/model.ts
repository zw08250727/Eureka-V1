import { marketStorage } from "@/features/markets/storage";

// Local fixtures; production identity verification belongs to the enterprise service.
export const enterprise = {
  code: "100001", name: "青禾科技", realm: "baizhi-enterprise:100001",
  members: [{ name: "林晓", phone: "13800138000", email: "lin@qinghe.example" }],
};
const sessionKey = "enterprise:auth:v1";
export type EnterpriseIdentity = { realm: string; code: string; identity: string; name: string };
export function enterpriseMember(identity: string) {
  return enterprise.members.find(member => member.phone === identity || member.email === identity.toLowerCase());
}
export function signInEnterprise(code: string, identity: string, storage: Storage = marketStorage) {
  const member = enterpriseMember(identity);
  if (code !== enterprise.code || !member) throw new Error("该账号不在企业成员名单中，请联系企业管理员。");
  const session: EnterpriseIdentity = { realm: enterprise.realm, code, identity: member.email, name: member.name };
  storage.setItem(sessionKey, JSON.stringify(session));
}
export function readEnterpriseIdentity(storage: Storage = marketStorage): EnterpriseIdentity | null {
  try {
    const session = JSON.parse(storage.getItem(sessionKey) || "null");
    return session?.realm === enterprise.realm && session?.code === enterprise.code && enterpriseMember(session?.identity || "") ? session : null;
  } catch { return null; }
}
export function signOutEnterprise(storage: Storage = marketStorage) { storage.removeItem(sessionKey); }
export const enterpriseTasksKey = (identity: EnterpriseIdentity) => `enterprise:${identity.code}:${identity.identity}:tasks:v1`;
export type EnterpriseTask = { id: string; title: string; done: boolean };
