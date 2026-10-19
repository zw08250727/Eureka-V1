"use client";
/* eslint-disable @next/next/no-img-element -- Shared reference brand preserves intrinsic asset sizing. */
import type { ButtonHTMLAttributes } from "react";
import { productName, productLogo } from "@/features/markets/brand";
import { marketConfig, routeMarket, type Market } from "@/features/markets/config";
import type { AppView } from "@/lib/routes";
import { RefIcon } from "./symbols";

export function SidebarBrand({market, collapsed, onCollapse}: {market?: Market; collapsed: boolean; onCollapse: () => void}) {
  return (<div className="brand-row">
            <div className="workspace-brand">
              <img
                src={productLogo(market)}
                width={34}
                height={34}
                alt={productName(market)}
              />
              <div className="workspace-brand-copy">
                <strong>{productName(market)}</strong>
                <span>{market ? `${marketConfig(market).label} · PC Workbench` : "PC Workbench"}</span>
              </div>
            </div>
            <button
              className="collapse-btn"
              type="button"
              aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
              aria-expanded={!collapsed}
              aria-controls="workspace-sidebar"
              title={collapsed ? "展开侧栏" : "收起侧栏"}
              onClick={onCollapse}
            >
              <svg className="icon" style={{ width: 17, height: 16 }}>
                <use href="#ico-collapse" />
              </svg>
            </button>
          </div>);
}

export function WorkspaceCard({name, description, team = false, ...props}: {name: string; description: string; team?: boolean} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (<button type="button" id="ws-switcher" className="ws-switcher" {...props}>
      <span className="ws-space-avatar"><RefIcon name={team ? "users" : "user"} className="ws-icon" /></span>
      <span className="ws-space-copy"><strong>{name}</strong><small>{description}</small></span>
      <RefIcon name="chevron" className="ws-icon" />
    </button>);
}

export function PrimaryNavigation({view, onNavigate}: {view: string; onNavigate: (view: AppView) => void}) {
  return (<nav className="nav sidebar-quick-nav" aria-label="快捷入口">
              <button
                className={
                  "nav-item " +
                  ([
                    "home",
                    "thoughts",
                    "history",
                    "meeting",
                    "create-team",
                    "invitations",
                    "tasks",
                  ].includes(view)
                    ? "active"
                    : "")
                }
                id="home-entry"
                aria-current={
                  [
                    "home",
                    "thoughts",
                    "history",
                    "meeting",
                    "create-team",
                    "invitations",
                    "tasks",
                  ].includes(view)
                    ? "page"
                    : undefined
                }
                type="button"
                aria-label="首页"
                title="首页"
                onClick={() => onNavigate("home")}
              >
                <span className="nav-left">
                  <span className="nav-icon">
                    <RefIcon name="home" />
                  </span>
                  <span className="nav-label">首页</span>
                </span>
              </button>
              <button
                className={`nav-item recording-nav-item${view === "recording" ? " active" : ""}`}
                aria-current={view === "recording" ? "page" : undefined}
                id="start-recording"
                type="button"
                aria-label="开始录音"
                title="开始录音"
                onClick={() => onNavigate("recording")}
              >
                <span className="nav-left">
                  <span className="nav-icon">
                    <RefIcon name="mic" />
                  </span>
                  <span className="nav-label">开始录音</span>
                </span>
              </button>
              <>
                  <div className="knowledge-tree-leaf-row team-only-root-entry">
                    <button
                      className={
                        "side-sub-item knowledge-leaf contacts-nav-entry " +
                        (view === "contacts" ? "active" : "")
                      }
                      data-contacts-entry="true"
                      type="button"
                      aria-label={"通讯录"}
                      title={"通讯录"}
                      onClick={() => onNavigate("contacts")}
                    >
                      <RefIcon name="user" />
                      <span className="tree-folder-name">{"通讯录"}</span>
                    </button>
                  </div>
                  {<button
                    type="button"
                    id="todos-entry" aria-label="日程与待办" title="日程与待办"
                    className={
                      "nav-item " + (view === "calendar" ? "active" : "")
                    }
                    onClick={() => onNavigate("calendar")}
                  >
                    <span className="nav-left">
                      <span className="nav-icon">
                        <svg className="icon" viewBox="0 0 24 24">
                          <path d="m3 5 2 2 3-4M11 5h10M3 12l2 2 3-4M11 12h10M3 19l2 2 3-4M11 19h10" />
                        </svg>
                      </span>
                      <span className="nav-label">日程与待办</span>
                    </span>
                  </button>}
              </>
              <button type="button" aria-label={routeMarket() === "global" ? "AI Connections" : "连接器"} title={routeMarket() === "global" ? "AI Connections" : "连接器"} className={"nav-item " + (view === "connectors" ? "active" : "")} onClick={()=>onNavigate("connectors")}><span className="nav-left"><span className="nav-icon"><RefIcon name="link"/></span><span className="nav-label">{routeMarket() === "global" ? "AI Connections" : "连接器"}</span></span></button>
            </nav>);
}
