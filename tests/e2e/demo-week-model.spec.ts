import { expect, test } from "@playwright/test";
import {
  demoWeek,
  fillWeekActions,
  fillWeekThoughts,
  fillWeekWorkspaces,
} from "../../src/features/workbench/model/demo-week";
import {
  createLocalRepository,
  seedActions,
  seedThoughts,
  ACTION_KEY,
  THOUGHT_KEY,
} from "../../src/features/workbench/model/local-repository";
import { todayRecords } from "../../src/features/workbench/model/selectors";
import {
  createActions,
  createThoughts,
} from "../../src/features/personal/store";
import { createMeetingDetails } from "../../src/features/meetings/store";
import { M, createWorkspaceStore } from "../../src/features/spaces/model/store";

const at = (day: string) => new Date(`${day}T12:00:00`);
function memory(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
  };
}

for (const plan of demoWeek) {
  test(`${plan.date}: personal overview and both demo team briefs have date-specific content`, async () => {
    const now = at(plan.date),
      storage = memory();
    // Simulate a returning browser that already persisted the old seed week.
    storage.setItem(ACTION_KEY, JSON.stringify(seedActions(at("2026-10-07"))));
    storage.setItem(
      THOUGHT_KEY,
      JSON.stringify({ version: 1, records: seedThoughts(at("2026-10-07")) }),
    );
    storage.setItem(M.KEY, JSON.stringify(M.seed(at("2026-10-07"))));
    const snapshot = await createLocalRepository(storage, () => now).load();
    const today = todayRecords(snapshot.actions, snapshot.thoughts, now);
    expect(today.schedules.some((r) => r.title === plan.topic)).toBe(true);
    expect(today.todos.some((r) => r.title === plan.task)).toBe(true);
    expect(today.ideas.some((r) => r.title === plan.idea)).toBe(true);
    expect(today.ledger.some((r) => r.title === plan.expense)).toBe(true);
    expect(today.amount).toBeGreaterThan(0);
    const meeting = snapshot.meetings.find(
      (m) => m.id === `demo-week-personal-${plan.date}-0`,
    )!;
    expect(meeting.date).toBe(plan.date);
    expect(meeting.status).toBe("已总结");
    expect(meeting.updated).not.toBe("undefined");
    const calendar = createActions(storage, () => now).read();
    expect(
      calendar.records.filter((r) => r.id.startsWith("demo-week-")),
    ).toEqual(snapshot.actions.filter((r) => r.id.startsWith("demo-week-")));
    expect(createThoughts(storage, () => now).read().records).toEqual(
      snapshot.thoughts,
    );
    expect(
      snapshot.thoughts
        .filter((r) => r.id.startsWith("demo-week-"))
        .every((r) => r.date <= plan.date),
    ).toBe(true);
    const spaces = createWorkspaceStore(storage, () => now).read();
    for (const id of ["team-eureka", "team-design"]) {
      const w = M.get(spaces, id);
      for (const member of w.members.filter((m) => m.status === "active")) {
        const insight = M.insights(w, member.id, now).items.find(
          (i) => i.id === `demo-week-insight-${plan.date}`,
        )!;
        expect(insight.title).toContain(plan.topic);
        expect(insight.sources).toHaveLength(2);
        insight.sources.forEach((s) =>
          expect(M.getFile(w, s.fileId, member.id).summary).toContain(s.quote),
        );
      }
      expect(
        w.files
          .filter((f) => f.id.startsWith("demo-week-"))
          .every((f) => f.created.slice(0, 10) <= plan.date),
      ).toBe(true);
    }
    // Seeding reads are side-effect-free, so storage failures cannot partly migrate state.
    expect(JSON.parse(storage.getItem(M.KEY)!).spaces[0].files).toHaveLength(0);
  });
}

test("normalization is idempotent, keeps edits and does not resurrect deleted samples", () => {
  const now = at("2026-10-14");
  const actions = fillWeekActions(seedActions(at("2026-10-07")), now);
  const sample = actions.records.find(
    (r) => r.id === "demo-week-2026-10-08-todo",
  )!;
  sample.title = "用户修改的标题";
  sample.done = true;
  const removed = "demo-week-2026-10-09-schedule";
  actions.records = actions.records.filter((r) => r.id !== removed);
  const original = structuredClone(actions);
  expect(fillWeekActions(actions, now)).toEqual(original);
  const thoughts = fillWeekThoughts({ version: 1 as const, records: [] }, now);
  thoughts.records.splice(0, 1);
  const before = structuredClone(thoughts);
  expect(fillWeekThoughts(thoughts, now)).toEqual(before);
  const state = M.seed(now),
    w = M.get(state, "team-design");
  w.files = w.files.filter(
    (f) => f.id !== "demo-week-team-design-2026-10-08-0",
  );
  w.files.find((f) => f.id === "demo-week-team-design-2026-10-09-0")!.summary =
    "已编辑";
  const copy = structuredClone(state);
  expect(M.enrich(state, now)).toEqual(copy);
});

test("briefs respect current evidence, visibility and membership; new teams stay empty", () => {
  const now = at("2026-10-08"),
    state = M.seed(now),
    w = M.get(state, "team-design");
  const source = w.files.find(
    (f) => f.id === "demo-week-team-design-2026-10-08-1",
  )!;
  source.shared = [];
  expect(M.insights(w, "zhang", now).items).toHaveLength(0);
  source.shared = ["zhang"];
  source.summary = "用户已改写会议结论";
  expect(M.insights(w, "zhang", now).items).toHaveLength(0);
  source.summary = demoWeek[0].evidence[1];
  source.deleted = true;
  expect(M.insights(w, "zhang", now).items).toHaveLength(0);
  const empty = {
    ...structuredClone(w),
    id: "new-user-team",
    files: [],
    demoWeekDays: undefined,
  };
  state.spaces.push(empty);
  fillWeekWorkspaces(state, now);
  expect(empty.files).toHaveLength(0);
  expect(M.insights(empty, "zhang", now).items).toHaveLength(0);
  w.status = "dissolved";
  const saved = structuredClone(w);
  fillWeekWorkspaces(state, at("2026-10-14"));
  expect(w).toEqual(saved);
});

test("a persisted browser gains the next day's samples without duplicating the previous day", () => {
  const storage = memory();
  const first = M.seed(at("2026-10-08"));
  storage.setItem(M.KEY, JSON.stringify(first));
  const next = createWorkspaceStore(storage, () => at("2026-10-09")).read();
  const personal = M.get(next, "personal");
  expect(
    personal.files.filter((f) => f.id.startsWith("demo-week-")),
  ).toHaveLength(2);
  expect(new Set(personal.files.map((f) => f.id)).size).toBe(
    personal.files.length,
  );
  expect(M.get(first, "personal").files).toHaveLength(1);
});

test("personal sample meeting details and recycle patches keep the same record identity", () => {
  const storage = memory(),
    state = M.seed(at("2026-10-14"));
  storage.setItem(M.KEY, JSON.stringify(state));
  const id = "demo-week-personal-2026-10-08-0";
  const detail = createMeetingDetails(storage).read(id);
  expect(detail.title).toContain(demoWeek[0].topic);
  expect(detail.summary).toContain(demoWeek[0].evidence[0]);
  storage.setItem(
    "eureka:meeting-details:v1",
    JSON.stringify({ [id]: { deleted: true } }),
  );
  expect(() => createMeetingDetails(storage).read(id)).toThrow("回收站");
});
