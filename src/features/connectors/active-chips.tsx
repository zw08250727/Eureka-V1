"use client";

import { useContext, useEffect, useState } from "react";
import { AgentScope } from "@/features/agent/scope";
import { marketStorage, scopedKey } from "@/features/markets/storage";
import { createWorkspaceStore, M } from "@/features/spaces/model/store";
import { ConnectorLinkIcon } from "./icons";
import { connectorStorageKey, hasUsableTools, readConnectors, setConnectorEnabled, type Connector } from "./model";
import "./active-chips.css";

function enabledConnectors(items: Connector[]) {
  return items.filter(item => item.connected && item.enabled !== false && (!item.custom || hasUsableTools(item)));
}

export function AgentActiveConnectorChips() {
  const scope = useContext(AgentScope);
  const key = scope ? connectorStorageKey(scope.space, scope.actor) : "";
  const [items, setItems] = useState<Connector[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!key) return;
    let active = true;
    const refresh = () => {
      try {
        const next = enabledConnectors(readConnectors(marketStorage, key).items);
        if (active) { setItems(next); setError(""); }
      } catch (cause) { if (active) { setItems([]); setError((cause as Error).message); } }
    };
    queueMicrotask(refresh);
    const storage = (event: StorageEvent) => { if (event.key === scopedKey(key)) refresh(); };
    window.addEventListener("eureka:connectors-changed", refresh);
    window.addEventListener("storage", storage);
    return () => { active = false; window.removeEventListener("eureka:connectors-changed", refresh); window.removeEventListener("storage", storage); };
  }, [key]);
  if (!scope || (!items.length && !error)) return null;
  function disable(connector: Connector) {
    try {
      const workspace = M.get(createWorkspaceStore(marketStorage).read(), scope!.space);
      if (!M.member(workspace, scope!.actor) || (workspace.type === "team" && workspace.status !== "active")) throw Error("当前工作区无权修改连接器。");
      const next = setConnectorEnabled(marketStorage, key, connector.id, false);
      setItems(enabledConnectors(next.items));
      setError("");
      window.dispatchEvent(new Event("eureka:connectors-changed"));
    } catch (cause) { setError((cause as Error).message); }
  }
  return <div className="agent-active-connectors" aria-label="已启用连接器">
    {items.map(item => <button key={item.id} className="agent-active-connector-chip" type="button" aria-label={`关闭 ${item.name} 连接器`} title={`点击停用 ${item.name}`} onClick={() => disable(item)}><ConnectorLinkIcon /><span>{item.name}</span><span aria-hidden="true">×</span></button>)}
    {error && <span className="agent-active-connectors-error" role="alert">{error}</span>}
  </div>;
}
