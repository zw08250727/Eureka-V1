import { expect, test } from "@playwright/test";
import { todayRecords } from "../../src/features/workbench/model/selectors";
import { actionOnDay } from "../../src/features/personal/asset-rules";
import {
  contactStats,
  promiseStatus,
} from "../../src/features/personal/contact-rules";
import { validateAction } from "../../src/features/personal/store";
import { buildTeamBrief } from "../../src/features/spaces/model/brief";
import M from "../../src/features/spaces/model/core";
import type {
  ActionRecord,
  ThoughtRecord,
} from "../../src/features/workbench/model/types";
import type { Contact } from "../../src/features/personal/store";
const now = new Date("2026-10-15T12:00:00");
const action = (
  id: string,
  start: string,
  end = "",
  extra = {},
): ActionRecord => ({
  id,
  title: id,
  type: end ? "schedule" : "todo",
  start,
  end,
  done: false,
  source: "manual",
  notes: "",
  reminder: "none",
  location: "",
  participants: "",
  created: "",
  updated: "",
  links: [],
  ...extra,
});
const ledger = (id: string, extra = {}): ThoughtRecord => ({
  id,
  title: id,
  type: "ledger",
  date: "2026-10-15",
  time: "09:00",
  detail: "",
  amount: 10,
  direction: "expense",
  ...extra,
});

test("today includes ongoing cross-day events and overdue todos but excludes inactive assets", () => {
  const records = [
    action("ongoing", "2026-10-14T23:00", "2026-10-15T13:00"),
    action("overnight", "2026-10-15T23:00", "2026-10-16T01:00"),
    action("ended", "2026-10-15T09:00", "2026-10-15T10:00"),
    action("overdue", "2026-10-14T18:00"),
    action("undated", ""),
    action("cancelled", "2026-10-15T15:00", "", { status: "canceled" }),
    action("deleted", "2026-10-15T15:00", "", { deleted: true }),
  ];
  const r = todayRecords(records, [], now);
  expect(r.schedules.map((r) => r.id)).toEqual([
    "ongoing",
    "ended",
    "overnight",
  ]);
  expect(r.upcoming?.id).toBe("ongoing");
  expect(r.todos.map((r) => r.id)).toEqual(["overdue"]);
  expect(
    todayRecords(records, [], new Date("2026-10-15T14:00")).upcoming?.id,
  ).toBe("overnight");
  expect(
    actionOnDay(
      action("boundary", "2026-10-14T23:00", "2026-10-15T00:00"),
      "2026-10-15",
    ),
  ).toBe(false);
  expect(() => validateAction(action("undated", ""))).not.toThrow();
});

test("ledger uses business dates, actual amounts and separate currencies/directions", () => {
  const r = todayRecords(
    [],
    [
      ledger("old", {
        date: "2026-10-14",
        occurredOn: "2026-10-15",
        amount: 0.1,
      }),
      ledger("old2", { amount: 0.2 }),
      ledger("usd", { currency: "USD", amount: 12 }),
      ledger("income", { direction: "income", amount: 5 }),
      ledger("unknown", { occurredOn: "" }),
      ledger("otherday", { occurredOn: "2026-10-14" }),
      ledger("planned", { entryKind: "planned" }),
      ledger("pending", { status: "pending" }),
      ledger("badcurrency", { currency: "" }),
    ],
    now,
  );
  expect(r.expenses).toEqual([
    { currency: "CNY", amount: 0.3 },
    { currency: "USD", amount: 12 },
  ]);
  expect(r.income).toEqual([{ currency: "CNY", amount: 5 }]);
  expect(r.ledger).toHaveLength(4);
});

