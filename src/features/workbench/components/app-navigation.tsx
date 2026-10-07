"use client";
import Image from "next/image";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { assetUrl, legacyUrl, prdUrl } from "@/lib/routes";
import type { WorkbenchSnapshot } from "../model/types";
const history = [
  ["本周会议决策整理", "今天"],
  ["研发周报自动整理", "09:00"],
  ["客户访谈高频问题", "昨天"],
  ["周报与行动项", "周五"],
];
export function Sidebar({
  collapsed,
  toggle,
  data,
  onHome,
  activeView = "home",
}: {
  collapsed: boolean;
  toggle: () => void;
  data: WorkbenchSnapshot | null;
  onHome: () => void;
  activeView?: string;
}) {
  const [menu, setMenu] = useState(false),
    [account, setAccount] = useState(false),
    [auto, setAuto] = useState(false);
  return (
    <aside
      className={`app-sidebar ${collapsed ? "is-collapsed" : ""}`}
      aria-label="主导航"
    >
      <div className="app-brand">
        <Image
          unoptimized
          src={assetUrl("eurekamind-logo.png")}
          alt=""
          width={34}
          height={34}
        />
        <span>
          <b>EurekaMind</b>
          <small>PC Workbench</small>
        </span>
        <Button
          variant="ghost"
          onClick={toggle}
          aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
        >
          <Icon name="panel" />
        </Button>
      </div>
      <div className="workspace-switch">
        <Button
          className="workspace-trigger"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <Icon name="user" />
          <span>
            <b>个人工作空间</b>
            <small>Personal · {data?.personalPlan || "标准版"}</small>
          </span>
          <Icon name="chevron" />
        </Button>
        {menu ? (
          <div className="nav-menu">
            <strong>切换工作空间</strong>
            {data?.spaces.map((w) => (
              <a
                key={w.id}
                href={legacyUrl("spaces", w.id)}
                onClick={() => {
                  if (w.id === "personal") {
                    onHome();
                    setMenu(false);
                  }
                }}
              >
                {w.name}
                {w.id !== "personal" ? <small>{w.members} 人</small> : null}
              </a>
            ))}
            <a href={legacyUrl("create-team")}>＋ 创建团队</a>
            <a href={legacyUrl("invitations")}>工作空间邀请</a>
            <Button variant="ghost" onClick={() => setMenu(false)}>
              关闭
            </Button>
          </div>
        ) : null}
      </div>
      <nav className="primary-nav">
        <button
          aria-current={activeView === "home" ? "page" : undefined}
          onClick={onHome}
        >
          <Icon name="home" />
          <span>首页</span>
        </button>
        <a href={legacyUrl("recording")}>
          <Icon name="mic" />
          <span>开始录音</span>
        </a>
        <a
          href={legacyUrl("calendar")}
          aria-current={activeView === "calendar" ? "page" : undefined}
        >
          <Icon name="task" />
          <span>日程与待办</span>
        </a>
        <a
          href={legacyUrl("contacts")}
          aria-current={activeView === "contacts" ? "page" : undefined}
        >
          <Icon name="user" />
          <span>联系人</span>
          <small>{data?.contactCount ?? 6}</small>
        </a>
      </nav>
      <div className="history-nav">
        <p>项目</p>
        <div className="history-tabs">
          <button aria-pressed={!auto} onClick={() => setAuto(false)}>
            全部任务
          </button>
          <button aria-pressed={auto} onClick={() => setAuto(true)}>
            自动任务
          </button>
        </div>
        {history
          .filter((_, i) => !auto || i % 2 === 1)
          .map(([title, time]) => (
            <a key={title} href={legacyUrl("history", title)}>
              <Icon
                name={time.includes(":") || time === "周五" ? "clock" : "chat"}
              />
              <span>{title}</span>
              <small>{time}</small>
            </a>
          ))}
      </div>
      <div className="account-nav">
        {account ? (
          <div className="nav-menu">
            <a href={legacyUrl("devices")}>设备与同步</a>
            <a href={legacyUrl("subscription")}>个人订阅</a>
            <a href={legacyUrl("settings")}>个人设置</a>
            <Button variant="ghost" onClick={() => setAccount(false)}>
              关闭
            </Button>
          </div>
        ) : null}
        <Button
          variant="ghost"
          aria-expanded={account}
          onClick={() => setAccount(!account)}
        >
          <span className="account-avatar">
            <Icon name="user" />
          </span>
          <b>{data?.accountName || "张伟"}’s Space</b>
          <Icon name="chevron" />
        </Button>
      </div>
    </aside>
  );
}
export function TopBar({
  toggleSidebar,
  title = "我的 AI 工作台",
}: {
  toggleSidebar: () => void;
  title?: string;
}) {
  const [download, setDownload] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!downloadRef.current?.contains(e.target as Node)) setDownload(false);
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") setDownload(false);
    }
    document.addEventListener("click", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <header className="app-topbar">
      <Button
        variant="ghost"
        className="mobile-menu"
        aria-label="展开导航"
        onClick={toggleSidebar}
      >
        <Icon name="panel" />
      </Button>
      <h1>{title}</h1>
      <div>
        <a className="prd-link" href={prdUrl} target="_blank" rel="noreferrer">
          需求评审 ↗
        </a>
        <a className="product-link" href="https://eurekamind.ai/shop">
          <Image
            unoptimized
            src={assetUrl("hardware-entry.png")}
            alt=""
            width={28}
            height={28}
          />
          <span>
            <b>EurekaMind</b>
            <small>智能记录，轻松协作</small>
          </span>
        </a>
        <div className="app-download-wrap" ref={downloadRef}>
          <button
            className="phone-link"
            aria-label="下载 EurekaMind App"
            aria-haspopup="dialog"
            aria-expanded={download}
            onClick={() => setDownload(!download)}
          >
            <Icon name="phone" />
          </button>
          {download ? (
            <div
              className="app-download-popover"
              role="dialog"
              aria-label="EurekaMind App 下载二维码"
            >
              <strong>EurekaMind App</strong>
              <p>扫码安装 App，绑定你的录音设备</p>
              <Image
                unoptimized
                src={assetUrl("download/eurekamind-app-qr.png")}
                alt="EurekaMind App 下载二维码"
                width={160}
                height={160}
              />
              <span>扫码下载 · App Store</span>
              <a
                href="https://apps.apple.com/us/app/eurekamind-ai-note-taker/id6742087483"
                target="_blank"
                rel="noreferrer"
              >
                Download App ↗
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
