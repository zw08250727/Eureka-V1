"use client";

import { useState } from "react";
import Image from "next/image";
import { ReferenceDialog } from "@/features/reference/dialog";
import { reviewToolsEnabled } from "@/features/markets/review";
import { productLogo } from "@/features/markets/brand";
import { routeMarket } from "@/features/markets/config";
import { appUrl } from "@/lib/routes";
import { RefIcon } from "@/features/reference/symbols";
import { connectorLogin, connectorRecommendations, connectorSkills, connectorToolsByScope } from "./catalog";
import { connectorAuthorizationTarget } from "./authorization";
import { ConnectorAuthorizationFlow, connectorPermissionIds } from "./authorization-flow";
import { ConnectorDisconnectIcon, ConnectorLinkIcon } from "./icons";
import { ConnectorMark } from "./mark";
import type { Connector } from "./model";

export function SystemConnectorDetail({ connector, readonly, enterprise = false, error, onClose, onAuthorize, onDisconnect, onReviewAuthorize }: {
  connector: Connector;
  readonly: boolean;
  enterprise?: boolean;
  error?: string;
  onClose: () => void;
  onAuthorize: (scopes: string[]) => void;
  onDisconnect: () => void;
  onReviewAuthorize: () => void;
}) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [additionalAuthorization, setAdditionalAuthorization] = useState(false);
  const [notice, setNotice] = useState("");
  const recommendations = connectorRecommendations[connector.id] || [];
  const permissionIds = connectorPermissionIds(connector.id);
  const allPermissionsGranted = permissionIds.length > 0 && permissionIds.every(id => connector.authorizedScopes?.includes(id));
  const skills = connector.authorizedScopes?.length
    ? connector.authorizedScopes.flatMap(scope => connectorToolsByScope[connector.id]?.[scope] || [])
    : connectorSkills[connector.id] || [];
  function connect(additional = false) {
    if (["dingtalk", "feishu"].includes(connector.id) && routeMarket() === "cn") {
      setAdditionalAuthorization(additional);
      setAuthorizationOpen(true);
      return;
    }
    let target: ReturnType<typeof connectorAuthorizationTarget>;
    try { target = connectorAuthorizationTarget(connector.id); }
    catch { setNotice("暂时无法打开授权页面，请检查浏览器存储后重试。"); return; }
    const destination = target.url || connectorLogin[connector.id];
    if (!destination) return;
    // The static prototype has no token exchange endpoint. Opening a provider never grants access.
    setNotice(target.authorization ? "已打开平台授权页。授权结果验证完成后，连接状态才会更新。" : "已打开平台登录页。完成平台登录后，请返回此页；连接状态需在授权完成后更新。");
    window.open(destination, "_blank", "noopener,noreferrer");
  }
  return <>
  <ReferenceDialog className="connector-dialog connector-system-dialog" label={`${connector.name} · 连接器详情`} onClose={onClose}>
    <div inert={confirmDisconnect}>
    <button type="button" className="connector-detail-close" aria-label="关闭对话框" onClick={onClose}>×</button>
    <div className="connector-detail-hero">
      <div className="connector-detail-logos"><Image className="connector-brand-image" src={productLogo(routeMarket() || "global")} alt="" width={52} height={64} unoptimized /><span className="connector-logo-dots" aria-hidden="true">•••</span><ConnectorMark connector={connector} large /></div>
      <h2>{connector.connected ? connector.name : `连接 ${connector.name}`}</h2>
      <p>{connector.description}</p>
      <div className="connector-detail-actions">
        {connector.connected ? <>
          <button type="button" className="primary" disabled={enterprise} title={enterprise ? "企业工作台暂未提供 Agent 入口" : undefined} onClick={() => { onClose(); location.assign(appUrl("home")); }}><span aria-hidden="true">↗</span> <span>去使用</span></button>
          <button type="button" className="connector-disconnect" disabled={readonly} onClick={() => setConfirmDisconnect(true)}><ConnectorDisconnectIcon /><span>断开连接</span></button>
        </> : <button type="button" className="primary connector-connect-button" disabled={readonly} onClick={() => connect(false)}><ConnectorLinkIcon /><span>连接</span></button>}
      </div>
      {readonly && <p className="connector-detail-feedback" role="status">当前团队已到期，仅可查看连接器。</p>}
      {notice && <p className="connector-detail-feedback" role="status">{notice}</p>}
      {error && <p className="connector-error" role="alert">{error}</p>}
      {!connector.connected && reviewToolsEnabled() && <button type="button" className="connector-review-authorize" disabled={readonly} onClick={onReviewAuthorize}>评审：模拟授权成功</button>}
    </div>
    {recommendations.length > 0 && <section className="connector-detail-section"><h3>快速查看已连接数据</h3><div className="connector-recommendations">{recommendations.map(item => <button className="connector-recommendation" key={item.title} type="button" disabled={!connector.connected || enterprise} title={!connector.connected ? "连接后可使用" : enterprise ? "企业工作台暂未提供 Agent 入口" : item.prompt} onClick={() => { onClose(); location.assign(appUrl(item.view)); }}><strong>{item.title}</strong><span>{item.description}</span>{connector.connected && <b aria-hidden="true">→</b>}</button>)}</div></section>}
    {connector.connected && <>
      <section className="connector-detail-section"><div className="connector-skill-heading"><h3>已成功接入的工具列表</h3>{!allPermissionsGranted && permissionIds.length > 0 && <button type="button" disabled={readonly} onClick={() => connect(true)}>＋ 新增授权工具</button>}</div><ul className="connector-skill-list">{skills.map(skill => <li key={skill}><RefIcon name="book" /><span>{skill}</span></li>)}</ul></section>
      <section className="connector-detail-section connector-detail-info"><h3>基础信息</h3><dl><dt>状态</dt><dd className="connected">已连接</dd><dt>连接时间</dt><dd>{connector.connectedAt && !Number.isNaN(Date.parse(connector.connectedAt)) ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(connector.connectedAt)) : "未记录"}</dd><dt>归属</dt><dd>当前账号与工作区</dd></dl></section>
    </>}
    </div>
  </ReferenceDialog>
  {confirmDisconnect && <ReferenceDialog className="connector-dialog connector-disconnect-dialog" label="确认断开此连接器" onClose={() => setConfirmDisconnect(false)}>
    <div className="connector-disconnect-content">
      <div className="connector-disconnect-heading"><span className="connector-warning-mark" aria-hidden="true">!</span><h2>确认断开此连接器？</h2></div>
      <p>断开后将无法继续使用该连接器，可随时重新安装。</p>
      {error && <p className="connector-error" role="alert">{error}</p>}
      <div className="connector-disconnect-actions"><button type="button" className="connector-confirm-cancel" data-autofocus onClick={() => setConfirmDisconnect(false)}>取消</button><button type="button" className="connector-confirm-accept" onClick={onDisconnect}>确认</button></div>
    </div>
  </ReferenceDialog>}
  {authorizationOpen && <ConnectorAuthorizationFlow connector={connector} initialScopes={connector.authorizedScopes} startAtPermissions={additionalAuthorization} onClose={() => setAuthorizationOpen(false)} onAuthorize={onAuthorize} onFinish={() => setAuthorizationOpen(false)} />}
  </>;
}
