"use client";

import { useEffect, useState } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import { marketUrl, type Market } from "@/features/markets/config";
import { Auth } from "./auth";
import { DomesticEntry } from "./domestic-entry";
import "./auth-overlay.css";
import { useAuthOverlayBehavior } from "./use-auth-overlay-behavior";

export function AuthOverlay({ market, onClose, onSuccess }: {
  market: Market;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [edition, setEdition] = useState<"entry" | "personal">("entry");
  useEffect(() => {
    if (edition !== "entry") document.querySelector<HTMLInputElement>(".auth-overlay input")?.focus();
  }, [edition]);
  useAuthOverlayBehavior(true);
  return <ReferenceDialog className="auth-overlay market-surface" label={market === "cn" ? "登录百智" : "登录或注册 EurekaMind"} onClose={onClose}>
    <button className="auth-overlay-close" aria-label="关闭登录" onClick={onClose} type="button" data-autofocus>×</button>
    {market === "cn" && edition !== "entry" && <button type="button" className="auth-overlay-back" aria-label="返回版本选择" onClick={() => setEdition("entry")}>‹ 返回</button>}
    {market !== "cn" ? <Auth market={market} onSuccess={onSuccess} /> : edition === "entry" ? <DomesticEntry onSelect={selection => {
      if (selection === "enterprise") location.assign(marketUrl("cn", "enterprise/login/"));
      else setEdition("personal");
    }} /> : <Auth market="cn" onSuccess={onSuccess} />}
  </ReferenceDialog>;
}
