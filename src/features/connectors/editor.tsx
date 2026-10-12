"use client";

import { useState } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
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
      className="connector-dialog"
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
        <header>
          <h2>{connector ? "编辑" : "添加"}自定义连接器</h2>
          <button type="button" aria-label="关闭对话框" onClick={close}>
            ×
          </button>
        </header>
        <div className="connector-dialog-body">
          <label>
            连接器名称
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              data-autofocus
              required
            />
          </label>
          <fieldset className="connector-mode">
            <legend>配置方式</legend>
            <label>
              <input
                type="radio"
                name="mode"
                checked={mode === "url"}
                onChange={() => setMode("url")}
              />
              URL 地址
            </label>
            <label>
              <input
                type="radio"
                name="mode"
                checked={mode === "json"}
                onChange={() => setMode("json")}
              />
              JSON 配置
            </label>
          </fieldset>
          {mode === "url" ? (
            <label>
              服务地址
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/mcp"
                required
              />
            </label>
          ) : (
            <label>
              MCP JSON 配置
              <textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                placeholder={
                  '{"mcpServers":{"example":{"url":"https://example.com/mcp"}}}'
                }
                rows={7}
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
            保存连接器
          </button>
        </footer>
      </form>
    </ReferenceDialog>
  );
}
