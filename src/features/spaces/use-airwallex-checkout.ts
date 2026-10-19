"use client";
import { useEffect, useRef, useState } from "react";
import { marketConfig, routeMarket } from "@/features/markets/config";
import { marketSessionStorage } from "@/features/markets/storage";
import { M } from "./model/store";
import type { Order, Workspace } from "./model/types";

// Local sandbox only. Static deployments never call a visitor's loopback service.
export function usesAirwallexSandbox() {
  return typeof location !== "undefined" && routeMarket() === "global" &&
    ["localhost", "127.0.0.1"].includes(location.hostname);
}
export function useAirwallexCheckout() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function begin(w: Workspace, actor: string, order: Order, onPaid: () => void, kind: "seat" | "credits" | "personal" = "seat") {
    if (active.current) return;
    const originPage = location.href;
    const popup = window.open("about:blank", "_blank", "popup,width=560,height=800");
    if (!popup) { setError("请允许打开支付窗口后重试（错误码：PAY-WINDOW）"); return; }
    popup.opener = null;
    active.current = true;
    setPending(true); setError("");
    const endpoint = process.env.NEXT_PUBLIC_AIRWALLEX_CHECKOUT_API || "http://127.0.0.1:3101/api/airwallex/checkouts";
    const key = `airwallex:${w.id}:${actor}:${order.id}`;
    let errorCode = "PAY-ORDER";
    try {
      M.govern(w, actor); M.writable(w);
      if (!usesAirwallexSandbox() || (kind === "seat" && w.type !== "team") || (kind === "personal" && w.type !== "personal")) throw Error("当前入口不支持 Airwallex 沙盒结账");
      if (order.status === "cancelled") throw Error("订单已取消，请重新选择");
      if (kind === "seat") {
        const quote = M.seatQuote(w, order.targetSeats!, actor);
        if (quote.added !== order.added) throw Error("席位订单已变化，请重新确认");
      } else if (kind === "credits" && !M.CREDIT_PACKS.some(pack => pack.id === order.packId && pack.credits === order.credits && pack.amount === order.amount)) {
        throw Error("Credits 报价已变化，请重新选择");
      }
      if (kind === "personal") {
        const plan = marketConfig().personal[order.cycle];
        if (!plan || order.amount !== plan.amount || order.currency !== plan.currency || !w.personalOrders?.some(item => item.id === order.id)) throw Error("个人订阅报价无效");
      }
      errorCode = "PAY-STORAGE";
      const requestId = marketSessionStorage.getItem(key) || crypto.randomUUID();
      marketSessionStorage.setItem(key, requestId);
      errorCode = "PAY-CONNECT";
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Eureka-Checkout": "1" },
        body: JSON.stringify({ requestId, market: "global", workspaceId: w.id, actor, kind, cycle: order.cycle || "month", quantity: kind === "credits" ? order.credits! / 1000 : kind === "personal" ? 1 : order.added }),
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) { errorCode = `PAY-CREATE-${response.status}`; throw Error(errorCode); }
      errorCode = "PAY-RESPONSE";
      const data = await response.json();
      const url = new URL(data.url);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".airwallex.com") || url.username || url.password) throw Error("返回的支付地址无效");
      if (!mounted.current || location.href !== originPage) { popup.close(); return; }
      popup.location.replace(url.href);
      const deadline = Date.now() + 30 * 60 * 1000;
      while (mounted.current && location.href === originPage && Date.now() < deadline) {
        errorCode = "PAY-VERIFY";
        const result = await fetch(`${endpoint}/${encodeURIComponent(data.id)}`, {
          headers: { "X-Eureka-Checkout": "1" }, signal: AbortSignal.timeout(45000),
        });
        if (!result.ok) { errorCode = `PAY-VERIFY-${result.status}`; throw Error(errorCode); }
        const status = await result.json();
        if (!mounted.current || location.href !== originPage) return;
        if (status.status === "COMPLETED" && (kind === "credits" || status.subscriptionId)) {
          errorCode = "PAY-APPLY";
          onPaid();
          popup.close(); window.focus();
          return;
        }
        if (["CANCELLED", "EXPIRED"].includes(status.status)) {
          errorCode = "PAY-EXPIRED";
          marketSessionStorage.removeItem(key);
          throw Error("结账已取消或过期，权益未增加，请重试");
        }
        if (popup.closed) return;
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      if (mounted.current) setError("支付结果待确认，请重试查询（错误码：PAY-PENDING）");
    } catch (e) {
      try { if (popup.location.href === "about:blank") popup.close(); } catch { /* Official checkout is cross-origin. */ }
      if (e instanceof Error && e.name === "TimeoutError") errorCode += "-TIMEOUT";
      if (mounted.current) setError(errorCode.startsWith("PAY-VERIFY") || errorCode === "PAY-APPLY"
        ? `支付结果待确认，请重试查询（错误码：${errorCode}）`
        : `暂时无法完成操作，请重试（错误码：${errorCode}）`);
    } finally { active.current = false; if (mounted.current) setPending(false); }
  }
  return { begin, pending, error };
}
