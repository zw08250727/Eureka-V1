"use client";
import { AgentHistoryButton } from "@/features/agent/history-button";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RefIcon } from "@/features/reference/symbols";
import { M } from "./model/store";
import type { Insight, Thread } from "./model/types";
import type { SpacesController } from "./use-spaces";
import { appUrl } from "@/lib/routes";
import { creditNumber, date, WsButton as Button, WsDialog } from "./billing-ui";
export function TeamHomeAgent({
  controller,
  space,
  actor,
  insightId,
  initialHistoryId,
  onClose,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  insightId?: string;
  initialHistoryId?: string;
  onClose: () => void;
}) {
  const w = M.get(controller.state!, space),
    insight = M.insights(w, actor).items.find((i) => i.id === insightId);
  const [activeInsight, setActiveInsight] = useState<string | undefined>(
      insightId,
    ),
    [historyId, setHistoryId] = useState(initialHistoryId),
    [draft, setDraft] = useState(insight?.title || ""),
    [answer, setAnswer] = useState(""),
    [fresh, setFresh] = useState(false),
    [error, setError] = useState(""),
    [web, setWeb] = useState(false),
    [appData, setAppData] = useState(false),
    [fileIds, setFileIds] = useState<string[]>([]),
    [sources, setSources] = useState(false),
    [width, setWidth] = useState(390),
    [bounds, setBounds] = useState({ min: 300, max: 760 });
  const rail = useRef<HTMLElement>(null),
    scroll = useRef<HTMLDivElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    drag = useRef<{ x: number; width: number } | null>(null),
    preferred = useRef(390),
    shouldScroll = useRef(false);
  const context: Insight | undefined = activeInsight
    ? M.insights(w, actor).items.find((i) => i.id === activeInsight)
    : undefined;
  const thread = historyId
    ? M.history(w, actor).find((t) => t.id === historyId)
    : undefined;
  const messages = thread
    ? M.conversation(w, thread.id, actor)
    : fresh
      ? []
      : M.history(w, actor)
          .filter(
            (t) =>
              !(t as Thread & { demo?: boolean }).demo &&
              t.user === actor &&
              (!context || t.prompt.includes(context.title)),
          )
          .slice(0, 4)
          .reverse();
  function applyWidth(value: number) {
    const host = rail.current?.closest<HTMLElement>(
      ".ws-layout,.md-detail-layout",
    );
    if (!host) return;
    const available = host.getBoundingClientRect().width,
      max = Math.max(
        1,
        Math.min(760, available - (innerWidth > 900 ? 300 : 0)),
      ),
      min = Math.min(300, max),
      next = Math.round(Math.max(min, Math.min(max, value)));
    setWidth(next);
    setBounds({ min, max });
    host.style.setProperty("--agent-panel-width", `${next}px`);
    return next;
  }
  function persistWidth(value: number) {
    preferred.current = value;
    try {
      localStorage.setItem("eureka:agent-panel-width:v1", String(value));
    } catch {
      /* Session resizing remains available. */
    }
  }
  useLayoutEffect(() => {
    try {
      preferred.current =
        Number(localStorage.getItem("eureka:agent-panel-width:v1")) || 390;
    } catch {
      /* Default width. */
    }
    const resize = () => applyWidth(preferred.current);
    resize();
    window.addEventListener("resize", resize);
    if (insightId || initialHistoryId)
      input.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("resize", resize);
      document.body.classList.remove("agent-resizing");
    };
  }, [insightId, initialHistoryId]);
  useEffect(() => {
    if (shouldScroll.current && scroll.current) {
      scroll.current.scrollTop = scroll.current.scrollHeight;
      shouldScroll.current = false;
    }
  }, [controller.state, answer]);
  function send() {
    try {
      const prompt =
        context && draft.trim() && !draft.includes(context.title)
          ? context.title + "：" + draft
          : draft;
      const result = controller.change((s) =>
        M.ask(M.get(s, space), prompt, null, actor, historyId || null, {
          fileIds,
          web,
          appData,
        }),
      );
      setDraft("");
      setAnswer(result.cost ? "" : result.answer);
      setHistoryId(result.threadId || historyId);
      setFileIds([]);
      setError("");
      shouldScroll.current = true;
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const icon = (name: string) => <RefIcon name={name} className="ws-icon" />;
  return (
    <>
      <aside ref={rail} className="ws-agent" aria-label="Ask Agent">
        <div
          className="agent-resize-handle"
          tabIndex={0}
          role="separator"
          aria-orientation="vertical"
          aria-label="调整 Agent 窗口宽度"
          aria-valuemin={bounds.min}
          aria-valuemax={bounds.max}
          aria-valuenow={width}
          title="左右拖动调整宽度，或使用左右方向键"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = {
              x: e.clientX,
              width: rail.current!.getBoundingClientRect().width,
            };
            document.body.classList.add("agent-resizing");
          }}
          onPointerMove={(e) => {
            if (drag.current)
              applyWidth(drag.current.width + drag.current.x - e.clientX);
          }}
          onPointerUp={(e) => {
            if (drag.current) {
              const next = applyWidth(
                drag.current.width + drag.current.x - e.clientX,
              );
              if (next) persistWidth(next);
              drag.current = null;
              document.body.classList.remove("agent-resizing");
            }
          }}
          onPointerCancel={() => {
            drag.current = null;
            document.body.classList.remove("agent-resizing");
          }}
          onLostPointerCapture={() => {
            drag.current = null;
            document.body.classList.remove("agent-resizing");
          }}
          onKeyDown={(e) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
              return;
            e.preventDefault();
            const next = applyWidth(
              e.key === "Home"
                ? bounds.min
                : e.key === "End"
                  ? bounds.max
                  : width + (e.key === "ArrowLeft" ? 24 : -24),
            );
            if (next) persistWidth(next);
          }}
        />
        <header>
          <div>
            <span className="ws-agent-mark">{icon("spark")}</span>
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
                setFresh(true);
                setHistoryId(undefined);
                setActiveInsight(undefined);
                setAnswer("");
                setDraft("");
                setError("");
                setFileIds([]);
                setWeb(false);
                setAppData(false);
                input.current?.focus();
              }}
            >
              {icon("new-task")}
            </Button>
            <Button
              action="agent-close"
              className="ws-icon-button"
              aria-label="收起 Agent"
              onClick={onClose}
            >
              {icon("x")}
            </Button>
          </div>
        </header>
        <div ref={scroll} className="ws-agent-scroll">
          <span className="ws-eyebrow">仅引用当前空间已授权的内容</span>
          {thread ? (
            <div className="ws-agent-history-context">
              <span className="ws-eyebrow">历史会话</span>
              <h3>{thread.title || thread.prompt}</h3>
              <p>
                <time>{date(thread.time)}</time>
              </p>
            </div>
          ) : context ? (
            <div className="ws-agent-insight-context">
              <span>正在讨论</span>
              <h3>{context.title}</h3>
              <p>{context.description}</p>
              <div className="ws-agent-insight-sources">
                {context.sources.map((e) => (
                  <Button
                    action="file"
                    key={e.fileId}
                    value={e.fileId}
                    className="link"
                    onClick={() =>
                      location.assign(appUrl("meeting", e.fileId, space, actor))
                    }
                  >
                    {icon("mic")}
                    {e.title}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <h3>让团队讨论有下一步</h3>
              <p>整理关键结论、拆解行动项，或准备下一次沟通。</p>
              <div className="ws-agent-prompts">
                {["整理待推进的行动项", "为下次会议准备简报"].map((t) => (
                  <Button
                    action="prompt"
                    key={t}
                    value={t}
                    onClick={() => {
                      setDraft(t);
                      input.current?.focus();
                    }}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </>
          )}
          {messages.map((t) => (
            <Fragment key={t.id}>
              <div className="ws-chat-user">{t.prompt}</div>
              <div className="ws-chat-answer">{t.answer}</div>
              {t.usage ? (
                <div className="ws-agent-usage">
                  输入 {creditNumber(t.usage.inputTokens)} / 输出{" "}
                  {creditNumber(t.usage.outputTokens)} tokens ·{" "}
                  {creditNumber(t.usage.cost)} Credits（模拟）
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
            ref={input}
            name="question"
            aria-label="向团队 Agent 提问"
            aria-describedby="ws-composer-hint"
            placeholder="输入问题，按 Enter 发送…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                if (draft.trim()) send();
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
              {icon("book")}
            </Button>
            <Button
              action="agent-web"
              className={`ws-tool${web ? " selected" : ""}`}
              aria-label="联网搜索"
              aria-pressed={web}
              title="联网搜索（模拟）"
              onClick={() => setWeb(!web)}
            >
              {icon("globe")}
            </Button>
            <button
              type="submit"
              className="ws-btn primary"
              aria-label="发送问题"
              disabled={!draft.trim()}
            >
              {icon("send")}
            </button>
          </div>
          <small id="ws-composer-hint">
            {fileIds.length
              ? "已引用 " + fileIds.length + " 场会议"
              : thread
                ? "已引用当前历史会话"
                : "基于当前工作空间"}
            {appData ? " · 应用数据" : ""}
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
      </aside>
      {sources ? (
        <WsDialog
          title="引用资料"
          form="agent-sources"
          onClose={() => setSources(false)}
          error={error}
          footer={
            <>
              <Button action="close-dialog" onClick={() => setSources(false)}>
                取消
              </Button>
              <button type="submit" className="ws-btn primary">
                确认引用
              </button>
            </>
          }
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const form = new FormData(e.currentTarget),
                ids = form.getAll("files").map(String);
              ids.forEach((id) => M.getFile(w, id, actor));
              setFileIds(ids);
              setAppData(form.has("appData"));
              setSources(false);
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
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
                {icon("mic")}
                <span>{f.title}</span>
              </label>
            ))}
          </div>
          <label className="ws-source-app">
            <input type="checkbox" name="appData" defaultChecked={appData} />
            应用数据（所选会议的名称与处理状态）
          </label>
          <p className="ws-muted">不会引用个人闪念、联系人或其他空间资料。</p>
        </WsDialog>
      ) : null}
    </>
  );
}
