"use client";
import { useSceneAgent } from "@/features/agent/session";
import { AgentHistoryButton } from "@/features/agent/history-button";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type {
  ActionRecord,
  ActionState,
} from "@/features/workbench/model/types";
import { RefIcon } from "@/features/reference/symbols";
import { createActions, parseSchedule } from "./store";
import { newAction } from "./calendar";
import {
  ActionFields,
  actionValues,
  localDate,
  PaButton,
  PaModal,
  PersonalToast,
} from "./calendar-dialogs";
type Session = ActionState["sessions"][number];
export function CalendarAgent({
  host,
  records,
  scope,
  selected,
  session,
  repo,
  onRefresh,
  onClose,
  onOpen,
  navigationGuardRef,
}: {
  host: RefObject<HTMLDivElement | null>;
  records: ActionRecord[];
  scope: ActionRecord[];
  selected?: ActionRecord;
  session?: Session;
  repo: ReturnType<typeof createActions>;
  onRefresh: () => void;
  onClose: () => void;
  onOpen: (r: ActionRecord) => void;
  navigationGuardRef: RefObject<((next: () => void) => void) | null>;
}) {
  const agent = useSceneAgent("calendar", selected?.id || "");
  const [prompt, setPrompt] = useState(""),
    [ids, setIds] = useState<string[]>([]),
    [web, setWeb] = useState(false),
    [sources, setSources] = useState(false);
  const [draft, setDraft] = useState<ActionRecord | null>(null),
    [sessionId, setSessionId] = useState(session?.id || ""),
    [activeSession, setActiveSession] = useState(session);
  const [messages, setMessages] = useState<
      { prompt: string; body: ReactNode }[]
    >([]),
    [error, setError] = useState(""),
    [guard, setGuard] = useState(false);
  const [toast, setToast] = useState("");
  const [width, setWidth] = useState(390),
    [max, setMax] = useState(760);
  const drag = useRef<{ x: number; width: number } | null>(null),
    preferred = useRef(390);
  const input = useRef<HTMLTextAreaElement>(null),
    form = useRef<HTMLFormElement>(null),
    body = useRef<HTMLDivElement>(null),
    continuation = useRef<(() => void) | null>(null),
    bypassNavigation = useRef(false);
  const min = Math.min(300, max);
  useLayoutEffect(() => {
    const root = host.current;
    if (!root) return;
    try {
      preferred.current =
        Number(localStorage.getItem("eureka:agent-panel-width:v1")) || 390;
    } catch {
      /* Session-only preference. */
    }
    const fit = () => {
      const bound = Math.max(
        1,
        Math.min(
          760,
          root.getBoundingClientRect().width - (innerWidth > 1050 ? 300 : 0),
        ),
      );
      setMax(bound);
      setWidth(
        Math.round(
          Math.max(Math.min(300, bound), Math.min(bound, preferred.current)),
        ),
      );
    };
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    fit();
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      document.body.classList.remove("agent-resizing");
    };
  }, [host]);
  useLayoutEffect(() => {
    host.current?.style.setProperty("--agent-panel-width", width + "px");
  }, [width, host]);
  useLayoutEffect(() => {
    const message = body.current?.querySelector(".pa-message:last-of-type");
    if (body.current && message instanceof HTMLElement)
      body.current.scrollTop = message.offsetTop - body.current.offsetTop;
  }, [messages.length]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (draft) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const nav = (e: MouseEvent) => {
      if (bypassNavigation.current) return;
      const target =
        e.target instanceof Element
          ? e.target.closest<HTMLElement>(
              "a[href],.sidebar-quick-nav button,#home-entry,[data-meeting-view],.ws-menu-space,.ws-menu-item,.nav-item,.side-sub-item",
            )
          : null;
      if (draft && target && !target.closest("dialog,#personal-actions")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        continuation.current = () => target.click();
        setGuard(true);
      }
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("click", nav, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("click", nav, true);
    };
  }, [draft]);
  const saveWidth = (value: number) => {
    const next = Math.round(Math.max(min, Math.min(max, value)));
    preferred.current = next;
    setWidth(next);
    try {
      localStorage.setItem("eureka:agent-panel-width:v1", String(next));
    } catch {
      /* Optional preference. */
    }
  };
  const finishDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    saveWidth(width);
    document.body.classList.remove("agent-resizing");
  };
  const guarded = (next: () => void) => {
    if (draft) {
      continuation.current = next;
      setGuard(true);
    } else next();
  };
  useImperativeHandle(navigationGuardRef, () => guarded);
  const continueAfterGuard = () => {
    const next = continuation.current;
    continuation.current = null;
    setDraft(null);
    setGuard(false);
    bypassNavigation.current = true;
    next?.();
  };
  const open = (id: string) => {
    const r = records.find((r) => r.id === id);
    if (r) onOpen(r);
  };
  const generate = (text: string) => {
    if (!text.trim() || draft) return;
    try { agent.ensureAvailable(); } catch (error) { setError((error as Error).message); return; }
    const wantsCreate =
      /创建|新建|提醒我/.test(text) ||
      (/安排/.test(text) && !/哪些|优先|汇总|总结|回顾/.test(text));
    if (!wantsCreate) {
      const rows = ids.length
        ? records.filter((r) => ids.includes(r.id))
        : scope;
      const pending = rows
        .filter((r) => !r.done)
        .sort((a, b) => a.start.localeCompare(b.start));
      setMessages((m) => [
        ...m,
        {
          prompt: text,
          body: (
            <>
              <p>
                根据
                {ids.length ? "所选记录" : selected ? "当前记录" : "当前视图"}，
                {rows.length
                  ? "可以优先关注以下安排："
                  : "暂无匹配的日程与待办。"}
              </p>
              {pending.slice(0, 8).map((r) => (
                <PaButton
                  key={r.id}
                  action="open-created"
                  className="pa-linked"
                  id={r.id}
                  onClick={() => onOpen(r)}
                >
                  {r.title} · {localDate(r.start)}
                </PaButton>
              ))}
              <small className="pa-hint">
                仅引用个人记录 · 本地模拟分析{web ? " · 未连接外部搜索" : ""}
              </small>
            </>
          ),
        },
      ]);
      agent.record(text, pending.length ? pending.slice(0, 8).map((r) => `${r.title} · ${localDate(r.start)}`).join("\n") : "暂无匹配的日程与待办。");
      setPrompt("");
      return;
    }
    try {
      const type = /待办|提醒我|todo/i.test(text) ? "todo" : "schedule";
      const parsed: ActionRecord = {
        ...newAction(type),
        ...parseSchedule(text),
        type,
      };
      if (type === "todo") parsed.end = "";
      const sid = crypto.randomUUID();
      repo.session(sid, text, parsed);
      agent.record(text, `已生成${type === "todo" ? "待办" : "日程"}草稿：${parsed.title}。需要在日程场景确认后才会保存。`);
      setSessionId(sid);
      setDraft(parsed);
      setMessages((m) => [...m, { prompt: text, body: null }]);
      setPrompt("");
      setError("");
      onRefresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const confirm = () => {
    if (!draft || !form.current?.reportValidity()) return false;
    try {
      agent.ensureAvailable();
      const r = repo.confirm(sessionId, actionValues(form.current, draft));
      setDraft(null);
      onRefresh();
      setActiveSession({
        id: sessionId,
        prompt: messages.at(-1)?.prompt,
        created: new Date().toISOString(),
        recordId: r?.id,
      });
      setMessages([]);
      setError("");
      agent.record("确认保存", `已加入日程与待办：${r?.title || draft.title}`);
      setToast("已加入日程与待办");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  return (
    <aside id="pa-agent" className="pa-agent" aria-label="日程与待办 Ask Agent">
      <div
        className="agent-resize-handle"
        tabIndex={0}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整 Agent 窗口宽度"
        title="左右拖动调整宽度，或使用左右方向键"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={width}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, width };
          document.body.classList.add("agent-resizing");
        }}
        onPointerMove={(e) => {
          if (drag.current)
            setWidth(
              Math.round(
                Math.max(
                  min,
                  Math.min(
                    max,
                    drag.current.width + drag.current.x - e.clientX,
                  ),
                ),
              ),
            );
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
            return;
          e.preventDefault();
          saveWidth(
            e.key === "Home"
              ? min
              : e.key === "End"
                ? max
                : width + (e.key === "ArrowLeft" ? 24 : -24),
          );
        }}
      />
      <header>
        <div className="pa-agent-title">
          <span className="ws-agent-mark" aria-hidden="true">
            <RefIcon name="spark" />
          </span>
          <div>
            <h2>Ask Agent</h2>
            <small>我的日程与待办</small>
          </div>
        </div>
        <div className="agent-head-actions">
            <AgentHistoryButton />
          <button
            type="button"
            className="agent-new-task"
            data-pa="new-agent-task"
            aria-label="新建会话"
            title="新建会话"
            onClick={() =>
              guarded(() => {
                agent.reset();
                setActiveSession(undefined);
                setMessages([]);
                setPrompt("");
                setSessionId("");
                setIds([]);
                setWeb(false);
                input.current?.focus();
              })
            }
          >
            <RefIcon name="new-task" />
          </button>
          <PaButton
            action="close-agent"
            className="pa-agent-close"
            aria-label="收起 Ask Agent"
            onClick={() => guarded(onClose)}
          >
            <RefIcon name="x" />
          </PaButton>
        </div>
      </header>
      <div className="pa-agent-body" ref={body}>
        <span className="pa-agent-context">
          {activeSession
            ? "来源会话 · " + localDate(activeSession.created || "")
            : selected
              ? "已引用：" + selected.title
              : "仅引用当前工作区内本人的日程与待办"}
        </span>
        <div
          className="pa-agent-welcome"
          hidden={!!activeSession || !!messages.length}
        >
          <h3>让每个安排都有下一步</h3>
          <p>梳理日程、跟进待办，或准备新的安排。</p>
          <div className="pa-agent-prompts">
            <PaButton
              action="agent-summary"
              onClick={() => generate("哪些安排需要优先关注？")}
            >
              哪些安排需要优先关注？
              <RefIcon name="expand" />
            </PaButton>
            <PaButton
              action="agent-example"
              onClick={() => {
                setPrompt("明天 14:00–15:00，安排「产品方案讨论」");
                input.current?.focus();
              }}
            >
              安排明天的产品方案讨论
              <RefIcon name="expand" />
            </PaButton>
          </div>
        </div>
        <div id="pa-agent-result" role="log" aria-label="Agent 对话">
          {activeSession && (
            <>
              <div className="pa-message">{activeSession.prompt}</div>
              <div className="pa-agent-answer">
                <p>
                  {activeSession.recordId
                    ? "记录已创建，可继续查看和编辑。"
                    : "补充日期和时间后，可以继续创建安排。"}
                </p>
                {activeSession.recordId && (
                  <PaButton
                    action="open-created"
                    className="pa-linked"
                    id={activeSession.recordId}
                    onClick={() => open(activeSession.recordId!)}
                  >
                    {records.find((r) => r.id === activeSession.recordId)
                      ?.type === "todo"
                      ? "查看待办"
                      : "查看日程"}
                  </PaButton>
                )}
              </div>
            </>
          )}
          {messages.map((m, i) => (
            <Fragment key={i}>
              <div className="pa-message">{m.prompt}</div>
              <div className="pa-agent-answer">
                {m.body}
                {draft && i === messages.length - 1 && (
                  <>
                    <h3>确认{draft.type === "todo" ? "待办" : "日程"}</h3>
                    <p>
                      {draft.start
                        ? "请核对时间和内容，确认后加入日程与待办。"
                        : "还需要具体日期和时间，请在下方补充。"}
                    </p>
                    <form
                      id="pa-agent-form"
                      ref={form}
                      onSubmit={(e) => {
                        e.preventDefault();
                        confirm();
                      }}
                    >
                      <ActionFields record={draft} />
                      <p role="alert" data-pa-error hidden={!error}>
                        {error}
                      </p>
                      <button className="pa-btn primary" type="submit">
                        确认创建{draft.type === "todo" ? "待办" : "日程"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </Fragment>
          ))}
        </div>
        {!draft && error && (
          <p className="pa-hint" role="alert">
            {error}
          </p>
        )}
      </div>
      <form
        id="pa-agent-prompt"
        className="pa-composer"
        hidden={!!draft}
        onSubmit={(e) => {
          e.preventDefault();
          generate(prompt);
        }}
      >
        <label className="sr-only" htmlFor="pa-prompt">
          给 Agent 的要求
        </label>
        <textarea
          ref={input}
          id="pa-prompt"
          rows={3}
          maxLength={2000}
          aria-describedby="pa-agent-scope"
          placeholder="输入问题，按 Enter 发送…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              generate(prompt);
            }
          }}
        />
        <div className="pa-composer-tools">
          <PaButton
            action="agent-sources"
            className={`pa-tool${ids.length ? " selected" : ""}`}
            aria-label="引用日程与待办"
            title="引用日程与待办"
            onClick={() => setSources(true)}
          >
            <RefIcon name="book" />
          </PaButton>
          <PaButton
            action="agent-web"
            className={`pa-tool${web ? " selected" : ""}`}
            aria-label="联网搜索"
            aria-pressed={web}
            title="联网搜索（模拟）"
            onClick={() => {
              setWeb(!web);
              setToast(
                !web ? "已开启联网模拟，当前未连接外部搜索" : "已关闭联网模拟",
              );
            }}
          >
            <RefIcon name="globe" />
          </PaButton>
          <button
            className="pa-btn primary"
            type="submit"
            aria-label="发送问题"
            disabled={!prompt.trim()}
          >
            <RefIcon name="send" />
          </button>
        </div>
        <small id="pa-agent-scope">
          {ids.length
            ? `已引用 ${ids.length} 条日程与待办`
            : selected
              ? "已引用当前记录"
              : "基于当前日历视图"}
        </small>
        <div className="pa-composer-caption">
          <span>Enter 发送 / Shift+Enter 换行</span>
          <span>本地模拟</span>
        </div>
      </form>
      {sources && (
        <PaModal
          title="引用日程与待办"
          confirm="确认引用"
          onClose={() => setSources(false)}
          onSave={(f) => {
            setIds(new FormData(f).getAll("agentSources").map(String));
            setSources(false);
          }}
        >
          <p>选择当前个人空间中的记录。不选择时使用当前日历视图。</p>
          <div className="pa-agent-sources">
            {records.map((r) => (
              <label key={r.id}>
                <input
                  type="checkbox"
                  name="agentSources"
                  value={r.id}
                  defaultChecked={ids.includes(r.id)}
                />
                <span>
                  {r.title}
                  <small>
                    {r.type === "schedule" ? "日程" : "待办"} ·{" "}
                    {localDate(r.start)}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </PaModal>
      )}
      {guard && (
        <PaModal
          title="保留这次修改？"
          confirm="保存并继续"
          onClose={() => setGuard(false)}
          onSave={() => {
            if (confirm()) continueAfterGuard();
            else throw Error("请核对草稿内容并填写有效的时间");
          }}
        >
          <p>还有未保存的内容。你可以继续编辑、放弃修改，或保存后继续。</p>
          <PaButton action="discard" onClick={continueAfterGuard}>
            放弃修改
          </PaButton>
        </PaModal>
      )}
      <PersonalToast message={toast} onDone={() => setToast("")} />
    </aside>
  );
}
