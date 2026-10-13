"use client";
import { useEffect, useRef, useState } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import { marketUrl } from "@/features/markets/config";
import { EnterpriseLoginForm } from "./login-form";
import { useAuthReady } from "@/features/auth/use-auth-ready";
import { useAuthOverlayBehavior } from "@/features/auth/use-auth-overlay-behavior";
import { EnterpriseGuestHome } from "./guest-home";
import "@/features/auth/auth-overlay.css";

export function EnterpriseLogin() {
  const ready = useAuthReady();
  const [open, setOpen] = useState(true);
  const loginTrigger = useRef<HTMLButtonElement>(null);
  useAuthOverlayBehavior(ready && open);
  useEffect(() => {
    if (!open) {
      // Direct entry has no trigger; a reopened dialog restores its own trigger.
      if (document.activeElement === document.body) loginTrigger.current?.focus();
      return;
    }
  }, [open]);
  return <>
    <EnterpriseGuestHome onLogin={() => setOpen(true)} loginRef={loginTrigger} />
    {!ready && <p role="status">正在打开百销登录…</p>}
    {ready && open && <ReferenceDialog className="auth-overlay market-surface" label="百销企业登录" onClose={() => setOpen(false)}>
    <button className="auth-overlay-close" aria-label="关闭登录" type="button" onClick={() => setOpen(false)}>×</button>
    <button className="auth-overlay-back" aria-label="返回版本选择" type="button" onClick={() => location.assign(marketUrl("cn", "?login=1"))}>‹ 返回</button>
    <EnterpriseLoginForm />
  </ReferenceDialog>}
  </>;
}
