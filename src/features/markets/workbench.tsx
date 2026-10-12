"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { appUrl } from "@/lib/routes";
import { marketUrl, type Market } from "./config";
import { readIdentity, scopedKey } from "./storage";
import { GuestHome, type LoginIntent } from "./guest-home";
const Application = dynamic(() => import("@/features/application/application").then(m => m.Application));
const AuthOverlay = dynamic(() => import("@/features/auth/auth-overlay").then(m => m.AuthOverlay));

export function MarketWorkbench({ market }: { market: Market }) {
  const [session, setSession] = useState<"loading" | "guest" | "member">("loading");
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const check = () => {
      try {
        const params = new URLSearchParams(location.search);
        const enterprise = market === "cn" && params.get("edition") === "enterprise";
        const signedIn = !!readIdentity(market);
        setError("");
        setSession(signedIn && !enterprise ? "member" : "guest");
        const protectedRoute = location.pathname === marketUrl(market, "workbench/") && (
          (params.get("view") || "home") !== "home" ||
          (params.get("space") || "personal") !== "personal" || params.has("action")
        );
        if (enterprise || (!signedIn && protectedRoute)) {
          setTarget(enterprise ? marketUrl(market, "workbench/?view=home&space=personal") : location.pathname + location.search);
        } else if (signedIn) setTarget(null);
      } catch {
        setSession("guest");
        setError("无法读取登录信息，请允许浏览器存储后重试。");
      }
    };
    const change = (event: StorageEvent) => {
      if (!event.key || event.key === scopedKey("eureka:auth:v1", market)) check();
    };
    check();
    window.addEventListener("storage", change);
    window.addEventListener("popstate", check);
    window.addEventListener("focus", check);
    return () => {
      window.removeEventListener("storage", change);
      window.removeEventListener("popstate", check);
      window.removeEventListener("focus", check);
    };
  }, [market]);
  function requestLogin(intent: LoginIntent = {}) {
    const destination = appUrl(intent.view || "home", intent.id || "", "personal");
    setTarget(destination + (intent.action ? `&action=${intent.action}` : ""));
  }
  function closeLogin() {
    setTarget(null);
    // A cancelled deep link becomes the public home; it cannot reopen on refresh.
    history.replaceState(null, "", marketUrl(market));
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  if (session === "loading") return <main className="market-loading" role="status">正在打开工作台…</main>;
  return <>
    {session === "member" ? <Application /> : <GuestHome market={market} onLogin={requestLogin} />}
    {error && <p className="guest-storage-error" role="alert">{error}</p>}
    {target && <AuthOverlay market={market} onClose={closeLogin} onSuccess={() => location.replace(target)} />}
  </>;
}
