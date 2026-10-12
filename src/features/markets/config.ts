import cn from "./cn.json";
import global from "./global.json";
export type Market = "cn" | "global";
export const markets = { cn, global };
export function routeMarket(
  path = typeof location === "undefined" ? "" : location.pathname,
): Market | null {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const relative =
    base && path.startsWith(base + "/") ? path.slice(base.length) : path;
  const segment = relative.split("/")[1];
  return segment === "cn" || segment === "global" ? segment : null;
}
export function marketConfig(market: Market | null = routeMarket()) {
  return markets[market || "global"];
}
export function marketUrl(market: Market, page = "") {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/${market}/${page}`;
}
export function formatMarketMoney(
  amount: number,
  currency = marketConfig().currency,
) {
  return new Intl.NumberFormat(currency === "CNY" ? "zh-CN" : "en-US", { style: "currency", currency }).format(
    amount,
  );
}
// Translate product terminology at the React boundary, never storage keys or IDs.
export function creditText(text: string) {
  return routeMarket() === "cn" ? text.replaceAll("Credits", "积分").replace(/([\u4e00-\u9fff]) +积分/g, "$1积分").replace(/积分 +([\u4e00-\u9fff])/g, "积分$1") : text;
}
export const personalPlanName = () => routeMarket() === "cn" ? "专业版" : "Pro";
export const teamMoney = (amount: number) => formatMarketMoney(amount, marketConfig().team.month.currency);
