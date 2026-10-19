import type { Workspace } from "./types";

export type CreditCategory = "membership" | "task" | "recharge" | "gift" | "legacy";
export type CreditGrant = {
  id: string; category: CreditCategory; label: string;
  amount: number; remaining: number; time: string; expires: string | null;
};
const round = (n: number) => Math.round(n * 1000) / 1000;
export function addCreditMonths(iso: string, months: number) {
  const d = new Date(iso), day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + months);
  const max = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, max));
  return d.toISOString();
}
// Historical balances have no reliable category or expiry metadata. Preserve them;
// only grants issued by this version receive an expiry or source classification.
export function creditGrants(w: Workspace): CreditGrant[] {
  return w.credits.grants || [{
    id: "opening", category: "legacy", label: "原有积分余额",
    amount: w.credits.total, remaining: Math.max(0, round(w.credits.total - w.credits.used)),
    time: "", expires: null,
  }];
}
export function creditSummary(w: Workspace, now = new Date()) {
  const iso = now.toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const categories = { membership: 0, task: 0, recharge: 0, gift: 0, legacy: 0 };
  let expired = 0, expiring = 0;
  for (const grant of creditGrants(w)) {
    if (grant.expires && grant.expires <= iso) expired += grant.remaining;
    else {
      categories[grant.category] += grant.remaining;
      if (grant.expires && grant.expires < end) expiring += grant.remaining;
    }
  }
  return { categories, expired: round(expired), expiring: round(expiring),
    balance: w.status === "dissolved" ? 0 : round(Object.values(categories).reduce((n, v) => n + v, 0)) };
}
export function grantCredits(w: Workspace, grant: CreditGrant) {
  w.credits.grants ||= creditGrants(w);
  if (w.credits.grants.some(g => g.id === grant.id)) return;
  w.credits.grants.push(grant);
  w.credits.total = round(w.credits.total + grant.amount);
}
export function debitCredits(w: Workspace, amount: number, now = new Date()) {
  if (creditSummary(w, now).balance < amount) throw Error("Credits不足，请充值后重试");
  w.credits.grants ||= creditGrants(w);
  const eligible = w.credits.grants.filter(g => !g.expires || g.expires > now.toISOString())
    .sort((a, b) => (a.expires || "9999").localeCompare(b.expires || "9999") || a.time.localeCompare(b.time));
  let rest = amount;
  for (const g of eligible) {
    const used = Math.min(g.remaining, rest);
    g.remaining = round(g.remaining - used); rest = round(rest - used);
    if (!rest) break;
  }
}
