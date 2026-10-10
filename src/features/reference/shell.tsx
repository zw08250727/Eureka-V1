"use client";
import "./workspace-navigation.css";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
/* The reference assets retain their original image sizing and decoding. */
/* eslint-disable @next/next/no-img-element */
import { createPortal } from "react-dom";
import { RefIcon, Symbols } from "./symbols";
import { appUrl, assetUrl, basePath, prdUrl, type AppView } from "@/lib/routes";
import { AgentScope } from "@/features/agent/history-button";
import { PageTitleContext } from "./page-title";
import { RecordingPermission } from "@/features/meetings/recording-permission";
import { CreateTeamDialog, InvitationsDialog } from "@/features/spaces/setup";
import { M } from "@/features/spaces/model/store";
import PS from "@/features/spaces/model/subscription";
import type { SpacesController } from "@/features/spaces/use-spaces";
export function ReferenceShell({
  children,
  title,
  view,
  space,
  actor,
  controller,
  reviewSwitch,
}: {
  children: ReactNode;
  title: string;
  view: string;
  space: string;
  actor: string;
  controller: SpacesController;
  reviewSwitch?: ReactNode;
}) {
  const [pageTitle, setPageTitle] = useState(title);
  const [recordRequest, setRecordRequest] = useState<{ id: string } | null>(
    null,
  );
  const [skipRecordPermission, setSkipRecordPermission] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      try { M.assertEntitlement(M.get(controller.state!, space), actor); } catch (e) { window.dispatchEvent(new CustomEvent("eureka:notice", { detail: (e as Error).message })); return; }
      if (skipRecordPermission)
        location.assign(appUrl("recording", detail.id, space, actor));
      else setRecordRequest(detail);
    };
    window.addEventListener("eureka:record-request", handler);
    return () => window.removeEventListener("eureka:record-request", handler);
  }, [space, actor, skipRecordPermission, controller.state]);
  const [setupDialog, setSetupDialog] = useState<
    "create" | "invitations" | null
  >(null);
  const data = controller.state!,
    w = M.get(data, space),
    team = w.type === "team",
    admin = M.admin(w, actor);
  const [collapsed, setCollapsed] = useState(false),
    [menu, setMenu] = useState<"spaces" | "account" | null>(null),
    [position, setPosition] = useState<CSSProperties>({}),
    [download, setDownload] = useState(false),
    [toast, setToast] = useState("");
  const menuRef = useRef<HTMLDivElement>(null),
    downloadRef = useRef<HTMLDivElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.personalOnly = "1";
    document.body.dataset.edition = "personal";
    document.body.dataset.workspace = "personal";
    document.body.dataset.wsType = w.type;
    document.body.classList.add("app-data-mode");
    const narrow = matchMedia("(max-width:1100px)").matches;
    root.dataset.sidebarCollapsed = String(narrow);
    const frame = requestAnimationFrame(() => setCollapsed(narrow));
    return () => {
      cancelAnimationFrame(frame);
      document.body.classList.remove("app-data-mode");
    };
  }, [team, w.type]);
  useEffect(() => {
    document.documentElement.dataset.sidebarCollapsed = String(collapsed);
  }, [collapsed]);
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!(e.target instanceof Element)) return;
      if (
        !menuRef.current?.contains(e.target) &&
        !e.target.closest("#user-card,#ws-switcher")
      )
        setMenu(null);
      if (!downloadRef.current?.contains(e.target)) setDownload(false);
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenu(null);
        setDownload(false);
      }
    }
    document.addEventListener("click", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", key);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    const listener = (e: Event) => notify((e as CustomEvent<string>).detail);
    window.addEventListener("eureka:notice", listener);
    return () => window.removeEventListener("eureka:notice", listener);
  }, []);
  function go(v: AppView, id = "", wid = space) {
    if (v === "recording") { window.dispatchEvent(new CustomEvent("eureka:record-request", { detail: { id } })); return; }
    location.assign(appUrl(v, id, wid, wid === "personal" ? data.account.id : actor));
  }
  function open(kind: "spaces" | "account", anchor: HTMLElement) {
    if (menu === kind) {
      setMenu(null);
      return;
    }
    const r = anchor.getBoundingClientRect();
    setPosition({
      left: Math.min(
        Math.max(12, r.left),
        innerWidth - Math.min(338, innerWidth - 24) - 12,
      ),
      ...(r.top > innerHeight / 2
        ? { bottom: innerHeight - r.top + 8 }
        : { top: Math.min(r.bottom + 8, innerHeight - 200) }),
    });
    setMenu(kind);
  }
  function notify(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }
  const nav = (label: string, icon: string, v: AppView, active = false) => (
    <button
      type="button"
      className={"ws-btn " + (active ? "active" : "")}
      onClick={() => go(v)}
    >
      <RefIcon name={icon} className="ws-icon" />
      {label}
    </button>
  );
  return (
    <PageTitleContext.Provider
      value={{ baseTitle: title, setTitle: setPageTitle }}
    >
      <AgentScope.Provider value={{ controller, space, actor }}>
      <Symbols />
      <div className="app">
        <aside className="sidebar" id="workspace-sidebar">
          <div className="brand-row">
            <div className="workspace-brand">
              <img
                src={assetUrl("eurekamind-logo.png?v=sidebar-brand-v2")}
                width={34}
                height={34}
                alt="EurekaMind"
              />
              <div className="workspace-brand-copy">
                <strong>EurekaMind</strong>
                <span>PC Workbench</span>
              </div>
            </div>
            <button
              className="collapse-btn"
              type="button"
              aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
              aria-expanded={!collapsed}
              aria-controls="workspace-sidebar"
              title={collapsed ? "展开侧栏" : "收起侧栏"}
              onClick={() => setCollapsed(!collapsed)}
            >
              <svg className="icon" style={{ width: 17, height: 16 }}>
                <use href="#ico-collapse" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            id="ws-switcher"
            className="ws-switcher"
            aria-controls="ws-menu"
            aria-expanded={menu === "spaces"}
            title={"切换工作空间：" + w.name}
            onClick={(e) => open("spaces", e.currentTarget)}
          >
            <span className="ws-space-avatar">
              <RefIcon name={team ? "users" : "user"} className="ws-icon" />
            </span>
            <span className="ws-space-copy">
              <strong>{w.name}</strong>
              <small>
                {team
                  ? `Team · ${admin ? "管理员" : "成员"} · ${w.members.filter((m) => m.status === "active").length} 位成员`
                  : "Personal · " + PS.current(w).plan}
              </small>
            </span>
            <RefIcon name="chevron" className="ws-icon" />
          </button>
          <div className="sidebar-body">
            <nav className="nav sidebar-quick-nav" aria-label="快捷入口">
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
                onClick={() => go("home")}
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
                onClick={() => go("recording")}
              >
                <span className="nav-left">
                  <span className="nav-icon">
                    <RefIcon name="mic" />
                  </span>
                  <span className="nav-label">开始录音</span>
                </span>
              </button>
              <>
                  {<button
                    type="button"
                    id="todos-entry"
                    className={
                      "nav-item " + (view === "calendar" ? "active" : "")
                    }
                    onClick={() => go("calendar")}
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
                      onClick={() => go("contacts")}
                    >
                      <RefIcon name="user" />
                      <span className="tree-folder-name">{"通讯录"}</span>
                    </button>
                  </div>
              </>
            </nav>
            <nav
              id="ws-team-nav"
              className="ws-team-nav"
              aria-label="团队工作区"
            >
              {team ? (
                <>
                  <div className="ws-nav-label">团队工作区</div>
                  {nav("团队成员", "users", "members", view === "members")}
                  {admin && nav("设备查看", "phone", "devices", view === "devices")}
                  {nav("空间设置", "task", "content-permissions", ["subscription", "space-settings", "content-permissions", "credits", "audit"].includes(view))}
                  <a
                    className="ws-btn"
                    href="https://wisenote-open-api.vercel.app/#_2"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="开放API调用"
                    title="开放API调用 · 在新标签页打开 API 文档"
                    style={{ textDecoration: "none" }}
                  >
                    <RefIcon name="link" className="ws-icon" />
                    开放API调用
                  </a>
                </>
              ) : null}
            </nav>
          </div>
          <div className="user-footer">
            <button
              className="user-card"
              id="user-card"
              aria-expanded={menu === "account"}
              aria-controls="ws-menu"
              type="button"
              aria-label={data.account.name + "‘s Space"}
              title={data.account.name + "‘s Space"}
              onClick={(e) => open("account", e.currentTarget)}
            >
              <span className="user-avatar">
                <svg className="icon" style={{ width: 15, height: 15 }}>
                  <use href="#ico-user" />
                </svg>
              </span>
              <div className="user-copy">
                <div className="user-name">{data.account.name}‘s Space</div>
              </div>
              <svg className="icon" style={{ color: "#8c8c8c" }}>
                <use href="#ico-chevron" />
              </svg>
            </button>
          </div>
        </aside>
        <main className="main">
          <div className="topbar">
            <div className="topbar-inner">
              <div className="page-crumb" id="page-crumb">
                {pageTitle}
              </div>
              <div className="topbar-right">
                {reviewSwitch}
                <a
                  className="prd-review-entry"
                  href={prdUrl}
                  target="_blank"
                  rel="noopener"
                  title="打开产品需求文档与评审"
                >
                  需求评审 <span aria-hidden="true">↗</span>
                </a>
                <button
                  className="record-promo"
                  id="hardware-top-promo"
                  aria-label="打开 EurekaMind 商城"
                  type="button"
                  onClick={() => location.assign("https://eurekamind.ai/shop")}
                >
                  <span className="promo-device">
                    <img
                      src={assetUrl("hardware-entry.png")}
                      alt="EurekaMind"
                    />
                  </span>
                  <span className="promo-copy">
                    <strong>EurekaMind</strong>
                    <span>智能记录，轻松协作</span>
                  </span>
                </button>
                <div className="top-actions">
                  <div
                    className={"app-download-entry " + (download ? "open" : "")}
                    id="app-download-entry"
                    ref={downloadRef}
                  >
                    <button
                      className="app-download-btn"
                      id="app-download-btn"
                      aria-label="下载 EurekaMind App"
                      aria-haspopup="dialog"
                      aria-expanded={download}
                      type="button"
                      onClick={() => setDownload(!download)}
                    >
                      <RefIcon name="phone" />
                    </button>
                    <div
                      className="app-qr-popover"
                      role="dialog"
                      aria-label="EurekaMind App 下载二维码"
                    >
                      <strong>EurekaMind App</strong>
                      <span>扫码安装 App，绑定你的录音设备</span>
                      <div className="app-qr-grid">
                        <div className="app-qr-item">
                          <img
                            src={assetUrl("download/eurekamind-app-qr.png")}
                            alt="EurekaMind App 下载二维码"
                          />
                          <strong>扫码下载</strong>
                          <span>App Store</span>
                        </div>
                      </div>
                      <a
                        className="appstore-download-link"
                        href="https://apps.apple.com/us/app/eurekamind-ai-note-taker/id6742087483"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                         ▷ Download App
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {children}
          {recordRequest ? (
            <RecordingPermission
              onClose={() => setRecordRequest(null)}
              onStart={(skip) => {
                setSkipRecordPermission(skip);
                location.assign(
                  appUrl("recording", recordRequest.id, space, actor),
                );
              }}
            />
          ) : null}
          {setupDialog === "create" ? (
            <CreateTeamDialog
              controller={controller}
              onClose={() => setSetupDialog(null)}
            />
          ) : setupDialog === "invitations" ? (
            <InvitationsDialog
              controller={controller}
              onClose={() => setSetupDialog(null)}
            />
          ) : null}
        </main>
      </div>
      <aside
        className="knowledge-xiaozhi-panel"
        id="knowledge-xiaozhi-panel"
        aria-hidden="true"
        inert
      />
      <aside className="drawer" id="drawer" aria-hidden="true" inert />
      {menu
        ? createPortal(
            <div
              id="ws-menu"
              className="ws-menu"
              role="dialog"
              aria-label={
                menu === "account" ? "我的账户与工作空间" : "切换工作空间"
              }
              data-mode={menu}
              style={position}
              ref={menuRef}
            >
              <div className="ws-menu-head">
                <span className="ws-space-avatar">
                  <RefIcon name={team ? "users" : "user"} className="ws-icon" />
                </span>
                <div>
                  <strong>{w.name}</strong>
                  <small>{data.account.email}</small>
                </div>
              </div>
              <div className="ws-menu-caption">工作空间 · 切换不移动内容，也不改变设备绑定</div>
              {data.spaces
                .filter((s) => M.member(s))
                .map((s) => (
                  <button
                    type="button"
                    className="ws-btn ws-menu-space"
                    key={s.id}
                    onClick={() => {
                      controller.change((x) => {
                        x.activeId = s.id;
                      });
                      location.assign(appUrl("home", "", s.id, "zhang"));
                    }}
                  >
                    <span className="ws-mini-avatar">
                      {s.type === "personal" ? "P" : s.name[0]}
                    </span>
                    <span>
                      {s.name}
                      <small>
                        {s.type === "personal"
                          ? "个人权益独立维护"
                          : (M.admin(s) ? "管理员" : "成员") +
                            " · " +
                            s.members.filter((m) => m.status === "active")
                              .length +
                            " 位成员"}
                      </small>
                    </span>
                    <b>{s.id === space ? "✓" : ""}</b>
                  </button>
                ))}
              <div className="ws-menu-divider" />
              <button
                type="button"
                className="ws-btn ws-menu-item"
                onClick={() => {
                  setMenu(null);
                  try { M.assertCanJoinTeam(data); setSetupDialog("create"); }
                  catch (e) { notify((e as Error).message); }
                }}
              >
                <RefIcon name="plus" className="ws-icon" />
                创建团队工作空间
              </button>
              <button
                type="button"
                className="ws-btn ws-menu-item"
                onClick={() => {
                  setMenu(null);
                  setSetupDialog("invitations");
                }}
              >
                <RefIcon name="users" className="ws-icon" />
                工作空间邀请{" "}
                <span className="ws-badge">
                  {
                    data.invitations.filter((i) => i.status === "pending")
                      .length
                  }
                </span>
              </button>
              {team && admin ? (
                <button
                  type="button"
                  className="ws-btn ws-menu-item"
                  onClick={() => go("members", "invite")}
                >
                  <RefIcon name="users" className="ws-icon" />
                  邀请空间成员
                </button>
              ) : null}
              {menu === "account" ? (
                <>
                  <div className="ws-menu-divider" />
                  {[
                    ["home", "mic", "会议录音"],
                    ["my-devices", "phone", "我的设备"],
                    ["subscription", "task", team ? "订阅与席位" : "个人订阅"],
                    ["settings", "edit", "个人设置"],
                  ].map(([v, icon, label]) => (
                    <button
                      type="button"
                      className="ws-btn ws-menu-item"
                      key={v}
                      onClick={() => go(v as AppView)}
                    >
                      <RefIcon name={icon} className="ws-icon" />
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="ws-btn ws-menu-item"
                    onClick={() => location.assign(basePath + "/")}
                  >
                    <RefIcon name="collapse" className="ws-icon" />
                    退出登录
                  </button>
                </>
              ) : null}
              <p className="ws-menu-note">同一账号 · 各空间的数据与订阅独立</p>
            </div>,
            document.body,
          )
        : null}
      <div className={"toast " + (toast ? "show" : "")} role="status">
        {toast}
      </div>
      </AgentScope.Provider>
    </PageTitleContext.Provider>
  );
}
