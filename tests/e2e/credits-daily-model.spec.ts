import { expect, test } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import { createWorkspaceStore } from "../../src/features/spaces/model/store";
import {
  createActions,
  createThoughts,
} from "../../src/features/personal/store";
import { claimReward } from "../../src/features/account/rewards";
import { ensureTeamDailyDemo } from "../../src/features/personal/team-daily-demo";
import type { ActionRecord } from "../../src/features/workbench/model/types";
function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] || null,
    get length() {
      return data.size;
    },
  } satisfies Storage;
}
const now = () => new Date("2026-10-10T12:00:00+08:00");
const action: ActionRecord = {
  id: "",
  type: "todo",
  title: "Confirm pilot scope",
  start: "2026-10-10T18:00",
  end: "",
  done: false,
  source: "manual",
  notes: "",
  reminder: "none",
  location: "",
  participants: "",
  created: "",
  updated: "",
  links: [],
};
test.beforeAll(() =>
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent() {} },
  }),
);
test.afterAll(() => Reflect.deleteProperty(globalThis, "window"));
test("daily rewards enforce account scope, once per day and monthly caps", () => {
  const s = M.seed(),
    p = M.get(s, "personal"),
    team = M.get(s, "team-eureka"),
    initial = p.credits.total;
  claimReward(p, "zhang", "register", "", now());
  claimReward(p, "zhang", "register", "", now());
  expect(p.credits.total).toBe(initial + 1000);
  for (let d = 1; d <= 15; d++)
    claimReward(p, "zhang", "signin", "", new Date(2026, 9, d, 12));
  expect(() =>
    claimReward(p, "zhang", "signin", "", new Date(2026, 9, 16, 12)),
  ).toThrow(/上限/);
  claimReward(p, "zhang", "signin", "", new Date(2026, 9, 15, 12));
  expect(
    p.rewards!.entries.filter((e) => e.id.startsWith("signin")).length,
  ).toBe(15);
  expect(() => claimReward(team, "zhang", "signin")).toThrow(/个人/);
  expect(() => claimReward(p, "zhang", "profile")).toThrow(/完善/);
  claimReward(p, "zhang", "feedback", "Please improve search", now());
  expect(() =>
    claimReward(p, "zhang", "feedback", "Please improve search", now()),
  ).toThrow(/已经/);
});
test("USD SKU payment retry is idempotent and personal/team are isolated", () => {
  const s = M.seed(),
    p = M.get(s, "personal"),
    team = M.get(s, "team-eureka"),
    before = p.credits.total,
    teamBefore = team.credits.total;
  expect(M.CREDIT_PACKS.map((x) => [x.credits, x.amount])).toEqual([
    [5000, 59],
    [10000, 109],
    [15000, 149],
  ]);
  const order = M.createCreditOrder(p, "credits-15k");
  expect(order.currency).toBe("USD");
  M.payCreditOrder(p, order.id, "failure");
  expect(p.credits.total).toBe(before);
  M.payCreditOrder(p, order.id, "success");
  M.payCreditOrder(p, order.id, "success");
  expect(p.credits.total).toBe(before + 15000);
  expect(team.credits.total).toBe(teamBefore);
  expect(() => M.createCreditOrder(team, "credits-5k", "kevin")).toThrow(
    /管理员/,
  );
  const cancelled = M.createCreditOrder(p, "credits-5k");
  M.cancelCreditOrder(p, cancelled.id);
  expect(() => M.payCreditOrder(p, cancelled.id, "success")).toThrow(/取消/);
});
test("atomic action sharing: only owner grants, recipients read-only, revocation immediate", () => {
  const storage = memory();
  storage.setItem(M.KEY, JSON.stringify(M.seed()));
  const own = createActions(storage, now, "zhang", "team-eureka"),
    r = own.save(action);
  expect(
    createActions(storage, now, "kevin", "team-eureka")
      .read()
      .records.some((x) => x.id === r.id),
  ).toBe(false);
  own.share(r.id, ["kevin"]);
  const shared = createActions(storage, now, "kevin", "team-eureka"),
    visible = shared.read().records.find((x) => x.id === r.id)!;
  expect(visible.ownerId).toBe("zhang");
  expect(() => shared.save({ ...visible, done: true })).toThrow(/只读/);
  expect(() =>
    createActions(storage, now, "lin", "team-eureka", "zhang").share(r.id, [
      "kevin",
    ]),
  ).toThrow(/本人/);
  const admin = createActions(storage, now, "lin", "team-eureka");
  admin.save({
    ...admin.read().records.find((x) => x.id === r.id)!,
    title: "Admin edit",
  });
  createActions(storage, now, "zhang", "team-eureka").share(r.id, []);
  expect(
    createActions(storage, now, "kevin", "team-eureka")
      .read()
      .records.some((x) => x.id === r.id),
  ).toBe(false);
});
test("type-level sharing covers past/future thoughts but excludes transferred content", () => {
  const storage = memory();
  storage.setItem(M.KEY, JSON.stringify(M.seed()));
  const own = createThoughts(storage, now, "zhang", "team-eureka");
  const draft = {
    id: "",
    type: "inspiration" as const,
    title: "Idea",
    date: "2026-10-10",
    time: "09:00",
    detail: "Content",
  };
  const first = own.save(draft);
  expect(
    createThoughts(storage, now, "kevin", "team-eureka")
      .read()
      .records.some((r) => r.id === first.id),
  ).toBe(false);
  createWorkspaceStore(storage).change((s) => {
    M.get(s, "team-eureka").thoughtSharing = {
      zhang: { inspiration: ["kevin"] },
    };
  });
  createThoughts(storage, now, "zhang", "team-eureka").save({
    ...draft,
    title: "Future idea",
  });
  const visible = createThoughts(storage, now, "kevin", "team-eureka").read()
    .records;
  expect(visible.filter((r) => r.ownerId === "zhang")).toHaveLength(2);
  expect(() =>
    createThoughts(storage, now, "kevin", "team-eureka").save({
      ...visible[0],
      title: "No",
    }),
  ).toThrow(/只读/);
  createWorkspaceStore(storage).change((s) => {
    M.get(s, "team-eureka").thoughtSharing = {};
  });
  expect(
    createThoughts(storage, now, "kevin", "team-eureka")
      .read()
      .records.some((r) => r.id === first.id),
  ).toBe(false);
});
test("demo migration is additive and never resurrects deleted or edited daily data", () => {
  const storage = memory();
  storage.setItem(M.KEY, JSON.stringify(M.seed()));
  ensureTeamDailyDemo(storage, "team-eureka", now());
  const own = createActions(storage, now, "zhang", "team-eureka");
  const r = own.read().records.find((r) => r.ownerId === "zhang")!;
  own.save({ ...r, title: "User edited", done: true });
  ensureTeamDailyDemo(storage, "team-eureka", now());
  expect(
    createActions(storage, now, "zhang", "team-eureka")
      .read()
      .records.find((x) => x.id === r.id)?.title,
  ).toBe("User edited");
  createWorkspaceStore(storage).change((s) => {
    M.get(s, "team-eureka").status = "expired";
  });
  expect(() =>
    createActions(storage, now, "zhang", "team-eureka").share(r.id, ["kevin"]),
  ).toThrow(/只读/);
});

