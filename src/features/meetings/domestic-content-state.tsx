"use client";

import { useRef, useState } from "react";
import { basePath } from "@/lib/routes";
import type { MeetingDetail } from "./types";
import "./domestic-content-state.css";

export type DomesticContentTab = "summary" | "transcript";
export type DomesticContentAction = "generate" | "retry" | "membership" | "time-pack" | "settings" | "refresh";
export type DomesticContentStateKind = "empty" | "short" | "processing" | "failed" | "quota" | "auto-disabled" | "paused" | "queued";

export interface DomesticContentStateProps {
  r: Pick<MeetingDetail, "id" | "contentState">;
  tab: DomesticContentTab;
  /** Use WorkspaceFile.status or the current personal list row's status. */
  status?: string | number;
  processingPaused?: boolean;
  readonly: boolean;
  workspaceType: "personal" | "team";
  /** Pass w.status === 'active' for a team. */
  workspaceActive?: boolean;
  /** Team billing access must be supplied explicitly; never infer it from canEdit. */
  canManageSubscription?: boolean;
  /** Parent-owned in-flight operation, separate from the stored processing status. */
  pending?: boolean;
  /** Caller rechecks permissions and locks market/account/workspace/meeting before writes. */
  onAction: (action: DomesticContentAction, tab: DomesticContentTab) => void | Promise<void>;
}

// Source: index-DEbbywsx.js Sh/ls/ll, hh/rs, l5 and the empty-state render branches.
const numericStatus: Record<string, string> = {
  0: "RECORDING", 2: "PC_MEETING_IN_SUMMARY", 4: "PC_MEETING_AUDIO_PROCESSING",
  6: "PC_MEETING_MERGING", 7: "READY", 10: "PC_MEETING_AUDIO_PROCESSING",
  12: "PC_MEETING_PENDING_SUMMARY", 14: "PC_MEETING_PENDING_SUMMARY",
  16: "PC_MEETING_FAILED", 25: "PC_MEETING_IN_SUMMARY", 30: "PC_MEETING_IN_SUMMARY",
  35: "PC_MEETING_IN_SUMMARY", 40: "PC_MEETING_SUMMARY_COMPLETED", 45: "VECTORIZING",
  47: "VECTORIZE_FAILED", 50: "READY", 60: "PC_MEETING_FAILED", 61: "PC_MEETING_FAILED",
  64: "PC_MEETING_MERGE_FAILED", 65: "PC_MEETING_AUDIO_PROCESS_FAILED",
};
const aliases: Record<string, string> = {
  KNOWLEDGE_COMPLETED: "READY", KNOWLEDGE_SYNCING: "VECTORIZING", KNOWLEDGE_SYNC_FAILED: "VECTORIZE_FAILED",
  SUMMARY_COMPLETED: "PC_MEETING_SUMMARY_COMPLETED", SUMMARY_PROCESSING: "PC_MEETING_IN_SUMMARY",
  ASR_PROCESSING: "PC_MEETING_IN_SUMMARY", ASR_COMPLETED: "PC_MEETING_IN_SUMMARY", ASR_SUCCESS: "PC_MEETING_IN_SUMMARY",
  PENDING_SUMMARY: "PC_MEETING_PENDING_SUMMARY", SUMMARY_FAILED: "PC_MEETING_FAILED",
  已总结: "READY", 待总结: "PC_MEETING_PENDING_SUMMARY", AI总结中: "PC_MEETING_IN_SUMMARY",
  总结中: "PC_MEETING_IN_SUMMARY", 转写中: "TRANSCRIBING", 转译中: "TRANSCRIBING",
  向量化中: "VECTORIZING", 转码中: "PC_MEETING_AUDIO_PROCESSING", 合并中: "PC_MEETING_MERGING",
  总结失败: "PC_MEETING_FAILED", 转写失败: "TRANSCRIPT_FAILED", 转译失败: "TRANSCRIPT_FAILED",
  向量化失败: "VECTORIZE_FAILED", 合并失败: "PC_MEETING_MERGE_FAILED", PC录音处理失败: "PC_MEETING_AUDIO_PROCESS_FAILED",
  待处理: "QUEUED", "原始音频 · 待处理": "QUEUED", 处理中: "PROCESSING",
};
const processingTitles: Record<string, string> = {
  PC_MEETING_IN_SUMMARY: "正在生成总结，请稍后...",
  VECTORIZING: "正在处理会议内容，请稍后...",
  PC_MEETING_AUDIO_PROCESSING: "正在处理录音，请稍后...",
  PC_MEETING_MERGING: "正在合并录音，请稍后...",
  TRANSCRIBING: "正在转写，请稍后...",
  PROCESSING: "正在处理录音，请稍后...",
  UPLOADING: "正在上传录音，请稍后...",
  PARSING: "正在解析录音，请稍后...",
  RECORDING: "录音进行中，结束后可查看处理结果",
  RECORDING_IN_PROGRESS: "录音进行中，结束后可查看处理结果",
  RECORDING_PAUSED: "录音已暂停，结束录音后可查看处理结果",
  PAUSED: "录音已暂停，结束录音后可查看处理结果",
};
const failedTitles: Record<string, string> = {
  PC_MEETING_FAILED: "总结失败", TRANSCRIPT_FAILED: "转写失败", ASR_FAILED: "转写失败",
  VECTORIZE_FAILED: "向量化失败", PC_MEETING_MERGE_FAILED: "合并失败",
  PC_MEETING_AUDIO_PROCESS_FAILED: "PC录音处理失败", FAILED: "录音处理失败",
};