test("contact counts include both sides and only distinct verified accessible interactions", () => {
  const p: Contact = {
    initials: "P",
    name: "P",
    role: "",
    company: "",
    summary: "",
    tag: "",
    count: 0,
    recent: "",
    region: "",
    email: "",
    themes: [],
    memories: [],
    inferences: [],
    id: "p",
    commitments: [],
    myCommitments: [["Send brief", "", "待跟进"]],
    interactions: [
      {
        id: "1",
        occurredAt: "2026-10-14",
        verifiedParticipation: true,
        sourceAvailable: true,
        themes: ["budget"],
      },
      {
        id: "1",
        occurredAt: "2026-10-14",
        verifiedParticipation: true,
        sourceAvailable: true,
        themes: ["budget"],
      },
      {
        id: "2",
        occurredAt: "2026-10-13",
        verifiedParticipation: false,
        sourceAvailable: true,
        themes: ["other"],
      },
      {
        id: "3",
        occurredAt: "2026-08-01",
        verifiedParticipation: true,
        sourceAvailable: true,
        themes: ["old"],
      },
      {
        id: "4",
        occurredAt: "2026-10-12",
        verifiedParticipation: true,
        sourceAvailable: false,
        themes: ["deleted"],
      },
    ],
  };
  expect(contactStats(p, now)).toEqual({
    interactions: 2,
    activeThemes: 1,
    open: 1,
    recent: "2026-10-14",
  });
});
const file = (
  id: string,
  date: string,
  facts: Record<string, unknown>[] = [],
  quote = "Original evidence",
) => ({
  id,
  title: id,
  owner: "zhang",
  created: date,
  summary: quote,
  transcript: "",
  detail: { briefFacts: facts },
});
const fact = (extra = {}) => ({
  issueId: "issue",
  topic: "Delivery",
  quote: "Original evidence",
  kind: "fact",
  ...extra,
});

test("team brief keeps old open issues until explicit closure, silence does not resolve them", () => {
  const old = file("old", "2026-09-01T10:00", [fact({ status: "open" })]);
  const silence = file("silence", "2026-09-02T10:00", [fact()]);
  expect(buildTeamBrief([old, silence], now)).toHaveLength(1);
  expect(
    buildTeamBrief(
      [
        old,
        silence,
        file("resolved", "2026-09-03T10:00", [fact({ status: "resolved" })]),
      ],
      now,
    ),
  ).toHaveLength(0);
  expect(
    buildTeamBrief([file("old-plain", "2026-09-01T10:00")], now),
  ).toHaveLength(0);
});

test("team consensus requires corroborating meetings, verified speakers and same agreement", () => {
  const agree = {
    kind: "consensus",
    agreed: true,
    agreementId: "decision1",
    speakerIds: ["zhang", "lin"],
  };
  const a = file("a", "2026-10-14T10:00", [fact(agree)]),
    b = file("b", "2026-10-15T10:00", [fact(agree)]);
  expect(buildTeamBrief([a, b], now)[0].label).toBe("明确共识");
  expect(buildTeamBrief([a], now)[0].label).toBe("单次会议要点");
  expect(
    buildTeamBrief(
      [
        a,
        file("c", "2026-10-15T10:00", [
          fact({ ...agree, agreementId: "decision2" }),
        ]),
      ],
      now,
    )[0].label,
  ).toBe("跨会议讨论");
  expect(
    buildTeamBrief(
      [a, { ...b, summary: "Evidence has been corrected" }],
      now,
    )[0].sources,
  ).toHaveLength(1);
});

test("team brief filters unavailable/deleted sources before analysis", () => {
  const state = M.seed(),
    w = M.get(state, "team-eureka");
  const base = {
    ...file("private", "2026-10-14T10:00", [fact()]),
    shared: [],
    deleted: false,
    source: "网页录音",
    duration: 1,
    updated: "",
    size: "",
    creator: "",
    status: "已总结",
    tags: [],
  };
  w.files = [
    base,
    { ...base, id: "shared", shared: ["kevin"] },
    { ...base, id: "deleted", shared: ["kevin"], deleted: true },
  ];
  const report = M.insights(w, "kevin", now);
  expect(
    report.items.flatMap((i: { sources: { fileId: string }[] }) =>
      i.sources.map((s) => s.fileId),
    ),
  ).toEqual(["shared"]);
});

test("promise counts deduplicate IDs and overdue requires an explicit deadline", () => {
  const p = {
    id: "promise",
    side: "mine" as const,
    title: "Send brief",
    due: "尽快",
    status: "待完成",
  };
  expect(promiseStatus(p, now)).toBe("待完成");
  expect(promiseStatus({ ...p, deadline: "2026-10-15" }, now)).toBe("待完成");
  expect(promiseStatus({ ...p, deadline: "2026-10-14" }, now)).toBe("逾期");
  expect(
    promiseStatus({ ...p, status: "已完成", deadline: "2026-10-14" }, now),
  ).toBe("已完成");
  const contact: Contact = {
    id: "c",
    initials: "C",
    name: "Contact",
    company: "",
    role: "",
    summary: "",
    tag: "",
    count: 0,
    recent: "",
    region: "",
    email: "",
    themes: [],
    memories: [],
    inferences: [],
    promises: [p, p],
  };
  expect(contactStats(contact, now).open).toBe(1);
});