test("member removal revokes all daily grants and transfers records without granting share rights", () => {
  const storage = memory();
  storage.setItem(M.KEY, JSON.stringify(M.seed()));
  ensureTeamDailyDemo(storage, "team-eureka", now());
  createWorkspaceStore(storage).change((s) => {
    M.get(s, "team-eureka").thoughtSharing = {
      zhang: { inspiration: ["kevin"] },
      kevin: { ledger: ["zhang"] },
    };
  });
  createWorkspaceStore(storage).change((s) => {
    M.memberAction(
      s,
      M.get(s, "team-eureka"),
      "kevin",
      "remove",
      undefined,
      "zhang",
    );
  });
  const w = M.get(createWorkspaceStore(storage).read(), "team-eureka");
  expect(w.thoughtSharing?.kevin).toBeUndefined();
  expect(w.thoughtSharing?.zhang?.inspiration).toEqual([]);
  const rows = createActions(storage, now, "zhang", "team-eureka").read()
    .records;
  expect(rows.some((r) => r.sharedWith?.includes("kevin"))).toBe(false);
  const transferred = rows.find((r) => r.previousOwnerId === "kevin")!;
  expect(transferred).toBeTruthy();
  const repo=createActions(storage,now,'zhang','team-eureka');repo.save({...transferred,previousOwnerId:undefined,title:'Edited inherited task'});expect(createActions(storage,now,'zhang','team-eureka').read().records.find(r=>r.id===transferred.id)?.previousOwnerId).toBe('kevin');
  expect(() =>
    createActions(storage, now, "zhang", "team-eureka").share(transferred.id, [
      "lin",
    ]),
  ).toThrow(/不能替/);
});
