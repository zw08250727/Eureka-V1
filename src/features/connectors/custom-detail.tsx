"use client";

import { useState } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import { RefIcon } from "@/features/reference/symbols";
import type { Connector } from "./model";

export function CustomConnectorDetail({ connector, readonly, error, onClose, onEdit, onDelete }: {
  connector: Connector;
  readonly: boolean;
  error?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const tools = Array.isArray(connector.toolDefinitions)
    ? connector.toolDefinitions.filter(row => row && typeof row.name === "string" && typeof row.description === "string")
    : [];
  return <ReferenceDialog className="connector-dialog connector-tools-dialog" label={`${connector.name} · 工具详情`} onClose={onClose}>
    <div inert={confirm}>
      <header className="connector-tools-header">
        <span className="connector-tools-icon" aria-hidden="true"><RefIcon name="agent" /></span>
        <div><h2>{connector.name}</h2><p>{connector.provider || "自定义连接器"} · 已集成{tools.length}个tools</p></div>
        <button type="button" aria-label="关闭对话框" onClick={onClose}>×</button>
      </header>
      <div className="connector-tools-body">
        <h3>tools功能说明</h3>
        {tools.length ? <div className="connector-tools-list" role="list">{tools.map(tool => <div className="connector-tool-row" role="listitem" key={tool.name}><code>{tool.name}</code><span>{tool.description}</span></div>)}</div>
          : <p className="connector-empty">当前连接尚未提供可展示的工具清单。</p>}
        {error && <p role="alert" className="connector-error">{error}</p>}
      </div>
      <footer><button type="button" disabled={readonly} onClick={() => setConfirm(true)}>卸载</button><button type="button" className="primary" disabled={readonly} onClick={onEdit}>去编辑</button></footer>
    </div>
    {confirm && <div className="connector-confirm-overlay"><div className="connector-confirm-box" role="alertdialog" aria-modal="true" aria-label="确认卸载连接器"><h3>卸载{connector.name}？</h3><p>卸载后，后续任务不能使用此连接器；已有内容会保留。</p><div><button type="button" autoFocus onClick={() => setConfirm(false)}>取消</button><button type="button" className="danger" onClick={onDelete}>确认卸载</button></div></div></div>}
  </ReferenceDialog>;
}
