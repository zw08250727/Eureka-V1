"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AuthShowcase } from "./auth-showcase";
import Image from "next/image";
import { appUrl, assetUrl } from "@/lib/routes";
import "./auth.css";
export function Auth() {
  const [mode, setMode] = useState("login"),
    [email, setEmail] = useState("demo@eurekamind.com"),
    [code, setCode] = useState("123456"),
    [terms, setTerms] = useState(true),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function message(text: string) {
    setStatus(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(""), 2600);
  }
  const login = mode === "login";
  function enter(provider = false) {
    if (!terms) {
      setStatus("请先同意服务条款与隐私政策");
      return;
    }
    if (!provider && !/^\S+@\S+\.\S+$/.test(email)) {
      setStatus("请输入有效的邮箱地址");
      return;
    }
    if (!provider && !/^\d{6}$/.test(code)) {
      setStatus("请输入邮箱验证码（6 位数字）");
      return;
    }
    setBusy(true);
    location.replace(appUrl("home", "", "personal"));
  }
  return (
    <main className="auth">
      <section className="auth-form">
        <div className="brand">
          <Image
            className="mark"
            src={assetUrl("eurekamind-logo.png")}
            alt=""
            width={36}
            height={36}
            unoptimized
          />
          <div>
            <strong>EurekaMind</strong>
            <small>Personal & Team</small>
          </div>
        </div>
        <form
          id="auth-form"
          className="form"
          noValidate
          aria-busy={busy}
          onSubmit={(e) => {
            e.preventDefault();
            enter();
          }}
        >
          <h1>{login ? "欢迎回来" : "创建你的账号"}</h1>
          <p className="desc">
            {login
              ? "一个账号，连接个人灵感与团队协作。"
              : "从一个想法开始，与团队一起向前。"}
          </p>
          <div className="oauth">
            <Button
              id="google"
              type="button"
              disabled={busy}
              onClick={() => enter(true)}
            >
              <svg
                className="oauth-mark"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.8-1.76-5.59-4.13H3.07v2.59A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.95c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z"
                />
              </svg>
              {login ? "使用 Google 登录" : "使用 Google 注册"}
            </Button>
            <Button
              id="apple"
              type="button"
              disabled={busy}
              onClick={() => enter(true)}
            >
              <svg
                className="oauth-mark"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M16.7 1.4c.1 1.3-.4 2.6-1.2 3.5-.8.9-2 1.5-3.2 1.4-.2-1.2.4-2.5 1.1-3.3.8-.9 2.1-1.6 3.3-1.6ZM20.9 17.6c-.5 1.2-.8 1.8-1.5 2.8-.9 1.3-2.2 2.9-3.7 2.9-1.3 0-1.7-.8-3.5-.8s-2.2.8-3.5.8c-1.5 0-2.8-1.5-3.7-2.8C2.5 16.9 1.8 12 3.4 9.3a5.3 5.3 0 0 1 4.3-2.6c1.4 0 2.3.8 3.5.8 1.1 0 1.9-.8 3.5-.8 1.4 0 2.8.8 3.6 1.8-3.2 1.8-2.7 6.5.6 7.8l2 1.3Z" />
              </svg>
              {login ? "使用 Apple 登录" : "使用 Apple 注册"}
            </Button>
          </div>
          <div className="divider">
            <span>或使用邮箱</span>
          </div>
          <label className="label" htmlFor="email">
            邮箱地址
          </label>
          <input
            className="input"
            id="email"
            placeholder="name@company.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
            }}
          />
          <label className="label" htmlFor="code">
            验证码
          </label>
          <div className="code-row">
            <input
              className="input"
              id="code"
              placeholder="请输入 6 位验证码"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              className="plain"
              id="send"
              type="button"
              disabled={busy || sent}
              onClick={() => {
                if (!/^\S+@\S+\.\S+$/.test(email)) {
                  message("请输入有效的邮箱地址");
                  return;
                }
                setSent(true);
                message("演示验证码：123456");
              }}
            >
              {sent ? "已发送" : "获取验证码"}
            </Button>
          </div>
          <Button id="submit" className="primary" type="submit" disabled={busy}>
            {busy
              ? "正在进入首页…"
              : login
                ? "登录并进入首页"
                : "注册并进入首页"}
          </Button>
          <p className="auth-entry-note">登录后可创建或加入 Team 工作空间。</p>
          <label className="check">
            <input
              id="terms"
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <span>
              我已阅读并同意{" "}
              <a
                href="#"
                data-policy="terms"
                onClick={(e) => {
                  e.preventDefault();
                  message("服务条款预览");
                }}
              >
                服务条款
              </a>{" "}
              与{" "}
              <a
                href="#"
                data-policy="privacy"
                onClick={(e) => {
                  e.preventDefault();
                  message("隐私政策预览");
                }}
              >
                隐私政策
              </a>
              。
            </span>
          </label>
          <label className="check">
            <input id="updates" type="checkbox" defaultChecked />
            <span>接收 EurekaMind 产品更新与服务通知。</span>
          </label>
          <div id="status" className="status" role="status" aria-live="polite">
            {status}
          </div>
          <div className="switch">
            {login ? "还没有账号？" : "已有账号？"}{" "}
            <Button
              type="button"
              onClick={() => {
                setMode(login ? "register" : "login");
                setEmail("demo@eurekamind.com");
                setCode("123456");
                setTerms(true);
                setSent(false);
                setStatus("");
              }}
            >
              {login ? "立即注册" : "返回登录"}
            </Button>
          </div>
        </form>
      </section>
      <AuthShowcase />
    </main>
  );
}
