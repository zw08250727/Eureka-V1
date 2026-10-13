"use client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { marketUrl } from "@/features/markets/config";
import { signIn } from "@/features/markets/storage";
import { signInEnterprise, type EnterpriseTenant } from "@/features/enterprise/model";
import { useAuthReady } from "./use-auth-ready";

export function DomesticCredentials({ tenant, onSuccess }: { tenant?: EnterpriseTenant; onSuccess?: () => void }) {
  const ready = useAuthReady();
  const [method, setMethod] = useState("phone");
  const [identity, setIdentity] = useState("");
  const [code, setCode] = useState("");
  const [terms, setTerms] = useState(false);
  const [status, setStatus] = useState("");
  const [remaining, setRemaining] = useState(0);
  const codeExpiry = useRef(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining(Math.max(0, Math.ceil((codeExpiry.current - Date.now()) / 1000))), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  function resetCredentials() { setIdentity(""); setCode(""); setTerms(false); setStatus(""); setRemaining(0); }
  function validIdentity() {
    const valid = method === "phone" ? /^1[3-9]\d{9}$/.test(identity.trim()) : /^\S+@\S+\.\S+$/.test(identity.trim());
    if (!valid) setStatus(method === "phone" ? "请输入有效的手机号" : "请输入有效的邮箱地址");
    return valid;
  }
  function submit() {
    if (!ready || busy) return;
    setStatus("");
    if (!validIdentity()) return;
    if (!terms) { setStatus("请先阅读并同意用户服务协议和隐私政策"); return; }
    if (!["111111", "123456"].includes(code.trim())) { setStatus("验证码错误或已过期，请重新输入。"); return; }
    try {
      if (tenant) signInEnterprise(tenant.code, identity.trim());
      else signIn("cn", identity.trim().toLowerCase(), method);
      setBusy(true);
      if (onSuccess) { onSuccess(); return; }
      location.replace(marketUrl("cn", tenant ? "enterprise/" : "workbench/?view=home&space=personal"));
    } catch (error) { setStatus(error instanceof Error ? error.message : "登录信息保存失败，请稍后重试。"); }
  }
  return <form className={`form ${tenant ? "enterprise-credentials" : ""}`} id="auth-form" noValidate aria-busy={busy} onSubmit={event => { event.preventDefault(); submit(); }}>
    <div className="auth-methods" role="group" aria-label="登录方式">{([["phone", "手机号"], ["email", "邮箱"]] as const).map(([value, label]) => <button key={value} type="button" disabled={!ready || busy} aria-pressed={method === value} onClick={() => { setMethod(value); resetCredentials(); }}>{label}</button>)}</div>
    {tenant && <p className="enterprise-method-help">{method === "phone" ? <>使用企业登记的 <strong>手机号</strong>，通过短信验证码完成登录。</> : <>使用企业分配的 <strong>企业邮箱</strong>，通过邮箱验证码完成登录。</>}</p>}
    <label className={tenant ? "sr-only" : "label"} htmlFor={method}>{method === "phone" ? "手机号" : "邮箱地址"}</label>
    <div className="credential-input">
      {tenant && <span className="credential-icon" aria-hidden="true">{method === "phone" ? <svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg> : <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7L22 6"/></svg>}</span>}
      <input disabled={!ready || busy} className="input" id={method} type={method === "phone" ? "tel" : "email"} autoComplete={method === "phone" ? "tel" : "email"} placeholder={method === "phone" ? "请输入手机号" : "请输入邮箱地址"} maxLength={method === "phone" ? 11 : 254} value={identity} onChange={event => { setIdentity(event.target.value); setCode(""); setRemaining(0); setStatus(""); }} />
    </div>
    <label className={tenant ? "sr-only" : "label"} htmlFor="code">验证码</label>
    <div className="code-row credential-input">
      {tenant && <span className="credential-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 2 8 4v6c0 5-5 9-8 10-3-1-8-5-8-10V6Z"/><path d="m8 12 3 3 5-6"/></svg></span>}
      <input disabled={!ready || busy} className="input" id="code" inputMode="numeric" autoComplete="one-time-code" placeholder="请输入验证码" maxLength={6} value={code} onChange={event => setCode(event.target.value)} />
      <Button className="plain" id="send" type="button" disabled={!ready || busy || remaining > 0} onClick={() => { if (validIdentity()) { codeExpiry.current = Date.now() + 60000; setRemaining(60); setCode("111111"); setStatus("验证码已发送"); } }}>{remaining ? `${remaining}s 后重新获取` : "获取验证码"}</Button>
    </div>
    <label className="check"><input disabled={!ready || busy} id="terms" type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} /><span>我已阅读并同意 <a href="https://100wiser.com/index" target="_blank" rel="noopener noreferrer">《用户服务协议》</a> 和 <a href="https://100wiser.com/index" target="_blank" rel="noopener noreferrer">《隐私政策》</a></span></label>
    <Button id="submit" className="primary" type="submit" disabled={!ready || busy}>{busy ? "正在登录…" : "登录"}</Button>
    <div className="status" id="status" role="status" aria-live="polite">{status}</div>
  </form>;
}
