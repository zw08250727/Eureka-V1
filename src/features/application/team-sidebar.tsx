"use client";
import { useState } from "react";
import Image from "next/image";
import { M } from "@/features/spaces/model/store";
import type { WorkspaceState } from "@/features/spaces/model/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { appUrl, assetUrl, type AppView } from "@/lib/routes";
export function TeamSidebar({
  state,
  space,
  actor,
  view,
  collapsed,
  toggle,
}: {
  state: WorkspaceState;
  space: string;
  actor: string;
  view: string;
  collapsed: boolean;
  toggle: () => void;
}) {
  const [menu, setMenu] = useState(false),
    [account, setAccount] = useState(false),
    [auto, setAuto] = useState(false);
  const w = M.get(state, space),
    admin = M.admin(w, actor);
  const nav: [AppView, string][] = [
    ["home", "首页"], ["recording", "开始录音"], ["contacts", "通讯录"],
    ["members", "团队成员"], ...(admin ? [["devices", "设备查看"] as [AppView, string]] : []), ["content-permissions", "空间设置"],
  ];
  return (
    <aside
      className={"app-sidebar " + (collapsed ? "is-collapsed" : "")}
      aria-label="团队导航"
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
            <b>{w.name}</b>
            <small>Team · Unlimited</small>
          </span>
          <Icon name="chevron" />
        </Button>
        {menu ? (
          <div className="nav-menu">
            {state.spaces
              .filter((s) => M.member(s, state.account.id))
              .map((s) => (
                <a key={s.id} href={appUrl("home", "", s.id, "zhang")}>
                  {s.name}
                  <small>
                    {s.members.filter((m) => m.status === "active").length} 人
                  </small>
                </a>
              ))}
            <a href={appUrl("create-team", "", "personal", "zhang")}>
              ＋ 创建团队
            </a>
            <a href={appUrl("invitations", "", "personal", "zhang")}>
              工作空间邀请
            </a>
            <Button onClick={() => setMenu(false)}>关闭</Button>
          </div>
        ) : null}
      </div>
      <nav className="primary-nav">
        {nav.map(([v, label]) => (
          <a
            key={v}
            href={appUrl(v, "", space, actor)}
            aria-current={view === v ? "page" : undefined}
          >
            <Icon
              name={v === "home" ? "home" : v === "members" ? "user" : "task"}
            />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="history-nav">
        <p>历史会话</p>
        <div className="history-tabs">
          <button aria-pressed={!auto} onClick={() => setAuto(false)}>
            全部任务
          </button>
          <button aria-pressed={auto} onClick={() => setAuto(true)}>
            自动任务
          </button>
        </div>
        {auto
          ? M.scheduledTasks(w, actor).map((t) => (
              <a key={t.id} href={appUrl("tasks", t.id, space, actor)}>
                <Icon name="clock" />
                <span>{t.title}</span>
              </a>
            ))
          : M.history(w, actor)
              .slice(0, 5)
              .map((t) => (
                <a key={t.id} href={appUrl("history", t.id, space, actor)}>
                  <Icon name="chat" />
                  <span>{t.title || t.prompt}</span>
                </a>
              ))}
      </div>
      <div className="account-nav">
        {account ? (
          <div className="nav-menu">
            <a href={appUrl("settings", "", space, actor)}>个人设置</a>
            <a href={appUrl("members", "", space, actor)}>团队成员</a>
          </div>
        ) : null}
        <Button
          variant="ghost"
          aria-expanded={account}
          onClick={() => setAccount(!account)}
        >
          <Icon name="user" />
          <b>{state.account.name}’s Space</b>
          <Icon name="chevron" />
        </Button>
      </div>
    </aside>
  );
}
