import {
  fillWeekActions,
  fillWeekThoughts,
  type WeekThoughtState,
} from "./demo-week";
import { createWorkspaceStore, M } from "../../spaces/model/store";
import baseline from "./baseline.json";
import { localDay } from "./selectors";
import type {
  ActionState,
  Meeting,
  ThoughtRecord,
  Upload,
  WorkbenchRepository,
  WorkbenchSnapshot,
} from "./types";
export const ACTION_KEY = "eureka:personal-actions:v1";
export const THOUGHT_KEY = "eureka:thoughts:v1";
export const UPLOAD_KEY = "eureka:audio-uploads:v1";
const DETAIL_KEY = "eureka:meeting-details:v1";
const clone = <T>(v: T): T => structuredClone(v);
export function seedActions(now: Date): ActionState {
  // Only relative demo dates move. Historical records keep their original dates.
  const offset = Math.round(
    (Date.parse(localDay(now) + "T12:00:00Z") -
      Date.parse(baseline.seedDate + "T12:00:00Z")) /
      86400000,
  );
  const relative = /2026-10-(?:06|07|08|09)/g;
  const shift = (s: string) =>
    s.replace(relative, (day) =>
      new Date(Date.parse(day + "T12:00:00Z") + offset * 86400000)
        .toISOString()
        .slice(0, 10),
    );
  return JSON.parse(shift(JSON.stringify(baseline.actions))) as ActionState;
}
export function seedThoughts(now: Date): ThoughtRecord[] {
  const day = localDay(now),
    yesterday = localDay(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
    );
  return baseline.thoughts.map((r) => ({
    ...r,
    date:
      r.date === baseline.seedDate
        ? day
        : r.id === "older-idea"
          ? yesterday
          : r.date,
  })) as ThoughtRecord[];
}
function parse(raw: string | null, fallback: unknown, label: string): unknown {
  try {
    return raw === null ? clone(fallback) : JSON.parse(raw);
  } catch {
    throw Error(`${label}无法读取，请保留浏览器数据后重试。`);
  }
}
function object(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function actionState(v: unknown): v is ActionState {
  return (
    object(v) &&
    v.version === 1 &&
    Array.isArray(v.records) &&
    Array.isArray(v.meetings) &&
    Array.isArray(v.sessions) &&
    object(v.settings) &&
    v.records.every(
      (r) =>
        object(r) &&
        typeof r.id === "string" &&
        ["todo", "schedule"].includes(String(r.type)) &&
        ["title", "start", "end", "updated"].every(
          (k) => typeof r[k] === "string",
        ),
    )
  );
}
const formatSize = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1048576
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1048576).toFixed(1)} MB`;
export function validateUpload(file: Pick<File, "name" | "size">) {
  if (!/\.(m4a|mp3|wav|opus|flac|aac)$/i.test(file.name))
    throw Error("请选择 m4a、mp3、wav、opus、flac 或 aac 音频文件。");
  if (file.size <= 0) throw Error("文件为空，请重新选择。");
}
export function createLocalRepository(
  storage: Storage,
  now = () => new Date(),
): WorkbenchRepository {
  let rawActions: string | null = null,
    rawUploads: string | null = null,
    rawDetails: string | null = null,
    details: Record<string, Record<string, unknown>> = {},
    actions: ActionState,
    uploads: Upload[] = [];
  function snapshot(): WorkbenchSnapshot {
    const thoughtValue = parse(
      storage.getItem(THOUGHT_KEY),
      { version: 1, records: seedThoughts(now()) },
      "闪念记录",
    );
    if (
      !object(thoughtValue) ||
      thoughtValue.version !== 1 ||
      !Array.isArray(thoughtValue.records) ||
      thoughtValue.records.some(
        (r) =>
          !object(r) ||
          !["id", "title", "date", "time", "detail", "type"].every(
            (k) => typeof r[k] === "string",
          ),
      )
    )
      throw Error("闪念记录格式无效，请保留浏览器数据后重试。");
    const thoughts = fillWeekThoughts(
      thoughtValue as unknown as WeekThoughtState,
      now(),
    );
    const patches = parse(
      storage.getItem("eureka:meeting-details:v1"),
      {},
      "会议记录",
    );
    if (!object(patches)) throw Error("会议记录格式无效。");
    const recycled: Meeting[] = [];
    const meetings: Meeting[] = baseline.meetings.map((m) => {
      const patch = patches[m.id];
      return {
        ...m,
        ...(object(patch) && typeof patch.title === "string"
          ? { title: patch.title }
          : {}),
      };
    });
    for (const m of actions.meetings)
      meetings.unshift({
        id: m.id,
        title: m.title,
        date: m.created.slice(0, 10),
        source: "网页录音",
        size: "演示音频",
        creator: "张伟",
        tag: "日程录音",
        duration: `${Math.max(1, Math.ceil(m.seconds / 60))} 分钟`,
        status: "已总结",
        created: m.created.slice(0, 16).replace("T", " "),
        updated: m.created.slice(0, 16).replace("T", " "),
      });
    for (const f of [...uploads].reverse()) {
      const time = new Date(f.created).toLocaleString("sv-SE").slice(0, 16);
      (f.deleted ? recycled : meetings).unshift({
        id: f.id,
        title: f.title,
        date: time.slice(0, 10),
        source: "文件上传",
        size: f.size,
        creator: "张伟",
        tag: "上传录音",
        duration: "待识别",
        status: "待处理",
        created: time,
        updated: time,
        deletedAt: f.deletedAt,
      });
    }
    const spaces = createWorkspaceStore(storage, now).read().spaces.filter(w => M.member(w)).map(w => ({ id: w.id, name: w.name, members: w.members.filter(m => m.status === "active").length }));
    let accountName = "张伟",
      personalPlan = "标准版";
    const workspace = createWorkspaceStore(storage, now).read();
    if (workspace !== null) {
      if (
        !object(workspace) ||
        workspace.version !== 2 ||
        !Array.isArray(workspace.spaces) ||
        !object(workspace.account)
      )
        throw Error("工作空间数据格式无效。");
      accountName = String(workspace.account.name || "张伟");
      const personal = workspace.spaces.find(
        (w) => object(w) && w.id === "personal",
      );
      if (
        object(personal) &&
        object(personal.personalSubscription) &&
        String(personal.personalSubscription.endsAt) > now().toISOString()
      )
        personalPlan = "Pro";
      if (object(personal) && Array.isArray(personal.files)) {
        for (const f of personal.files) {
          if (!object(f) || f.deleted) continue;
          meetings.unshift({
            id: String(f.id),
            title: String(f.title),
            date: String(f.created).slice(0, 10),
            source: String(f.source),
            size: String(f.size || "演示音频"),
            creator: accountName,
            tag: Array.isArray(f.tags) ? f.tags.join("、") : "设备录音",
            duration: `${f.duration || 0} 分钟`,
            status: String(f.status || "已总结"),
            created: String(f.created),
            updated: String(f.updated || f.created || "—"),
          });
        }
      }
      spaces.splice(
        0,
        spaces.length,
        ...workspace.spaces
          .filter(
            (w) =>
              object(w) &&
              w.status !== "dissolved" &&
              Array.isArray(w.members) &&
              w.members.some(
                (m) =>
                  object(m) &&
                  m.id === (workspace.account as Record<string, unknown>).id &&
                  m.status === "active",
              ),
          )
          .map((w) => ({
            id: String(w.id),
            name: String(w.name),
            members: w.members.filter((m) => m.status === "active").length,
          })),
      );
    }
    for (let i = meetings.length - 1; i >= 0; i--) {
      const m = meetings[i],
        patch = patches[m.id];
      const p: Record<string, unknown> = object(patch) ? patch : {};
      if (typeof p.title === "string") m.title = p.title;
      if (Array.isArray(p.tags)) m.tag = p.tags.join("、");
      if (p.deleted || p.purged) {
        meetings.splice(i, 1);
        if (!p.purged)
          recycled.unshift({ ...m, deletedAt: String(p.deletedAt) });
      }
    }
    meetings.sort((a, b) => Date.parse(b.created.replace(" ", "T")) - Date.parse(a.created.replace(" ", "T")));
    const contacts = parse(
      storage.getItem("baizhi-v14-contacts"),
      {},
      "联系人",
    );
    const personalContacts =
      object(contacts) && object(contacts.personal)
        ? contacts.personal.contacts
        : null;
    const contactCount = Array.isArray(personalContacts)
      ? personalContacts.filter((p) => object(p) && (!p.ownerId || p.ownerId === workspace.account.id)).length
      : 6;
    return {
      actions: clone(actions.records),
      thoughts: clone([...(workspace.spaces.find((w) => w.id === "personal")?.thoughts || []).filter((t) => !t.deleted && t.owner === workspace.account.id), ...thoughts.records]),
      meetings,
      spaces,
      accountName,
      personalPlan,
      recycled,
      contactCount,
    };
  }
  function read() {
    rawDetails = storage.getItem(DETAIL_KEY);
    const parsed = parse(rawDetails, {}, "会议详情");
    if (!object(parsed)) throw Error("会议详情格式无效");
    details = parsed as Record<string, Record<string, unknown>>;
    rawActions = storage.getItem(ACTION_KEY);
    const value = parse(rawActions, seedActions(now()), "个人记录");
    if (!actionState(value))
      throw Error("个人记录格式无效，请保留浏览器数据后重试。");
    actions = fillWeekActions(value, now());
    rawUploads = storage.getItem(UPLOAD_KEY);
    const files = parse(rawUploads, [], "上传记录");
    if (
      !Array.isArray(files) ||
      files.some(
        (f) =>
          !object(f) ||
          !["id", "title", "name", "size", "created"].every(
            (k) => typeof f[k] === "string",
          ) ||
          !String(f.id).startsWith("upload-") ||
          !Number.isFinite(Date.parse(String(f.created))),
      )
    )
      throw Error("上传记录格式无效。");
    uploads = files as Upload[];
    return snapshot();
  }
  function persist(key: string, expected: string | null, value: unknown) {
    if (storage.getItem(key) !== expected)
      throw Error("另一页面已更新，请刷新后重试；当前输入仍保留。");
    const raw = JSON.stringify(value);
    try {
      storage.setItem(key, raw);
    } catch {
      throw Error("保存失败，浏览器存储不可用或已满；请保留当前输入。");
    }
    return raw;
  }
  return {
    async load() {
      return read();
    },
    async setMeetingTag(id, tag) {
      const next = {
        ...details,
        [id]: { ...details[id], tags: tag.split(/[、,，]/).filter(Boolean) },
      };
      rawDetails = persist(DETAIL_KEY, rawDetails, next);
      details = next;
      return snapshot();
    },
    async toggleTodo(id) {
      const next = clone(actions),
        r = next.records.find((r) => r.id === id && r.type === "todo");
      if (!r) throw Error("待办不存在，请刷新后重试。");
      r.done = !r.done;
      r.completedAt = r.done ? now().toISOString() : undefined;
      r.updated = now().toISOString();
      r.revision = (r.revision || 0) + 1;
      rawActions = persist(ACTION_KEY, rawActions, next);
      actions = next;
      return snapshot();
    },
    async setUploadDeleted(id, deleted) {
      if (!id.startsWith("upload-")) {
        const next = {
          ...details,
          [id]: {
            ...details[id],
            deleted,
            deletedAt: deleted ? now().toISOString() : undefined,
          },
        };
        rawDetails = persist(DETAIL_KEY, rawDetails, next);
        details = next;
        return snapshot();
      }
      if (!uploads.some((f) => f.id === id)) throw Error("上传记录不存在");
      const next = uploads.map((f) =>
        f.id === id
          ? {
              ...f,
              deleted,
              deletedAt: deleted ? now().toISOString() : undefined,
            }
          : f,
      );
      rawUploads = persist(UPLOAD_KEY, rawUploads, next);
      uploads = next;
      return snapshot();
    },
    async purgeUpload(id) {
      if (!id.startsWith("upload-")) {
        if (!details[id]?.deleted) throw Error("仅能彻底删除回收站中的录音");
        const next = { ...details, [id]: { ...details[id], purged: true } };
        rawDetails = persist(DETAIL_KEY, rawDetails, next);
        details = next;
        return snapshot();
      }
      const record = uploads.find((f) => f.id === id);
      if (!record?.deleted) throw Error("仅能彻底删除回收站中的录音");
      const next = uploads.filter((f) => f.id !== id);
      rawUploads = persist(UPLOAD_KEY, rawUploads, next);
      uploads = next;
      return snapshot();
    },
    async upload(file) {
      validateUpload(file);
      const f: Upload = {
        id: "upload-" + crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 150) || "上传录音",
        name: file.name,
        size: formatSize(file.size),
        created: now().toISOString(),
        note: "音频已加入会议列表，等待转写处理。本地演示仅保存文件信息，未上传原音频，也未生成真实转写或总结。",
      };
      const next = [f, ...uploads];
      rawUploads = persist(UPLOAD_KEY, rawUploads, next);
      uploads = next;
      return snapshot();
    },
  };
}
