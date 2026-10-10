import type { Contact } from "./store";
import { localDay } from "./asset-rules";
export interface ContactPromise {
  id: string;
  side: "theirs" | "mine";
  title: string;
  due: string;
  deadline?: string;
  status: string;
  updatedAt?: string;
}
export interface ContactInteraction {
  id: string;
  occurredAt: string;
  verifiedParticipation: boolean;
  sourceAvailable: boolean;
  themes: string[];
  extractedSummary?: string;
  todos?: { side: "mine" | "theirs"; title: string; due: string; completed?: boolean }[];
  profile?: Record<string, string>;
}
export function contactPromises(person: Contact): ContactPromise[] {
  if (person.promises)
    return [...new Map(person.promises.map((p) => [p.id, p])).values()];
  return (["theirs", "mine"] as const).flatMap((side) =>
    (side === "mine"
      ? person.myCommitments || []
      : person.commitments || []
    ).map(([title, due, status], index) => ({
      id: `${person.id}:${side}:${index}`,
      side,
      title,
      due,
      status: status === "待跟进" ? "待完成" : status,
    })),
  );
}
export const openPromise = (p: ContactPromise) =>
  ["待完成", "待跟进", "进行中", "逾期"].includes(p.status);
export function promiseStatus(p: ContactPromise, now = new Date()) {
  // Ambiguous legacy copy (e.g. "尽快" or "9 月 18 日") cannot establish a deadline.
  const deadline =
    p.deadline && /^\d{4}-\d{2}-\d{2}$/.test(p.deadline)
      ? new Date(p.deadline + "T23:59:59.999").getTime()
      : Date.parse(p.deadline || "");
  return openPromise(p) && Number.isFinite(deadline) && deadline < +now
    ? "逾期"
    : p.status;
}
export function contactStats(person: Contact, now = new Date()) {
  const events = [
    ...new Map(
      (person.interactions || [])
        .filter(
          (e) =>
            e.verifiedParticipation &&
            e.sourceAvailable &&
            Number.isFinite(Date.parse(e.occurredAt)) &&
            Date.parse(e.occurredAt) <= +now,
        )
        .map((e) => [e.id, e]),
    ).values(),
  ];
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  const themes = new Set(
    events
      .filter(
        (e) =>
          e.occurredAt.slice(0, 10) >= localDay(from) &&
          e.occurredAt.slice(0, 10) <= localDay(now),
      )
      .flatMap((e) => e.themes),
  );
  return {
    interactions: events.length,
    activeThemes: themes.size,
    open: contactPromises(person).filter(openPromise).length,
    recent:
      events
        .map((e) => e.occurredAt)
        .filter(Boolean)
        .sort()
        .at(-1) || "暂无已核实互动",
  };
}
