"use client";

import { useState } from "react";
import Image from "next/image";
import { ReferenceDialog } from "@/features/reference/dialog";
import { RefIcon, Symbols } from "@/features/reference/symbols";
import { TodayOverview } from "@/features/workbench/components/today-overview";
import type { WorkbenchSnapshot } from "@/features/workbench/model/types";
import { productLogo, productName } from "./brand";
import type { Market } from "./config";
import { assetUrl, type AppView } from "@/lib/routes";
import "@/features/reference/workspace-navigation.css";
import "@/features/reference/ui-polish.css";
import "./guest-home.css";

export type HomeAction = "upload" | "agent" | "recording" | "notifications";
export type LoginIntent = { view?: AppView; id?: string; action?: HomeAction };
// A visitor never mounts account repositories or seeded personal/team records.
const empty: WorkbenchSnapshot = {
  actions: [], thoughts: [], meetings: [], spaces: [], recycled: [],
  accountName: "", contactCount: 0, personalPlan: "",
};
const navigation: { view: AppView; label: string; icon: string }[] = [
  { view: "home", label: "首页", icon: "home" },
  { view: "recording", label: "开始录音", icon: "mic" },
  { view: "contacts", label: "通讯录", icon: "user" },
  { view: "calendar", label: "日程与待办", icon: "task" },
  { view: "connectors", label: "连接器", icon: "link" },
];

export function GuestHome({ market, onLogin }: { market: Market; onLogin: (intent?: LoginIntent) => void }) {
  const [now] = useState(() => new Date());
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
      <button className="ws-switcher" onClick={() => onLogin()} aria-label="登录后进入工作空间">
        <span className="ws-space-avatar"><RefIcon name="user" className="ws-icon" /></span>
        <span className="ws-space-copy"><strong>我的工作空间</strong><small>登录，开启协作</small></span>
        <RefIcon name="chevron" className="ws-icon" />
      </button>
      <div className="sidebar-body"><nav className="nav sidebar-quick-nav" aria-label="快捷入口">
        {navigation.map(({ view, label, icon }) => <button key={view} className={`nav-item ${view === "home" ? "active" : ""}`} aria-current={view === "home" ? "page" : undefined} title={label} onClick={() => view === "home" ? setExpanded(false) : go(view)}>
          <span className="nav-left"><span className="nav-icon"><RefIcon name={icon} /></span><span className="nav-label">{label}</span></span>
        </button>)}
      </nav>
      <div className="guest-team-entry"><button className="ws-btn" onClick={() => go("create-team")}><RefIcon name="users" className="ws-icon" />创建团队</button><button className="ws-btn" onClick={() => go("invitations")}><RefIcon name="users" className="ws-icon" />加入团队</button></div>
      <div className="guest-public-links"><a href="https://eurekamind.ai/shop" target="_blank" rel="noopener noreferrer">商城 ↗</a><button onClick={() => setDownload(true)}>下载 App</button></div>
      </div>
      <div className="user-footer">
        <button className="guest-points-guide" onClick={() => go("credits")}><RefIcon name="spark" /><span>{market === "cn" ? "赚积分" : "赚 Credits"}<small>登录后解锁更多 AI 能力</small></span><span aria-hidden="true">›</span></button>
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
          <button className="ex-top-credits" onClick={() => go("credits")}>✦ {market === "cn" ? "积分" : "Credits"}</button>
          <button className="ex-top-credits guest-subscribe" onClick={() => go("subscription")}>升级会员</button>
          <button className="ex-top-credits" aria-label="所有通知" onClick={() => onLogin({ action: "notifications" })}><RefIcon name="bell" /></button>
          <a className="guest-hardware-link" href="https://eurekamind.ai/shop" target="_blank" rel="noopener noreferrer"><Image src={assetUrl("hardware-entry.png")} alt="" width={30} height={36} unoptimized /><span>智能记录，轻松协作</span></a>
          <button className="ex-top-credits" aria-label={`下载 ${productName(market)} App`} onClick={() => setDownload(true)}><RefIcon name="phone" /></button>
          <button className="guest-login-primary" onClick={() => onLogin()}>登录 / 注册</button>
        </div>
      </div></div>
      <div className="main-inner" data-main-view="home">
        <section className="recording-home" aria-label="录音工作首页"><div className="meeting-agent-grid"><div className="home-content-stack">
          <TodayOverview data={empty} now={now} title="记录此刻，让想法向前一步" guest agentOpen={false} onNavigate={go} onHomeAgent={() => onLogin({ action: "agent" })} onUpload={() => onLogin({ action: "upload" })} onToggle={() => onLogin()} />
          <div className="pa-archive-wrap"><section className="home-meeting-library" aria-labelledby="recent-meeting-title">
            <div className="home-meeting-head"><div className="meeting-library-copy"><h2 id="recent-meeting-title">我的会议</h2><p>每一次交流，都值得记录</p></div>
              <div className="home-meeting-toolbar">
                <button className="guest-search" onClick={() => onLogin()}><RefIcon name="search" />搜索会议</button>
                <button className="recording-recycle-entry" onClick={() => go("trash")}><RefIcon name="trash" /><span>录音回收站</span></button>
              </div>
            </div>
            <div className="guest-meeting-empty"><span className="guest-empty-icon"><RefIcon name="mic" /></span><h3>从你的第一场会议开始</h3><p>登录后查看会议记录、转写与智能总结</p><button className="guest-login-primary" onClick={() => onLogin()}>登录，开始记录</button></div>
          </section></div>
        </div></div></section>
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
