"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AgentScope } from "@/features/agent/scope";
import { marketStorage } from "@/features/markets/storage";
import { marketConfig, routeMarket } from "@/features/markets/config";
import { createWorkspaceStore, M } from "@/features/spaces/model/store";
import { appUrl } from "@/lib/routes";
import { ConnectorMark } from "./mark";
import { ConnectorLinkIcon } from "./icons";
import { connectorStorageKey, hasUsableTools, readConnectors, setConnectorEnabled, type Connector } from "./model";
import "./agent-picker.css";

function sortedItems(items: Connector[]) {
  const ids = routeMarket() === "cn" ? ["feishu", "dingtalk", "tencent-meeting"] : marketConfig().connectors.map(item => item.id);
  const order = new Map(ids.map((id, index) => [id, index]));
  return [...items].sort((a, b) => a.custom === b.custom ? (a.custom ? 0 : (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99)) : Number(a.custom) - Number(b.custom));
}

export function AgentConnectorPicker({ className = "" }: { className?: string }) {
  const scope = useContext(AgentScope);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Connector[] | null>(null);
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ left: 12, bottom: 56, width: 292, maxHeight: 440 });
  const root = useRef<HTMLDivElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const key = scope ? connectorStorageKey(scope.space, scope.actor) : "";
  function load() {
    if (!key) return;
    try {
      const next = readConnectors(marketStorage, key).items;
      setItems(sortedItems(next));
      setError("");
    } catch (cause) { setItems([]); setError((cause as Error).message); }
  }
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node) && !popover.current?.contains(event.target as Node)) setOpen(false); };
    const dismiss = () => setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", dismiss);
    popover.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("resize", dismiss); };
  }, [open]);
  if (!scope) return null;
  const readonly = (() => {
    try {
      const workspace = M.get(scope.controller.state!, scope.space);
      return !M.member(workspace, scope.actor) || (workspace.type === "team" && workspace.status !== "active");
    } catch { return true; }
  })();
  function toggle(connector: Connector) {
    try {
      const workspace = M.get(createWorkspaceStore(marketStorage).read(), scope!.space);
      if (!M.member(workspace, scope!.actor) || (workspace.type === "team" && workspace.status !== "active")) throw Error("当前工作区无权修改连接器。");
      const next = setConnectorEnabled(marketStorage, key, connector.id, connector.enabled === false);
      setItems(sortedItems(next.items));
      setError("");
      window.dispatchEvent(new Event("eureka:connectors-changed"));
    } catch (cause) { setError((cause as Error).message); }
  }
  function goToConnector(id?: string) {
    const url = appUrl("connectors");
    location.assign(id ? `${url}&connector=${encodeURIComponent(id)}` : url);
  }
  function openPicker() {
    if (open) { setOpen(false); return; }
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(292, innerWidth - 24);
    setPosition({ left: Math.max(12, Math.min(rect.left, innerWidth - width - 12)), bottom: innerHeight - rect.top + 8, width, maxHeight: Math.min(440, innerHeight * .62, Math.max(180, rect.top - 20)) });
    load();
    setOpen(true);
  }
  const groups = [false, true] as const;
  return <div className={`agent-connector-picker ${className}`} ref={root}>
    <button ref={trigger} type="button" className="agent-connector-trigger" aria-label="连接器" title="连接器" aria-expanded={open} onClick={openPicker}><ConnectorLinkIcon /><span>连接器</span></button>
    {open && typeof document !== "undefined" && createPortal(<div ref={popover} className="agent-connector-popover" style={{ left: position.left, bottom: position.bottom, width: position.width, maxHeight: position.maxHeight }} role="dialog" aria-label="连接器选择" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
      {groups.map(custom => <section key={String(custom)}><h3>{custom ? "自定义连接器" : "系统连接器"}</h3><div className="agent-connector-rows">{items?.filter(item => item.custom === custom && (!custom || hasUsableTools(item))).map(item => <div className="agent-connector-row" key={item.id}>
        <ConnectorMark connector={item} /><span>{item.name}</span>
        {item.connected ? <button type="button" role="switch" aria-label={`${item.name} ${item.enabled === false ? "启用" : "关闭"}`} aria-checked={item.enabled !== false} disabled={readonly} onClick={() => toggle(item)}><span /></button> : <button type="button" className="agent-connector-connect" disabled={readonly} onClick={() => goToConnector(item.id)}><ConnectorLinkIcon /><span>连接</span></button>}
      </div>)}{custom && !items?.some(item => item.custom && hasUsableTools(item)) && <p className="agent-connector-empty">暂无已接入的自定义连接器</p>}</div></section>)}
      {error && <p role="alert" className="agent-connector-error">{error}</p>}
      <button type="button" className="agent-connector-manage" onClick={() => goToConnector()}><span aria-hidden="true">↗</span> 接入工具</button>
    </div>, document.body)}
  </div>;
}
