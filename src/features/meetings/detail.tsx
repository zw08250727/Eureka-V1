/* eslint-disable @next/next/no-img-element -- Preserve the original image element sizing and local upload preview behavior. */
"use client";
import { useEffect, useRef, useState } from "react";
import { useWorkbench } from "@/features/workbench/hooks/use-workbench";
import { createLocalRepository } from "@/features/workbench/model/local-repository";
import { MeetingAgent } from "./agent";
import { RefIcon } from "@/features/reference/symbols";
import { M } from "@/features/spaces/model/store";
import { TeamMeetingAgent } from "./team-agent";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { appUrl, assetUrl } from "@/lib/routes";
import { createMeetingDetails } from "./store";
import type { MeetingDetail } from "./types";
import {
  MdButton as B,
  MdIcon as I,
  MdIconButton as IB,
  clockTime,
  download,
} from "./reference-ui";
import {
  MeetingContent,
  InlineEditor,
  meetingTabs,
  currentText,
  type MeetingTab,
} from "./content";
import { RecipientDialog } from "@/features/spaces/sharing-settings";
import { MeetingDialogs } from "./dialogs";
export function MeetingPage({
  id,
  spaces,
  space,
  actor,
}: {
  id: string;
  spaces: SpacesController;
  space: string;
  actor: string;
}) {
  const personal = useWorkbench(),
    repo = useRef<ReturnType<typeof createMeetingDetails> | null>(null),
    audio = useRef<HTMLAudioElement>(null),
    root = useRef<HTMLElement>(null),
    host = useRef<HTMLDivElement>(null),
    imageInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(id),
    [record, setRecord] = useState<MeetingDetail | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState<MeetingTab>("summary"),
    [expanded, setExpanded] = useState(false),
    [score, setScore] = useState(0),
    [modal, setModal] = useState(() =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("dialog") === "info"
        ? "info"
        : "",
    ),
    [zoom, setZoom] = useState(1),
    [libraryClosed, setLibraryClosed] = useState(false),
    [libraryMobile, setLibraryMobile] = useState(false),
    [agentOpen, setAgentOpen] = useState(false),
    [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0),
    [duration, setDuration] = useState(0),
    [speed, setSpeed] = useState(1),
    [images, setImages] = useState<
      Record<string, { name: string; url: string }[]>
    >({}),
    [preview, setPreview] = useState(0),
    [drafts, setDrafts] = useState<Record<string, string>>({}),
    [toast, setToast] = useState("");
  const w = spaces.state?.spaces.find((w) => w.id === space),
    team = w?.type === "team",
    file =
      team && w
        ? M.visible(w, actor).find((f) => f.id === selected)
        : undefined,
    readonly = !!team && (!w || !M.canEdit(w, file, actor));
  const [previousId, setPreviousId] = useState(id);
  if (previousId !== id) {
    setPreviousId(id);
    setSelected(id);
  }
  const loaded = !!record;
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      try {
        let next: MeetingDetail;
        if (team && w) {
          if (!file) throw Error("会议不存在或没有访问权限");
          next = {
            id: file.id,
            title: file.title,
            summary: file.summary,
            transcript: file.transcript,
            verbatim: "",
            source: file.source,
            created: file.created,
            duration: file.duration,
            template: "通用",
            language: "中文（中国）",
            detail: "标准",
            speakers: w.members
              .filter((m) => m.status === "active")
              .map((m) => m.name),
            tags: file.tags,
            customer: "",
            project: "",
            location: "",
            updated: file.updated,
            generated: {},
            feedback: 0,
            ...file.detail,
          };
        } else {
          repo.current ??= createMeetingDetails(localStorage);
          next = repo.current.read(selected);
        }
        if (active) {
          setRecord(next);
          setScore(next.feedback);
          setError("");
        }
      } catch (e) {
        if (active) {
          setRecord(null);
          setError((e as Error).message);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [selected, team, w, file]);
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let url = "",
      cancelled = false;
    fetch(assetUrl("meeting-demo.wav"))
      .then((r) => {
        if (!r.ok) throw Error("audio");
        return r.blob();
      })
      .then((blob) => {
        if (!cancelled) {
          url = URL.createObjectURL(blob);
          element.src = url;
        }
      })
      .catch(() => {
        if (!cancelled) element.src = assetUrl("meeting-demo.wav");
      });
    return () => {
      cancelled = true;
      element.pause();
      if (url) URL.revokeObjectURL(url);
    };
  }, []);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const fit = () => {
      const frame = el.querySelector(".md-frame");
      if (frame) {
        const top =
          frame.getBoundingClientRect().top +
          (el.closest(".main")?.scrollTop || 0);
        el.style.setProperty("--md-frame-top", `${top}px`);
      }
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    window.addEventListener("resize", fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [loaded]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (Object.keys(drafts).length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [drafts]);
  const imageUrls = useRef<string[]>([]);
  useEffect(
    () => () => imageUrls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
  function save(patch: Partial<MeetingDetail>) {
    if (!record) throw Error("会议尚未加载");
    if (readonly) throw Error("此录音为只读，请向所有者申请编辑权限，并确认工作区订阅有效");
    const next = {
      ...record,
      ...patch,
      updated: new Date().toLocaleString("zh-CN", { hour12: false }),
    };
    if (team) {
      spaces.change((s) =>
        M.saveDetail(
          M.get(s, space),
          selected,
          {
            ...patch,
            ...("verbatim" in patch ? { transcript: patch.verbatim } : {}),
          },
          actor,
        ),
      );
    } else {
      repo.current!.save(next);
      void personal.reload();
    }
    setRecord(next);
    setError("");
  }
  const draftKey = `${selected}/${tab}`,
    draft = drafts[draftKey];
  function chooseMeeting(next: string) {
    audio.current?.pause();
    if (audio.current) audio.current.currentTime = 0;
    setSelected(next);
    setTab("summary");
    setExpanded(false);
    setZoom(1);
    setLibraryMobile(false);
    setModal("");
  }
  function play() {
    void audio.current
      ?.play()
      .catch(() => setToast("音频暂时无法播放，请刷新后重试。"));
  }
  function seek(n: number, autoplay = true) {
    if (!audio.current) return;
    audio.current.currentTime = Math.max(0, Math.min(n, duration || 0));
    setTime(audio.current.currentTime);
    if (autoplay) play();
  }
  function dropDraft() {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  }
  function action(name: string) {
    if (!record) return;
    try {
      if (name === "edit") {
        const field = tab === "verbatim" ? "verbatim" : "summary";
        const html =
          record[`${field}Html`] ||
          currentText(record, tab)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        setDrafts((prev) => ({ ...prev, [draftKey]: html }));
      } else if (name === "feedback") {
        save({ feedback: score });
        setToast("评价已保存在本地演示中");
      } else if (name === "generate") {
        save({ generated: { ...record.generated, [tab]: true } });
      } else if (name === "copy") {
        navigator.clipboard
          .writeText(currentText(record, tab))
          .then(() => setToast("已复制到剪贴板"))
          .catch(() => setModal("copy"));
      } else if (name === "zoom-in" || name === "zoom-out") {
        setZoom((z) =>
          Math.min(2, Math.max(0.5, z + (name === "zoom-in" ? 0.1 : -0.1))),
        );
      } else if (name === "fullscreen") {
        const viewport = root.current?.querySelector(".md-map-viewport");
        void (
          document.fullscreenElement
            ? document.exitFullscreen()
            : viewport?.requestFullscreen()
        )?.catch(() => setToast("此浏览器暂不支持全屏"));
      } else if (name === "export-current") {
        if (tab === "mindmap") {
          const svg = root.current?.querySelector(".md-map");
          if (svg)
            download(
              new XMLSerializer().serializeToString(svg),
              "svg",
              record.title,
              "image/svg+xml",
            );
        } else download(currentText(record, tab), "txt", record.title);
      } else setModal(name);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  const list = team && w ? M.visible(w, actor) : personal.data?.meetings || [];
  const visible = list.filter((m) =>
    m.title.toLowerCase().includes(query.toLowerCase()),
  );
  const meta = (m: {
    created: string;
    duration: string | number;
    source: string;
    visibility?: string;
  }) =>
    `${m.created.replace("T", " ").slice(0, 16)} · ${typeof m.duration === "number" ? `${m.duration} 分钟` : m.duration} · ${m.source}${m.visibility === "invited" ? " · 已邀请成员查看" : team ? " · 仅自己可见" : ""}`;
  const r = record;
  return (
    <section
      ref={root}
      id="meeting-detail-root"
      className={`md-workspace${agentOpen ? " md-agent-open" : ""}`}
      data-main-view="note-detail"
      aria-label="语音笔记详情"
    >
      <audio
        ref={audio}
        preload="auto"
        hidden
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {!r ? (
        <p role={error ? "alert" : "status"}>{error || "正在读取会议…"}</p>
      ) : (
        <>
          {team && w?.status !== "active" && <p className="ws-readonly">团队工作区只读，可检索现有录音、转录和笔记；编辑与 AI 功能暂停。设备绑定和同步不受影响。</p>}
          {file?.rawAudio && <p className="ws-info">{file.processingPaused ? "原始音频已同步保存。工作区订阅暂停，尚未转录或生成摘要，恢复后进入处理队列。" : "原始音频已保留，工作区已恢复，等待转录处理。"}</p>}
          <div className="md-page-head">
            <div>
              <h1>语音笔记</h1>
              <p>
                统一管理语音转写内容，沉淀会议、闪念与结构化数据，持续积累可复用的知识资产。
              </p>
            </div>
            <div className="md-page-tools">
              <input
                className="md-search"
                id="md-search"
                type="search"
                placeholder="搜索语音笔记"
                aria-label="搜索语音笔记"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <B
                action="ask"
                className="md-ask-agent"
                aria-label={agentOpen ? "收起 Agent" : "Ask Agent"}
                aria-controls="md-agent-host"
                aria-expanded={agentOpen}
                onClick={() => setAgentOpen(!agentOpen)}
              >
                <span className="md-agent-mark">
                  <RefIcon name="spark" />
                </span>
                <strong>Ask Agent</strong>
                <RefIcon name="expand" className="icon md-agent-expand" />
              </B>
            </div>
          </div>
          <div ref={host} className="md-detail-layout">
            <div
              className={`md-frame${libraryClosed ? " library-closed" : ""}${libraryMobile ? " library-mobile" : ""}`}
            >
              <aside className="md-library">
                <div className="md-library-head">
                  <span>
                    录音文件{" "}
                    <small id="md-library-count">（共{list.length}个）</small>
                  </span>
                  <IB
                    action="library"
                    name="library"
                    label="收起录音列表"
                    onClick={() => {
                      setLibraryClosed(true);
                      setLibraryMobile(false);
                    }}
                  />
                </div>
                <div className="md-library-list" id="md-library-list">
                  {visible.length ? (
                    visible.map((m) => (
                      <button
                        type="button"
                        className="md-library-item"
                        key={m.id}
                        data-md-meeting={m.id}
                        aria-current={m.id === selected}
                        onClick={() => chooseMeeting(m.id)}
                      >
                        <span className="md-file-icon">
                          <I name="file" />
                        </span>
                        <span className="md-library-copy">
                          <strong>
                            {m.id === selected ? r.title : m.title}
                          </strong>
                          <small>{meta(m)}</small>
                          <em>{m.status}</em>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="md-notice">没有找到相关录音</p>
                  )}
                </div>
              </aside>
              <section className="md-main">
                <header className="md-top">
                  <IB
                    action="library"
                    name="library"
                    label="切换录音列表"
                    onClick={() => {
                      if (
                        matchMedia("(max-width:800px)").matches ||
                        (agentOpen && matchMedia("(max-width:1799px)").matches)
                      )
                        setLibraryMobile(!libraryMobile);
                      else setLibraryClosed(!libraryClosed);
                    }}
                  />
                  <div className="md-top-copy">
                    <button
                      className="md-title-button"
                      type="button"
                      data-md-action="rename"
                      aria-label="编辑录音标题"
                      disabled={readonly}
                      onClick={() => action("rename")}
                    >
                      <h1 id="note-detail-title">{r.title}</h1>
                      <I name="edit" />
                    </button>
                    <div className="md-top-meta">
                      <p id="note-detail-meta">
                        {meta(
                          file ||
                            personal.data?.meetings.find(
                              (m) => m.id === selected,
                            ) ||
                            r,
                        )}{" "}
                        ·{" "}
                        <span style={{ color: "#25b47b" }}>
                          {file?.status ||
                            personal.data?.meetings.find(
                              (m) => m.id === selected,
                            )?.status ||
                            "已总结"}
                        </span>
                      </p>
                      <button
                        type="button"
                        data-md-action="info"
                        disabled={readonly}
                        onClick={() => action("info")}
                      >
                        <I name="location" /> {r.location || "添加位置"}
                      </button>
                    </div>
                  </div>
                  <div
                    className="md-top-actions"
                    role="group"
                    aria-label="会议操作"
                  >
                    <B action="export" onClick={() => action("export")}>
                      <I name="download" /> 导出
                    </B>
                    {(
                      <B
                        action="share"
                        disabled={readonly || (!!team && file?.owner !== actor)}
                        onClick={() => action("share")}
                      >
                        <I name="share" /> 分享
                      </B>
                    )}
                    {team && w && file && file.owner === actor && (
                      <B action="team-share" disabled={readonly} onClick={() => action("team-share")}>
                        <RefIcon name="users" className="md-icon" /> 团队共享
                      </B>
                    )}
                    <B
                      action="delete"
                      className="md-btn md-delete-btn"
                      disabled={readonly || (!!team && file?.owner !== actor && !M.admin(w!, actor))}
                      onClick={() => action("delete")}
                    >
                      <I name="trash" /> 删除
                    </B>
                    <IB
                      action="close"
                      name="close"
                      label="关闭会议详情"
                      onClick={() =>
                        location.assign(appUrl("home", "", space, actor))
                      }
                    />
                  </div>
                </header>
                <div className="md-scroll">
                  <section className="md-info">
                    <div className="md-info-line">
                      <button
                        type="button"
                        data-md-action="participants"
                        disabled={readonly}
                        onClick={() => action("participants")}
                      >
                        参会人 <span>{r.speakers.join("、")}</span>
                      </button>
                      <button
                        type="button"
                        data-md-action="info"
                        disabled={readonly}
                        onClick={() => action("info")}
                      >
                        客户名称 <span>{r.customer || "添加客户"}</span>
                      </button>
                      <button
                        type="button"
                        data-md-action="info"
                        disabled={readonly}
                        onClick={() => action("info")}
                      >
                        商机项目 <span>{r.project || "添加项目"}</span>
                      </button>
                      <B
                        action="info-toggle"
                        className="md-info-toggle"
                        aria-expanded={expanded}
                        onClick={() => setExpanded(!expanded)}
                      >
                        {expanded ? "收起 ⌃" : "展开 ⌄"}
                      </B>
                    </div>
                    <div className="md-info-extra" hidden={!expanded}>
                      <div>
                        标签{" "}
                        {r.tags.map((t) => (
                          <span className="md-tag" key={t}>
                            {t}
                          </span>
                        ))}
                        <B
                          action="info"
                          className="md-link"
                          disabled={readonly}
                          onClick={() => action("info")}
                        >
                          ＋ 添加标签
                        </B>
                      </div>
                      <div>
                        图片（{(images[selected] || []).length}/50）
                        <div className="md-images">
                          {(images[selected] || []).map((im, i) => (
                            <div className="md-image" key={im.url}>
                              <img
                                src={im.url}
                                alt={im.name}
                                data-md-preview={i}
                                onClick={() => {
                                  setPreview(i);
                                  setModal("image-preview");
                                }}
                              />
                              <button
                                aria-label={`移除图片 ${im.name}`}
                                data-md-remove-image={i}
                                disabled={readonly}
                                onClick={() => {
                                  URL.revokeObjectURL(im.url);
                                  setImages({
                                    ...images,
                                    [selected]: images[selected].filter(
                                      (_, j) => i !== j,
                                    ),
                                  });
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <B
                          action="image"
                          className="md-image-add"
                          aria-label="添加图片"
                          disabled={readonly}
                          onClick={() => imageInput.current?.click()}
                        >
                          <I name="plus" />
                        </B>
                      </div>
                    </div>
                  </section>
                  <div className="md-player">
                    <B
                      action="play"
                      className="md-play"
                      aria-label={`${playing ? "暂停" : "播放"}录音`}
                      onClick={() =>
                        playing ? audio.current?.pause() : play()
                      }
                    >
                      <I name={playing ? "pause" : "play"} />
                    </B>
                    <B
                      action="rewind"
                      className="md-icon-btn"
                      aria-label="后退15秒"
                      onClick={() => seek(time - 15, false)}
                    >
                      ↶15
                    </B>
                    <time id="md-elapsed">{clockTime(time)}</time>
                    <input
                      id="md-seek"
                      type="range"
                      min="0"
                      max={duration || 1}
                      value={time}
                      step="0.1"
                      aria-label="录音播放进度"
                      onChange={(e) => seek(Number(e.target.value), false)}
                    />
                    <time id="md-duration">{clockTime(duration)}</time>
                    <B
                      action="forward"
                      className="md-icon-btn"
                      aria-label="前进15秒"
                      onClick={() => seek(time + 15, false)}
                    >
                      15↷
                    </B>
                    <select
                      id="md-speed"
                      aria-label="播放倍速"
                      value={speed}
                      onChange={(e) => {
                        setSpeed(Number(e.target.value));
                        if (audio.current)
                          audio.current.playbackRate = Number(e.target.value);
                      }}
                    >
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((x) => (
                        <option value={x} key={x}>
                          {x}x
                        </option>
                      ))}
                    </select>
                    <span className="md-demo">演示音频</span>
                  </div>
                  <nav
                    className="md-tabs"
                    role="tablist"
                    aria-label="录音详情内容"
                    onKeyDown={(e) => {
                      if (
                        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                          e.key,
                        )
                      )
                        return;
                      e.preventDefault();
                      const index = meetingTabs.findIndex((t) => t[0] === tab);
                      const next =
                        meetingTabs[
                          e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? 5
                              : (index +
                                  (e.key === "ArrowRight" ? 1 : -1) +
                                  6) %
                                6
                        ][0];
                      setTab(next);
                      root.current
                        ?.querySelector<HTMLButtonElement>(`#md-tab-${next}`)
                        ?.focus();
                    }}
                  >
                    {meetingTabs.map(([key, label]) => (
                      <button
                        key={key}
                        id={`md-tab-${key}`}
                        role="tab"
                        type="button"
                        data-md-tab={key}
                        aria-controls="md-content"
                        aria-selected={tab === key}
                        tabIndex={tab === key ? 0 : -1}
                        onClick={() => setTab(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </nav>
                  <section
                    id="md-content"
                    className="md-panel"
                    role="tabpanel"
                    aria-labelledby={`md-tab-${tab}`}
                  >
                    {draft !== undefined ? (
                      <InlineEditor
                        key={draftKey}
                        html={draft}
                        onDraft={(html) =>
                          setDrafts((prev) => ({ ...prev, [draftKey]: html }))
                        }
                        onExit={dropDraft}
                        onSave={(text, html) => {
                          const field =
                            tab === "verbatim" ? "verbatim" : "summary";
                          save({ [field]: text, [`${field}Html`]: html });
                          dropDraft();
                        }}
                      />
                    ) : (
                      <>
                        {!!r.marks?.length && (
                          <section className="md-card" aria-label="重点标记">
                            <h3>重点标记</h3>
                            {r.marks.map((second, index) => (
                              <button
                                type="button"
                                key={index}
                                className="pa-btn"
                                onClick={() => {
                                  if (audio.current)
                                    audio.current.currentTime = second;
                                  setTime(second);
                                }}
                              >
                                {clockTime(second)}
                              </button>
                            ))}
                          </section>
                        )}
                        <MeetingContent
                          r={r}
                          tab={tab}
                          readonly={readonly}
                          score={score}
                          setScore={setScore}
                          action={action}
                          seek={seek}
                          zoom={zoom}
                        />
                      </>
                    )}
                  </section>
                </div>
              </section>
            </div>
            <aside
              id="md-agent-host"
              aria-label="会议 Agent 对话"
              hidden={!agentOpen}
            >
              {team ? (
                agentOpen ? (
                  <TeamMeetingAgent
                    key={selected}
                    controller={spaces}
                    space={space}
                    actor={actor}
                    selectedId={selected}
                    onClose={() => setAgentOpen(false)}
                  />
                ) : null
              ) : (
                <MeetingAgent
                  r={r}
                  open={agentOpen}
                  onClose={() => {
                    setAgentOpen(false);
                    root.current
                      ?.querySelector<HTMLButtonElement>(".md-ask-agent")
                      ?.focus();
                  }}
                  host={host}
                />
              )}
            </aside>
          </div>
          <input
            ref={imageInput}
            type="file"
            id="md-images-input"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            hidden
            onChange={(e) => {
              const files = [...(e.target.files || [])];
              if (readonly) return;
              if ((images[selected] || []).length + files.length > 50) {
                setToast("最多添加50张图片");
                return;
              }
              if (
                files.some(
                  (f) =>
                    ![
                      "image/png",
                      "image/jpeg",
                      "image/webp",
                      "image/gif",
                    ].includes(f.type) || f.size > 5 * 1024 * 1024,
                )
              ) {
                setToast("请选择5MB以内的 PNG、JPG、WebP 或 GIF 图片");
                return;
              }
              const additions = files.map((f) => ({
                name: f.name,
                url: URL.createObjectURL(f),
              }));
              imageUrls.current.push(...additions.map((a) => a.url));
              setImages({
                ...images,
                [selected]: [...(images[selected] || []), ...additions],
              });
              setExpanded(true);
              e.target.value = "";
              setToast("图片已添加，仅在本次会话保留");
            }}
          />
          {modal === "team-share" && team && w && file ? (
            <RecipientDialog key={`${space}:${selected}`} w={w} actor={actor} owner={file.owner} initial={file.shared}
              title={`团队共享 · ${file.title}`} onClose={() => setModal("")} onSave={users => {
                spaces.change(s => M.share(M.get(s, space), selected, users, actor, []));
                setModal("");
              }} />
          ) : modal ? (
            <MeetingDialogs
              key={`${selected}/${modal}`}
              kind={modal}
              r={r}
              onClose={() => setModal("")}
              onSave={(patch) => {
                save(patch);
                if (modal === "info") setExpanded(true);
              }}
              onRemove={async () => {
                if (team)
                  spaces.change((s) =>
                    M.trash(M.get(s, space), selected, false, actor),
                  );
                else {
                  const repository = createLocalRepository(localStorage);
                  await repository.load();
                  await repository.setUploadDeleted(selected, true);
                }
                setDrafts({});
                location.assign(appUrl("home", "", space, actor));
              }}
              seek={seek}
              workspace={team ? w : undefined}
              copyText={currentText(r, tab)}
              previewImage={images[selected]?.[preview]}
            />
          ) : null}
        </>
      )}
      {toast ? (
        <div className="toast show" role="status">
          {toast}
        </div>
      ) : null}
    </section>
  );
}
export { MeetingInfoDialog } from "./info-dialog";
export type { MeetingInfoDialogProps } from "./info-dialog";
