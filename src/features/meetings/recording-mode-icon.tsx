/* eslint-disable @next/next/no-img-element -- Preserve hardware environment/call SVG assets. */
import { basePath } from "@/lib/routes";
import { recordingMode, recordingModeLabel } from "./recording-mode";
import { meetingSourceKind, type MeetingCapture } from "./capture";

type SourceKind = ReturnType<typeof meetingSourceKind>;

/** The legacy assets use a 32px tile and an 18px drawing inset by 7px.
 * Keep that canvas and scale for every source, including the recording launcher. */
export function RecordingSourceGlyph({ kind, upload = false, size = 24 }: { kind: Exclude<SourceKind, "hardware">; upload?: boolean; size?: number }) {
  const asset = upload ? "upload" : kind === "audio" ? "mic" : kind;
  return <img src={`${basePath}/assets/baizhi/meeting/recording-${asset}-source.svg`} width={size} height={size} alt="" aria-hidden="true" />;
}

export function RecordingModeIcon({ record, size = 24, className }: {
  record: Parameters<typeof recordingMode>[0] & { capture?: MeetingCapture }; size?: number; className?: string;
}) {
  const kind = meetingSourceKind(record), mode = recordingMode(record);
  const label = kind === "hardware" ? `硬件录音 · ${recordingModeLabel(record)}` : { app: "APP 录音", web: record.source === "文件上传" ? "文件上传" : "Web 录音", video: "视频录制", audio: "音频录制" }[kind];
  return <span className={className} role="img" aria-label={label} title={label} data-recording-source={kind} data-recording-mode={mode} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flexShrink: 0, color: "var(--ui-text)" }}>
    {kind === "hardware" ? <img src={`${basePath}/assets/baizhi/meeting/recording-${mode === "call" ? "ear" : "mic"}-source.svg`} width={size} height={size} alt={recordingModeLabel(record)} /> : <RecordingSourceGlyph kind={kind} upload={record.source === "文件上传"} size={size} />}
  </span>;
}