/** Resolve an EMPTY panel only. Existing content should keep rendering in MeetingContent. */
export function resolveDomesticContentState({ r, tab, status, processingPaused, workspaceType, workspaceActive, pending }: Pick<DomesticContentStateProps, "r" | "tab" | "status" | "processingPaused" | "workspaceType" | "workspaceActive" | "pending">): { kind: DomesticContentStateKind; title: string } {
  const context = r.contentState;
  const raw = (String(status ?? "").trim() || String(context?.recordingStatus ?? "").trim()).toUpperCase();
  const normalized = numericStatus[raw] || aliases[raw] || raw;
  const emptyTitle = tab === "summary" ? "暂无智能总结" : "会议内容结构化、快速理解主题和分支";
  if (processingPaused || (workspaceType === "team" && workspaceActive === false)) {
    return { kind: "paused", title: "转写与 AI 总结已暂停" };
  }
  if (pending || processingTitles[normalized]) {
    return { kind: "processing", title: processingTitles[normalized] || "正在提交，请稍后..." };
  }
  if (context?.viewType === 2 || context?.viewType === 3) {
    return { kind: "short", title: "本次录音较短，未检测到实质性内容" };
  }
  if (context?.transcriptSubStatus === 300001) {
    return { kind: "quota", title: emptyTitle };
  }
  if (failedTitles[normalized]) return { kind: "failed", title: failedTitles[normalized] };
  if (normalized === "QUEUED") return { kind: "queued", title: "录音已保存，等待处理" };
  // Source checks autoTranslateEverEnabled only for the TRANSCRIPT notice.
  // An absent setting must not claim the user never enabled automatic transcription.
  if (tab === "transcript" && (context?.autoTranslateEverEnabled === false || context?.autoTranslateEverEnabled === 0)) {
    return { kind: "auto-disabled", title: emptyTitle };
  }
  return { kind: "empty", title: emptyTitle };
}

/**
 * Mount for an empty summary/transcript panel, keyed by market/workspace/meeting/tab.
 * This component neither generates content nor writes storage or routes.
 * Official public PNGs from https://100wiser.com/static/png/:
 * summary-empty-DrSsD1fh.png SHA256 58883ca6e0e86ff5b3828b2bce8d93406b79916cdd29e3e6899b5a28dbb28830
 * transcript-empty-Bl42-4Kv.png SHA256 0db79651f139441032fde0f707d5b84868d72ba0d584fb5c4a81fafe6b4662f0
 */
