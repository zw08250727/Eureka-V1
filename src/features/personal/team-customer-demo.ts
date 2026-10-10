import { createWorkspaceStore, M } from "@/features/spaces/model/store";
import type { Contact, ContactsState } from "./store";

const CONTACTS_KEY = "baizhi-v14-contacts";
// Populate only the built-in example teams, never teams created by the user.
export function ensureTeamCustomerDemo(storage: Storage, workspaceId: string, actor: string) {
  if (workspaceId === "personal") return;
  const repository = createWorkspaceStore(storage), state = repository.read();
  const w = M.get(state, workspaceId);
  const growth = w.members.some(m => m.id === "wang" && m.email === "wang.chen@eureka.example") &&
    (state.invitations.some(i => i.id === "invite-growth" && i.workspaceId === w.id) || w.name === "增长研究小组");
  if (!(growth || ["team-eureka", "team-design"].includes(w.id)) || w.customerDemoVersion || w.status !== "active" || !M.member(w, actor)) return;
  const raw = storage.getItem(CONTACTS_KEY);
  const data: Record<string, ContactsState> = raw ? JSON.parse(raw) : {};
  if (!data || typeof data !== "object" || Array.isArray(data)) throw Error("客户数据格式无效，请保留浏览器数据后重试");
  const prefix = `workspace:${w.id}:account:`;
  for (const [key, scope] of Object.entries(data)) {
    if (key.startsWith(prefix) && (!scope || !Array.isArray(scope.contacts) || !scope.notes || !Array.isArray(scope.tasks)))
      throw Error("客户数据格式无效，请保留浏览器数据后重试");
  }
  // Existing customer collections and their sharing choices must remain untouched.
  if (Object.entries(data).some(([key, scope]) => key.startsWith(prefix) && scope.contacts?.length)) return;
  for (const [index, member] of w.members.filter(m => m.status === "active").entries()) {
    const companies = growth ? ["远帆零售", "青禾生活", "知行教育"] : ["星海智能科技", "云帆制造", "启明数科"];
    const company = companies[index % companies.length];
    const people = growth ? ["陈思宁", "顾言", "许知夏"] : ["周宁", "李嘉禾", "赵安然"];
    const templates = [
      { name: company, subjectType: "enterprise" as const, company, role: growth ? "零售与消费" : "企业服务", channel: "crm" as const, summary: "计划在两个业务团队开展试点，重点关注客户跟进记录、协作权限和 CRM 数据衔接。" },
      { name: people[index % people.length], subjectType: "person" as const, company, role: "业务负责人", channel: "manual" as const, summary: "负责试点方案与内部协调，偏好先确认业务目标，再安排产品演示和评估。" },
      { name: growth ? "晨光品牌工作室" : "星海智能科技", subjectType: "enterprise" as const, company: growth ? "晨光品牌工作室" : "星海智能科技", role: "商务合作", channel: "agent" as const, summary: `由 ${member.name} 跟进合作需求，关注实施周期和资料共享；与其他成员的同名客户分别保留。` },
    ];
    const contacts: Contact[] = templates.map((item, i) => ({
      ...item, id: `demo-customer-${member.id}-${i + 1}`, ownerId: member.id,
      sharedWith: member.id === state.account.id ? [] : w.members.filter(m => m.status === "active" && m.role !== "admin" && m.id !== member.id).map(m => m.id),
      initials: item.name.slice(0, 2), tag: "示例客户", count: 0, recent: "", region: ["上海", "杭州", "深圳"][index % 3],
      email: `customer-${member.id}-${i + 1}@example.com`, createdAt: `2026-10-0${8 - i}T0${9 - index}:30:00+08:00`,
      themes: [], memories: [], inferences: [],
      sources: [{ id: `demo-source-${member.id}-${i + 1}`, channel: item.channel, fields: { name: item.name, company: item.company }, updatedAt: "2026-10-08", ...(item.channel === "crm" ? { crmId: `DEMO-${index + 1}`, crmSystem: "演示 CRM" } : {}) }],
    }));
    data[prefix + member.id] = { ...(data[prefix + member.id] || {}), itemSharingVersion: 1, contacts, notes: data[prefix + member.id]?.notes || {}, tasks: data[prefix + member.id]?.tasks || [] };
    // Only fictional colleagues with no prior choice start with shared demo records.
  }
  const updated = JSON.stringify(data);
  try {
    storage.setItem(CONTACTS_KEY, updated);
    repository.change(s => { const target = M.get(s, workspaceId); target.customerDemoVersion = 1; });
  } catch (error) {
    if (storage.getItem(CONTACTS_KEY) === updated) {
      if (raw === null) storage.removeItem(CONTACTS_KEY); else storage.setItem(CONTACTS_KEY, raw);
    }
    throw error;
  }
}
