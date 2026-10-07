import type { ActionRecord, Meeting, ThoughtRecord } from "./types";
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function todayRecords(
  actions: ActionRecord[],
  thoughts: ThoughtRecord[],
  now = new Date(),
) {
  const day = localDay(now);
  const todos = actions.filter(
    (r) => r.type === "todo" && r.start.slice(0, 10) === day,
  );
  const schedules = actions
    .filter((r) => r.type === "schedule" && r.start.slice(0, 10) === day)
    .sort((a, b) => a.start.localeCompare(b.start));
  const ideas = thoughts.filter(
    (r) => r.type === "inspiration" && r.date === day,
  );
  const ledger = thoughts.filter((r) => r.type === "ledger" && r.date === day);
  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const upcoming = schedules.find((r) => r.end.slice(11, 16) > clock);
  return {
    todos,
    schedules,
    ideas,
    ledger,
    clock,
    upcoming,
    next: upcoming || schedules.at(-1),
    amount: ledger
      .filter((r) => r.direction !== "income")
      .reduce((n, r) => n + (r.amount || 0), 0),
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
