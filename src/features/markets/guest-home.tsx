"use client";

import { useState } from "react";
import Image from "next/image";
import { ReferenceDialog } from "@/features/reference/dialog";
import { RefIcon, Symbols } from "@/features/reference/symbols";
import { productLogo, productName } from "./brand";
import type { Market } from "./config";
import { assetUrl, type AppView } from "@/lib/routes";
import "@/features/reference/workspace-navigation.css";
import "@/features/reference/ui-polish.css";
import "./guest-home.css";

export type HomeAction = "upload" | "agent" | "recording" | "notifications";
export type LoginIntent = { view?: AppView; id?: string; action?: HomeAction };
// A visitor never mounts account repositories or seeded personal/team records.
const navigation: { view: AppView; label: string; icon: string }[] = [
  { view: "home", label: "首页", icon: "home" },
  { view: "recording", label: "开始录音", icon: "mic" },
  { view: "contacts", label: "通讯录", icon: "user" },
  { view: "calendar", label: "日程与待办", icon: "task" },
  { view: "connectors", label: "连接器", icon: "link" },
];

export function GuestHome({ market, onLogin }: { market: Market; onLogin: (intent?: LoginIntent) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [download, setDownload] = useState(false);
  function go(view: AppView, id?: string) {
    // Keep mobile navigation mounted so dismissing auth can restore its trigger.
    if (view === "recording") onLogin({ action: "recording" });
    else onLogin({ view, id });
  }
  return <div className="app guest-app" data-guest="true" data-nav-open={expanded}>
    <Symbols />
    <aside className="sidebar" id="guest-sidebar">
      <div className="brand-row"><div className="workspace-brand">
        <Image src={productLogo(market)} alt="" width={34} height={34} unoptimized />
        <div className="workspace-brand-copy"><strong>{productName(market)}</strong></div>
      </div><button className="guest-nav-close" aria-label="收起导航" onClick={() => setExpanded(false)}>×</button></div>
      <button className="ws-switcher" aria-label="个人工作区" onClick={() => onLogin()}>
        <span className="ws-space-avatar"><RefIcon name="user" className="ws-icon" /></span>
        <span className="ws-space-copy"><strong>个人工作区</strong></span>
        <RefIcon name="chevron" className="ws-icon" />
      </button>
      <div className="sidebar-body"><nav className="nav sidebar-quick-nav" aria-label="快捷入口">
        {navigation.map(({ view, label, icon }) => <button key={view} className={`nav-item ${view === "home" ? "active" : ""}`} aria-current={view === "home" ? "page" : undefined} title={label} onClick={() => view === "home" ? setExpanded(false) : go(view)}>
          <span className="nav-left"><span className="nav-icon"><RefIcon name={icon} /></span><span className="nav-label">{label}</span></span>
        </button>)}
      </nav>
      </div>
      <div className="user-footer">
        <button className="user-card" id="user-card" onClick={() => onLogin()} aria-label="登录 / 注册">
          <span className="user-avatar"><RefIcon name="user" /></span><span className="user-copy"><span className="user-name">登录 / 注册</span></span><RefIcon name="chevron" />
        </button>
      </div>
    </aside>
    {expanded && <button className="guest-nav-scrim" aria-label="关闭导航" onClick={() => setExpanded(false)} />}
    <main className="main">
      <div className="topbar"><div className="topbar-inner">
        <button className="guest-nav-toggle" aria-label="打开导航" aria-expanded={expanded} aria-controls="guest-sidebar" onClick={() => setExpanded(true)}>☰</button>
        <div className="page-crumb">我的 AI 工作台</div>
        <div className="topbar-right">
          <a className="guest-hardware-link" href="https://eurekamind.ai/shop" target="_blank" rel="noopener noreferrer"><Image src={assetUrl("hardware-entry.png")} alt="" width={30} height={36} unoptimized /><span>智能记录，轻松协作</span></a>
          <button className="ex-top-credits" aria-label="下载 App" onClick={() => setDownload(true)}><RefIcon name="phone" /><span>下载 App</span></button>
          <button className="guest-login-primary" onClick={() => onLogin()}>登录 / 注册</button>
        </div>
      </div></div>
      <div className="main-inner" data-main-view="home">
        <section className="guest-library" aria-labelledby="recent-meeting-title">
          <div className="guest-library-top">
            <nav className="guest-library-tabs" aria-label="内容分类">
              <button type="button" aria-current="page">我的会议</button>
              <button type="button" onClick={() => go("thoughts")}>我的闪念</button>
            </nav>
            <div className="guest-library-actions">
              <button type="button" className="guest-record" onClick={() => onLogin({ action: "recording" })}><RefIcon name="mic" />开始录音</button>
              <button type="button" onClick={() => onLogin({ action: "upload" })}><RefIcon name="upload" />上传</button>
              <button type="button" aria-label="Ask Agent" onClick={() => onLogin({ action: "agent" })}><RefIcon name="spark" />{market === "cn" ? "问问小智" : "Ask Agent"}</button>
            </div>
          </div>
          <div className="guest-library-heading">
            <h1 id="recent-meeting-title">我的会议</h1>
            <button className="guest-search" onClick={() => onLogin()}><RefIcon name="search" />搜索会议</button>
          </div>
          <div className="guest-meeting-empty">
            <RefIcon name="folder" />
            <h2>暂无内容</h2>
            <button className="guest-empty-login" onClick={() => onLogin()}>登录后查看</button>
          </div>
        </section>
      </div>
    </main>
    {download && <ReferenceDialog className="guest-download-dialog" label={`${productName(market)} App 下载`} onClose={() => setDownload(false)}>
      <header><h2>{productName(market)} App</h2><button aria-label="关闭下载" onClick={() => setDownload(false)}>×</button></header>
      <p>扫码安装 App，绑定你的录音设备</p>
      <Image src={assetUrl("download/eurekamind-app-qr.png")} alt="App 下载二维码" width={180} height={180} unoptimized />
      <a href="https://apps.apple.com/us/app/eurekamind-ai-note-taker/id6742087483" target="_blank" rel="noopener noreferrer">前往 App Store ↗</a>
    </ReferenceDialog>}
  </div>;
}
