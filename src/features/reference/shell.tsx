"use client";
import { ReviewFloatingButton } from "./review-floating-button";
import { CreditReviewProvider, AgentCreditPreview } from "@/features/agent/credit-preview";
import { SidebarBrand, WorkspaceCard, PrimaryNavigation } from "./sidebar-parts";
import { creditText } from "@/features/markets/config";
import { reviewToolsEnabled } from "@/features/markets/review";

import { productName } from "@/features/markets/brand";

import { routeMarket } from "@/features/markets/config";
import { signOut } from "@/features/markets/storage";
import { Select } from "@/components/ui/select";
import { ChainLinkIcon } from "@/components/ui/chain-icon";
import "./workspace-navigation.css";
import "./ui-polish.css";
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
import { ReferenceDialog } from "./dialog";
import { RefIcon, Symbols } from "./symbols";
import { appUrl, assetUrl, basePath, prdUrl, type AppView } from "@/lib/routes";
import { AgentScope } from "@/features/agent/history-button";
import { PageTitleContext } from "./page-title";
import { RecordingPermission } from "@/features/meetings/recording-permission";
import { CreateTeamDialog, InvitationsDialog } from "@/features/spaces/setup";
import { M } from "@/features/spaces/model/store";
import dynamic from "next/dynamic";
import { DomesticPointsEntry, DomesticPointsGuide } from "@/features/account/domestic-points";
import { claimReward } from "@/features/account/rewards";
import { CreditsPromo, openAccount, type AccountPanel } from "@/features/account/experience";
const TemplatePreferences=dynamic(()=>import("@/features/meetings/template-picker").then(m=>m.TemplatePreferences));
const AccountExperience = dynamic(() => import("@/features/agent/account-panel").then(m => m.AgentAccountPanel));
import { AgentSettlementSync } from "@/features/agent/settlement-sync";
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
  const [mobileNav, setMobileNav] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [templatePreferences,setTemplatePreferences]=useState(false);
  useEffect(()=>{const open=()=>setTemplatePreferences(true);window.addEventListener("eureka:templates",open);return()=>window.removeEventListener("eureka:templates",open)},[]);
  const [accountPanel,setAccountPanel]=useState<AccountPanel>(null);
  useEffect(()=>{const open=(e:Event)=>{setAccountPanel((e as CustomEvent<AccountPanel>).detail);setMenu(null);setMobileNav(false)};window.addEventListener("eureka:account-panel",open);return()=>window.removeEventListener("eureka:account-panel",open)},[]);
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
        innerWidth - Math.min(routeMarket() === "cn" && kind === "account" ? 300 : 338, innerWidth - 24) - 12,
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
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      onClick={() => go(v)}
    >
      <RefIcon name={icon} className="ws-icon" />
      <span className="ws-nav-text">{label}</span>
    </button>
  );
  return (
    <PageTitleContext.Provider
      value={{ baseTitle: title, setTitle: setPageTitle }}
    >
      <AgentScope.Provider value={{ controller, space, actor }}>
      <CreditReviewProvider key={`${space}:${actor}:${view}`} workspace={w} actor={actor} onSend={() => setReviewOpen(false)}>
      <Symbols />
      <div className="app">
        <aside className="sidebar" id="workspace-sidebar">
          <SidebarBrand market={routeMarket() || undefined} collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />
          <WorkspaceCard name={w.name}
            description={team ? `Team · ${admin ? "管理员" : "成员"} · ${w.members.filter((m) => m.status === "active").length} 位成员` : "Personal · " + PS.current(w).plan}
            team={team} aria-controls="ws-menu" aria-expanded={menu === "spaces"}
            title={"切换工作空间：" + w.name} onClick={(e) => open("spaces", e.currentTarget)} />
          <div className="sidebar-body">
            <PrimaryNavigation view={view} onNavigate={go} />
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
                  {nav("空间设置", "task", "space-settings", ["subscription", "space-settings", "content-permissions", "credits", "audit"].includes(view))}
                  <a
                    className="ws-btn"
                    href="https://wisenote-open-api.vercel.app/#_2"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="开放API调用"
                    title="开放API调用 · 在新标签页打开 API 文档"
                    style={{ textDecoration: "none" }}
                  >
                    <ChainLinkIcon className="ws-icon" />
                    <span className="ws-nav-text">开放API调用</span>
                  </a>
                </>
              ) : null}
            </nav>
          </div>

          <div className="user-footer">
          {routeMarket() === "cn" ? <DomesticPointsGuide w={w} actor={actor} onPanel={openAccount}/> : <button className={"ex-top-credits ex-lower-credits" + (team ? " credit-recharge-cta" : "")} aria-label={team ? "充值 Credits" : "做任务赚 Credits"} title={team ? "充值 Credits" : "做任务赚 Credits"} disabled={team && !M.admin(w, actor)} onClick={()=>openAccount(team?"recharge":"tasks")}><span className="credits-guide-icon" aria-hidden="true">✦</span><span className="credits-guide-copy">{team?creditText("充值 Credits"):creditText("做任务赚 Credits")}</span><span className="credits-guide-chevron" aria-hidden="true">›</span></button>}
            <button
              className="user-card"
              id="user-card"
              aria-expanded={menu === "account"}
              aria-controls="ws-menu"
              type="button"
              aria-label={data.account.email}
              title={data.account.email}
              onClick={(e) => open("account", e.currentTarget)}
            >
              <span className="user-avatar">
                <svg className="icon" style={{ width: 15, height: 15 }}>
                  <use href="#ico-user" />
                </svg>
              </span>
              <div className="user-copy">
                <div className="user-name">{data.account.email}</div>
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
              <button className="mobile-nav-trigger" aria-label="打开导航" onClick={() => setMobileNav(true)}><span aria-hidden="true">☰</span><span>导航</span></button>
              <div className="page-crumb" id="page-crumb">
                {pageTitle}
              </div>
              <div className="topbar-right">
                {routeMarket() === "cn" ? <DomesticPointsEntry key={`${space}:${actor}`} w={w} actor={actor} onPanel={openAccount}/> : <button className="ex-top-credits" onClick={()=>openAccount("credits")}>✦ {M.creditBalance(w).toLocaleString()}{creditText(" Credits")}</button>}
                <button className="ex-top-credits" aria-label="所有通知" onClick={()=>openAccount("notifications")}><RefIcon name="bell"/></button>
                <button
                  className="record-promo"
                  id="hardware-top-promo"
                  aria-label={`打开 ${productName()} 商城`}
                  type="button"
                  onClick={() => location.assign("https://eurekamind.ai/shop")}
                >
                  <span className="promo-device">
                    <img
                      src={assetUrl("hardware-entry.png")}
                      alt={productName()}
                    />
                  </span>
                  <span className="promo-copy">
                    <strong>{productName()}</strong>
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
                      aria-label={`下载 ${productName()} App`}
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
                      aria-label={`${productName()} App 下载二维码`}
                    >
                      <strong>{productName()} App</strong>
                      <span>扫码安装 App，绑定你的录音设备</span>
                      <div className="app-qr-grid">
                        <div className="app-qr-item">
                          <img
                            src={assetUrl("download/eurekamind-app-qr.png")}
                            alt={`${productName()} App 下载二维码`}
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
                menu === "account" ? "我的账户" : "切换工作空间"
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
                  <strong>{menu === "account" ? data.account.name : w.name}</strong>
                  <small>{data.account.email}</small>
                </div>
              </div>
              {menu === "spaces" && <>
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
                disabled={!!M.accountTeam(data, data.account.id)}
                title={M.accountTeam(data, data.account.id) ? "最多一个 Team，请先由原团队管理员移除成员资格" : undefined}
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
              </>}
              {menu === "account" ? (
                <>
                  <CreditsPromo w={w} actor={actor} onSignin={() => { try { controller.change(st => claimReward(M.get(st, space), actor, "signin")); } catch(e) { notify((e as Error).message); } }}/>
                  {[
                    ["home", "mic", "会议录音"],
                    ["my-devices", "phone", "我的设备"],
                    ["subscription", "task", team ? "订阅与席位" : "个人订阅"],
                    ["settings", "edit", "个人设置"],
                    ["updates", "clock", "更新日志"],
                    ["product", "file", "产品介绍"],
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
                    onClick={signOut}
                  >
                    <RefIcon name="collapse" className="ws-icon" />
                    退出登录
                  </button>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
      {mobileNav && <ReferenceDialog className="ex-dialog mobile-nav-dialog" label="工作台导航" onClose={() => setMobileNav(false)}>
        <header className="ex-head"><h2>工作台导航</h2><button className="ex-close" aria-label="关闭导航" onClick={() => setMobileNav(false)}>×</button></header>
        <div className="ex-body">
          <label className="mobile-space-picker">当前工作区<Select aria-label="切换工作区" value={space} onChange={e => go("home", "", e.target.value)}>{data.spaces.filter(s => M.member(s)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></label>
          <div className="mobile-space-actions"><button disabled={!!M.accountTeam(data, data.account.id)} title={M.accountTeam(data, data.account.id) ? "每个账号最多加入或创建一个团队" : "创建团队"} onClick={() => { try { M.assertCanJoinTeam(data); setMobileNav(false); setSetupDialog("create"); } catch(e) { notify((e as Error).message); } }}>创建团队</button><button onClick={() => { setMobileNav(false); setSetupDialog("invitations"); }}>工作空间邀请</button></div>
          <nav className="mobile-nav-links" aria-label="工作区功能">{([["home","首页"],["recording","开始录音"],["contacts","通讯录"],["calendar","日程与待办"],["connectors",routeMarket() === "global" ? "AI Connections" : "连接器"],...(team ? [["members","团队成员"],...(admin ? [["devices","设备查看"],["space-settings","空间设置"]] : [])] : [])] as [AppView,string][]).map(([v,label]) => <button key={v} aria-current={view === v ? "page" : undefined} onClick={() => {setMobileNav(false);go(v)}}>{label}<span aria-hidden="true">→</span></button>)}</nav>
          <div className="mobile-nav-account"><span>我的账户</span><CreditsPromo w={w} actor={actor} onSignin={() => { try { controller.change(st => claimReward(M.get(st, space), actor, "signin")); } catch(e) { notify((e as Error).message); } }}/><nav className="mobile-nav-links" aria-label="账户功能">{([["settings","个人设置"],["subscription",team ? "订阅与席位" : "个人订阅"],["my-devices","我的设备"],["updates","更新日志"],["product","产品介绍"]] as [AppView,string][]).map(([v,label]) => <button key={v} onClick={() => go(v)}>{label}<span aria-hidden="true">→</span></button>)}</nav></div>
        </div>
      </ReferenceDialog>}
      {view !== "connectors" && reviewToolsEnabled() && <ReviewFloatingButton expanded={reviewOpen} onOpen={() => { setMenu(null); setMobileNav(false); setReviewOpen(true); }}/>}
      {view !== "connectors" && reviewOpen && <ReferenceDialog className="ex-dialog review-tools-dialog" label="评审工具" onClose={()=>setReviewOpen(false)}>
        <header className="ex-head"><h2>评审工具</h2><button className="ex-close" aria-label="关闭评审工具" onClick={()=>setReviewOpen(false)}>×</button></header>
        <div className="ex-body review-tools-body">{reviewSwitch}<AgentCreditPreview /><a className="prd-review-entry" href={prdUrl} target="_blank" rel="noopener">需求评审 <span aria-hidden="true">↗</span></a><a className="prd-review-entry" href={`${basePath}/review/`}>版本与模块评审总览 ↗</a><a className="prd-review-entry" href={`${basePath}/`}>国内／海外演示入口 ↗</a></div>
      </ReferenceDialog>}
      {templatePreferences&&<TemplatePreferences onClose={()=>setTemplatePreferences(false)}/>}
      {accountPanel&&<AccountExperience key={`${space}:${actor}:${accountPanel}`} controller={controller} space={space} actor={actor} panel={accountPanel} onClose={()=>setAccountPanel(null)}/>}
      <div className={"toast " + (toast ? "show" : "")} role="status">
        {toast}
      </div>
      <AgentSettlementSync />
      </CreditReviewProvider>
      </AgentScope.Provider>
    </PageTitleContext.Provider>
  );
}
