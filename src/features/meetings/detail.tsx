"use client";
/* eslint-disable @next/next/no-img-element -- Preserve the original image element sizing and local upload preview behavior. */

import { countMonthlyFeedbackRewards } from "@/features/account/rewards";
import { meetingAudioSource } from "./audio-source";
import { RecordingModeIcon } from "./recording-mode-icon";
import { MeetingDocumentEditor } from "./document-editor";
import { meetingBodyHtml } from "./content";
import { DomesticAudioPlayer, type DomesticAudioStatus } from "./domestic-audio-player";
import { DomesticTranscript } from "./domestic-transcript";
import { DomesticContentState, meetingStatusBadge } from "./domestic-content-state";
import { DomesticImageManager } from "./domestic-image-manager";
import { marketConfig, routeMarket } from "@/features/markets/config";
import { meetingSummaries, summaryView, updateSummary } from "./summaries";
import { submitMeetingFeedback } from "./feedback-model";
import "./domestic-detail.css";
import "./meeting-detail-ui.css";
import { marketStorage } from "@/features/markets/storage";

import { Select } from "@/components/ui/select";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkbench } from "@/features/workbench/hooks/use-workbench";
import { createLocalRepository } from "@/features/workbench/model/local-repository";
import { MeetingAgent } from "./agent";
import { RefIcon } from "@/features/reference/symbols";
import { M } from "@/features/spaces/model/store";
import { TeamMeetingAgent } from "./team-agent";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { appUrl, assetUrl, basePath } from "@/lib/routes";
import { createMeetingDetails } from "./store";
import type { MeetingDetail } from "./types";
import {
  MdDialog,
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
  linesFor,
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
  const cn = routeMarket() === "cn", enhanced = routeMarket() !== null;
  const personal = useWorkbench(),
    repo = useRef<ReturnType<typeof createMeetingDetails> | null>(null),
    audio = useRef<HTMLAudioElement>(null),
    root = useRef<HTMLElement>(null),
    host = useRef<HTMLDivElement>(null),
    imageInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(id),
    [summaryId,setSummaryId] = useState(""),
    [assetSummaryId,setAssetSummaryId] = useState(""),
    [record, setRecord] = useState<MeetingDetail | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState<MeetingTab>("summary"),
    [expanded, setExpanded] = useState(routeMarket() !== null),
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
    [audioStatus,setAudioStatus] = useState<DomesticAudioStatus>("loading"),
    [buffered,setBuffered] = useState(0),
    [uploading, setUploading] = useState(false),
    [preview, setPreview] = useState(0),
    [participantKey,setParticipantKey] = useState("") ,
    [imageSelection, setImageSelection] = useState<number[]>([]),
    [drafts, setDrafts] = useState<Record<string, string>>({}),
    [toast, setToast] = useState("");
  const w = spaces.state?.spaces.find((w) => w.id === space),
    team = w?.type === "team",
    file =
      team && w
        ? M.visible(w, actor).find((f) => f.id === selected)
        : undefined,
    readonly = !!team && (!w || !M.canEdit(w, file, actor));
  const participantClip=useRef<{key:string;end:number;speed:number}|null>(null);
  const stopParticipant=useCallback(()=>{const clip=participantClip.current;if(!clip)return;audio.current?.pause();if(audio.current)audio.current.playbackRate=clip.speed;setSpeed(clip.speed);participantClip.current=null;setParticipantKey("");},[]);
  const [previousId, setPreviousId] = useState(id);
  if (previousId !== id) {
    setPreviousId(id);
    setSelected(id);
  }
  const loaded = !!record;
  const selectedSummary = record ? meetingSummaries(record).find(s=>s.id===summaryId) || meetingSummaries(record).at(-1)! : null;
  const r = record && enhanced ? summaryView(record,selectedSummary!.id) : record;
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
            recordingMode: file.recordingMode,
            created: file.created,
            duration: file.duration,
            template: "通用",
            language: "中文（中国）",
            detail: "标准",
            speakers: w.members
              .filter((m) => m.status === "active")
              .map((m) => m.name),
            tags: file.tags || [],
            customer: "",
            project: "",
            location: "",
            updated: file.updated,
            generated: {},
            feedback: 0,
            ...file.detail,
          };
        } else {
          repo.current ??= createMeetingDetails(marketStorage);
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
  const audioSource=record ? (enhanced ? meetingAudioSource(record) : assetUrl("meeting-demo.wav")) : "";
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let url = "",
      cancelled = false;
    element.pause();
    element.removeAttribute("src");
    element.load();
    if(!audioSource) {queueMicrotask(()=>{setAudioStatus("error");setDuration(0);setTime(0);});return;}
    queueMicrotask(()=>{setAudioStatus("loading");setDuration(0);setTime(0);});
    fetch(audioSource)
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
        if (!cancelled) element.src = audioSource;
      });
    return () => {
      cancelled = true;
      element.pause();
      if (url) URL.revokeObjectURL(url);
    };
  }, [audioSource,selected]);
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
  const activeScope = useRef("");
  const currentRecord = useRef(record);
  const uploadLock = useRef(false);
  useEffect(() => { activeScope.current = `${routeMarket()}/${space}/${actor}/${selected}`; currentRecord.current = record; }, [space,actor,selected,record]);
  useEffect(() => () => { activeScope.current = ""; }, []);
  function save(patch: Partial<MeetingDetail>) {
    if (!record) throw Error("会议尚未加载");
    if (readonly) throw Error("此录音为只读，请向所有者申请编辑权限，并确认工作区订阅有效");
    patch = enhanced ? updateSummary(record,selectedSummary!.id,patch) : patch;
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
            ...(!enhanced && "verbatim" in patch ? { transcript: patch.verbatim } : {}),
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
  const Editor = enhanced ? MeetingDocumentEditor : InlineEditor;
  const draftKey = `${selected}/${tab}${enhanced && tab === "summary" ? `/${selectedSummary?.id}` : ""}`,
    draft = drafts[draftKey];
  function chooseMeeting(next: string) {
    stopParticipant();
    audio.current?.pause();
    if (audio.current) audio.current.currentTime = 0;
    setSelected(next);
    setSummaryId("");
    setTab("summary");
    setExpanded(enhanced);
    root.current?.querySelector(".md-scroll")?.scrollTo({top:0});
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
    if (!r) return;
    const record=r;
    try {
      if (name === "edit") {
        const field = tab === "verbatim" ? "verbatim" : "summary";
        const html =
          (enhanced ? meetingBodyHtml(currentText(record, tab), record[`${field}Html`]) : record[`${field}Html`]) ||
          currentText(record, tab)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        setDrafts((prev) => ({ ...prev, [draftKey]: html }));
      } else if (name === "feedback") {
        save({ feedback: score });
        setToast("评价已保存");
      } else if (enhanced && (name === "asset-source" || (name === "regenerate" && tab !== "verbatim") || (name === "generate" && tab !== "verbatim"))) {
        if(readonly)throw Error("此录音为只读");
        setAssetSummaryId(selectedSummary?.id || "default");setModal("asset-source");
      } else if (name === "generate" || (enhanced && name === "regenerate" && tab === "verbatim")) {
        if(enhanced && tab === "verbatim") {
          const text=linesFor(record).map(l=>l.text).join("\n\n");
          save({verbatim: text, generated:{...record.generated,verbatim:text ? true : "source-empty"}});
        } else save({ generated: { ...record.generated, [tab]: true } });
      } else if (name === "zoom-reset") {
        setZoom(1);
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
        const viewport = root.current?.querySelector(".md-map-viewport, .cn-asset-map, .cn-asset-visual");
        void (
          document.fullscreenElement
            ? document.exitFullscreen()
            : viewport?.requestFullscreen()
        )?.catch(() => setToast("此浏览器暂不支持全屏"));
      } else if (name === "export-current") {
        if (tab === "mindmap") {
          const svg = root.current?.querySelector(".md-map, .cn-asset-map svg");
          if (svg)
            download(
              new XMLSerializer().serializeToString(svg),
              "svg",
              record.title,
              "image/svg+xml",
            );
        } else if (enhanced && tab === "visual") { setModal("export"); }
        else download(currentText(record, tab), "txt", record.title);
      } else setModal(name);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  const list = team && w ? M.visible(w, actor) : personal.data?.meetings || [];
  const visible = list.filter((m) =>
    m.title.toLowerCase().includes(query.toLowerCase()),
  );
  const badge = meetingStatusBadge(r?.contentState?.recordingStatus ?? file?.status ?? personal.data?.meetings.find(m=>m.id===selected)?.status);
  const shortContent = enhanced && (r?.contentState?.viewType === 2 || r?.contentState?.viewType === 3);
  const tabs = enhanced && r && !linesFor(r).some(s=>s.en.trim()) ? meetingTabs.filter(([key])=>key!=="translation") : meetingTabs;
  const meta = (m: {
    created: string;
    duration: string | number;
    source: string;
    visibility?: string;
  }) =>
    `${m.created.replace("T", " ").slice(0, 16)} · ${typeof m.duration === "number" ? `${m.duration} 分钟` : m.duration} · ${m.source}${m.visibility === "invited" ? " · 已邀请成员查看" : team ? " · 仅自己可见" : ""}`;
  return (
    <section
      ref={root}
      id="meeting-detail-root"
      className={`md-workspace${enhanced ? ` meeting-detail-ui ${cn ? "cn-meeting-detail" : "global-meeting-detail"}` : ""}${agentOpen ? " md-agent-open" : ""}`}
      data-main-view="note-detail"
      aria-label="语音笔记详情"
    >
      <audio
        ref={audio}
        preload="auto"
        hidden
        onLoadedMetadata={(e) => {setDuration(e.currentTarget.duration);setAudioStatus("ready");}}
        onWaiting={()=>setAudioStatus("buffering")}
        onCanPlay={()=>setAudioStatus("ready")}
        onError={()=>setAudioStatus("error")}
        onProgress={e=>{const a=e.currentTarget;if(a.buffered.length)setBuffered(a.buffered.end(a.buffered.length-1));}}
        onTimeUpdate={(e) => {setTime(e.currentTarget.currentTime);if(participantClip.current && e.currentTarget.currentTime>=participantClip.current.end)stopParticipant();}}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {setPlaying(false);stopParticipant();}}
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
                          <em data-tone={m.id===selected ? badge.tone : meetingStatusBadge(m.status).tone}>{m.id===selected ? badge.label : meetingStatusBadge(m.status).label}</em>
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
                  <RecordingModeIcon record={r} className="md-recording-mark" size={48} />

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
                        <span className="md-summary-ready" data-tone={badge.tone}>{badge.label}</span>
                        {meta(
                          file ||
                            personal.data?.meetings.find(
                              (m) => m.id === selected,
                            ) ||
                            r,
                        )}
                      </p>
                      <button
                        hidden={enhanced}
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
                        disabled={readonly || (!!team && !M.canShare(w!, file, actor))}
                        onClick={() => action("share")}
                      >
                        <I name="share" /> 分享
                      </B>
                    )}
                    {team && w && file && M.canShare(w, file, actor) && (
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
                    <B
                      action="ask"
                      className="md-ask-agent"
                      aria-label={agentOpen ? "收起 Agent" : "Ask Agent"}
                      aria-controls="md-agent-host"
                      aria-expanded={agentOpen}
                      onClick={() => setAgentOpen(!agentOpen)}
                    >
                      <span className="md-agent-mark"><RefIcon name="spark" /></span>
                      <strong>Ask Agent</strong>
                      <RefIcon name="expand" className="icon md-agent-expand" />
                    </B>
                    <IB
                      action="library"
                      name="library"
                      label="切换录音列表"
                      onClick={() => {
                        if (
                          matchMedia("(max-width:800px)").matches ||
                          (agentOpen && matchMedia("(max-width:1799px)").matches)
                        ) setLibraryMobile(!libraryMobile);
                        else setLibraryClosed(!libraryClosed);
                      }}
                    />
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
                  {enhanced ? <DomesticAudioPlayer time={time} duration={duration} speed={speed} playing={playing} marks={r.marks} status={audioStatus} error={!audioSource ? "暂无可播放的原音频" : ""} buffered={buffered} onTogglePlay={()=>playing?audio.current?.pause():play()} onSeek={(n,autoplay)=>{seek(n,autoplay);if(autoplay)setTab("transcript");}} onSpeedChange={n=>{setSpeed(n);if(audio.current)audio.current.playbackRate=n;}} onRetry={audioSource ? ()=>{setAudioStatus("loading");audio.current?.load();} : undefined}/> : <div className="md-player">
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
                    <Select
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
                    </Select>

                  </div>}
                  <section className={`md-info${expanded ? " is-expanded" : ""}`}>
                    <div className="md-info-line">
                      <button
                        type="button"
                        data-md-action="participants"
                        disabled={readonly}
                        onClick={() => action("participants")}
                      >
                        参会人 <span>{(enhanced ? [...new Set([...linesFor(r).map(s=>s.speakerName || r.speakers[s.speaker] || "发言人"),...(r.silentParticipants || [])])] : r.speakers).join("、")}</span>
                      </button>
                      {enhanced && <button type="button" data-md-action="info" disabled={readonly} onClick={()=>action("info")}>位置 <span>{r.location || "添加位置"}</span></button>}
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
                      {(team || r.customer || r.project) && <div className="md-info-line">                      <button
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
</div>}
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
                      <div className="md-image-section">
                        <span>图片（{(r.images || []).length}/50）</span>
                        <div className="md-images">
                          {(r.images || []).map((im, i) => (
                            <div className="md-image" key={`${im.name}/${i}`}>
                              <img
                                src={im.url}
                                loading="lazy"
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
                                  if(enhanced){setImageSelection([i]);setModal("image-manager");}
                                  else try { save({ images: r.images!.filter((_, j) => i !== j) }); } catch(e) { setToast((e as Error).message); }
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
                          disabled={readonly || uploading}
                          onClick={() => imageInput.current?.click()}
                        >
                          {uploading ? "上传中…" : <><img src={`${basePath}/assets/baizhi/meeting/add-image-source.svg`} width={20} height={20} alt="" /><span>添加图片</span></>}
                        </B>
                        {enhanced && !!r.images?.length && <B onClick={()=>{setImageSelection([]);setModal("image-manager");}}>全部图片（{r.images.length}）</B>}
                      </div>
                    </div>
                  </section>
                  {!shortContent && <nav
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
                      const index = tabs.findIndex((t) => t[0] === tab);
                      const next =
                        tabs[
                          e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? tabs.length-1
                              : (index +
                                  (e.key === "ArrowRight" ? 1 : -1) +
                                  tabs.length) %
                                tabs.length
                        ][0];
                      setTab(next);
                      root.current
                        ?.querySelector<HTMLButtonElement>(`#md-tab-${next}`)
                        ?.focus();
                    }}
                  >
                    {tabs.map(([key, label]) => (
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
                  </nav>}
                  <section
                    id="md-content"
                    className="md-panel"
                    role={shortContent ? "region" : "tabpanel"}
                    aria-label={shortContent ? "录音内容" : undefined}
                    aria-labelledby={shortContent ? undefined : `md-tab-${tab}`}
                  >
                    {enhanced && !shortContent && tab === "summary" && meetingSummaries(r).length>1 && <div className="cn-summary-selector"><label>全部总结<Select aria-label="全部总结" value={selectedSummary!.id} onChange={e=>setSummaryId(e.target.value)}>{meetingSummaries(r).map(s=><option key={s.id} value={s.id}>{s.title || "新总结"}</option>)}</Select></label>{selectedSummary?.source==="agent_generated" && !readonly && <B onClick={()=>setModal("delete-summary")}>删除总结</B>}</div>}
                    {shortContent ? <><DomesticContentState r={r} tab="summary" readonly={readonly} workspaceType={team?"team":"personal"} onAction={()=>{}}/>{r.contentState?.viewType === 3 && <DomesticTranscript r={r} readonly seek={seek} onSave={save} time={time} compact/>}</> : enhanced && (tab==="summary" || tab==="transcript") && (tab==="summary" ? !r.summary.trim() || r.summary==="录音已保存，等待转写处理。" : !linesFor(r).length) ? <DomesticContentState key={`${space}/${actor}/${r.id}/${tab}`} r={r} tab={tab} status={r.contentState?.recordingStatus ?? file?.status ?? personal.data?.meetings.find(m=>m.id===selected)?.status} processingPaused={file?.processingPaused} readonly={readonly} workspaceType={team?"team":"personal"} workspaceActive={w?.status==="active"} canManageSubscription={!!w && M.admin(w,actor)} onAction={(name)=>{
                      if(name==="membership" || name==="time-pack")location.assign(appUrl("subscription",name==="time-pack"?"time-pack":"",space,actor));
                      else if(name==="settings")location.assign(appUrl("settings","recording",space,actor));
                      else if(name==="refresh")location.reload();
                      else if(tab==="summary")setModal("template");
                      else throw Error("转写服务暂不可用，请稍后重试");
                    }}/> : draft !== undefined ? (
                      <Editor
                        key={draftKey}
                        html={draft}
                        title={tab === "summary" ? (record?.summaries?.length ? selectedSummary?.title || r.title : r.title) : `${r.title} · 逐字稿`}
                        meeting={r}
                        team={!!team}
                        onDraft={(html) =>
                          setDrafts((prev) => ({ ...prev, [draftKey]: html }))
                        }
                        onExit={()=>enhanced?setModal("discard-edit"):dropDraft()}
                        onSave={(text, html, title?: string) => {
                          const field =
                            tab === "verbatim" ? "verbatim" : "summary";
                          const patch = { [field]: text, [`${field}Html`]: html };
                          if (enhanced && tab === "summary" && record?.summaries?.length) {
                            const updated = updateSummary(record, selectedSummary!.id, patch);
                            save({...updated, summaries: updated.summaries!.map(s=>s.id===selectedSummary!.id?{...s,title:title || s.title}:s)});
                          } else save({...patch, ...(enhanced && tab === "summary" && title ? {title} : {})});
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
                          key={`${selected}/${selectedSummary?.id}`}
                          r={r}
                          tab={tab}
                          readonly={readonly}
                          score={score}
                          setScore={setScore}
                          action={action}
                          seek={seek}
                          zoom={zoom}
                        time={time}
                        onSave={save}
                        reward={!!spaces.state?.spaces.some(p => p.type === "personal" && M.member(p,actor) && countMonthlyFeedbackRewards(p.rewards?.entries || []) < marketConfig().rewardLimits.feedback)}
                        onFeedback={rating => {
                          if(readonly)throw Error("此录音为只读");
                          spaces.change(s=>submitMeetingFeedback(s,space,selected,actor,rating,record?.summaries?.length ? selectedSummary!.id : undefined));
                          setRecord({...record!,...updateSummary(record!,selectedSummary!.id,{feedback:rating.score,feedbackDetail:rating})});
                          setToast("评价已提交");
                        }}
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
            onChange={async (e) => {
              const input = e.currentTarget;
              const targetScope = activeScope.current;
              const targetSession = marketStorage.getItem("eureka:auth:v1");
              const original = record;
              if(uploadLock.current)return;
              const files = [...(e.target.files || [])];
              if (readonly || !files.length) { input.value=""; return; }
              if ((r.images || []).length + files.length > 50) {
                setToast("最多添加50张图片");
                input.value="";return;
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
                input.value="";return;
              }
              uploadLock.current=true;setUploading(true);
              try {
                const additions = await Promise.all(files.map(f => new Promise<{name:string;url:string}>((resolve,reject) => {
                  const reader=new FileReader();reader.onload=()=>resolve({name:f.name,url:String(reader.result)});reader.onerror=()=>reject(Error("图片读取失败"));reader.readAsDataURL(f);
                })));
                if(activeScope.current !== targetScope || marketStorage.getItem("eureka:auth:v1") !== targetSession)return;
                if(currentRecord.current !== original)throw Error("会议已更新，请重新添加图片");
                save({images:[...(r.images || []),...additions]});
                setExpanded(true);setToast("图片已添加");
              } catch(e) { setToast((e as Error).message || "图片保存失败，请重试"); }
              finally { uploadLock.current=false;setUploading(false);input.value = ""; }
            }}
          />
          {modal === "team-share" && team && w && file ? (
            <RecipientDialog key={`${space}:${selected}`} w={w} actor={actor} owner={file.owner} initial={file.shared}
              title={`团队共享 · ${file.title}`} onClose={() => setModal("")} onSave={users => {
                spaces.change(s => M.share(M.get(s, space), selected, users, actor, []));
                setModal("");
              }} />
          ) : modal === "discard-edit" ? (
            <MdDialog title="放弃未保存的修改？" onClose={()=>setModal("")} footer={<><B onClick={()=>setModal("")}>继续编辑</B><B className="md-btn md-primary" onClick={()=>{dropDraft();setModal("");}}>放弃修改</B></>}>当前修改尚未保存。</MdDialog>
          ) : modal === "delete-summary" ? (
            <MdDialog title="确认删除此总结？" onClose={()=>setModal("")} footer={<><B onClick={()=>setModal("")}>取消</B><B className="md-btn md-primary" onClick={()=>{try{if(readonly || selectedSummary?.source!=="agent_generated")throw Error("此总结不可删除");const remaining=meetingSummaries(record!).filter(s=>s.id!==selectedSummary.id);if(!remaining.length)throw Error("至少保留一份总结");const primary=remaining[0];save({summaries:remaining,summary:primary.text,summaryHtml:primary.html || "",template:primary.template || r.template,feedback:primary.feedback?.score || 0});setSummaryId(remaining.at(-1)!.id);setModal("");}catch(e){setToast((e as Error).message);}}}>确定</B></>}>删除后无法恢复，录音和转译文本会保留。</MdDialog>
          ) : modal === "image-manager" ? (
            <DomesticImageManager images={r.images || []} readonly={readonly} initialSelection={imageSelection} onClose={()=>setModal("")} onDelete={indices=>{save({images:(r.images || []).filter((_,i)=>!indices.includes(i))});setToast("图片已删除");}} onPreview={index=>{setPreview(index);setModal("image-preview");}}/>
          ) : modal === "asset-source" ? (
            <MdDialog title={tab === "visual" ? "选择用于生成图文摘要的总结" : "选择用于生成思维导图的总结"} onClose={()=>setModal("")} footer={<><B onClick={()=>setModal("")}>取消</B><B className="md-btn md-primary" disabled={readonly || !meetingSummaries(r).some(s=>s.id===assetSummaryId && s.text.trim())} onClick={()=>{
              try {
                const source=meetingSummaries(r).find(s=>s.id===assetSummaryId)!;
                save({generated:{...r.generated,[tab]:tab === "visual" ? "failed" : true,...(tab === "visual" ? {visualUrl:""} : {}),[`${tab}SourceTitle`]:source.title,[`${tab}SourceId`]:source.id,[`${tab}SourceText`]:source.text}});
                setZoom(1);setModal("");
              } catch(e) {setToast((e as Error).message);}
            }}>{r.generated[tab] ? "重新生成" : "生成"}</B></>}>
              {meetingSummaries(r).some(s=>s.text.trim()) ? meetingSummaries(r).filter(s=>s.text.trim()).map(s=><label className="md-choice" key={s.id}><input type="radio" name="asset-source" checked={assetSummaryId===s.id} onChange={()=>setAssetSummaryId(s.id)}/><span><strong>{s.title}</strong><small>{s.template || r.template} · {r.title}</small></span></label>) : <p>暂无可用总结，请先生成智能总结。</p>}
            </MdDialog>
          ) : modal ? (
            <MeetingDialogs
              key={`${selected}/${selectedSummary?.id}/${modal}`}
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
                  const repository = createLocalRepository(marketStorage);
                  await repository.load();
                  await repository.setUploadDeleted(selected, true);
                }
                setDrafts({});
                location.assign(appUrl("home", "", space, actor));
              }}
              seek={seek}
              onPlayParticipantSegment={enhanced ? clip=>{stopParticipant();participantClip.current={key:clip.key,end:clip.end ?? duration,speed};setParticipantKey(clip.key);setSpeed(1);if(audio.current)audio.current.playbackRate=1;seek(clip.start);} : undefined}
              onStopParticipantSegment={enhanced ? stopParticipant : undefined}
              activeParticipantSegmentKey={participantKey}
              workspace={team ? w : undefined}
              copyText={currentText(r, tab)}
              previewImage={r.images?.[preview]}
              allImages={r.images || []}
              previewIndex={preview}
              onPreview={setPreview}
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
