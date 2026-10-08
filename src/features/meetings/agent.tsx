"use client";
import { useSceneAgent } from "@/features/agent/session";
import { AgentHistoryButton } from "@/features/agent/history-button";
import { useEffect, useRef, useState, type RefObject } from "react";
import { RefIcon as Icon } from "@/features/reference/symbols";
import type { AgentGateway } from "@/features/workbench/model/types";
import type { MeetingDetail } from "./types";
type Session = { input: string; messages: { role: string; text: string }[] };
export function MeetingAgent({
  r,
  open,
  onClose,
  host,
  gateway,
}: {
  r: MeetingDetail;
  open: boolean;
  onClose: () => void;
  host: RefObject<HTMLDivElement | null>;
  gateway?: AgentGateway;
}) {
  const agent = useSceneAgent("meeting", r.id);
  const [sessions, setSessions] = useState<Record<string, Session>>({}),
    [sources, setSources] = useState(false),
    [audio, setAudio] = useState(false),
    [apps, setApps] = useState(false),
    [web, setWeb] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [width, setWidth] = useState(390),
    [bounds, setBounds] = useState({ min: 300, max: 760 });
  const rail = useRef<HTMLElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    log = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; width: number } | null>(null),
    abort = useRef<AbortController | null>(null);
  const session = sessions[r.id] || {
    input: `请根据「${r.title}」整理重点与后续行动。`,
    messages: [],
  };
  const change = (patch: Partial<Session>) =>
    setSessions((prev) => ({
      ...prev,
      [r.id]: { ...(prev[r.id] || session), ...patch },
    }));
  useEffect(() => {
    if (open) input.current?.focus({ preventScroll: true });
  }, [open, r.id]);
  useEffect(
    () => () => {
      abort.current?.abort();
      document.body.classList.remove("agent-resizing");
    },
    [],
  );
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let preferred = 390;
    try {
      preferred =
        Number(localStorage.getItem("eureka:agent-panel-width:v1")) || 390;
    } catch {
      /* Keep session sizing. */
    }
    const fit = () => {
      const available = el.getBoundingClientRect().width,
        max = Math.max(
          1,
          Math.min(760, available - (innerWidth > 1000 ? 300 : 0)),
        ),
        min = Math.min(300, max);
      const next = Math.round(Math.max(min, Math.min(max, preferred)));
      setBounds({ min, max });
      setWidth(next);
      el.style.setProperty("--agent-panel-width", `${next}px`);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [host]);
  function resize(value: number, persist = false) {
    const next = Math.round(Math.max(bounds.min, Math.min(bounds.max, value)));
    setWidth(next);
    host.current?.style.setProperty("--agent-panel-width", `${next}px`);
    if (persist)
      try {
        localStorage.setItem("eureka:agent-panel-width:v1", String(next));
      } catch {
        /* Preference only. */
      }
  }
  function finishDrag() {
    if (drag.current) {
      resize(rail.current?.getBoundingClientRect().width || width, true);
      drag.current = null;
      document.body.classList.remove("agent-resizing");
    }
  }
  async function send() {
    if (!session.input.trim() || busy) return;
    const id = r.id,
      prompt = session.input.trim();
    setBusy(true);
    setError("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      let text = `这场会议的主要内容：\n${r.summary}\n\n可以继续按负责人、截止时间整理后续行动。\n\n${web ? "联网搜索已选，当前仅模拟，未执行真实检索。" : "模拟回复，尚未调用 AI 服务。"}`;
      if (gateway) {
        const reply = await gateway.send(
          prompt,
          { kind: "daily", title: r.title, lines: [r.summary, r.transcript] },
          { audio, apps, web, fileIds: audio ? [id] : undefined },
          controller.signal,
        );
        text = [reply.text, ...reply.items].join("\n");
      }
      if (!controller.signal.aborted) {
        agent.record(prompt, text);
        setSessions((prev) => ({
          ...prev,
          [id]: {
            input: "",
            messages: [
              ...(prev[id]?.messages || []),
              { role: "user", text: prompt },
              { role: "assistant", text },
            ],
          },
        }));
        requestAnimationFrame(() => {
          if (log.current) log.current.scrollTop = log.current.scrollHeight;
        });
      }
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside
      ref={rail}
      className={`xiaozhi-rail${open ? " expanded" : ""}`}
      id="xiaozhi-rail"
      aria-labelledby="xiaozhi-title"
      aria-hidden={!open}
    >
      <div
        className="agent-resize-handle"
        tabIndex={0}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整 Agent 窗口宽度"
        title="左右拖动调整宽度，或使用左右方向键"
        aria-valuemin={bounds.min}
        aria-valuemax={bounds.max}
        aria-valuenow={width}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          drag.current = {
            x: e.clientX,
            width: rail.current?.getBoundingClientRect().width || width,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          document.body.classList.add("agent-resizing");
        }}
        onPointerMove={(e) => {
          if (drag.current)
            resize(drag.current.width + drag.current.x - e.clientX);
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
            return;
          e.preventDefault();
          resize(
            e.key === "Home"
              ? bounds.min
              : e.key === "End"
                ? bounds.max
                : width + (e.key === "ArrowLeft" ? 24 : -24),
            true,
          );
        }}
      />
      <div className="xiaozhi-panel">
        <div className="xiaozhi-head">
          <div className="xiaozhi-identity">
            <span className="xiaozhi-mark">
              <Icon name="spark" />
            </span>
            <div>
              <h2 id="xiaozhi-title">Ask Agent</h2>
              <p>基于当前页面内容继续工作</p>
            </div>
          </div>
          <div className="xiaozhi-head-actions">
            <AgentHistoryButton />
            <button
              type="button"
              className="agent-new-task"
              id="xiaozhi-new-task"
              aria-label="新建会话"
              title="新建会话"
              onClick={() => {
                agent.reset();
                abort.current?.abort();
                change({ input: "", messages: [] });
                setError("");
              }}
            >
              <Icon name="new-task" />
            </button>
            <button
              id="xiaozhi-collapse"
              aria-label="收起 Ask Agent"
              onClick={onClose}
            >
              <Icon name="x" />
            </button>
          </div>
        </div>
        <div className="xiaozhi-body">
          <div ref={log} className="xiaozhi-intro md-agent-conversation">
            <div className="md-agent-context">
              <small>当前会议</small>
              <strong>{r.title}</strong>
              <p>围绕这场会议，继续提问或整理行动项。</p>
            </div>
            <div
              className="md-agent-messages"
              role="log"
              aria-label="会议对话消息"
              aria-live="polite"
            >
              {session.messages.map((m, i) => (
                <article className={`agent-history-message ${m.role}`} key={i}>
                  <span>
                    {m.role === "user" ? "你" : "Ask Agent · 模拟回复"}
                  </span>
                  <p>{m.text}</p>
                </article>
              ))}
            </div>
            {error ? <p role="alert">{error}</p> : null}
          </div>
          <div className="agent-composer-wrap">
            <div className="xiaozhi-composer">
              <textarea
                ref={input}
                id="xiaozhi-input"
                placeholder="输入问题，按 Enter 发送…"
                aria-label="向 Ask Agent 输入问题"
                value={session.input}
                onChange={(e) => change({ input: e.target.value })}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="agent-composer-toolbar">
                <div className="agent-source-wrap">
                  <button
                    type="button"
                    className="agent-tool-button has-sources"
                    id="agent-sources-toggle"
                    aria-label="引用资料"
                    title="引用资料"
                    aria-expanded={sources}
                    aria-controls="agent-sources-popover"
                    onClick={() => setSources(!sources)}
                  >
                    <Icon name="book" />
                  </button>
                  <div id="agent-sources-popover" hidden={!sources}>
                    <strong>引用资料</strong>
                    <div className="xiaozhi-context">
                      <button
                        id="xiaozhi-audio"
                        aria-pressed={audio}
                        onClick={() => setAudio(!audio)}
                      >
                        <Icon name="mic" />
                        音频文件
                      </button>
                      <button
                        id="xiaozhi-knowledge"
                        aria-pressed={apps}
                        onClick={() => setApps(!apps)}
                      >
                        <Icon name="book" />
                        应用数据
                      </button>
                    </div>
                    <p>选择资料，补充对话上下文</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="agent-tool-button"
                  id="agent-web-toggle"
                  aria-label="联网搜索"
                  title="联网搜索（模拟）"
                  aria-pressed={web}
                  onClick={() => setWeb(!web)}
                >
                  <Icon name="globe" />
                </button>
                <button
                  className="xiaozhi-send"
                  id="xiaozhi-send"
                  aria-label="发送给 Ask Agent"
                  disabled={!session.input.trim() || busy}
                  onClick={() => {
                    setSources(false);
                    void send();
                  }}
                >
                  <Icon name="send" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
