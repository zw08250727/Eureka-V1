"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
}) {
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
    [web, setWeb] = useState(false);
  const request = useRef<AbortController | null>(null),
    textarea = useRef<HTMLTextAreaElement>(null);
  const [last, setLast] = useState(draft.sequence);
  // A user selecting a new context is an explicit replacement of the pending prompt.
  if (last !== draft.sequence) {
    setLast(draft.sequence);
    setInput(draft.text);
    setContext(draft.context);
  }
  useEffect(() => () => request.current?.abort(), []);
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
        context,
        { audio, apps, web },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setMessages((m) => [...m, { prompt, reply }]);
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
    setMessages([]);
    setInput("");
    setContext({ kind: "page", title: "当前页面", lines: [] });
    setError("");
    setAudio(false);
    setApps(false);
    setWeb(false);
    textarea.current?.focus();
  }
  return (
    <aside
      className="agent-panel"
      hidden={!open}
      style={{ width: sizing.width }}
      aria-label="Ask Agent"
    >
      <div
        className="agent-resize-handle"
        role="separator"
        aria-label="调整 Agent 窗口宽度"
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
        onPointerMove={(e) => {
          sizing.moveDrag(e.clientX);
        }}
        onPointerUp={() => {
          sizing.endDrag();
        }}
        onPointerCancel={() => {
          sizing.cancelDrag();
        }}
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
      <header>
        <span className="agent-mark">
          <Icon name="spark" />
        </span>
        <div>
          <h2>Ask Agent</h2>
          <p>基于当前页面内容继续工作</p>
        </div>
        <Button variant="ghost" aria-label="新建任务" onClick={reset}>
          <Icon name="edit" />
        </Button>
        <Button variant="ghost" aria-label="收起 Ask Agent" onClick={onClose}>
          <Icon name="close" />
        </Button>
      </header>
      <div className="agent-messages">
        {!messages.length ? (
          <section className="agent-welcome">
            <small>资料准备好后</small>
            <h3>让每次讨论都有下一步</h3>
            <p>引用已沉淀的会议或知识文件，再开始分析与创作。</p>
            <div>
              {[
                ["整理行动项", "整理本周会议并生成行动清单"],
                ["生成复盘", "结合知识库生成一份项目复盘报告"],
                ["分析需求", "分析近期客户会议中的重点需求"],
              ].map(([label, prompt]) => (
                <button
                  key={label}
                  onClick={() => {
                    setInput(prompt);
                    textarea.current?.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        ) : null}
        <div role="log" aria-label="Agent 对话" aria-live="polite">
          {messages.map((m, i) => (
            <section key={i}>
              <p className="agent-user-message">{m.prompt}</p>
              <div className="agent-reply">
                <h3>{m.reply.title}</h3>
                <p>{m.reply.text}</p>
                <ul>
                  {m.reply.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
      </div>
      <form
        className="agent-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          ref={textarea}
          aria-label="向 Ask Agent 输入问题"
          placeholder="输入问题，按 Enter 发送…"
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
        <div className="agent-tools">
          <div className="agent-source-wrap">
            <Button
              aria-label="引用资料"
              aria-expanded={sources}
              onClick={() => setSources(!sources)}
            >
              <Icon name="book" />
            </Button>
            {sources ? (
              <div className="agent-sources">
                <strong>引用资料</strong>
                <Button aria-pressed={audio} onClick={() => setAudio(!audio)}>
                  音频文件
                </Button>
                <Button aria-pressed={apps} onClick={() => setApps(!apps)}>
                  应用数据
                </Button>
                {context.kind === "daily" ? (
                  <p>
                    {context.title} · {context.lines.length} 条记录
                  </p>
                ) : null}
                <Button variant="ghost" onClick={() => setSources(false)}>
                  关闭
                </Button>
              </div>
            ) : null}
          </div>
          <Button
            aria-label="联网搜索"
            aria-pressed={web}
            onClick={() => {
              setWeb(!web);
              setSources(false);
            }}
          >
            <Icon name="globe" />
          </Button>
          <Button
            className="agent-send"
            aria-label="发送给 Ask Agent"
            type="submit"
            disabled={!input.trim() || busy}
          >
            <Icon name="send" />
          </Button>
        </div>
      </form>
    </aside>
  );
}
