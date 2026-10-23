import cn from "../../markets/cn.json";
import { marketConfig } from "../../markets/config";
import { grantCredits } from "./credit-ledger";
// Existing personal subscription rules, imported as a module.

const config = marketConfig();
const plans = config.personal;
const fail = (message) => {
    throw Error(message);
  },
  id = () =>
    `PERSONAL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
function owner(w) {
  if (w.type !== "personal") fail("只能在个人空间管理此订阅");
}
function addMonths(iso, n) {
  const d = new Date(iso),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const max = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, max));
  return d.toISOString();
}
function current(w, now = new Date().toISOString()) {
  owner(w);
  const s = w.personalSubscription;
  const effectiveNow = now;
  const status = { remainingDays: s?.endsAt ? Math.max(0, Math.ceil((Date.parse(s.endsAt) - Date.parse(effectiveNow)) / 86400000)) : 0 };
  if (!s || s.endsAt <= effectiveNow)
    return {
      ...status,
      plan: config.id === "cn" ? "免费版" : "标准版",
      minutes: config.benefits.standardMinutes,
      credits: null,
      renew: false,
      cycle: null,
      endsAt: s?.endsAt || null,
      nextRefresh: null,
      usedMinutes: 0,
    };
  const tier = config.id === "cn" ? cn.memberCatalog.find(p => p.id === (s.tier || "professional")) : null;
  return { ...s, ...status, tier: tier?.id, plan: tier?.name || "Pro", minutes: tier ? (tier.minutes ?? Infinity) : config.benefits.proMinutes, credits: tier?.monthlyCredits || config.benefits.proCredits, usedMinutes: 0 };
}
const snapshot = (w) => JSON.stringify(w.personalSubscription || null);
function create(w, cycle, tier = "professional") {
  owner(w);
  const selected = config.id === "cn" ? cn.memberCatalog.find(p => p.id === tier) : null;
  if (config.id === "cn" && !selected) fail("请选择有效的会员类型");
  const p = selected ? { cycle, amount: selected[cycle], currency: "CNY" } : plans[cycle];
  if (!p || !["month", "year"].includes(cycle)) fail("请选择有效的套餐");
  const s = current(w);
  if (s.endsAt > new Date().toISOString() && s.cycle === cycle && (config.id !== "cn" || s.tier === tier))
    fail("当前套餐已生效，无需重复购买");
  if (config.id === "cn" && s.endsAt > new Date().toISOString() && s.tier === "excellent" && tier !== "excellent") fail("当前已享卓越版权益，请到期后再选择专业版");
  w.personalOrders ||= [];
  const before = snapshot(w),
    old = w.personalOrders.find(
      (o) =>
        ["pending", "failed"].includes(o.status) &&
        o.cycle === cycle && (config.id !== "cn" || o.tier === tier) &&
        o.snapshot === before && o.amount === p.amount && o.currency === p.currency &&
        o.priceVersion === (config.id === "cn" ? config.revision : "mobile-demo-v1"),
    );
  if (old) return old;
  w.personalOrders
    .filter((o) => ["pending", "failed"].includes(o.status))
    .forEach((o) => (o.status = "cancelled"));
  const order = {
    id: id(),
    workspaceId: w.id,
    ...p,
    created: new Date().toISOString(),
    status: "pending",
    snapshot: before,
    priceVersion: config.id === "cn" ? config.revision : "mobile-demo-v1",
    planName: selected?.name || "Pro",
    ...(selected ? { tier, monthlyMinutes: selected.minutes, storageGB: selected.storageGB } : {}),
    monthlyCredits: selected?.monthlyCredits || config.benefits.proCredits,
  };
  w.personalOrders.unshift(order);
  return order;
}
function get(w, orderId) {
  owner(w);
  return (
    (w.personalOrders || []).find(
      (o) => o.id === orderId && o.workspaceId === w.id,
    ) || fail("个人订阅订单不存在")
  );
}
function cancel(w, orderId) {
  const o = get(w, orderId);
  if (o.status === "paid") fail("已支付订单不能取消");
  o.status = "cancelled";
  return o;
}
function pay(
  w,
  orderId,
  result,
  method = config.payments.subscription[0],
  now = new Date().toISOString(),
) {
  const o = get(w, orderId);
  if (!["success", "failure"].includes(result)) fail("支付结果无效");
  if (o.status === "paid") return o;
  if (!["pending", "failed"].includes(o.status)) fail("订单已取消");
  if (o.snapshot !== snapshot(w)) fail("订阅已变化，请重新确认订单");
  const tier = config.id === "cn" ? cn.memberCatalog.find(p => p.id === o.tier) : null;
  const p = tier ? { amount: tier[o.cycle], currency: "CNY" } : plans[o.cycle];
  if (
    !p ||
    o.amount !== p.amount ||
    o.currency !== p.currency ||
    (config.id === "cn" && (!tier || o.monthlyCredits !== tier.monthlyCredits || o.monthlyMinutes !== tier.minutes)) ||
    o.priceVersion !== (config.id === "cn" ? config.revision : "mobile-demo-v1")
  )
    fail("订单报价无效");
  // The overseas sandbox completion adapter records its verified provider name.
  if (!config.payments.subscription.includes(method) && !(config.id === "global" && method === "Airwallex"))
    fail("支付方式无效");
  if (result === "failure") {
    o.status = "failed";
    return o;
  }
  const subscription = {
    plan: "Pro",
    ...(tier ? { tier: tier.id } : {}),
    cycle: o.cycle,
    startsAt: now,
    endsAt: addMonths(now, o.cycle === "year" ? 12 : 1),
    nextRefresh: addMonths(now, 1),
    renew: config.id !== "cn",
    orderId: o.id,
  };
  o.status = "paid";
  o.paidAt = now;
  o.method = method;
  o.subscription = subscription;
  o.invoiceId = "INV-" + o.id;
  w.personalSubscription = { ...subscription };
  w.plan = "Pro";
  if (config.id === "cn") grantCredits(w, { id: `${o.id}:0`, category: "membership", label: `${o.planName}会员积分`, amount: o.monthlyCredits, remaining: o.monthlyCredits, time: now, expires: null });
  else w.credits.total += config.benefits.proCredits;
  return o;
}
// Monthly grant anniversaries are anchored to purchase, including Jan 31 and leap years.
function refresh(w, now = new Date().toISOString()) {
  if (config.id !== "cn" || w.type !== "personal") return;
  const s = w.personalSubscription;
  if (!s?.startsAt || !s.endsAt || !s.orderId) return;
  const order = (w.personalOrders || []).find(o => o.id === s.orderId);
  if (!order?.monthlyCredits) return; // Never reissue legacy paid grants.
  for (let i = 1; i < (s.cycle === "year" ? 12 : 1); i++) {
    const at = addMonths(s.startsAt, i);
    if (at >= s.endsAt || at > now) break;
    grantCredits(w, { id: `${s.orderId}:${i}`, category: "membership", label: `${order.planName || "专业版"}会员积分`, amount: order.monthlyCredits, remaining: order.monthlyCredits, time: at, expires: null });
  }
  let next = addMonths(s.startsAt, 1);
  for (let i = 2; next <= now && next < s.endsAt; i++) next = addMonths(s.startsAt, i);
  s.nextRefresh = next < s.endsAt ? next : null;
}
function renew(w, value) {
  owner(w);
  if (config.id === "cn") fail("当前套餐为单次购买，无自动续费");
  if (current(w).plan !== "Pro") fail("暂无有效 Pro 订阅");
  w.personalSubscription.renew = !!value;
  return w.personalSubscription;
}
function restore(w, now = new Date().toISOString()) {
  owner(w);
  const o = (w.personalOrders || []).find(
    (o) => o.status === "paid" && o.subscription?.endsAt > now,
  );
  if (!o) fail("本浏览器没有可恢复的有效购买记录");
  if (w.personalSubscription?.orderId !== o.id)
    w.personalSubscription = { ...o.subscription };
  w.plan = "Pro";
  return current(w, now);
}

const subscriptionModel = {
  plans,
  refresh,
  current,
  create,
  get,
  cancel,
  pay,
  renew,
  restore,
  addMonths,
};

export default subscriptionModel;