export function DomesticContentState(props: DomesticContentStateProps) {
  const { r, tab, readonly, workspaceType, workspaceActive, canManageSubscription, onAction } = props;
  const state = resolveDomesticContentState(props);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const operation = useRef(false);
  const team = workspaceType === "team";
  const canWrite = !readonly && state.kind !== "paused" && state.kind !== "processing";
  const canBill = team ? canManageSubscription === true : !readonly;
  const disabled = busy || !!props.pending;
  const act = async (action: DomesticContentAction) => {
    if (operation.current || props.pending) return;
    if ((action === "generate" || action === "retry" || action === "settings") && !canWrite) return;
    if (action === "membership" && !canBill) return;
    if (action === "time-pack" && (team || readonly)) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try { await onAction(action, tab); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败，请稍后重试"); }
    finally { operation.current = false; setBusy(false); }
  };
  const button = (action: DomesticContentAction, label: string, primary = false) => (
    <button type="button" className={primary ? "cn-content-primary" : "cn-content-link"} disabled={disabled} onClick={() => void act(action)}>{label}</button>
  );
  const hint = state.kind === "quota" ? (
    <div className="cn-content-notice" role="note">
      <span aria-hidden="true">!</span>
      <p>因额度不足未自动生成，请{team ? <>{canBill ? <> {button("membership", "管理团队订阅")}</> : "联系团队管理员处理"}。</> : canBill ? <> {button("membership", "升级会员")} 或 {button("time-pack", "购买加时包")}</> : "联系录音所有者处理。"}</p>
    </div>
  ) : state.kind === "auto-disabled" ? (
    <div className="cn-content-notice" role="note">
      <span aria-hidden="true">!</span>
      <p>{canWrite ? <>您可在「设置 - {button("settings", "打开自动转译开关")}」，将在每次录音完成后自动转录文本并总结</> : "当前录音尚未自动转写，请联系录音所有者处理。"}</p>
    </div>
  ) : null;
  if (state.kind === "processing") return (
    <section className="cn-content-state cn-content-processing" aria-label={tab === "summary" ? "总结处理状态" : "转写处理状态"} aria-busy="true" data-content-state={state.kind}>
      <p role="status"><span className="cn-content-spinner" aria-hidden="true" />{state.title}</p>
      <div className="cn-content-skeleton" aria-hidden="true">{[0, 1, 2, 3].map(n => <span key={n} />)}</div>
    </section>
  );
  const simple = state.kind === "short" || state.kind === "paused" || state.kind === "queued";
  const showGenerate = canWrite && ["empty", "auto-disabled", "quota"].includes(state.kind);
  return (
    <section className={`cn-content-state${simple ? " cn-content-simple" : ""}`} aria-label={tab === "summary" ? "总结内容状态" : "转写内容状态"} data-content-state={state.kind} data-meeting-id={r.id} aria-busy={disabled}>
      {hint}
      <div className="cn-content-empty">
        {!simple && (
          /* eslint-disable-next-line @next/next/no-img-element -- Exact public source empty-state artwork. */
          <img src={`${basePath}/assets/baizhi/meeting/${tab === "summary" ? "summary-empty-DrSsD1fh.png" : "transcript-empty-Bl42-4Kv.png"}`} alt="" width={240} height={146} />
        )}
        <h2 className={tab === "transcript" && ["empty", "auto-disabled", "quota"].includes(state.kind) ? "cn-content-transcript-title" : undefined} role={state.kind === "failed" ? "alert" : "status"}>{state.title}</h2>
        {state.kind === "short" ? null : state.kind === "paused" ? (
          <p>{team ? "团队工作区当前只读，原始音频同步不受影响。恢复订阅后可继续转写与 AI 总结。" : "当前录音处理已暂停，原始音频予以保留。"}</p>
        ) : state.kind === "queued" ? <p>处理完成后可查看内容。</p> : state.kind === "failed" ? <p>{canWrite ? "请稍后重试。" : "当前暂无可查看内容，请联系录音所有者处理。"}</p> : tab === "summary" ? <p>{canWrite ? "点击生成后，将结合当前录音内容完成智能分析" : "当前暂无可查看的智能总结"}</p> : <>
          <p>讨论结构更直观、主题层级清晰展开；适合复盘、汇报与分享</p>
        </>}
        {showGenerate && button("generate", tab === "summary" ? "发起智能总结" : "立即生成", true)}
        {state.kind === "failed" && canWrite && button("retry", "重新生成", true)}
        {state.kind === "queued" && button("refresh", "刷新状态")}
        {state.kind === "paused" && team && (canBill ? button("membership", workspaceActive === false ? "续费团队" : "管理团队订阅", true) : <p>请联系团队管理员恢复订阅。</p>)}
        {readonly && !simple && state.kind !== "failed" && <p className="cn-content-permission">当前为只读，生成与重试由录音所有者或有管理权限的成员操作。</p>}
        {error && <p className="cn-content-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
