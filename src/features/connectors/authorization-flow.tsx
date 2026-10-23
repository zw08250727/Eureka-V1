"use client";

import { useEffect, useRef, useState } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import type { Connector } from "./model";

type Permission = { id: string; title: string; description: string; count: number };

const providerPermissions: Record<string, Permission[]> = {
  dingtalk: [
    { id: "messages", title: "消息与群组", description: "DING 消息、群信息、群机器人与群会话消息", count: 48 },
    { id: "contacts", title: "通讯录", description: "用户基本信息、用户搜索、部门列表与部门成员", count: 36 },
    { id: "tables", title: "AI 表格", description: "表格查看、评论、编辑与数据表记录读写", count: 52 },
    { id: "calendar", title: "日历与待办", description: "日程、会议室、待办事项与完成状态", count: 31 },
  ],
  feishu: [
    { id: "messages", title: "即时消息", description: "消息、群组与机器人会话的读取和发送", count: 42 },
    { id: "contacts", title: "通讯录", description: "用户基础信息、部门与成员列表", count: 28 },
    { id: "calendar", title: "日历与任务", description: "日程、会议、任务与待办状态", count: 34 },
    { id: "docs", title: "云文档", description: "文档、电子表格、多维表格与知识库", count: 57 },
  ],
};

export function connectorPermissionIds(connectorId: string) {
  const provider = connectorId === "feishu" ? "feishu" : connectorId === "dingtalk" ? "dingtalk" : "";
  return provider ? providerPermissions[provider].map(item => item.id) : [];
}

export function ConnectorAuthorizationFlow({ connector, initialScopes = [], startAtPermissions = false, onClose, onAuthorize, onFinish }: {
  connector: Connector;
  initialScopes?: string[];
  startAtPermissions?: boolean;
  onClose: () => void;
  onAuthorize: (scopes: string[]) => void;
  onFinish: () => void;
}) {
  const provider = connector.id === "feishu" ? "feishu" : "dingtalk";
  const permissions = providerPermissions[provider];
  const [step, setStep] = useState<"entry" | "permissions" | "success">(startAtPermissions ? "permissions" : "entry");
  const [selected, setSelected] = useState(() => new Set(initialScopes.length ? initialScopes : permissions.map(item => item.id)));
  const [avatar, setAvatar] = useState("👩");
  const [applicationName, setApplicationName] = useState("我的飞书 CLI");
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);
  useEffect(() => {
    if (step !== "success") return;
    const timer = window.setTimeout(() => finishRef.current(), 1600);
    return () => window.clearTimeout(timer);
  }, [step]);
  const allSelected = selected.size === permissions.length;
  const permissionCount = permissions.filter(item => selected.has(item.id)).reduce((sum, item) => sum + item.count, 0);
  const url = step === "success"
    ? provider === "dingtalk" ? "https://login.dingtalk.com/oauth2/auth/success" : "https://open.feishu.cn/page/cli/success"
    : step === "permissions"
      ? provider === "dingtalk" ? "https://login.dingtalk.com/oauth2/auth?scope=selected" : "https://open.feishu.cn/page/cli/authorize"
      : provider === "dingtalk" ? "https://login.dingtalk.com/oauth2/auth?prompt=consent" : "https://open.feishu.cn/page/cli";
  function toggle(id: string) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function authorize() {
    const scopes = permissions.filter(item => selected.has(item.id)).map(item => item.id);
    onAuthorize(scopes);
    setStep("success");
  }
  return <ReferenceDialog className="connector-dialog connector-oauth-dialog" label={`${connector.name} 登录与授权`} onClose={step === "success" ? onFinish : onClose}>
    <div className="connector-oauth-browserbar" aria-hidden="true"><span className="connector-browser-dots">● ● ●</span><span>{url}</span></div>
    {step === "entry" && provider === "dingtalk" && <div className="connector-oauth-entry">
      <div className="connector-account-avatar">👩🏻</div>
      <h2>当前账号</h2>
      <p>此账号已在使用，可直接登录 DingTalk Workspace</p>
      <button type="button" className="connector-oauth-primary" data-autofocus onClick={() => setStep("permissions")}>立即登录</button>
      <small>登录后进入权限选择，授权完成后自动返回百智工作台</small>
    </div>}
    {step === "entry" && provider === "feishu" && <div className="connector-oauth-create">
      <div className="connector-oauth-create-inner">
        <h2>创建飞书 CLI 应用</h2>
        <fieldset><legend>头像 <b>*</b></legend><div className="connector-avatar-options">{["🌳", "🧑‍💼", "👨", "👩", "😎", "🌷", "🧝", "▣"].map(item => <button key={item} type="button" aria-label={`选择头像 ${item}`} aria-pressed={avatar === item} onClick={() => setAvatar(item)}>{item}</button>)}</div></fieldset>
        <label><span>名称 <b>*</b></span><input value={applicationName} onChange={event => setApplicationName(event.target.value)} /></label>
        <p>创建后，自动完成所有配置 ›</p>
        <button type="button" className="connector-oauth-primary" disabled={!applicationName.trim()} onClick={() => setStep("permissions")}>创建</button>
        <button type="button" className="connector-oauth-secondary" onClick={() => setStep("permissions")}>选择已有应用</button>
      </div>
    </div>}
    {step === "permissions" && <div className="connector-oauth-permissions">
      <header><div className="connector-permission-app"><span>{provider === "feishu" ? avatar : "👩🏻"}</span><strong>{provider === "feishu" ? applicationName : "当前账号的钉钉 CLI"}</strong></div><h2>确定开通并授权以下权限吗？</h2><p>授权后，应用将以 <strong>你的名义</strong> 访问和操作 <strong>你的相关数据</strong></p></header>
      <div className="connector-permission-list">{permissions.map(item => <label key={item.id}><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} /><span><strong>{item.title}</strong><small>{item.description}</small></span><b aria-hidden="true">›</b></label>)}</div>
      <footer><label><input type="checkbox" checked={allSelected} onChange={() => setSelected(new Set(allSelected ? [] : permissions.map(item => item.id)))} />全选</label><span>已选 <strong>{permissionCount}</strong> 项权限</span><button type="button" className="connector-oauth-primary" disabled={!selected.size} onClick={authorize}>授权并连接</button><button type="button" className="connector-oauth-secondary" onClick={onClose}>取消</button><small>该应用将持续访问已授权的数据，你可以随时在连接器详情中断开连接。</small></footer>
    </div>}
    {step === "success" && <div className="connector-oauth-success" role="status"><span aria-hidden="true">✓</span><h2>授权成功</h2><p>正在返回百智工作台并打开连接器详情…</p></div>}
  </ReferenceDialog>;
}
