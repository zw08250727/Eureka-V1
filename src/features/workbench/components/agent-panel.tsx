"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { RefIcon as Icon } from "@/features/reference/symbols";
import {useAgentLayout} from "@/features/reference/use-agent-layout";
import { useAgentWidth } from "../hooks/use-agent-width";
import { mockAgent } from "../model/mock-agent";
import type { AgentContext, AgentGateway, AgentReply } from "../model/types";
export interface AgentDraft {
  context: AgentContext;
  text: string;
  sequence: number;
}
export function AgentPanel({
  open,
  onClose,
  host,
  draft,
  gateway = mockAgent,
}: {
  open: boolean;
  onClose: () => void;
  host: RefObject<HTMLDivElement | null>;
  draft: AgentDraft;
  gateway?: AgentGateway;
  files?: { id: string; title: string }[];
}) {
  const rail=useRef<HTMLElement>(null);
  useAgentLayout(rail,open);
  const sizing = useAgentWidth(host),
    [input, setInput] = useState(draft.text),
    [context, setContext] = useState(draft.context),
    [messages, setMessages] = useState<{ prompt: string; reply: AgentReply }[]>(
      [],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [sources, setSources] = useState(false),
    [audio, setAudio] = useState(false),
    [apps, setApps] = useState(false),
    [web, setWeb] = useState(false),
    [widget, setWidget] = useState(!!draft.context.widget);
  const request = useRef<AbortController | null>(null),
    textarea = useRef<HTMLTextAreaElement>(null);
  const [last, setLast] = useState(draft.sequence);
  // A user selecting a new context is an explicit replacement of the pending prompt.
  if (last !== draft.sequence) {
    setLast(draft.sequence);
    setInput(draft.text);
    setContext(draft.context);
    setWidget(!!draft.context.widget);
  }
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!(e.target as Element).closest(".agent-source-wrap"))
        setSources(false);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  useEffect(() => {
    if (open && draft.sequence)
      textarea.current?.focus({ preventScroll: true });
  }, [open, draft.sequence]);
  useEffect(() => {
    host.current?.style.setProperty("--agent-panel-width", `${sizing.width}px`);
  }, [host, sizing.width]);
  useEffect(() => {
    document.body.classList.toggle("xiaozhi-open", open);
    return () => document.body.classList.remove("xiaozhi-open");
  }, [open]);
  async function send() {
    if (!input.trim() || busy) return;
    const prompt = input.trim();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const reply = await gateway.send(
        prompt,
        {
          ...context,
          widget: widget ? context.widget : undefined,
          records:
            context.title === draft.context.title
              ? draft.context.records
              : context.records,
          lines:
            context.title === draft.context.title
              ? draft.context.lines
              : context.lines,
        },
        { audio, apps, web },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setMessages((m) =>
          context.widget && widget
            ? [{ prompt, reply }]
            : [...m, { prompt, reply }],
        );
        setInput((current) => (current.trim() === prompt ? "" : current));
      }
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function reset() {
    request.current?.abort();
    setBusy(false);
    setSources(false);
    setMessages([]);
    setInput("");
    setContext({ kind: "page", title: "当前页面", lines: [] });
    setError("");
    setAudio(false);
    setApps(false);
    setWeb(false);
    setWidget(false);
    textarea.current?.focus();
  }
  return (
    <aside ref={rail}
      className={`xiaozhi-rail ${open ? "expanded" : ""}`}
      id="xiaozhi-rail"
      aria-label="Ask Agent"
      aria-labelledby="xiaozhi-title"
      aria-hidden={!open}
    >
      <div
        className="agent-resize-handle"
        role="separator"
        aria-label="调整 Agent 窗口宽度"
        title="左右拖动调整宽度，或使用左右方向键"
        aria-orientation="vertical"
        tabIndex={0}
        aria-valuemin={sizing.min}
        aria-valuemax={sizing.max}
        aria-valuenow={Math.round(sizing.width)}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          sizing.startDrag(e.clientX);
        }}
        onPointerMove={(e) => sizing.moveDrag(e.clientX)}
        onPointerUp={() => sizing.endDrag()}
        onPointerCancel={() => sizing.cancelDrag()}
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            sizing.save(
              e.key === "Home"
                ? sizing.min
                : e.key === "End"
                  ? sizing.max
                  : sizing.width + (e.key === "ArrowLeft" ? 24 : -24),
            );
          }
        }}
      />
      <div className="xiaozhi-panel" aria-hidden={!open}>
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
            <button
              type="button"
              className="agent-new-task"
              id="xiaozhi-new-task"
              aria-label="新建任务"
              title="新建任务"
              onClick={reset}
            >
              <Icon name="new-task" />
            </button>
            <button
              id="xiaozhi-collapse"
              aria-label="收起小智"
              type="button"
              onClick={onClose}
            >
              <Icon name="x" />
            </button>
          </div>
        </div>
        <div className="xiaozhi-body">
          <div className="xiaozhi-intro">
            <span className="xiaozhi-state">
              <i />
              资料准备好后
            </span>
            <h3>让每次讨论都有下一步</h3>
            <p>引用已沉淀的会议或知识文件，再开始分析与创作。</p>
            <div className="xiaozhi-suggestions">
              {[
                ["整理行动项", "整理本周会议并生成行动清单"],
                ["生成复盘", "结合知识库生成一份项目复盘报告"],
                ["分析需求", "分析近期客户会议中的重点需求"],
              ].map(([label, prompt]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setInput(prompt);
                    textarea.current?.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {messages.map((m, i) =>
              context.widget && widget ? (
                <section
                  key={i}
                  id="widget-agent-result"
                  className="widget-agent-result"
                  aria-live="polite"
                >
                  <span>AI · 演示建议</span>
                  <h4>{m.reply.title}</h4>
                  <p className="widget-agent-request">
                    {m.prompt.split("\n")[0]}
                  </p>
                  <ol>
                    {m.reply.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ol>
                  <small>基于已引用的记录整理，仅供参考。</small>
                </section>
              ) : (
                <article key={i} className="agent-history-message assistant">
                  <span>Ask Agent · 本地模拟</span>
                  <p>{m.prompt}</p>
                  <p>已收到你的问题，可以继续补充背景，或引用资料展开讨论。</p>
                  <small>
                    {web
                      ? "联网搜索已选，当前仅模拟，未执行真实检索。"
                      : "模拟回复，尚未调用 AI 服务。"}
                  </small>
                </article>
              ),
            )}
          </div>
          {error ? <p role="alert">{error}</p> : null}
          <div className="agent-composer-wrap">
            <form
              className="xiaozhi-composer"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <textarea
                id="xiaozhi-input"
                ref={textarea}
                placeholder="输入问题，按 Enter 发送…"
                aria-label="向 Ask Agent 输入问题"
                aria-describedby="agent-keyboard-hint xiaozhi-context-hint"
                value={input}
                onChange={(e) => setInput(e.target.value)}
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
                    className={
                      "agent-tool-button " +
                      (audio || apps || widget ? "has-sources" : "")
                    }
                    id="agent-sources-toggle"
                    aria-label="引用资料"
                    title="引用资料"
                    aria-expanded={sources}
                    aria-controls="agent-sources-popover"
                    onClick={() => setSources(!sources)}
                  >
                    <Icon name="book" />
                  </button>
                  <div
                    id="agent-sources-popover"
                    hidden={!sources}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setSources(false);
                        document
                          .getElementById("agent-sources-toggle")
                          ?.focus();
                      }
                    }}
                  >
                    <strong>引用资料</strong>
                    <div className="xiaozhi-context">
                      <button
                        id="xiaozhi-audio"
                        className={audio ? "selected" : ""}
                        aria-pressed={audio}
                        type="button"
                        onClick={() => setAudio(!audio)}
                      >
                        <Icon name="mic" />
                        音频文件
                      </button>
                      <button
                        id="xiaozhi-knowledge"
                        className={apps ? "selected" : ""}
                        aria-pressed={apps}
                        type="button"
                        onClick={() => setApps(!apps)}
                      >
                        <Icon name="book" />
                        应用数据
                      </button>
                      {context.widget ? (
                        <button
                          type="button"
                          id="xiaozhi-widget-context"
                          aria-label={
                            "引用" +
                            (context.widget === "thoughts" ? " " : "") +
                            context.title
                          }
                          className={widget ? "selected" : ""}
                          onClick={() => setWidget(!widget)}
                        >
                          {context.title}
                        </button>
                      ) : null}
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
                  onClick={() => {
                    setWeb(!web);
                    setSources(false);
                  }}
                >
                  <Icon name="globe" />
                </button>
                <button
                  className="xiaozhi-send"
                  id="xiaozhi-send"
                  aria-label="发送给 Ask Agent"
                  disabled={!input.trim() || busy}
                  type="submit"
                >
                  <Icon name="send" />
                </button>
              </div>
              <span
                id="xiaozhi-context-hint"
                className="agent-context-hint"
                aria-live="polite"
              >
                {audio || apps || widget
                  ? `已引用 ${Number(audio) + Number(apps) + Number(widget)} 类资料`
                  : "基于当前页面继续对话"}
              </span>
              <div className="agent-composer-caption">
                <span id="agent-keyboard-hint">
                  Enter 发送 / Shift+Enter 换行
                </span>
                <span>本地模拟</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
