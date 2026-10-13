"use client";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { basePath } from "@/lib/routes";
import { DomesticCredentials } from "@/features/auth/domestic-credentials";
import { useAuthReady } from "@/features/auth/use-auth-ready";
import { findEnterprise, type EnterpriseTenant } from "./model";
import "@/features/auth/auth.css";
import "@/features/auth/domestic-auth.css";
import "./login.css";

export function EnterpriseLoginForm() {
  const ready = useAuthReady();
  const [code, setCode] = useState("");
  const [tenant, setTenant] = useState<EnterpriseTenant>();
  const [error, setError] = useState("");
  function changeEnterprise() { setTenant(undefined); setError(""); setCode(""); }
  return <section className="enterprise-login-card" aria-label="百销企业认证">
    <div className="enterprise-auth-brand"><strong>百销</strong><span>企业工作台</span></div>
        {tenant ? <>
          <button type="button" className="enterprise-code-back" aria-label="返回企业代码" onClick={changeEnterprise}>‹ 返回企业代码</button>
          <div className="enterprise-tenant">
            {tenant.code === "bairong" ? <Image src={`${basePath}/assets/baizhi/auth/bairong-logo.jpg`} alt="企业标识" width={40} height={40} unoptimized /> : <span className="enterprise-tenant-placeholder" aria-hidden="true">企</span>}
            <h2>{tenant.name}</h2><button type="button" onClick={changeEnterprise}>更换企业</button>
          </div>
          <DomesticCredentials key={tenant.code} tenant={tenant} />
        </> : <form id="auth-form" className="enterprise-code-form" noValidate onSubmit={event => {
          event.preventDefault();
          if (!ready) return;
          const match = findEnterprise(code);
          if (!match) { setError("企业代码无效，请核对后重试。"); return; }
          setTenant(match); setError("");
        }}>
          <h2>企业登录</h2><p className="enterprise-login-desc">输入企业代码，进入企业专属工作台</p>
          <label className="sr-only" htmlFor="enterprise-code">企业代码</label>
          <div className="credential-input">
            <span className="credential-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M8 7V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M2 12a24 24 0 0 0 20 0"/></svg></span>
            <input data-autofocus disabled={!ready} id="enterprise-code" className="input" autoComplete="organization" autoCapitalize="characters" maxLength={12} placeholder="请输入企业代码" value={code} aria-invalid={!!error} aria-describedby="enterprise-code-help status" onChange={event => { setCode(event.target.value.toUpperCase()); setError(""); }} />
          </div>
          <p id="enterprise-code-help">不知道企业代码？请咨询企业管理员</p>
          <Button id="submit" className="enterprise-login-submit" type="submit" disabled={!ready || !code.trim()}>下一步</Button>
          <p id="status" className="enterprise-login-error" role="status">{error}</p>
        </form>}
  </section>;
}
