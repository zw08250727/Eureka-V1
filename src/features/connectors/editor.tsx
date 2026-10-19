"use client";

import { useState } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import { RefIcon } from "@/features/reference/symbols";
import type { Connector } from "./model";
export function ConnectorEditor({
  connector,
  onSave,
  onClose,
}: {
  connector?: Connector;
  onSave: (name: string, value: string, mode: "url" | "json") => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(connector?.name || ""),
    [url, setUrl] = useState(connector?.url || ""),
    [json, setJson] = useState(connector?.config || ""),
    [mode, setMode] = useState<"url" | "json">(
      connector?.config ? "json" : "url",
    ),
    [error, setError] = useState("");
  const dirty =
    name !== (connector?.name || "") ||
    url !== (connector?.url || "") ||
    json !== (connector?.config || "");
  const close = () => {
    if (!dirty || window.confirm("放弃尚未保存的连接器修改？")) onClose();
  };
  return (
    <ReferenceDialog
      className="connector-dialog connector-editor-dialog"
      label={connector ? "编辑自定义连接器" : "添加自定义连接器"}
      onClose={close}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSave(name, mode === "url" ? url : json, mode);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <header><h2>{connector ? "编辑" : "添加"}自定义连接器</h2></header>
        <div className="connector-dialog-body">
          <p className="connector-editor-intro">将 MCP 服务接入百智，为 Agent 扩展数据连接与工具调用能力 <a href="https://www.yuque.com/bairongbaizhi/xp2skr/stutwdfq1lr3t4dt?singleDoc#" target="_blank" rel="noopener noreferrer" aria-label="配置教程：百融百智自定义 MCP 操作指南（在新窗口打开）">配置教程 <RefIcon name="book" /></a></p>
          <fieldset className="connector-mode">
            <legend className="sr-only">配置方式</legend>
            <label className={mode === "url" ? "active" : ""}>
              <input
                type="radio"
                name="mode"
                aria-label="直接URL接入"
                checked={mode === "url"}
                onChange={() => setMode("url")}
              />
              直接URL接入
            </label>
            <label className={mode === "json" ? "active" : ""}>
              <input
                type="radio"
                name="mode"
                aria-label="通过JSON导入"
                checked={mode === "json"}
                onChange={() => setMode("json")}
              />
              通过JSON导入
            </label>
          </fieldset>
          <label>
            <span>名称 <b aria-hidden="true">*</b></span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入连接器名称"
              maxLength={60}
              data-autofocus
              required
            />
          </label>
          {mode === "url" ? (
            <label>
              <span>服务地址 <b aria-hidden="true">*</b></span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="请输入 MCP 服务地址（https://...）"
                required
              />
            </label>
          ) : (
            <label>
              <span>JSON 配置 <b aria-hidden="true">*</b></span>
              <textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                placeholder={
                  '{"mcpServers": {"my-mcp": {"url": "https://example.com/mcp"}}}'
                }
                rows={8}
                required
              />
            </label>
          )}

          {error && (
            <p role="alert" className="connector-error">
              {error}
            </p>
          )}
        </div>
        <footer>
          <button type="button" onClick={close}>
            取消
          </button>
          <button className="primary" type="submit">
            {connector ? "保存" : "确定"}
          </button>
        </footer>
      </form>
    </ReferenceDialog>
  );
}
