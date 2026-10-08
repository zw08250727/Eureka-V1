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
  myCommitments?: string[][];
  themes: string[];
  memories: string[];
  inferences: string[];
}
export interface ContactsState {
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
  if (!validDate(r.start)) throw Error("请选择有效的时间");
  if (r.type === "schedule" && (!validDate(r.end) || r.end <= r.start))
    throw Error("结束时间必须晚于开始时间");
  if (r.notes.length > 2000) throw Error("备注不能超过 2000 字");
  if (!reminders.some(([v]) => v === r.reminder)) throw Error("提醒时间无效");
  if (r.location.length > 300 || r.participants.length > 300)
    throw Error("地点和参与人各不能超过 300 字");
}
export function createActions(storage: Storage, now = () => new Date()) {
  const store = createJsonStore<ActionState>(
    storage,
    "eureka:personal-actions:v1",
    () => seedActions(now()),
    (v) =>
      !!v &&
      typeof v === "object" &&
      "version" in v &&
      v.version === 1 &&
      "records" in v &&
      Array.isArray(v.records),
    (value) => fillWeekActions(value, now()),
  );
  return {
    ...store,
    session(id: string, prompt: string, draft: ActionRecord) {
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
    save(input: ActionRecord) {
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
          source: old?.source || input.source,
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
export function createThoughts(storage: Storage, now = () => new Date()) {
  const store = createJsonStore<WeekThoughtState>(
    storage,
    "eureka:thoughts:v1",
    () => ({ version: 1, records: seedThoughts(now()) }),
    (v) =>
      !!v &&
      typeof v === "object" &&
      "version" in v &&
      v.version === 1 &&
      "records" in v &&
      Array.isArray(v.records),
    (value) => fillWeekThoughts(value, now()),
  );
  return {
    ...store,
    save(input: ThoughtRecord) {
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
        const old = s.records.find((x) => x.id === input.id);
        if (old && (old.revision || 0) !== (input.revision || 0))
          throw Error("记录已更新，请重新打开");
        const r = {
          ...input,
          title: input.title.trim(),
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
export function createContacts(storage: Storage) {
  return createJsonStore<Record<string, ContactsState>>(
    storage,
    "baizhi-v14-contacts",
    () => ({
      personal: { contacts: contactSeeds as Contact[], notes: {}, tasks: [] },
    }),
    (v) => !!v && typeof v === "object" && !Array.isArray(v),
    (value) => {
      const scope = value.personal;
      if (!scope)
        return {
          ...value,
          personal: {
            contacts: structuredClone(contactSeeds) as Contact[],
            notes: {},
            tasks: [],
          },
        };
      if (
        !Array.isArray(scope.contacts) ||
        !Array.isArray(scope.tasks) ||
        !scope.notes
      )
        throw Error("联系人数据格式无效，请保留浏览器数据后重试");
      return value;
    },
  );
}
export function day(value = new Date()) {
  return new Date(+value + 8 * 3600000).toISOString().slice(0, 10);
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
