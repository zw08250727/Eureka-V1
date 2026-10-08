"use client";
import { readSessions, useSceneAgent } from "@/features/agent/session";
import { AgentHistoryButton } from "@/features/agent/history-button";
import { Fragment, useLayoutEffect, useEffect, useRef, useState } from "react";
import { useAgentLayout } from "@/features/reference/use-agent-layout";
import { M } from "./model/store";
import type { SpacesController } from "./use-spaces";
import { RefIcon } from "@/features/reference/symbols";
import {
  ManagementButton as Button,
  ManagementIcon as Icon,
  ManagementDialog as Dialog,
  managementDate,
} from "./management-ui";
import { SCENES } from "@/features/agent/registry";
import personalHistory from "@/features/personal/history-seeds.json";
export const personalHistoryTitles = [
  "本周会议决策整理",
  "研发周报自动整理",
  "客户访谈高频问题",
  "周报与行动项",
];
export function ManagementAgentResize() {
  const ref = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; width: number } | null>(null);
  const [range, setRange] = useState({ min: 300, max: 760, width: 390 });
  function resize(value: number, persist = false) {
    const rail = ref.current?.parentElement,
      host = rail?.closest<HTMLElement>(
        ".ws-layout,.md-detail-layout,.meeting-agent-grid,.contacts-shell,.pa-workspace,.pa-archive-wrap",
      );
    if (!rail || !host) return;
    const max = Math.max(
        1,
        Math.min(
          760,
          host.getBoundingClientRect().width -
            (innerWidth > (rail.id === "xiaozhi-rail" ? 760 : 900) ? 300 : 0),
        ),
      ),
      min = Math.min(300, max),
      width = Math.round(Math.max(min, Math.min(max, value)));
    host.style.setProperty("--agent-panel-width", width + "px");
    setRange({ min, max, width });
    if (persist)
      try {
        localStorage.setItem("eureka:agent-panel-width:v1", String(width));
      } catch {
        /* Width still works for this session. */
      }
  }
  useEffect(() => {
    const fit = () => {
      let width = 390;
      try {
        width =
          Number(localStorage.getItem("eureka:agent-panel-width:v1")) || 390;
      } catch {
        /* Default width. */
      }
      resize(width);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.body.classList.remove("agent-resizing");
    };
  }, []);
  return (
    <div
      ref={ref}
      className="agent-resize-handle"
      tabIndex={0}
      role="separator"
      aria-orientation="vertical"
      aria-label="调整 Agent 窗口宽度"
      title="左右拖动调整宽度，或使用左右方向键"
      aria-valuemin={range.min}
      aria-valuemax={range.max}
      aria-valuenow={range.width}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, width: range.width };
        document.body.classList.add("agent-resizing");
      }}
      onPointerMove={(e) => {
        if (drag.current)
          resize(drag.current.width + drag.current.x - e.clientX);
      }}
      onLostPointerCapture={() => {
        if (drag.current) resize(range.width, true);
        drag.current = null;
        document.body.classList.remove("agent-resizing");
      }}
      onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
      onPointerCancel={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        resize(
          e.key === "Home"
            ? range.min
            : e.key === "End"
              ? range.max
              : range.width + (e.key === "ArrowLeft" ? 24 : -24),
          true,
        );
      }}
    />
  );
}
export function TeamHistoryAgent({
  controller,
  space,
  actor,
  id,
  onClose,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  id: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(id),
    [input, setInput] = useState(""),
    [error, setError] = useState(""),
    [answer, setAnswer] = useState("");
  const [sources, setSources] = useState(false),
    [fileIds, setFileIds] = useState<string[]>([]),
    [apps, setApps] = useState(
      Boolean(
        (
          M.history(M.get(controller.state!, space), actor).find(
            (t) => t.id === id,
          ) as { appData?: boolean } | undefined
        )?.appData,
      ),
    ),
    [web, setWeb] = useState(
      Boolean(
        (
          M.history(M.get(controller.state!, space), actor).find(
            (t) => t.id === id,
          ) as { web?: boolean } | undefined
        )?.web,
      ),
    );
  const textarea = useRef<HTMLTextAreaElement>(null),
    log = useRef<HTMLDivElement>(null);
  const w = M.get(controller.state!, space),
    thread = M.history(w, actor).find((t) => t.id === selected),
    conversation = thread ? M.conversation(w, thread.id, actor) : [];
  useEffect(() => {
    if (log.current) log.current.scrollTop = 0;
  }, [id]);
  function send() {
    try {
      const result = controller.change((s) =>
        M.ask(M.get(s, space), input, null, actor, thread?.id, {
          fileIds,
          web,
          appData: apps,
        }),
      );
      setInput("");
      setSelected(result.threadId || selected);
      setAnswer(result.cost ? "" : result.answer);
      setFileIds([]);
      setError("");
      requestAnimationFrame(() => {
        if (log.current) log.current.scrollTop = log.current.scrollHeight;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <aside className="ws-agent" aria-label="Ask Agent">
      <ManagementAgentResize />
      <header>
        <div>
          <span className="ws-agent-mark">
            <Icon name="spark" />
          </span>
          <div>
            <h2>Ask Agent</h2>
            <p>{w.name}</p>
          </div>
        </div>
        <div className="agent-head-actions">
            <AgentHistoryButton />
          <Button
            action="agent-new"
            className="agent-new-task"
            aria-label="新建会话"
            title="新建会话"
            onClick={() => {
              setSelected("");
              setInput("");
              setAnswer("");
              setFileIds([]);
              setApps(false);
              setWeb(false);
              textarea.current?.focus();
            }}
          >
            <Icon name="new-task" />
          </Button>
          <Button
            action="agent-close"
            className="ws-icon-button"
            aria-label="收起 Agent"
            onClick={onClose}
          >
            <Icon name="x" />
          </Button>
        </div>
      </header>
      <div className="ws-agent-scroll" ref={log}>
        <span className="ws-eyebrow">仅引用当前空间已授权的内容</span>
        {thread ? (
          <div className="ws-agent-history-context">
            <span className="ws-eyebrow">历史会话</span>
            <h3>{thread.title || thread.prompt}</h3>
            <p>
              <time>{managementDate(thread.time)}</time>
            </p>
          </div>
        ) : (
          <>
            <h3>让团队讨论有下一步</h3>
            <p>整理关键结论、拆解行动项，或准备下一次沟通。</p>
            <div className="ws-agent-prompts">
              {["整理待推进的行动项", "为下次会议准备简报"].map((t) => (
                <Button
                  key={t}
                  action="prompt"
                  value={t}
                  onClick={() => {
                    setInput(t);
                    textarea.current?.focus();
                  }}
                >
                  {t}
                </Button>
              ))}
            </div>
          </>
        )}
        {conversation.map((t) => (
          <Fragment key={t.id}>
            <div className="ws-chat-user">{t.prompt}</div>
            <div className="ws-chat-answer">{t.answer}</div>
            {t.usage ? (
              <div className="ws-agent-usage">
                输入 {t.usage.inputTokens.toLocaleString("zh-CN")} / 输出{" "}
                {t.usage.outputTokens.toLocaleString("zh-CN")} tokens ·{" "}
                {t.usage.cost.toLocaleString("zh-CN", {
                  maximumFractionDigits: 3,
                })}{" "}
                Credits（模拟）
              </div>
            ) : null}
          </Fragment>
        ))}
        {answer ? (
          <div className="ws-chat-answer" role="status">
            {answer}
          </div>
        ) : null}
      </div>
      <form
        className="ws-composer"
        data-ws-form="ask"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          ref={textarea}
          name="question"
          aria-label="向团队 Agent 提问"
          aria-describedby="ws-composer-hint"
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
              if (input.trim()) send();
            }
          }}
        />
        <div className="ws-composer-tools">
          <Button
            action="agent-sources"
            className={`ws-tool${fileIds.length || thread ? " selected" : ""}`}
            aria-label="引用资料"
            title="引用资料"
            onClick={() => setSources(true)}
          >
            <Icon name="book" />
          </Button>
          <Button
            action="agent-web"
            className={`ws-tool${web ? " selected" : ""}`}
            aria-label="联网搜索"
            aria-pressed={web}
            title="联网搜索（模拟）"
            onClick={() => setWeb(!web)}
          >
            <Icon name="globe" />
          </Button>
          <button
            className="ws-btn primary"
            type="submit"
            aria-label="发送问题"
            disabled={!input.trim()}
          >
            <Icon name="send" />
          </button>
        </div>
        <small id="ws-composer-hint">
          {fileIds.length
            ? `已引用 ${fileIds.length} 场会议`
            : thread
              ? "已引用当前历史会话"
              : "基于当前工作空间"}
          {apps ? " · 应用数据" : ""}
          {web ? " · 联网模拟" : ""}
        </small>
        <div className="ws-composer-caption">
          <small>Enter 发送 / Shift+Enter 换行</small>
          <small>按 Token 用量结算 · 本地模拟</small>
        </div>
        <p className="ws-form-error" role="alert">
          {error}
        </p>
      </form>
      {sources ? (
        <Dialog
          title="引用资料"
          form="agent-sources"
          onClose={() => setSources(false)}
          onSubmit={(f) => {
            const ids = f.getAll("files").map(String);
            ids.forEach((id) => M.getFile(w, id, actor));
            setFileIds(ids);
            setApps(f.has("appData"));
            setSources(false);
          }}
          footer={
            <>
              <Button action="close-dialog" onClick={() => setSources(false)}>
                取消
              </Button>
              <button className="ws-btn primary" type="submit">
                确认引用
              </button>
            </>
          }
        >
          <p className="ws-muted">
            仅展示当前空间有权访问的音频文件。未选择时沿用当前会话或页面上下文。
          </p>
          <div className="ws-source-options">
            {M.visible(w, actor).map((f) => (
              <label key={f.id}>
                <input
                  type="checkbox"
                  name="files"
                  value={f.id}
                  defaultChecked={(fileIds.length
                    ? fileIds
                    : thread?.files || []
                  ).includes(f.id)}
                />
                <Icon name="mic" />
                <span>{f.title}</span>
              </label>
            ))}
          </div>
          <label className="ws-source-app">
            <input type="checkbox" name="appData" defaultChecked={apps} />
            应用数据（所选会议的名称与处理状态）
          </label>
          <p className="ws-muted">不会引用个人闪念、联系人或其他空间资料。</p>
        </Dialog>
      ) : null}
    </aside>
  );
}
export function PersonalHistoryAgent({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const rail = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    document.body.classList.add("xiaozhi-open");
    return () => document.body.classList.remove("xiaozhi-open");
  }, []);
  useAgentLayout(rail, true, true);
  const [saved] = useState(() => {
    try { return readSessions(localStorage).find((s) => (s.id === id || s.id === "seed:" + id) && s.space === "personal" && s.actor === (new URLSearchParams(location.search).get("actor") || "zhang")); }
    catch { return undefined; }
  });
  const index = personalHistoryTitles.indexOf(id);
  const seed = saved ? {
    ...personalHistory[0], messages: saved.messages,
    source: SCENES[saved.scene]?.label || "历史会话",
    next: "基于这条会话继续梳理下一步",
    followup: "这条历史会话已恢复。当前为本地模拟；需要最新数据或执行操作时，请回到对应场景。",
  } : personalHistory[index] || { ...personalHistory[0], messages: [], source: "不可用", next: "", followup: "会话不存在或已删除。" };
  const agent = useSceneAgent(saved?.scene || "home", saved?.sourceId || "", saved?.id || (index >= 0 ? "seed:" + id : undefined), { title: personalHistoryTitles[index] || id, messages: seed.messages });
  const [fresh, setFresh] = useState(false);
  const [messages, setMessages] = useState(seed.messages),
    [input, setInput] = useState(""),
    [sources, setSources] = useState(false),
    [web, setWeb] = useState(false),
    [audio, setAudio] = useState(false),
    [apps, setApps] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null),
    log = useRef<HTMLDivElement>(null),
    sourceWrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!sourceWrap.current?.contains(e.target as Node)) setSources(false);
    };
    document.addEventListener("click", close);
    if (log.current) log.current.scrollTop = 0;
    return () => document.removeEventListener("click", close);
  }, []);
  function send() {
    if (!input.trim() || (!fresh && !saved && index < 0)) return;
    const text = agent.run(input.trim(), () => fresh
      ? `已收到：${input.trim()}。当前为本地模拟。`
      : `收到你的补充：“${input.trim()}”\n\n${seed.followup}\n\n${web ? "当前未执行真实联网检索。" : "模拟回复，尚未调用 AI 服务。"}`);
    setMessages((rows) => [...rows, { role: "user", text: input.trim() }, { role: "assistant", text }]);
    setInput("");
    requestAnimationFrame(() => {
      if (log.current) log.current.scrollTop = log.current.scrollHeight;
    });
  }
  return (
    <aside
      ref={rail}
      className={`xiaozhi-rail expanded${fresh ? "" : " history-mode"}`}
      id="xiaozhi-rail"
      aria-labelledby="xiaozhi-title"
      aria-hidden="false"
    >
      <ManagementAgentResize />
      <div className="xiaozhi-panel">
        <div className="xiaozhi-head">
          <div className="xiaozhi-identity">
            <span className="xiaozhi-mark">
              <RefIcon name="spark" />
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
                setFresh(true);
                setMessages([]);
                setInput("");
                setSources(false);
                setWeb(false);
                setAudio(false);
                setApps(false);
                textarea.current?.focus();
              }}
            >
              <RefIcon name="new-task" />
            </button>
            <button
              id="xiaozhi-collapse"
              aria-label="收起 Ask Agent"
              onClick={onClose}
            >
              <RefIcon name="x" />
            </button>
          </div>
        </div>
        <div className="xiaozhi-body">
          <div className="xiaozhi-intro" hidden={!fresh}>
            <span className="xiaozhi-state">
              <i />
              资料准备好后
            </span>
            <h3>让每次讨论都有下一步</h3>
            <p>引用已沉淀的会议或知识文件，再开始分析与创作。</p>
            <div className="xiaozhi-suggestions">
              {[
                ["整理本周会议并生成行动清单", "整理行动项"],
                ["结合知识库生成一份项目复盘报告", "生成复盘"],
                ["分析近期客户会议中的重点需求", "分析需求"],
              ].map(([prompt, label]) => (
                <button
                  key={prompt}
                  data-xiaozhi-prompt={prompt}
                  onClick={() => {
                    setInput(prompt);
                    textarea.current?.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {fresh
              ? messages
                  .filter((m) => m.role === "assistant")
                  .map((m, i) => (
                    <article
                      className="agent-history-message assistant"
                      key={i}
                    >
                      <span>Ask Agent · 本地模拟</span>
                      <p>{m.text}</p>
                      <p>
                        已收到你的问题，可以继续补充背景，或引用资料展开讨论。
                      </p>
                      <small>
                        {web
                          ? "联网搜索已选，当前仅模拟，未执行真实检索。"
                          : "模拟回复，尚未调用 AI 服务。"}
                      </small>
                    </article>
                  ))
              : null}
          </div>
          <section
            id="agent-history-session"
            hidden={fresh}
            aria-labelledby="agent-history-title"
            data-session-id={`history-${index + 1}`}
          >
            <header className="agent-session-head">
              <span>
                历史会话 <small>模拟对话</small>
              </span>
              <h3 id="agent-history-title" tabIndex={-1}>
                {saved?.title || personalHistoryTitles[index] || "会话不存在或已删除"}
              </h3>
              <p id="agent-history-source">{`已带入上下文 · ${seed.source}`}</p>
            </header>
            <div
              ref={log}
              id="agent-history-messages"
              role="log"
              aria-label="当前历史会话消息"
              aria-live="polite"
              tabIndex={0}
            >
              {messages.map((m, i) => (
                <article className={`agent-history-message ${m.role}`} key={i}>
                  <span>
                    {m.role === "user" ? "你" : "Ask Agent · 模拟回复"}
                  </span>
                  <p>{m.text}</p>
                </article>
              ))}
            </div>
            <button
              type="button"
              id="agent-history-continue"
              onClick={() => {
                setInput(seed.next);
                textarea.current?.focus();
              }}
            >
              {seed.next}
            </button>
          </section>
          <div className="agent-composer-wrap">
            <div className="xiaozhi-composer">
              <textarea
                ref={textarea}
                id="xiaozhi-input"
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
                    send();
                  }
                }}
              />
              <div className="agent-composer-toolbar">
                <div className="agent-source-wrap" ref={sourceWrap}>
                  <button
                    type="button"
                    className={`agent-tool-button${!fresh || audio || apps ? " has-sources" : ""}`}
                    id="agent-sources-toggle"
                    aria-label="引用资料"
                    title="引用资料"
                    aria-expanded={sources}
                    aria-controls="agent-sources-popover"
                    onClick={() => setSources(!sources)}
                  >
                    <RefIcon name="book" />
                  </button>
                  <div
                    id="agent-sources-popover"
                    hidden={!sources}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setSources(false);
                        sourceWrap.current?.querySelector("button")?.focus();
                      }
                    }}
                  >
                    <strong>引用资料</strong>
                    <div className="xiaozhi-context">
                      <button
                        id="xiaozhi-audio"
                        className={audio ? "selected" : ""}
                        aria-pressed={audio}
                        onClick={() => setAudio(!audio)}
                      >
                        <RefIcon name="mic" />
                        音频文件
                      </button>
                      <button
                        id="xiaozhi-knowledge"
                        className={apps ? "selected" : ""}
                        aria-pressed={apps}
                        onClick={() => setApps(!apps)}
                      >
                        <RefIcon name="book" />
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
                  title={web ? "已开启联网搜索（模拟）" : "联网搜索（模拟）"}
                  aria-pressed={web}
                  onClick={() => setWeb(!web)}
                >
                  <RefIcon name="globe" />
                </button>
                <button
                  className="xiaozhi-send"
                  id="xiaozhi-send"
                  aria-label="发送给 Ask Agent"
                  disabled={!input.trim()}
                  onClick={send}
                >
                  <RefIcon name="send" />
                </button>
              </div>
              <span
                id="xiaozhi-context-hint"
                className="agent-context-hint"
                aria-live="polite"
              >
                {!fresh
                  ? "已引用当前历史会话 · 继续对话"
                  : audio || apps
                    ? `已引用 ${Number(audio) + Number(apps)} 类资料`
                    : "基于当前页面继续对话"}
              </span>
              <div className="agent-composer-caption">
                <span id="agent-keyboard-hint">
                  Enter 发送 / Shift+Enter 换行
                </span>
                <span>本地模拟</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
