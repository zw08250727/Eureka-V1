"use client";

import { useEffect } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import type { Market } from "@/features/markets/config";
import { Auth } from "./auth";
import { DomesticEntry } from "./domestic-entry";
import "./auth-overlay.css";

export function AuthOverlay({ market, onClose, onSuccess, destination }: {
  market: Market;
  onClose: () => void;
  onSuccess: () => void;
  destination?: string;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLDialogElement>(".auth-overlay[open]");
      if (!dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled),a[href],input:not(:disabled),[tabindex='0']")).filter(node => node.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last) || !dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", trap); };
  }, []);
  return <ReferenceDialog className="auth-overlay market-surface" label={market === "cn" ? "登录百智" : "登录或注册 EurekaMind"} onClose={onClose}>
    <button className="auth-overlay-close" aria-label="关闭登录" onClick={onClose} type="button" data-autofocus>×</button>
    {market === "cn" ? <DomesticEntry destination={destination} /> : <Auth market={market} onSuccess={onSuccess} />}
  </ReferenceDialog>;
}
