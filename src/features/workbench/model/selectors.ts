import type { ActionRecord, Meeting, ThoughtRecord } from "./types";
import {
  actionOnDay,
  actionTime,
  assetActive,
  ledgerCurrency,
  ledgerDate,
  localDay,
  overdue,
  validLedger,
} from "@/features/personal/asset-rules";
export { localDay } from "@/features/personal/asset-rules";
export function todayRecords(
  actions: ActionRecord[],
  thoughts: ThoughtRecord[],
  now = new Date(),
) {
  const day = localDay(now);
  const todos = actions
    .filter(
      (r) =>
        r.type === "todo" &&
        assetActive(r) &&
        (actionOnDay(r, day) || overdue(r, now) ||
          (r.done && !!r.completedAt && localDay(new Date(r.completedAt)) === day)),
    )
    .sort(
      (a, b) =>
        actionTime(a.start) - actionTime(b.start),
    );
  const schedules = actions
    .filter((r) => r.type === "schedule" && actionOnDay(r, day))
    .sort((a, b) => actionTime(a.start) - actionTime(b.start));
  const ideas = thoughts
    .filter((r) => r.type === "inspiration" && assetActive(r) && r.date === day)
    .sort((a, b) => a.time.localeCompare(b.time));
  const ledger = thoughts.filter(
    (r) => validLedger(r) && ledgerDate(r) === day,
  );
  const totals = (direction: string) => {
    const sums = new Map<string, number>();
    for (const r of ledger.filter(
      (r) => (r.direction || "expense") === direction,
    )) {
      const currency = ledgerCurrency(r);
      sums.set(
        currency,
        (sums.get(currency) || 0) + Math.round(r.amount! * 100),
      );
    }
    return [...sums].map(([currency, cents]) => ({
      currency,
      amount: cents / 100,
    }));
  };
  const upcoming =
    schedules.find(
      (r) => actionTime(r.start) <= +now && actionTime(r.end) > +now,
    ) || schedules.find((r) => actionTime(r.start) > +now);
  const expenses = totals("expense"),
    income = totals("income");
  return {
    todos,
    schedules,
    ideas,
    ledger,
    expenses,
    income,
    day,
    upcoming,
    next: upcoming,
    clock: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    amount: expenses.find((r) => r.currency === "CNY")?.amount || 0,
  };
}
export function filterMeetings(
  meetings: Meeting[],
  search: string,
  source: string,
  date: string,
) {
  const query = search.trim().toLowerCase();
  return meetings.filter(
    (m) =>
      (!query ||
        `${m.title} ${m.tag} ${m.creator} ${m.source}`
          .toLowerCase()
          .includes(query)) &&
      (source === "all" || m.source === source) &&
      (!date || m.date === date),
  );
}
export const reminders = [
  "把今天记下来，让下一步更清楚。",
  "先记下灵感，再慢慢把它实现。",
  "从一件小事开始，推进今天。",
  "给重要的事，留一点专注时间。",
  "想法不必完整，先把它留下。",
  "会议之前，看看今天要确认什么。",
  "把待办写清楚，让行动更轻松。",
  "忙碌之间，也给思考留点空间。",
];
