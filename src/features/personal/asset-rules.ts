import type {
  ActionRecord,
  ThoughtRecord,
} from "@/features/workbench/model/types";

export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const assetActive = (r: { status?: string; deleted?: boolean }) =>
  !r.deleted &&
  !["canceled", "cancelled", "pending", "deleted"].includes(r.status || "");
export const actionTime = (value: string) =>
  value ? new Date(value).getTime() : NaN;
export function actionOnDay(r: ActionRecord, day: string) {
  if (!assetActive(r)) return false;
  const start = new Date(day + "T00:00:00"),
    end = new Date(start);
  end.setDate(end.getDate() + 1);
  const at = actionTime(r.start);
  return r.type === "todo"
    ? at >= +start && at < +end
    : at < +end && actionTime(r.end) > +start;
}
export const overdue = (r: ActionRecord, now = new Date()) =>
  r.type === "todo" &&
  assetActive(r) &&
  !r.done &&
  Number.isFinite(actionTime(r.start)) &&
  actionTime(r.start) < +now;
export const ledgerDate = (r: ThoughtRecord) =>
  r.occurredOn === undefined ? r.date : r.occurredOn;
// Existing records predate the currency field and were explicitly CNY-only.
export const ledgerCurrency = (r: Pick<ThoughtRecord, "currency">) =>
  r.currency === undefined ? "CNY" : r.currency;
export const validLedger = (r: ThoughtRecord) =>
  assetActive(r) &&
  r.type === "ledger" &&
  r.entryKind !== "planned" &&
  ["income", "expense"].includes(r.direction || "expense") &&
  Number.isFinite(r.amount) &&
  (r.amount || 0) > 0 &&
  /^[A-Z]{3}$/.test(ledgerCurrency(r));
export function money(amount: number, currency: string) {
  if (!Number.isFinite(amount) || !/^[A-Z]{3}$/.test(currency))
    return "金额待补充";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
export function scheduleTime(r: ActionRecord) {
  const crossDay = r.start.slice(0, 10) !== r.end.slice(0, 10);
  const label = (v: string) =>
    crossDay ? v.slice(5, 16).replace("T", " ") : v.slice(11, 16);
  return `${label(r.start)}–${label(r.end)}`;
}
