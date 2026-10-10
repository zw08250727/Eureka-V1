import { createWorkspaceStore, M } from "@/features/spaces/model/store";
import type { CustomerSource, CustomerField } from "./contact-identity";
import type { ContactPromise, ContactInteraction } from "./contact-rules";
import { ledgerCurrency, ledgerDate, localDay } from "./asset-rules";
import {
  fillWeekActions,
  fillWeekThoughts,
  type WeekThoughtState,
} from "@/features/workbench/model/demo-week";
import {
  seedActions,
  seedThoughts,
} from "@/features/workbench/model/local-repository";
import type {
  ActionRecord,
  ActionState,
  ThoughtRecord,
} from "@/features/workbench/model/types";
import contactSeeds from "./contact-seeds.json";
export interface Contact {
  phone?: string;
  sharedWith?: string[];
  previousOwnerId?: string;
  transferredAt?: string;
  detailDemoVersion?: number;
  subjectType?: "enterprise" | "person";
  createdAt?: string;
  ownerId?: string;
  sources?: CustomerSource[];
  fieldSources?: Partial<Record<CustomerField, string>>;
  sourceConflicts?: { field: CustomerField; value: string; source: string }[];
  id: string;
  initials: string;
  name: string;
  role: string;
  company: string;
  summary: string;
  tag: string;
  count: number;
  recent: string;
  region: string;
  email: string;
  timeline?: string[][];
  commitments?: string[][];
  promises?: ContactPromise[];
  interactions?: ContactInteraction[];
  confirmedFields?: string[];
  memoryConfirmations?: Record<string, string>;
  updatedAt?: string;
  myCommitments?: string[][];
  themes: string[];
  memories: string[];
  inferences: string[];
}
export interface ContactsState {
  itemSharingVersion?: number;
  customerDemoVersion?: number;
  contacts: Contact[];
  notes: Record<string, { text: string; time: string }[]>;
  tasks: {
    id: string;
    contactId: string;
    title: string;
    description: string;
    owner: string;
    createdAt: string;
  }[];
}
export function createJsonStore<T>(
  storage: Storage,
  key: string,
  seed: () => T,
  validate: (v: unknown) => boolean,
  normalize: (v: T) => T = (v) => v,
) {
  let raw = storage.getItem(key);
  function parse(): T {
    const value = raw === null ? seed() : JSON.parse(raw);
    if (!validate(value)) throw Error("数据格式无效，请保留浏览器数据后重试");
    return normalize(value as T);
  }
  let data = parse();
  return {
    read: () => structuredClone(data),
    change<R>(fn: (s: T) => R): R {
      if (storage.getItem(key) !== raw)
        throw Error("另一页面已更新，请保留输入并刷新后重试");
      const next = structuredClone(data),
        result = fn(next),
        value = JSON.stringify(next);
      try {
        storage.setItem(key, value);
      } catch {
        throw Error("保存失败，输入已保留，请检查浏览器存储");
      }
      raw = value;
      data = next;
      window.dispatchEvent(new Event("eureka:data"));
      return result;
    },
  };
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const d = new Date(value + ":00+08:00");
  return (
    Number.isFinite(+d) &&
    new Date(+d + 8 * 3600000).toISOString().slice(0, 16) === value
  );
}
export const reminders = [
  ["none", "不提醒"],
  ["0", "开始时"],
  ["5", "提前 5 分钟"],
  ["15", "提前 15 分钟"],
  ["30", "提前 30 分钟"],
  ["60", "提前 1 小时"],
  ["120", "提前 2 小时"],
  ["1440", "提前 1 天"],
];
export function validateAction(r: ActionRecord) {
  if (!r.title.trim() || r.title.trim().length > 200)
    throw Error("请填写 1–200 字的标题");
  if ((r.type === "schedule" || r.start) && !validDate(r.start))
    throw Error("请选择有效的时间");
  if (r.type === "schedule" && (!validDate(r.end) || r.end <= r.start))
    throw Error("结束时间必须晚于开始时间");
  if (r.notes.length > 2000) throw Error("备注不能超过 2000 字");
  if (!reminders.some(([v]) => v === r.reminder)) throw Error("提醒时间无效");
  if (r.location.length > 300 || r.participants.length > 300)
    throw Error("地点和参与人各不能超过 300 字");
}
export function createActions(storage: Storage, now = () => new Date(), accountId = "zhang", workspaceId = "personal", ownerId = accountId) {
  const legacy = ownerId === "zhang" && workspaceId === "personal";
  const authorize = (write = false) => {
    if (workspaceId === "personal") { if (ownerId !== accountId) throw Error("不能访问其他账号的个人内容"); return; }
    const w = M.get(createWorkspaceStore(storage).read(), workspaceId);
    if (!M.member(w, accountId)) throw Error("没有此工作空间的访问权限");
    if (w.type === "personal" && ownerId !== accountId) throw Error("不能访问他人个人内容");
    if (ownerId !== accountId && !M.member(w, ownerId)) throw Error("成员已移除，资料已移交，请刷新后重新打开");
    if (write && ownerId !== accountId && !M.admin(w, accountId)) throw Error("共享内容为只读，只有本人或管理员可以编辑");
    if (write) M.writable(w);
  };
  const store = createJsonStore<ActionState>(
    storage,
    legacy ? "eureka:personal-actions:v1" : `eureka:actions:${workspaceId}:${ownerId}:v1`,
    () => legacy ? seedActions(now()) : { version: 1, records: [], meetings: [], sessions: [], settings: {} },
    (v) =>
      !!v &&
      typeof v === "object" &&
      "version" in v &&
      v.version === 1 &&
      "records" in v &&
      Array.isArray(v.records),
    (value) => legacy ? fillWeekActions(value, now()) : value,
  );
  return {
    read() {
      authorize(); const data = store.read();
      data.records = data.records.map(r => ({ ...r, ownerId }));
      if (workspaceId !== "personal" && ownerId === accountId) {
        const w = M.get(createWorkspaceStore(storage).read(), workspaceId);
        for (const m of w.members.filter(m => m.status === "active" && m.id !== accountId))
          data.records.push(...createActions(storage, now, accountId, workspaceId, m.id).read().records);
      }
      if(workspaceId!=="personal"&&ownerId!==accountId){
        const w=M.get(createWorkspaceStore(storage).read(),workspaceId);
        if(!M.admin(w,accountId)){data.records=data.records.filter(r=>r.sharedWith?.includes(accountId));data.settings={};data.sessions=[];data.meetings=[];}
      }
      return data;
    },
    share(recordId:string, recipients:string[]){
      authorize(true);
      if(workspaceId==="personal"||ownerId!==accountId)throw Error("只有本人可以共享自己的团队内容");
      const w=M.get(createWorkspaceStore(storage).read(),workspaceId);
      if(recipients.some(id=>id===accountId||!M.member(w,id)))throw Error("请选择当前团队有效成员");
      return store.change(s=>{const r=s.records.find(r=>r.id===recordId);if(!r||r.previousOwnerId)throw Error("不能替其他成员共享内容");r.sharedWith=[...new Set(recipients)];r.updated=now().toISOString();r.revision=(r.revision||0)+1;});
    },
    change<R>(fn: (s: ActionState) => R): R {
      authorize(true);
      return store.change(s => {
        const grants = new Map(s.records.map(r => [r.id, [...(r.sharedWith || [])]]));
        const origins = new Map(s.records.map(r => [r.id, r.previousOwnerId]));
        const result = fn(s);
        for (const record of s.records) { record.sharedWith = grants.get(record.id) || []; record.previousOwnerId = origins.get(record.id); }
        return result;
      });
    },
    session(id: string, prompt: string, draft: ActionRecord) {
      authorize(true);
      return store.change((s) => {
        s.sessions.push({
          id,
          prompt,
          draft,
          created: new Date().toISOString(),
        });
      });
    },
    confirm(sessionId: string, input: ActionRecord) {
      authorize(true);
      return store.change((s) => {
        const session = s.sessions.find((x) => x.id === sessionId);
        if (!session) throw Error("会话不存在，请重新生成草稿");
        if (session.recordId)
          return s.records.find((r) => r.id === session.recordId);
        const r = {
          ...input,
          id: crypto.randomUUID(),
          source: "agent",
          sessionId,
          sharedWith: [],
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          revision: 1,
        };
        validateAction(r);
        s.records.unshift(r);
        session.recordId = r.id;
        return r;
      });
    },
    save(input: ActionRecord): ActionRecord {
      if (input.ownerId && input.ownerId !== ownerId)
        return createActions(storage, now, accountId, workspaceId, input.ownerId).save(input);
      if (input.type === "todo" && !input.start)
        input = { ...input, reminder: "none" };
      authorize(true);
      return store.change((s) => {
        const old = s.records.find((x) => x.id === input.id);
        if (
          old &&
          ((old.revision || 0) !== (input.revision || 0) ||
            input.updated !== old.updated)
        )
          throw Error("记录已更新，请重新打开编辑");
        const r = {
          ...input,
          id: input.id || crypto.randomUUID(),
          title: input.title.trim(),
          sharedWith: old?.sharedWith || [],
          previousOwnerId: old?.previousOwnerId,
          source: old?.source || input.source,
          completedAt: input.done ? (old?.done ? old.completedAt : now().toISOString()) : undefined,
          created: old?.created || new Date().toISOString(),
          updated: new Date().toISOString(),
          revision: (old?.revision || 0) + 1,
        };
        validateAction(r);
        if (old) s.records[s.records.indexOf(old)] = r;
        else s.records.unshift(r);
        return r;
      });
    },
  };
}
export function createThoughts(storage: Storage, now = () => new Date(), accountId = "zhang", workspaceId = "personal", ownerId = accountId) {
  const legacy = ownerId === "zhang" && workspaceId === "personal";
  const authorize = (write = false) => {
    const state = createWorkspaceStore(storage, now).read();
    const w = M.get(state, workspaceId);
    if (!M.member(w, accountId)) throw Error("没有此工作空间的访问权限");
    if (w.type === "personal" && ownerId !== accountId) throw Error("不能访问他人个人内容");
    if (ownerId !== accountId && !M.member(w, ownerId)) throw Error("成员已移除，资料已移交，请刷新后重新打开");
    if (write && ownerId !== accountId && !M.admin(w, accountId)) throw Error("共享内容为只读，只有本人或管理员可以编辑");
    if (write) M.writable(w);
    return w;
  };
  const store = createJsonStore<WeekThoughtState>(
    storage,
    legacy ? "eureka:thoughts:v1" : `eureka:thoughts:${workspaceId}:${ownerId}:v1`,
    () => ({ version: 1, records: legacy ? seedThoughts(now()) : [] }),
    (v) =>
      !!v &&
      typeof v === "object" &&
      "version" in v &&
      v.version === 1 &&
      "records" in v &&
      Array.isArray(v.records),
    (value) => legacy ? fillWeekThoughts(value, now()) : value,
  );
  const workspaceStore = createWorkspaceStore(storage, now);
  return {
    change<R>(fn: (s: WeekThoughtState) => R): R { authorize(true); return store.change(fn); },
    read() {
      const personal = authorize();
      const data = store.read();
      data.records = data.records.map(r => ({ ...r, ownerId }));
      if (ownerId === accountId) {
        data.records = [...M.visibleThoughts(personal, accountId).map(t=>({...t,ownerId:t.owner})), ...data.records];
        if (personal.type === "team") for (const m of personal.members.filter(m => m.status === "active" && m.id !== accountId))
          data.records.push(...createThoughts(storage, now, accountId, workspaceId, m.id).read().records);
      }
      if(ownerId!==accountId&&!M.admin(personal,accountId))data.records=data.records.filter(r=>!r.previousOwnerId&&personal.thoughtSharing?.[ownerId]?.[r.type]?.includes(accountId));
      return data;
    },
    save(input: ThoughtRecord): ThoughtRecord {
      const workspace = authorize(true);
      if (workspace.thoughts?.some((t) => t.id === input.id)) {
        if (!input.title.trim() || input.title.length > 200 || input.detail.length > 5000)
          throw Error("请填写有效标题和内容");
        if (!validDate(input.date + "T" + input.time)) throw Error("日期或时间无效");
        return workspaceStore.change((state) => {
          const current = M.get(state, workspaceId);
          if (!M.member(current, accountId)) throw Error("没有此工作空间的访问权限");
          M.writable(current);
          const thought = current.thoughts!.find((t) => t.id === input.id)!;
          if (thought.owner !== accountId && !M.admin(current, accountId)) throw Error("仅本人或管理员可以修改闪念");
          if (thought.revision !== input.revision) throw Error("记录已更新，请重新打开");
          Object.assign(thought, { title: input.title.trim(), detail: input.detail,
            date: input.date, time: input.time, amount: input.amount, currency: input.currency, direction: input.direction, revision: (thought.revision || 0) + 1, updated: now().toISOString() });
          // Device thoughts keep their workspace and owner; Team admins can manage them.
          return thought;
        });
      }
      if (input.ownerId && input.ownerId !== ownerId)
        return createThoughts(storage, now, accountId, workspaceId, input.ownerId).save(input);
      return store.change((s) => {
        if (!input.title.trim() || input.title.length > 200)
          throw Error("请填写 1–200 字的标题");
        if (input.detail.length > 5000) throw Error("内容最多 5000 字");
        if (!validDate(input.date + "T" + input.time))
          throw Error("日期或时间无效");
        if (
          input.type === "ledger" &&
          (!Number.isFinite(input.amount) ||
            !input.amount ||
            input.amount <= 0 ||
            input.amount > 999999999 ||
            Math.abs(input.amount * 100 - Math.round(input.amount * 100)) >
              0.00001)
        )
          throw Error("请输入大于 0、最多两位小数的金额");
        if (input.type === "ledger") {
          if (ledgerDate(input) && !validDate(ledgerDate(input) + "T12:00"))
            throw Error("请选择有效的收支发生日期");
          if (!/^[A-Z]{3}$/.test(ledgerCurrency(input)))
            throw Error("请填写三位币种代码，例如 CNY、USD");
          if (!["income", "expense"].includes(input.direction || "expense"))
            throw Error("收支方向无效");
        }
        const old = s.records.find((x) => x.id === input.id);
        if (old && (old.revision || 0) !== (input.revision || 0))
          throw Error("记录已更新，请重新打开");
        const r = {
          ...input,
          title: input.title.trim(),
          previousOwnerId: old?.previousOwnerId,
          source: old?.source || "manual",
          capture: old?.capture || "",
          id: input.id || crypto.randomUUID(),
          revision: (old?.revision || 0) + 1,
          updated: new Date().toISOString(),
        };
        if (old) s.records[s.records.indexOf(old)] = r;
        else s.records.unshift(r);
        return r;
      });
    },
  };
}
export function canShareContact(person: Contact, actor: string) {
  return person.ownerId === actor && (person.previousOwnerId || person.ownerId) === actor;
}
export function createContacts(storage: Storage, accountId = "zhang", workspaceId = "personal", ownerId = accountId) {
  const empty = (): ContactsState => ({ contacts: [], notes: {}, tasks: [] });
  const key = workspaceId !== "personal" ? `workspace:${workspaceId}:account:${ownerId}` : ownerId === "zhang" ? "personal" : `account:${ownerId}`;
  const authorize = () => {
    if (workspaceId !== "personal") {
      const w = M.get(createWorkspaceStore(storage).read(), workspaceId);
      if (!M.member(w, accountId)) throw Error("没有此工作空间的访问权限");
      if (w.type === "personal" && ownerId !== accountId) throw Error("不能访问他人个人内容");
    if (ownerId !== accountId && !M.member(w, ownerId)) throw Error("成员已移除，资料已移交，请刷新后重新打开");
    if (ownerId !== accountId && !M.admin(w, accountId)) throw Error("仅管理员可维护其他成员的通讯录");
      return w;
    }
    if (ownerId !== accountId) throw Error("不能访问他人个人工作区");
  };
  const snapshot = storage.getItem("baizhi-v14-contacts");
  const store = createJsonStore<Record<string, ContactsState>>(
    storage, "baizhi-v14-contacts",
    () => ({ personal: { ...empty(), contacts: structuredClone(contactSeeds) as Contact[] } }),
    (v) => !!v && typeof v === "object" && !Array.isArray(v),
    (value) => {
      value.personal ||= { ...empty(), contacts: structuredClone(contactSeeds) as Contact[] };
      value[key] ||= empty();
      if (!value.personal.customerDemoVersion) {
        if (value.personal.contacts.some((p) => p.id === "john" && p.name === "John Chen")) {
          for (const demo of (contactSeeds as Contact[]).filter((p) => p.subjectType === "enterprise"))
            if (!value.personal.contacts.some((p) => p.id === demo.id)) value.personal.contacts.push(structuredClone(demo));
        }
        value.personal.customerDemoVersion = 2;
      }
      for (const [scopeKey, scope] of Object.entries(value)) {
        if (scopeKey !== "personal" && !scopeKey.includes("account:")) continue;
        if (!Array.isArray(scope.contacts) || !Array.isArray(scope.tasks) || !scope.notes)
          throw Error("联系人数据格式无效，请保留浏览器数据后重试");
        const owner = scopeKey === "personal" ? "zhang" : scopeKey.split("account:").pop()!;
        for (const person of scope.contacts) {
          person.ownerId ||= owner;
          person.subjectType ||= "person";
          if (scopeKey === "personal") {
            const demo = (contactSeeds as Contact[]).find((c) => c.id === person.id);
            if (demo) {
              person.createdAt ||= demo.createdAt;
              person.sources ||= demo.sources?.map((source) => ({ ...structuredClone(source), verifiedEmail: source.verifiedEmail === person.email ? source.verifiedEmail : undefined, fields: { name: person.name, company: person.company, role: person.role, region: person.region, email: person.email, tag: person.tag, summary: person.summary } }));
              person.interactions ||= structuredClone(demo.interactions);
            }
          }
        }
      }
      if (workspaceId !== "personal") {
        const w = M.get(createWorkspaceStore(storage).read(), workspaceId);
        for (const m of w.members) {
          const scope = value[`workspace:${workspaceId}:account:${m.id}`];
          if (scope && !scope.itemSharingVersion) {
            for (const p of scope.contacts) p.sharedWith ||= w.customerSharing?.[m.id] ? w.members.filter(x => x.status === "active" && x.id !== m.id && x.role !== "admin").map(x => x.id) : [];
            scope.itemSharingVersion = 1;
          }
        }
      }
      return value;
    },
  );
  return {
    read() {
      authorize();
      const all = store.read();
      const scope = all[key];
      return { personal: { ...scope, contacts: scope.contacts.filter((p) => p.ownerId === ownerId) } };
    },
    readVisible(): { personal: ContactsState } {
      const workspace = authorize();
      if (storage.getItem("baizhi-v14-contacts") !== snapshot) return createContacts(storage, accountId, workspaceId, ownerId).readVisible();
      const all = store.read();
      if (!workspace) return { personal: { ...all[key], contacts: all[key].contacts.filter(p => p.ownerId === ownerId) } };
      const result = empty();
      for (const member of workspace.members.filter(m => m.status === "active")) {
        const scope = all[`workspace:${workspaceId}:account:${member.id}`];
        if (!scope) continue;
        for (const person of scope.contacts.filter(p => p.ownerId === member.id && (member.id === accountId || M.admin(workspace, accountId) || p.sharedWith?.includes(accountId)))) {
          result.contacts.push(person);
          result.notes[`${member.id}:${person.id}`] = scope.notes[person.id] || [];
        }
      }
      return { personal: result };
    },
    change<R>(fn: (s: Record<string, ContactsState>) => R): R {
      const workspace = authorize();
      if (workspace) M.writable(workspace);
      return store.change((all) => {
        const scope = all[key];
        const visible = scope.contacts.filter((p) => p.ownerId === ownerId);
        const hidden = scope.contacts.filter((p) => p.ownerId !== ownerId);
        const originsBefore = new Map(visible.map(p => [p.id, p.previousOwnerId]));
        const grantsBefore = new Map(visible.map(p => [p.id, JSON.stringify([...(p.sharedWith || [])].sort())]));
        const view = { personal: { ...scope, contacts: visible } };
        const result = fn(view);
        for (const person of view.personal.contacts) {
          if (person.ownerId && person.ownerId !== ownerId) throw Error("不能写入其他成员的客户档案");
          person.ownerId = ownerId;
          if (originsBefore.has(person.id)) person.previousOwnerId = originsBefore.get(person.id);
          const shared = person.sharedWith || [];
          const grantsChanged = JSON.stringify([...shared].sort()) !== (grantsBefore.get(person.id) || "[]");
          if (workspace && grantsChanged) {
            if (ownerId !== accountId || (originsBefore.get(person.id) || ownerId) !== accountId) throw Error("仅创建者本人可以管理共享；管理员接管资料不获得代共享权限");
            if (shared.some(id => id === ownerId || !M.member(workspace, id))) throw Error("只能共享给当前团队的有效成员");
          }
        }
        all[key] = { ...view.personal, contacts: [...view.personal.contacts, ...hidden] };
        return result;
      });
    },
  };
}
export function day(value = new Date()) {
  return localDay(value);
}
export function shiftDay(date: string, n: number) {
  return new Date(Date.parse(date + "T12:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function calendarRange(date: string, mode: string) {
  if (mode === "日") return [date];
  const first = mode === "月" ? date.slice(0, 7) + "-01" : date;
  const offset = (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7;
  return Array.from({ length: mode === "月" ? 42 : 7 }, (_, i) =>
    shiftDay(first, i - offset),
  );
}

export function parseSchedule(prompt: string, now = new Date()) {
  const local = new Date(+now + 8 * 3600000),
    day = local.toISOString().slice(0, 10);
  let date = prompt.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date) {
    const offset = prompt.includes("后天")
      ? 2
      : prompt.includes("明天")
        ? 1
        : prompt.includes("今天")
          ? 0
          : null;
    if (offset !== null)
      date = new Date(Date.parse(day + "T00:00:00Z") + offset * 86400000)
        .toISOString()
        .slice(0, 10);
  }
  const times = [...prompt.matchAll(/(\d{1,2})[:：](\d{2})/g)].map((m) => {
    let h = Number(m[1]);
    if (/下午|晚上/.test(prompt.slice(0, m.index)) && h < 12) h += 12;
    return String(h).padStart(2, "0") + ":" + m[2];
  });
  if (!times.length) {
    const match = prompt.match(
      /(上午|下午|晚上)?\s*(\d{1,2})[点时](半|\d{1,2}分)?/,
    );
    if (match) {
      let h = Number(match[2]);
      if (/下午|晚上/.test(match[1] || "") && h < 12) h += 12;
      times.push(
        String(h).padStart(2, "0") +
          ":" +
          (match[3] === "半"
            ? "30"
            : String(parseInt(match[3] || "0") || 0).padStart(2, "0")),
      );
    }
  }
  const start = date && times[0] ? date + "T" + times[0] : "";
  let end = date && times[1] ? date + "T" + times[1] : "";
  if (start && !end && validDate(start))
    end = new Date(Date.parse(start + ":00+08:00") + 8 * 3600000 + 30 * 60000)
      .toISOString()
      .slice(0, 16);
  const title =
    prompt.match(/[「“"]([^」”"]+)[」”"]/)?.[1] ||
    prompt
      .replace(
        /\d{4}-\d{2}-\d{2}|今天|明天|后天|\d{1,2}[:：]\d{2}|(上午|下午|晚上)?\s*\d{1,2}[点时](半|\d{1,2}分)?|帮我|请|创建|安排|一个|日程|到|至/g,
        "",
      )
      .replace(/^[\s，,：:—-]+|[\s，,。]+$/g, "")
      .trim();
  return {
    type: "schedule",
    title: title.slice(0, 200),
    start,
    end,
    source: "agent",
    reminder: "15",
    notes: "",
    location: "",
    participants: "",
    links: [],
    done: false,
  };
}
