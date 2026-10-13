"use client";
import { ReferenceDialog } from "@/features/reference/dialog";
import { marketUrl } from "@/features/markets/config";
import { EnterpriseLoginForm } from "./login-form";
import { useAuthReady } from "@/features/auth/use-auth-ready";
import "@/features/auth/auth-overlay.css";

export function EnterpriseLogin() {
  const ready = useAuthReady();
  return <main className="enterprise-login-page">{ready ? <ReferenceDialog className="auth-overlay market-surface" label="百销企业登录" onClose={() => location.assign(marketUrl("cn"))}>
    <button className="auth-overlay-close" aria-label="关闭登录" type="button" onClick={() => location.assign(marketUrl("cn"))}>×</button>
    <EnterpriseLoginForm />
  </ReferenceDialog> : <p role="status">正在打开百销登录…</p>}</main>;
}
