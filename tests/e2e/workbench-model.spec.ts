import { expect, test } from "@playwright/test";
import {
  createLocalRepository,
  ACTION_KEY,
  UPLOAD_KEY,
} from "../../src/features/workbench/model/local-repository";
import {
  todayRecords,
  filterMeetings,
} from "../../src/features/workbench/model/selectors";
function memory() {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    key: (n: number) => [...values.keys()][n] ?? null,
  } satisfies Storage;
}
const now = () => new Date("2026-10-07T04:00:00Z");
test("typed repository preserves existing records, revisions, sessions and unknown fields", async () => {
  const storage = memory(),
    repo = createLocalRepository(storage, now);
  let data = await repo.load();
  expect(data.meetings).toHaveLength(20); // Workspace switching never imports team records.
  expect(data.meetings.some(m => m.id === "team-demo-pilot")).toBe(false);
  data = await repo.toggleTodo("todo-1");
  const before = JSON.parse(storage.getItem(ACTION_KEY)!);
  before.sessions.push({ id: "keep-session" });
  before.settings.language = "en";
  before.extra = "keep";
  storage.setItem(ACTION_KEY, JSON.stringify(before));
  await repo.load();
  await repo.toggleTodo("todo-1");
  const after = JSON.parse(storage.getItem(ACTION_KEY)!);
  expect(
    after.records.find((r: { id: string }) => r.id === "todo-1").revision,
  ).toBe(2);
  expect(after.sessions).toEqual(before.sessions);
  expect(after.extra).toBe("keep");
  expect(after.settings.language).toBe("en");
  expect(filterMeetings(data.meetings, "", "M1", "")).toHaveLength(4);
});
test("concurrent and failed writes leave original data intact", async () => {
  const storage = memory(),
    a = createLocalRepository(storage, now),
    b = createLocalRepository(storage, now);
  await a.load();
  await b.load();
  await a.toggleTodo("todo-1");
  const first = storage.getItem(ACTION_KEY);
  await expect(b.toggleTodo("todo-2")).rejects.toThrow("另一页面");
  expect(storage.getItem(ACTION_KEY)).toBe(first);
  await b.load();
  storage.setItem = () => {
    throw Error("quota");
  };
  await expect(b.toggleTodo("todo-2")).rejects.toThrow("保存失败");
  expect(storage.getItem(ACTION_KEY)).toBe(first);
});
test("bad schemas are not overwritten and uploads preserve legacy deletion format", async () => {
  const storage = memory();
  storage.setItem(ACTION_KEY, "broken");
  const repo = createLocalRepository(storage, now);
  await expect(repo.load()).rejects.toThrow("无法读取");
  expect(storage.getItem(ACTION_KEY)).toBe("broken");
  storage.removeItem(ACTION_KEY);
  await repo.load();
  await expect(repo.upload({ name: "zero.wav", size: 0 })).rejects.toThrow(
    "文件为空",
  );
  expect(storage.getItem(UPLOAD_KEY)).toBeNull();
  const added = await repo.upload({ name: "example.WAV", size: 100 });
  const id = added.meetings[0].id;
  expect(id).toMatch(/^upload-/);
  await repo.setUploadDeleted(id, true);
  expect((await repo.load()).recycled[0].id).toBe(id);
  await repo.setUploadDeleted(id, false);
  expect((await repo.load()).meetings[0].id).toBe(id);
});
test("today selectors use business dates, exclude income and react to completed todos", () => {
  const result = todayRecords(
    [
      {
        id: "t",
        type: "todo",
        title: "今天",
        start: "2026-10-07T15:00",
        end: "",
        done: true,
        source: "manual",
        notes: "",
        reminder: "none",
        location: "",
        participants: "",
        created: "",
        updated: "",
        links: [],
      },
    ],
    [
      {
        id: "i",
        type: "ledger",
        title: "收入",
        date: "2026-10-07",
        time: "08:00",
        detail: "",
        amount: 500,
        direction: "income",
      },
      {
        id: "e",
        type: "ledger",
        title: "支出",
        date: "2026-10-07",
        time: "09:00",
        detail: "",
        amount: 30,
        direction: "expense",
      },
    ],
    new Date(2026, 9, 7, 12),
  );
  expect(result.amount).toBe(30);
  expect(result.todos[0].done).toBe(true);
  expect(result.schedules).toHaveLength(0);
});
