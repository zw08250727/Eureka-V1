"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { EnterpriseEntryToast } from "./enterprise-entry-toast";
import { productLogo } from "@/features/markets/brand";
import { marketUrl } from "@/features/markets/config";
import { signIn } from "@/features/markets/storage";
import { enterprise, signInEnterprise } from "@/features/enterprise/model";
import "./domestic-auth.css";

export function DomesticAuth({ onSuccess }: { onSuccess?: () => void }) {
  const [edition, setEdition] = useState("personal");
  const [enterpriseEntry, setEnterpriseEntry] = useState(0);
  const [method, setMethod] = useState("phone");
  const [tenantCode, setTenantCode] = useState("");
  const [tenantReady, setTenantReady] = useState(false);
  const [identity, setIdentity] = useState("");
  const [code, setCode] = useState("");
  const [terms, setTerms] = useState(false);
  const [status, setStatus] = useState("");
  const [remaining, setRemaining] = useState(0);
  const codeExpiry = useRef(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the browser URL target after static hydration.
    if (new URLSearchParams(location.search).get("edition") === "enterprise") setEdition("enterprise");
  }, []);
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining(Math.max(0, Math.ceil((codeExpiry.current - Date.now()) / 1000))), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  const enterpriseMode = edition === "enterprise";
  const choosingTenant = enterpriseMode && !tenantReady;
  function resetCredentials() { setIdentity(""); setCode(""); setTerms(false); setStatus(""); setRemaining(0); }
  function validIdentity() {
    const valid = method === "phone" ? /^1[3-9]\d{9}$/.test(identity.trim()) : /^\S+@\S+\.\S+$/.test(identity.trim());
    if (!valid) setStatus(method === "phone" ? "请输入有效的手机号" : "请输入有效的邮箱地址");
    return valid;
  }
  function submit() {
    setStatus("");
    if (choosingTenant) {
      if (tenantCode.trim() !== enterprise.code) { setStatus("企业代码无效，请核对后重试。"); return; }
      setTenantReady(true); resetCredentials(); return;
    }
    if (!validIdentity()) return;
    if (!terms) { setStatus("请先阅读并同意用户服务协议和隐私政策"); return; }
    if (!["111111", "123456"].includes(code.trim())) { setStatus("验证码错误或已过期，请重新输入。"); return; }
    try {
      if (enterpriseMode) signInEnterprise(tenantCode.trim(), identity.trim());
      else signIn("cn", identity.trim().toLowerCase(), method);
      setBusy(true);
      if (!enterpriseMode && onSuccess) { onSuccess(); return; }
      location.replace(marketUrl("cn", enterpriseMode ? "enterprise/" : "workbench/?view=home&space=personal"));
    } catch (error) { setStatus(error instanceof Error ? error.message : "登录信息保存失败，请稍后重试。"); }
  }
  return <main className="auth auth-centered domestic-auth">
    <section className="auth-form">
      <div className="brand"><Image className="baizhi-mark" src={productLogo("cn")} alt="" width={32} height={40} unoptimized /><strong>百智</strong></div>
      <form className="form" id="auth-form" noValidate aria-busy={busy} onSubmit={event => { event.preventDefault(); submit(); }}>
        <h1>{tenantReady && enterpriseMode ? enterprise.name : "欢迎登录"}</h1>
        <p className="desc">{enterpriseMode ? "登录企业工作台" : "欢迎来到百智，新用户将自动注册"}</p>
        <div className="auth-editions" role="group" aria-label="登录版本">
          {[['personal', '个人/团队版'], ['enterprise', '企业版']].map(([value, label]) => <button key={value} type="button" aria-pressed={edition === value} onClick={() => { setEdition(value); if (value === "enterprise") setEnterpriseEntry(current => current + 1); setTenantReady(false); setTenantCode(""); resetCredentials(); }}>{label}</button>)}
        </div>
        {choosingTenant ? <>
          <label className="label" htmlFor="enterprise-code">企业代码</label>
          <input className="input" id="enterprise-code" placeholder="请输入企业代码" value={tenantCode} onChange={event => setTenantCode(event.target.value)} autoComplete="organization" />
          <p className="enterprise-code-help">不知道企业代码？请咨询企业管理员</p>
        </> : <>
          {enterpriseMode && <button className="change-enterprise" type="button" onClick={() => { setTenantReady(false); resetCredentials(); }}>更换企业</button>}
          <div className="auth-methods" role="group" aria-label="登录方式">{[['phone', '手机号'], ['email', '邮箱']].map(([value, label]) => <button key={value} type="button" aria-pressed={method === value} onClick={() => { setMethod(value); resetCredentials(); }}>{label}</button>)}</div>
          <label className="label" htmlFor={method === "phone" ? "phone" : "email"}>{method === "phone" ? "手机号" : "邮箱地址"}</label>
          <input className="input" id={method === "phone" ? "phone" : "email"} type={method === "phone" ? "tel" : "email"} autoComplete={method === "phone" ? "tel" : "email"} placeholder={method === "phone" ? "请输入手机号" : "请输入邮箱地址"} value={identity} onChange={event => { setIdentity(event.target.value); setCode(""); setRemaining(0); }} />
          <label className="label" htmlFor="code">验证码</label>
          <div className="code-row"><input className="input" id="code" inputMode="numeric" autoComplete="one-time-code" placeholder="请输入 6 位验证码" maxLength={6} value={code} onChange={event => setCode(event.target.value)} /><Button className="plain" id="send" type="button" disabled={busy || remaining > 0} onClick={() => { if (validIdentity()) { codeExpiry.current = Date.now() + 60000; setRemaining(60); setCode("111111"); setStatus("验证码已发送"); } }}>{remaining ? `${remaining}s 后重新获取` : "获取验证码"}</Button></div>
          <label className="check"><input id="terms" type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} /><span>我已阅读并同意 <a href="https://100wiser.com/index" target="_blank" rel="noopener noreferrer">《用户服务协议》</a> 和 <a href="https://100wiser.com/index" target="_blank" rel="noopener noreferrer">《隐私政策》</a></span></label>
        </>}
        <Button id="submit" className="primary" type="submit" disabled={busy}>{busy ? "正在登录…" : choosingTenant ? "下一步" : "登录"}</Button>
        <div className="status" id="status" role="status" aria-live="polite">{status}</div>
      </form>
    </section>
    {enterpriseMode && <EnterpriseEntryToast key={enterpriseEntry} />}
  </main>;
}
