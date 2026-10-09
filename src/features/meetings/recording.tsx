"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { RefIcon } from "@/features/reference/symbols";
import { M } from "@/features/spaces/model/store";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { createActions } from "@/features/personal/store";
import { useSceneAgent } from "@/features/agent/session";
import { agentRoute } from "@/features/agent/registry";
import { AgentHistoryButton } from "@/features/agent/history-button";
import { appUrl } from "@/lib/routes";
const transcript = [
  [
    "00:00:01　发言人 1",
    "我们先确认一下今天产品沟通的重点，主要是录音入口和后续内容沉淀。",
  ],
  [
    "00:00:08　发言人 2",
    "用户开始录音前，需要明确知道麦克风和电脑内部声音分别会采集什么。",
  ],
  [
    "00:00:16　发言人 1",
    "授权完成后直接进入录制页，同时可以展开小智，围绕正在发生的会议提问。",
  ],
];
const waves = [
  [7, -0.1],
  [13, -0.8],
  [9, -0.4],
  [18, -1],
  [11, -0.3],
  [15, -0.6],
  [8, -0.9],
  [20, -0.2],
  [12, -0.7],
  [16, -0.5],
  [6, -1.1],
  [14, -0.15],
  [19, -0.65],
  [10, -0.35],
  [17, -0.85],
  [8, -0.25],
  [13, -0.75],
  [21, -0.45],
  [11, -1.05],
  [16, -0.55],
  [7, -0.05],
  [18, -0.95],
  [10, -0.5],
  [14, -0.2],
  [20, -0.7],
  [9, -0.4],
  [16, -1],
  [12, -0.3],
  [7, -0.8],
  [15, -0.6],
];
const recordingTime = (s: number) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
export function RecordingPage({
  controller,
  space,
  actor,
  id,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  id: string;
}) {
  const [startedAt] = useState(() => new Date());
  const [recordingId] = useState(() => crypto.randomUUID());
  const agent = useSceneAgent("recording", recordingId);
  const lastThread = useRef<string | undefined>(undefined);
  const [title, setTitle] = useState(() =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("title")?.trim() ||
          "新录音 · 产品沟通"
        : "新录音 · 产品沟通",
    ),
    [paused, setPaused] = useState(false),
    [seconds, setSeconds] = useState(0),
    [marks, setMarks] = useState<number[]>([]),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(""),
    [open, setOpen] = useState(false),
    [renaming, setRenaming] = useState(false),
    [input, setInput] = useState(""),
    [messages, setMessages] = useState<{ role: string; text: string }[]>([]),
    [toast, setToast] = useState(""),
    [newTask, setNewTask] = useState(false);
  const saving = useRef(false),
    leaving = useRef(false),
    name = useRef<HTMLHeadingElement>(null),
    inputRef = useRef<HTMLTextAreaElement>(null),
    log = useRef<HTMLDivElement>(null);
  const w = M.get(controller.state!, space);
  useEffect(() => {
    if (paused || saved || (w.type === "team" && w.status !== "active")) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [paused, saved, w.status, w.type]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (!saved && !leaving.current && (w.type !== "team" || w.status === "active")) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [saved, w.status, w.type]);
  useEffect(() => {
    if (renaming) {
      name.current?.focus();
      if (name.current)
        document.getSelection()?.selectAllChildren(name.current);
    }
  }, [renaming]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);
  function send() {
    if (!input.trim()) return;
    const prompt = input.trim();
    const answer =
      "基于当前演示转写：讨论涉及录音授权说明、采集范围及录制中提问。请回到原文确认具体行动与责任人；本地模拟尚未调用真实 AI 服务。";
    try {
      if (w.type === "team") {
        const nextId = crypto.randomUUID();
        controller.change((s) => {
          const target = M.get(s, space);
          M.assertEntitlement(target, actor);
          M.settleCredits(target, nextId, prompt, M.simulatedTokenUsage(prompt, answer), actor);
          if (!M.member(target, actor)) throw Error("没有访问此工作空间的权限");
          target.threads.push({
            ...agentRoute("recording"),
            id: nextId,
            user: actor,
            title: prompt.slice(0, 60),
            prompt,
            answer,
            time: new Date().toISOString(),
            files: saved ? [saved] : [],
            recordingId,
            parentThreadId: lastThread.current,
          });
        });
        lastThread.current = nextId;
      } else agent.record(prompt, answer);
      setMessages((m) => [
        ...m,
        { role: "user", text: prompt },
        { role: "assistant", text: answer },
      ]);
      setInput("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save() {
    if (saving.current) return;
    saving.current = true;
    try {
      if (!title.trim()) throw Error("请输入会议名称");
      const text = transcript
        .map(([speaker, words]) => `${speaker}：${words}`)
        .join("\n");
      const summary =
        "本地演示录音，讨论录音入口、采集授权与后续内容沉淀；未连接真实转写服务。";
      const fid = recordingId;
      if (w.type === "team") {
        controller.change((s) => {
          const target = M.get(s, space);
          M.consumeMinutes(target, recordingId, Math.max(1, Math.ceil(seconds / 60)), actor);
          if (target.files.some(f => f.id === recordingId)) return;
          const f = M.addFile(
            target,
            {
              title,
              source: "网页录音",
              duration: Math.max(1, Math.ceil(seconds / 60)),
              transcript: text,
              summary,
            },
            actor,
          );
          f.id = recordingId;
          f.detail = { ...f.detail, marks: [...marks] };
          for (const thread of target.threads)
            if (thread.recordingId === recordingId && thread.user === actor)
              thread.files = [recordingId];
        });
      } else {
        M.assertEntitlement(M.get(controller.state!, space), actor);
        const repo = createActions(localStorage);
        repo.change((s) => {
          const linked = id ? s.records.find((r) => r.id === id) : undefined;
          if (id && !linked) throw Error("关联日程不存在");
          if (!s.meetings.some((m) => m.id === fid))
            s.meetings.push({
              id: fid,
              title,
              created: new Date().toISOString(),
              seconds,
              transcript: text,
              summary,
              marks: [...marks],
            });
          if (linked && !linked.links.includes(fid)) {
            linked.links.push(fid);
            linked.updated = new Date().toISOString();
          }
        });
      }
      setPaused(true);
      setSaved(fid);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
    }
  }
  if (w.type === "team" && w.status !== "active") return <main className="ws-content"><h1>团队工作区只读</h1><p>暂停手动创建录音、转录和 AI。设备仍可同步原始音频；如需转写，请在录音前切换到个人或其他有效工作区。</p><a href={appUrl("home", "", space, actor)}>返回现有内容</a></main>;
  return (
    <section
      className="recording-workbench"
      data-main-view="recording"
      aria-label="语音录制工作台"
    >
      <div
        className={`recording-layout${open ? " assistant-open" : ""}${paused && !saved ? " paused" : ""}${saved ? " ended" : ""}`}
        id="recording-layout"
      >
        <section className="recording-canvas">
          <header className="recording-header">
            <div className="recording-title-row">
              <span className="recording-title-icon">
                <RefIcon name="mic" />
              </span>
              <div>
                <div className="recording-name">
                  <h1
                    ref={name}
                    id="recording-name"
                    contentEditable={renaming}
                    suppressContentEditableWarning
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    onBlur={(e) => {
                      setTitle(
                        e.currentTarget.textContent?.trim() ||
                          "新录音 · 产品沟通",
                      );
                      setRenaming(false);
                    }}
                  >
                    {title}
                  </h1>
                  <button
                    id="recording-rename"
                    aria-label="重命名录音"
                    onClick={() => {
                      setRenaming(true);
                      setToast("编辑名称后按 Enter 保存");
                    }}
                  >
                    <RefIcon name="skill-notes" />
                  </button>
                </div>
                <div className="recording-meta">
                  <span id="recording-start-time">
                    {startedAt.toLocaleString("zh-CN", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>·</span>
                  <span className="live" id="recording-live-state">
                    <i />
                    {saved ? "已结束" : paused ? "已暂停" : "录音中"}
                  </span>
                  <span>·</span>
                  <span>麦克风 + 系统音频</span>
                  <span>·</span>
                  <span>内容仅用于本次转写与智能处理</span>
                </div>
              </div>
            </div>
            <div className="recording-header-actions">
              <button
                id="recording-add-image"
                onClick={() => setToast("演示：已打开图片添加入口")}
              >
                <RefIcon name="attachment" />
                添加图片
              </button>
              <button
                className="recording-assistant-launch"
                id="recording-assistant-toggle"
                aria-controls="recording-assistant-panel"
                aria-expanded={open}
                aria-label={open ? "收起 Ask Agent" : "Ask Agent"}
                onClick={() => setOpen(!open)}
              >
                <span className="xiaozhi-mark">
                  <RefIcon name="spark" />
                </span>
                <span id="recording-assistant-toggle-label">
                  {open ? "收起 Ask Agent" : "Ask Agent"}
                </span>
                <RefIcon name={open ? "collapse" : "expand"} />
              </button>
              <button
                id="recording-back-home"
                onClick={() => {
                  if (!saved) {
                    setToast("请先结束录音或选择放弃录音");
                    return;
                  }
                  location.assign(appUrl("home", "", space, actor));
                }}
              >
                <RefIcon name="home" />
                返回首页
              </button>
            </div>
          </header>
          <div className="recording-tools">
            <select
              id="recording-source-language"
              aria-label="转写语言"
              onChange={() => setToast("已更新演示转写语言")}
            >
              <option>普通话</option>
              <option>粤语</option>
              <option>英语</option>
            </select>
            <span className="language-arrow">→</span>
            <select
              id="recording-target-language"
              aria-label="翻译语言"
              onChange={() => setToast("已更新演示翻译语言")}
            >
              <option>英语</option>
              <option>中文</option>
              <option>日语</option>
            </select>
            <label className="recording-translation">
              <input id="recording-translation" type="checkbox" />
              显示译文
            </label>
          </div>
          <div className="transcript-stream" id="transcript-stream">
            <div className="transcript-intro">
              <span>
                <i />
                演示转写内容 · 录音过程中持续追加
              </span>
              <span>自动识别发言段落</span>
            </div>
            {transcript.map(([t, text]) => (
              <article className="transcript-item" key={t}>
                <time>{t}</time>
                <p>{text}</p>
              </article>
            ))}
            {marks.map((t, i) => (
              <article
                className="transcript-item recording-session-generated"
                key={i}
              >
                <time>{recordingTime(t)}　重点标记</time>
                <p>已在此处添加重点标记，后续生成纪要时会优先关注。</p>
              </article>
            ))}
            {saved ? (
              <article className="transcript-item recording-session-generated">
                <time>{recordingTime(seconds)}　系统</time>
                <p>
                  录音已结束，演示转写与重点标记已保存。
                  <button
                    type="button"
                    className="pa-btn"
                    onClick={() =>
                      location.assign(appUrl("meeting", saved, space, actor))
                    }
                  >
                    查看会议
                  </button>
                </p>
              </article>
            ) : (
              <article
                className="transcript-item pending"
                id="transcript-live-line"
              >
                <time>实时转写</time>
                <p>
                  正在识别新的语音内容
                  <span className="transcript-cursor" />
                </p>
              </article>
            )}
            {error ? <p role="alert">{error}</p> : null}
          </div>
          <div className="recording-dock">
            <div className="waveform" aria-hidden="true">
              {waves.map(([wave, delay], i) => (
                <span
                  key={i}
                  style={
                    {
                      "--wave": `${wave}px`,
                      "--delay": `${delay}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <div className="recording-controls">
              <div className="recording-control-left">
                <button
                  className="ghost"
                  id="recording-abandon"
                  onClick={() => {
                    leaving.current = true;
                    location.assign(appUrl("home", "", space, actor));
                  }}
                >
                  <RefIcon name="x" />
                  放弃录音
                </button>
              </div>
              <div className="recording-control-main">
                <span className="recording-elapsed" id="recording-elapsed">
                  {recordingTime(seconds)}
                </span>
                <button
                  className="pause"
                  id="recording-pause"
                  aria-label={paused ? "继续录音" : "暂停录音"}
                  onClick={() => {
                    if (!saved) setPaused(!paused);
                  }}
                >
                  {paused ? "▶" : "Ⅱ"}
                </button>
                <button
                  id="recording-finish"
                  disabled={w.type === "team" && w.status !== "active"}
                  onClick={() => {
                    if (!saved) void save();
                  }}
                >
                  结束录音
                </button>
                <span className="recording-ended-note">
                  录音已结束，转写内容已保存
                </span>
              </div>
              <div className="recording-control-right">
                <button
                  id="recording-mark"
                  onClick={() => {
                    if (saved) setToast("录音已结束");
                    else {
                      setMarks([...marks, seconds]);
                      setToast(`已标记 ${recordingTime(seconds)}`);
                    }
                  }}
                >
                  <RefIcon name="spark" />
                  标记重点
                </button>
              </div>
            </div>
          </div>
        </section>
        <aside className="recording-assistant" aria-label="录制中小智对话">
          <div
            className="recording-assistant-panel"
            id="recording-assistant-panel"
            aria-hidden={!open}
          >
            <header className="recording-assistant-head">
              <div className="recording-assistant-id">
                <span className="xiaozhi-mark">
                  <RefIcon name="spark" />
                </span>
                <div>
                  <strong>Ask Agent</strong>
                  <small>结合当前转写进行对话</small>
                </div>
              </div>
              <div className="agent-head-actions">
                <AgentHistoryButton />
                <button
                  type="button"
                  className="agent-new-task"
                  id="recording-assistant-new-task"
                  aria-label="新建会话"
                  title="新建会话"
                  onClick={() => {
                    agent.reset();
                    lastThread.current = undefined;
                    setNewTask(true);
                    setMessages([]);
                    setInput("");
                  }}
                >
                  <RefIcon name="new-task" />
                </button>
                <button
                  id="recording-assistant-close"
                  aria-label="收起小智"
                  onClick={() => setOpen(false)}
                >
                  <RefIcon name="x" />
                </button>
              </div>
            </header>
            <div
              ref={log}
              className="recording-assistant-messages"
              id="recording-assistant-messages"
            >
              {messages.length ? (
                messages.map((m, i) => (
                  <div className={`recording-chat-row ${m.role}`} key={i}>
                    <span>{m.text}</span>
                  </div>
                ))
              ) : newTask ? (
                <div className="recording-assistant-empty">
                  <h3>开始新的会话</h3>
                  <p>继续围绕当前转写提问。</p>
                </div>
              ) : (
                <div className="recording-assistant-empty">
                  <span className="xiaozhi-mark">
                    <RefIcon name="spark" />
                  </span>
                  <h3>边录边问小智</h3>
                  <p>
                    可以根据当前转写提炼重点、记录问题，也可以结合个人资料补充背景。
                  </p>
                  <div className="recording-assistant-suggestions">
                    {[
                      ["提炼当前讨论的三个重点", "提炼重点"],
                      ["记录刚才提到的待办事项", "记录待办"],
                      ["结合知识库解释当前讨论背景", "补充背景"],
                    ].map(([prompt, label]) => (
                      <button
                        key={prompt}
                        data-recording-assistant-prompt={prompt}
                        onClick={() => {
                          setInput(prompt);
                          inputRef.current?.focus();
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="recording-assistant-composer">
              <textarea
                ref={inputRef}
                id="recording-assistant-input"
                placeholder="输入问题，按 Enter 发送…"
                aria-label="向录制中的小智提问"
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
              <div className="recording-assistant-foot">
                <div className="recording-assistant-tools">
                  <button
                    id="recording-assistant-transcript"
                    onClick={() => setToast("小智已引用当前实时转写")}
                  >
                    <RefIcon name="mic" />
                    当前转写
                  </button>
                  <button
                    id="recording-assistant-knowledge"
                    onClick={() => setToast("小智已打开知识库选择")}
                  >
                    <RefIcon name="book" />
                    知识库
                  </button>
                </div>
                <button
                  className="recording-assistant-send"
                  id="recording-assistant-send"
                  disabled={!input.trim()}
                  aria-label="发送给小智"
                  onClick={send}
                >
                  <RefIcon name="send" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
      {toast ? (
        <div className="toast show" role="status">
          {toast}
        </div>
      ) : null}
    </section>
  );
}
