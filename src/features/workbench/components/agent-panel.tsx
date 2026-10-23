"use client";

import { useAgentCreditSimulation, AgentSimulationMessages, AgentSendButton } from "@/features/agent/credit-preview";
import { AgentCredits } from "@/features/agent/credits";
import { useSceneAgent } from "@/features/agent/session";
import { AgentHistoryButton } from "@/features/agent/history-button";
import { Fragment, useEffect, useRef, useState, type RefObject } from "react";
import { RefIcon as Icon } from "@/features/reference/symbols";
import { AgentConnectorPicker } from "@/features/connectors/agent-picker";
import { AgentActiveConnectorChips } from "@/features/connectors/active-chips";
import { AgentMaterialPicker, AgentMaterialSummary, type AgentMaterial } from "@/features/agent/material-picker";
import {useAgentLayout} from "@/features/reference/use-agent-layout";
import { useAgentWidth } from "../hooks/use-agent-width";
import { mockAgent } from "../model/mock-agent";
import type { AgentContext, AgentGateway, AgentReply } from "../model/types";
import { AgentWaiting } from "@/features/agent/waiting";
import type { AgentProgress, AgentProcess } from "@/features/agent/demo-stream";
import styles from "@/features/agent/credits.module.css";
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
  const simulation = useAgentCreditSimulation(open);
  const agent = useSceneAgent(draft.context.widget === "thoughts" ? "thoughts" : "home");
  const rail=useRef<HTMLElement>(null);
  const messageEnd = useRef<HTMLDivElement>(null);
  useAgentLayout(rail,open);
  const sizing = useAgentWidth(host),
    [input, setInput] = useState(draft.text),
    [context, setContext] = useState(draft.context),
    [messages, setMessages] = useState<{ prompt: string; reply: AgentReply; runId: string; stopped?: boolean; process?: AgentProcess; failed?: boolean }[]>(
      [],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [materials, setMaterials] = useState<AgentMaterial[]>([]),
    [audio, setAudio] = useState(false),
    [apps, setApps] = useState(false),
    [web, setWeb] = useState(false),
    [widget, setWidget] = useState(!!draft.context.widget);
  const [pending, setPending] = useState<{ prompt: string; progress: AgentProgress } | null>(null);
  const progress = useRef<AgentProgress | null>(null);
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
  useEffect(() => { if (messages.length || pending) messageEnd.current?.scrollIntoView({ block: "nearest" }); }, [messages, pending]);
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
    if (!input.trim() || busy || request.current) return;
    const simulated = simulation.send(input.trim());
    if (simulated) { if (simulated === "sent") setInput(""); return; }
    const prompt = input.trim();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    let execution: ReturnType<typeof agent.begin> | undefined;
    try {
      execution = agent.begin(prompt);
      progress.current = null;
      setInput("");
      setPending({ prompt, progress: { text: "", process: { kind: "thinking", label: "梳理问题" } } });
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
        { audio, apps, web, runId: execution.runId, onProgress: value => {
          if (controller.signal.aborted) return;
          progress.current = value;
          setPending({ prompt, progress: value });
        } },
        controller.signal,
      );
      const runId = execution.runId;
      execution.complete([reply.title, reply.text, ...reply.items].join("\n"), reply.usage ?? null);
      if (!controller.signal.aborted) {
        setMessages((m) =>
          context.widget && widget
            ? [{ prompt, reply, runId, process: progress.current?.process }]
            : [...m, { prompt, reply, runId, process: progress.current?.process }],
        );
        setInput((current) => (current.trim() === prompt ? "" : current));
      }
    } catch (e) {
      try { execution?.pending(); } catch { /* Preserve the original error and input. */ }
      if (request.current === controller) {
        if (execution) {
          const runId = execution.runId;
          const text = progress.current?.text || "";
          setMessages(rows => [...rows, { prompt, runId, reply: { title: "Ask Agent", text, items: [] }, stopped: controller.signal.aborted, failed: !controller.signal.aborted, process: progress.current?.process }]);
        }
        setInput(current => current || prompt);
        if (!controller.signal.aborted) setError((e as Error).message);
      }
    } finally {
      if (request.current === controller) { request.current = null; setPending(null); setBusy(false); }
    }
  }
  function reset() {
    simulation.reset();
    agent.reset();
    request.current?.abort();
    request.current = null;
    setPending(null);
    setBusy(false);
    setMaterials([]);
    setMessages([]);
    setInput("");
    setContext(draft.context);
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
            <AgentHistoryButton />
            <button
              type="button"
              className="agent-new-task"
              id="xiaozhi-new-task"
              aria-label="新建会话"
              title="新建会话"
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
            {!simulation.hasMessages && !messages.length && !pending && <>
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
            </>}
            {messages.map((m, i) =>
              context.widget && widget ? (
                <section
                  key={i}
                  id="widget-agent-result"
                  className="widget-agent-result"
                  aria-live="polite"
                >
                  <span>AI 建议</span>
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
                <Fragment key={m.runId}>
                  <article className="agent-history-message user"><span>你</span><p>{m.prompt}</p></article>
                  <article className="agent-history-message assistant">
                    <span>Ask Agent</span>
                    <p className={styles.answer}>{m.reply.text}</p>
                    {m.process && <AgentWaiting process={m.process} state={m.stopped ? "stopped" : m.failed ? "failed" : "completed"} />}
                    {m.stopped && <div className={styles.systemNote} role="status">已停止生成，已保留当前回答。</div>}
                    <AgentCredits runId={m.runId} />
                  </article>
                </Fragment>
              ),
            )}
            {pending && <>
              <article className="agent-history-message user"><span>你</span><p>{pending.prompt}</p></article>
              <article className="agent-history-message assistant" aria-busy="true">
                <span>Ask Agent</span>
                {pending.progress.text && <p className={styles.streamingAnswer} data-testid="native-stream-answer">{pending.progress.text}</p>}
                <AgentWaiting process={pending.progress.process} />
              </article>
            </>}
            <AgentSimulationMessages />
            {open && !pending && (!messages.length || widget) && <AgentCredits runId={widget ? messages.at(-1)?.runId : undefined} />}
            <div ref={messageEnd} />
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
              <AgentMaterialSummary selected={materials} onRemove={(id) => { const next = materials.filter(item => item.id !== id); setMaterials(next); setAudio(next.some(item => item.category === "meetings")); setApps(next.some(item => item.category !== "meetings")); }} />
              <AgentActiveConnectorChips />
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
                <AgentMaterialPicker selected={materials} onChange={(next) => { setMaterials(next); setAudio(next.some(item => item.category === "meetings")); setApps(next.some(item => item.category !== "meetings")); }} triggerClassName={`agent-tool-button${materials.length ? " has-sources" : ""}`} />
                <button
                  type="button"
                  className="agent-tool-button"
                  id="agent-web-toggle"
                  aria-label="联网搜索"
                  title="联网搜索"
                  aria-pressed={web}
                  onClick={() => {
                    setWeb(!web);
                  }}
                >
                  <Icon name="globe" />
                </button>
                <AgentConnectorPicker />
                <AgentSendButton className="xiaozhi-send" id="xiaozhi-send" label={busy ? "停止生成" : "发送给 Ask Agent"} disabled={!busy && !input.trim()} onSend={() => { if (busy) request.current?.abort(); else void send(); }}>{busy ? <span aria-hidden="true">■</span> : <Icon name="send" />}</AgentSendButton>
              </div>
              <span
                id="xiaozhi-context-hint"
                className="agent-context-hint"
                aria-live="polite"
              >
                {materials.length || widget
                  ? `已引用 ${materials.length + Number(widget)} 项素材`
                  : "基于当前页面继续对话"}
              </span>
              <div className="agent-composer-caption">
                <span id="agent-keyboard-hint">
                  Enter 发送 / Shift+Enter 换行
                </span>

              </div>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
