"use client";
import { reviewToolsEnabled } from "@/features/markets/review";

import { useEffect, useRef, useState } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import { createWorkspaceStore, M } from "@/features/spaces/model/store";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { marketStorage } from "@/features/markets/storage";
import { marketConfig } from "@/features/markets/config";
import { ConnectorLogo } from "./logo";
import { ConnectorCard } from "./card";
import { ConnectorEditor } from "./editor";
import { SystemConnectorDetail } from "./system-detail";
import { CustomConnectorDetail } from "./custom-detail";
import { domesticCustomPresets, domesticPresetTools, exampleCustomTools } from "./catalog";
import { readEnterpriseIdentity, type EnterpriseIdentity } from "@/features/enterprise/model";
import {
  readConnectors,
  hasUsableTools,
  connectorStorageKey,
  persistedConnectorState,
  validateConnector,
  type Connector,
  type ConnectorState,
} from "./model";
import "./connectors.css";
export function ConnectorsPage({
  space,
  actor,
  controller,
  enterprise,
}: { space: string; actor: string; controller: SpacesController; enterprise?: never } | { enterprise: EnterpriseIdentity; space?: never; actor?: never; controller?: never }) {
  const key = enterprise
    ? `enterprise:${enterprise.code}:${enterprise.identity}:connectors:v1`
    : connectorStorageKey(space!, actor!);
  const [state, setState] = useState<ConnectorState | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState<string | null>(null),
    [pendingOpen, setPendingOpen] = useState(false),
    [previewConnected, setPreviewConnected] = useState<string[]>([]),
    [step, setStep] = useState<
      "detail" | "authorize" | "disconnect" | "delete"
    >("detail");
  const snapshot = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const next = readConnectors(marketStorage, key);
        snapshot.current = marketStorage.getItem(key);
        setState(next);
      } catch (e) {
        setError((e as Error).message);
      }
    });
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    if (!state) return;
    const url = new URL(location.href);
    const requested = url.searchParams.get("connector");
    if (!requested) return;
    url.searchParams.delete("connector");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
    if (state.items.some(item => item.id === requested)) {
      let active = true;
      queueMicrotask(() => { if (active) { setSelected(requested); setStep("detail"); } });
      return () => { active = false; };
    }
  }, [state]);
  const w = enterprise ? null : controller!.state!.spaces.find((item) => item.id === space)!;
  const readonly = !!w && w.type === "team" && w.status !== "active";
  function change(update: (items: Connector[]) => Connector[], dismissDemoId?: string) {
    if (!state) throw Error("连接器尚未加载。");
    if (enterprise) {
      const session = readEnterpriseIdentity();
      if (!session || session.realm !== enterprise.realm || session.identity !== enterprise.identity)
        throw Error("企业登录状态已变化，请重新登录后重试。");
    } else {
      const current = M.get(createWorkspaceStore(marketStorage).read(), space!);
      if (!M.member(current, actor!) || (current.type === "team" && current.status !== "active"))
        throw Error("工作区权限已变化，当前无法修改连接器。");
    }
    if (marketStorage.getItem(key) !== snapshot.current)
      throw Error("连接器已在其他页面修改，请刷新后重试。当前输入已保留。");
    const next = {
      ...state,
      version: 1 as const,
      items: update(structuredClone(state.items)),
      dismissedDemoIds: dismissDemoId ? [...new Set([...(state.dismissedDemoIds || []), dismissDemoId])] : state.dismissedDemoIds,
    };
    const raw = JSON.stringify(persistedConnectorState(next));
    marketStorage.setItem(key, raw);
    snapshot.current = raw;
    setState(next);
    setError("");
  }
  function act(fn: () => void) {
    try {
      fn();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const savedCurrent = state?.items.find((c) => c.id === selected);
  const current = savedCurrent && previewConnected.includes(savedCurrent.id) ? { ...savedCurrent, connected: true } : savedCurrent;
  const pending = state?.items.filter(item => item.custom && !hasUsableTools(item)) || [];
  function close() {
    setSelected(null);
    setStep("detail");
  }
  function card(c: Connector) {
    return <ConnectorCard key={c.id} connector={previewConnected.includes(c.id) ? { ...c, connected: true } : c} onOpen={() => {
      setSelected(c.id);
      setStep("detail");
      setError("");
    }} />;
  }
  return (
    <section className="connectors-page">
      {readonly && (
        <p className="connector-banner" role="status">
          当前团队已到期，仅可查看连接器。
        </p>
      )}
      {error && (
        <p className="connector-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="connector-banner" role="status">
          {notice}
        </p>
      )}
      {!state && !error && <p role="status">正在读取连接器…</p>}
      {state &&
        ([false, true] as const).map((custom) => (
          <section className="connector-group" key={String(custom)}>
            <h2>{custom ? "自定义连接器" : "系统连接器"}{custom && pending.length > 0 && <button type="button" className="connector-pending-entry" onClick={() => setPendingOpen(true)}>待接入配置 {pending.length}</button>}</h2>
            <div className="connector-grid">
              {custom && <button type="button" className="connector-add-card" disabled={readonly} onClick={() => setEditing("new")}><span aria-hidden="true">＋</span><strong>新增连接器</strong><small>通过 JSON 配置或服务 URL 接入</small></button>}
              {state.items
                .filter((c) => c.custom === custom && (!custom || hasUsableTools(c)))
                .sort((a, b) => custom ? (domesticCustomPresets.findIndex(item => item.name === a.name) + 1 || 99) - (domesticCustomPresets.findIndex(item => item.name === b.name) + 1 || 99) : marketConfig().connectors.findIndex(item => item.id === a.id) - marketConfig().connectors.findIndex(item => item.id === b.id))
                .map(card)}
            </div>
          </section>
        ))}
      {pendingOpen && <ReferenceDialog className="connector-dialog connector-pending-dialog" label="待接入配置" onClose={() => setPendingOpen(false)}>
        <header><h2>待接入配置</h2><button type="button" aria-label="关闭对话框" onClick={() => setPendingOpen(false)}>×</button></header>
        <div className="connector-dialog-body"><p className="connector-muted">这些配置尚无可用工具。完成配置后会出现在自定义连接器列表中。</p>
          <div className="connector-pending-list">{pending.map(item => <div className="connector-pending-row" key={item.id}><span><strong>{item.name}</strong><small>{item.url || "JSON 配置"}</small></span><button type="button" disabled={readonly} onClick={() => { setPendingOpen(false); setEditing(item.id); }}>继续配置</button></div>)}</div>
        </div>
      </ReferenceDialog>}
      {editing && (
        <ConnectorEditor
          connector={state?.items.find((c) => c.id === editing)}
          onClose={() => setEditing(null)}
          onSave={(name, value, mode) => {
            const data = validateConnector(
              name,
              value,
              mode,
              state!.items,
              editing,
            );
            const discovered = domesticPresetTools[name] || { provider: "自定义 MCP", tools: exampleCustomTools(name) };
            const connection = { ...data, tools: discovered.tools.length, provider: discovered.provider, toolDefinitions: discovered.tools, connected: true, enabled: true, connectedAt: new Date().toISOString() };
            change((items) =>
              editing === "new"
                ? [
                    ...items,
                    {
                      ...connection,
                      id: crypto.randomUUID(),
                      description: "通过 MCP 配置接入的自定义工具。",
                      custom: true,
                    },
                  ]
                : items.map((c) =>
                    c.id === editing ? { ...c, ...connection, catalog: undefined, demo: false } : c,
                  ),
            );
            setEditing(null);
            setPendingOpen(false);
            setNotice(`连接器已接入，已发现 ${discovered.tools.length} 个工具。`);
          }}
        />
      )}
      {current && !current.custom && (
        <SystemConnectorDetail connector={current} readonly={readonly} enterprise={!!enterprise} error={error} onClose={close} onAuthorize={(scopes) => act(() => { change(items => items.map(item => item.id === current.id ? { ...item, connected: true, enabled: true, connectedAt: new Date().toISOString(), authorizedScopes: scopes, catalog: undefined } : item)); setNotice(`${current.name}已连接。`); })} onReviewAuthorize={() => { setPreviewConnected(ids => [...ids, current.id]); close(); }} onDisconnect={() => act(() => { if (previewConnected.includes(current.id) && !savedCurrent?.connected) setPreviewConnected(ids => ids.filter(id => id !== current.id)); else change(items => items.map(item => item.id === current.id ? {...item, connected: false, connectedAt: undefined, authorizedScopes: undefined} : item)); setNotice("连接器已断开。"); close(); })} />
      )}
      {current && current.custom && current.connected && (
        <CustomConnectorDetail connector={current} readonly={readonly} error={error} onClose={close} onEdit={() => { close(); setEditing(current.id); }} onDelete={() => act(() => { change(items => items.filter(item => item.id !== current.id), current.demo ? current.id : undefined); setNotice("连接器已卸载。"); close(); })} />
      )}
      {current && current.custom && !current.connected && (
        <ReferenceDialog
          className="connector-dialog"
          label={`${current.name} · ${step === "detail" ? "连接器详情" : step === "authorize" ? "授权" : "确认操作"}`}
          onClose={close}
        >
          <header>
            <h2>{current.name}</h2>
            <button aria-label="关闭对话框" onClick={close}>
              ×
            </button>
          </header>
          <div className="connector-dialog-body">
            {step === "detail" ? (
              <>
                <ConnectorLogo connector={current} large />
                <p>{current.description}</p>
                <dl>
                  <dt>当前状态</dt>
                  <dd>{current.connected ? "已连接" : "未连接"}</dd>
                  <dt>授权归属</dt>
                  <dd>
                    {marketConfig().label} / {w?.name || enterprise?.code} / 当前成员
                  </dd>
                  <dt>可用工具</dt>
                  <dd>{current.tools} 项工具 · 仅限已授权资料</dd>
                </dl>
                {current.url && <p className="connector-url">{current.url}</p>}
                
              </>
            ) : step === "authorize" ? (
              <>
                <h3>确认授权</h3>
                <p>
                  允许 {current.name}{" "}
                  在当前工作区提供已授权资料与工具。涉及发送消息、创建或修改外部内容时仍需明确确认。
                </p>

              </>
            ) : (
              <>
                <h3>
                  {step === "delete"
                    ? "删除此自定义连接器？"
                    : "断开此连接器？"}
                </h3>
                <p>
                  后续 Agent
                  任务将不能使用此连接器的工具，已生成的工作区内容保留。
                </p>
              </>
            )}
            {error && (
              <p role="alert" className="connector-error">
                {error}
              </p>
            )}
          </div>
          <footer>
            <button onClick={close}>关闭</button>
            {step === "detail" ? (
              <>
                {current.custom && (
                  <>
                    <button
                      disabled={readonly}
                      onClick={() => {
                        setEditing(current.id);
                        close();
                      }}
                    >
                      编辑
                    </button>
                    <button
                      disabled={readonly}
                      className="danger"
                      onClick={() => setStep("delete")}
                    >
                      删除
                    </button>
                  </>
                )}
                <button
                  disabled={readonly}
                  className="primary"
                  onClick={() =>
                    setStep(current.connected ? "disconnect" : "authorize")
                  }
                >
                  {current.connected ? "断开连接" : "连接"}
                </button>
              </>
            ) : (
              <>
                {step === "authorize" && reviewToolsEnabled() && (
                  <button
                    onClick={() =>
                      setError("授权未完成，连接状态未改变。可重试或关闭。")
                    }
                  >
                    模拟授权失败
                  </button>
                )}
                <button
                  disabled={readonly}
                  className={step === "authorize" ? "primary" : "danger"}
                  onClick={() =>
                    act(() => {
                      change((items) =>
                        step === "delete"
                          ? items.filter((c) => c.id !== current.id)
                          : items.map((c) =>
                              c.id === current.id
                                ? { ...c, connected: step === "authorize", connectedAt: step === "authorize" ? new Date().toISOString() : undefined }
                                : c,
                            ),
                        step === "delete" && current.demo ? current.id : undefined,
                      );
                      setNotice(
                        step === "authorize"
                          ? "授权成功，连接器已连接。"
                          : step === "delete"
                            ? "连接器已删除。"
                            : "连接器已断开。",
                      );
                      close();
                    })
                  }
                >
                  {step === "authorize"
                    ? "确认授权"
                    : step === "delete"
                      ? "确认删除"
                      : "确认断开"}
                </button>
              </>
            )}
          </footer>
        </ReferenceDialog>
      )}
    </section>
  );
}
