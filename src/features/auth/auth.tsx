"use client";
import { useState, useRef, useEffect } from "react";
import { appUrl } from "@/lib/routes";
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
          <div className="brand">
            <span className="mark">e·</span>
            <div>
              <strong>EurekaMind</strong>
              <small>Personal workspace</small>
            </div>
          </div>
          <h1>{login ? "欢迎回来" : "创建你的账号"}</h1>
          <p className="desc">
            {login
              ? "使用你的 EurekaMind 账号进入个人工作台。"
              : "注册后即可进入个人工作台。"}
          </p>
          <div className="oauth">
            <button
              id="google"
              type="button"
              disabled={busy}
              onClick={() => enter(true)}
            >
              <span className="oauth-mark google">G</span>
              {login ? "使用 Google 登录" : "使用 Google 注册"}
            </button>
            <button
              id="apple"
              type="button"
              disabled={busy}
              onClick={() => enter(true)}
            >
              <span className="oauth-mark apple">●</span>
              {login ? "使用 Apple 登录" : "使用 Apple 注册"}
            </button>
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
            onChange={(e) => setEmail(e.target.value)}
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
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
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
            </button>
          </div>
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
          <button id="submit" className="primary" type="submit" disabled={busy}>
            {busy
              ? "正在进入首页…"
              : login
                ? "登录并进入首页"
                : "注册并进入首页"}
          </button>
          <p className="auth-demo">
            交互演示：邮箱与第三方登录均使用模拟账号。
          </p>
          <div id="status" className="status" role="status" aria-live="polite">
            {status}
          </div>
          <div className="switch">
            {login ? "还没有账号？" : "已有账号？"}{" "}
            <button
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
            </button>
          </div>
        </form>
      </section>
      <section className="auth-visual">
        <div className="visual-inner">
          <span className="visual-kicker">
            <i /> EurekaMind Personal workspace
          </span>
          <h2>
            把每一次交流，
            <br />
            变成个人知识资产。
          </h2>
          <p>
            记录会议、沉淀闪念、协作跟进，在同一个空间里把想法推进到下一步。
          </p>
          <div className="workspace-preview">
            <div className="preview-top">
              <span className="preview-dot" />
              个人 AI 工作台
            </div>
            <div className="preview-grid">
              <div className="preview-side">
                {["首页", "开始录音", "联系人"].map((t, i) => (
                  <div
                    key={t}
                    className={"preview-nav " + (!i ? "active" : "")}
                  >
                    {t}
                  </div>
                ))}
              </div>
              <div className="preview-main">
                <div className="preview-card">
                  <strong>我的会议</strong>
                  <span>管理录音、转写、纪要和待办</span>
                </div>
                <div className="preview-card">
                  <strong>Ask Agent</strong>
                  <span>围绕当前页面继续工作</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="visual-footer">
          登录后进入个人工作台 · 记录会议与整理知识
        </div>
      </section>
    </main>
  );
}
