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
import {
  readConnectors,
  validateConnector,
  type Connector,
  type ConnectorState,
} from "./model";
import "./connectors.css";
export function ConnectorsPage({
  space,
  actor,
  controller,
}: {
  space: string;
  actor: string;
  controller: SpacesController;
}) {
  const key = `eureka:connectors:native:v1:${space}:${actor}`;
  const [state, setState] = useState<ConnectorState | null>(null),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState<string | null>(null),
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
  const w = controller.state!.spaces.find((w) => w.id === space)!;
  const readonly = w.type === "team" && w.status !== "active";
  function change(update: (items: Connector[]) => Connector[]) {
    if (!state) throw Error("连接器尚未加载。");
    const current = M.get(createWorkspaceStore(marketStorage).read(), space);
    if (
      !M.member(current, actor) ||
      (current.type === "team" && current.status !== "active")
    )
      throw Error("工作区权限已变化，当前无法修改连接器。");
    if (marketStorage.getItem(key) !== snapshot.current)
      throw Error("连接器已在其他页面修改，请刷新后重试。当前输入已保留。");
    const next = {
      version: 1 as const,
      items: update(structuredClone(state.items)),
    };
    const raw = JSON.stringify(next);
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
  const current = state?.items.find((c) => c.id === selected);
  const filtered =
    state?.items.filter((c) =>
      c.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
    ) || [];
  function close() {
    setSelected(null);
    setStep("detail");
  }
  return (
    <section className="connectors-page">
      <div className="connectors-toolbar">
        <input
          className="connector-search"
          type="search"
          aria-label="搜索连接器"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索连接器"
        />
        <button
          className="connector-primary"
          disabled={readonly || !state}
          onClick={() => setEditing("new")}
        >
          ＋ 添加自定义连接器
        </button>
      </div>
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
        ([false, true] as const).filter(custom => !search.trim() || filtered.some(c => c.custom === custom)).map((custom) => (
          <section className="connector-group" key={String(custom)}>
            <h2>
              {custom ? "自定义连接器" : "系统连接器"}
              <span>{filtered.filter((c) => c.custom === custom).length}</span>
            </h2>
            <div className="connector-grid">
              {filtered
                .filter((c) => c.custom === custom)
                .map((c) => (
                  <ConnectorCard
                    key={c.id}
                    connector={c}
                    onOpen={() => {
                      setSelected(c.id);
                      setStep("detail");
                      setError("");
                    }}
                  />
                ))}
            </div>
            {!filtered.some((c) => c.custom === custom) && (
              <p className="connector-empty">
                暂无自定义连接器
              </p>
            )}
          </section>
        ))}

      {state && search.trim() && filtered.length === 0 && (
        <p className="connector-empty" role="status">没有找到相关连接器</p>
      )}
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
            change((items) =>
              editing === "new"
                ? [
                    ...items,
                    {
                      ...data,
                      id: crypto.randomUUID(),
                      description: "通过 MCP 配置接入的自定义工具。",
                      tools: 3,
                      custom: true,
                      connected: false,
                    },
                  ]
                : items.map((c) =>
                    c.id === editing ? { ...c, ...data, connected: false } : c,
                  ),
            );
            setEditing(null);
            setNotice("连接器配置已保存，请完成授权后使用。");
          }}
        />
      )}
      {current && (
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
                    {marketConfig().label} / {w.name} / 当前成员
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
                                ? { ...c, connected: step === "authorize" }
                                : c,
                            ),
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
