import cn from "../../markets/cn.json";
import { marketConfig } from "../../markets/config";
import PS from "./subscription";
import { addCreditMonths } from "./credit-ledger";
import type { Order, Workspace } from "./types";

export type TimeOrder = Omit<Order, "cycle"> & { workspaceId: string; minutes: number; validUntil?: string; priceVersion: string };
function personal(w: Workspace) {
  if (marketConfig().id !== "cn" || w.type !== "personal") throw Error("加时包仅适用于国内个人工作区");
}
export function timeOrder(w: Workspace, id: string) {
  personal(w);
  const order = w.timeOrders?.find(o => o.id === id && o.workspaceId === w.id);
  if (!order) throw Error("加时包订单不存在");
  return order;
}
export function createTimeOrder(w: Workspace, packId: string, now = new Date().toISOString()) {
  personal(w);
  const pack = cn.timePacks.find(p => p.id === packId);
  if (!pack) throw Error("请选择有效的加时包");
  w.timeOrders ||= [];
  const pending = w.timeOrders.find(o => o.packId === packId && ["pending", "failed"].includes(o.status) && o.expiresAt! > now && o.priceVersion === cn.revision && o.amount === pack.amount && o.minutes === pack.minutes && o.currency === "CNY");
  if (pending) return pending;
  const order: TimeOrder = { id: `TIME-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`, workspaceId: w.id, packId, minutes: pack.minutes, amount: pack.amount, currency: "CNY", created: now, expiresAt: new Date(Date.parse(now) + cn.timePackPolicy.orderHours * 3600000).toISOString(), status: "pending", priceVersion: cn.revision };
  w.timeOrders.unshift(order);
  return order;
}
export function cancelTimeOrder(w: Workspace, id: string) {
  const o = timeOrder(w, id);
  if (o.status === "paid") throw Error("已支付订单不能取消");
  o.status = "cancelled";
}
export function payTimeOrder(w: Workspace, id: string, result: "success" | "failure", method: string, now = new Date().toISOString()) {
  const o = timeOrder(w, id);
  if (!["success", "failure"].includes(result)) throw Error("支付结果无效");
  if (o.status === "paid") return o;
  if (o.status === "cancelled") throw Error("订单已取消");
  if (!o.expiresAt || o.expiresAt <= now) throw Error("订单已过期，请重新选择加时包");
  const pack = cn.timePacks.find(p => p.id === o.packId);
  if (!pack || o.amount !== pack.amount || o.minutes !== pack.minutes || o.currency !== "CNY" || o.priceVersion !== cn.revision) throw Error("订单报价无效");
  if (!cn.payments.subscription.includes(method)) throw Error("支付方式无效");
  if (result === "failure") { o.status = "failed"; return o; }
  Object.assign(o, { status: "paid", method, paidAt: now, validUntil: addCreditMonths(now, cn.timePackPolicy.validMonths), invoiceId: `INV-${o.id}` });
  return o;
}

/** Per-period quota and paid packs form separate pools; never borrow from a team. */
export function timeBalance(w: Workspace, now = new Date().toISOString()) {
  personal(w);
  const sub = PS.current(w, now), active = w.personalSubscription;
  let start = `${new Date(now).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }).slice(0, 7)}-01T00:00:00+08:00`;
  start = new Date(start).toISOString();
  let end = addCreditMonths(start, 1);
  if (active?.startsAt && active.endsAt && active.endsAt > now) {
    start = active.startsAt;
    for (let i = 1; i <= 12; i++) {
      end = addCreditMonths(active.startsAt, i);
      if (end > now) break;
      start = end;
    }
    if (end > active.endsAt) end = active.endsAt;
  }
  const source = `quota:${start}`, logs = w.transcriptionUsage?.logs || [];
  const spent = (id: string) => logs.reduce((sum, log) => sum + (log.allocations?.filter(a => a.source === id).reduce((n, a) => n + a.minutes, 0) || 0), 0);
  const legacyUsed = logs.filter(l => !l.allocations && l.time >= start && l.time < end).reduce((n, l) => n + l.minutes, 0);
  const quota = Math.max(0, sub.minutes - spent(source) - legacyUsed);
  const packs = (w.timeOrders || []).filter(o => o.status === "paid" && o.paidAt! <= now && o.validUntil! > now).map(o => ({ source: o.id, remaining: Math.max(0, o.minutes - spent(o.id)), expires: o.validUntil! }));
  return { quota, packs: packs.reduce((sum, p) => sum + p.remaining, 0), pools: [{ source, remaining: quota, expires: end }, ...packs].sort((a, b) => a.expires.localeCompare(b.expires)), refreshAt: end };
}
export function allocateMinutes(w: Workspace, minutes: number, now = new Date().toISOString()) {
  if (!Number.isFinite(minutes) || minutes <= 0) throw Error("转写用量无效");
  const balance = timeBalance(w, now);
  if (balance.quota + balance.packs < minutes) throw Error("当前工作区转写额度不足，不会扣减其他工作区权益");
  let remaining = minutes;
  const allocations: { source: string; minutes: number }[] = [];
  for (const pool of balance.pools) {
    const used = Math.min(remaining, pool.remaining);
    if (used > 0) allocations.push({ source: pool.source, minutes: used });
    remaining -= used;
    if (!remaining) break;
  }
  return allocations;
}
