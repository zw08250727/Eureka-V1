/** Screen capture is a separate source from Web microphone recording and
 * hardware environment/call modes. Missing metadata preserves historical data. */
export interface MeetingCapture {
  kind: "meeting-video" | "meeting-audio";
  microphone: boolean;
  microphoneName: string;
  language: string;
  surface?: "screen" | "window";
  surfaceName?: string;
}
export function captureParams(capture: MeetingCapture) {
  return new URLSearchParams({ capture: capture.kind, microphone: String(capture.microphone),
    microphoneName: capture.microphoneName, language: capture.language,
    ...(capture.surface ? { surface: capture.surface, surfaceName: capture.surfaceName || "" } : {}) }).toString();
}
export function readCapture(query: string): MeetingCapture | undefined {
  const p = new URLSearchParams(query), kind = p.get("capture");
  if (kind !== "meeting-video" && kind !== "meeting-audio") return;
  return { kind, microphone: p.get("microphone") !== "false", microphoneName: p.get("microphoneName") || "默认麦克风",
    language: p.get("language") || "中文（普通话）", ...(kind === "meeting-video" ? {
      surface: p.get("surface") === "screen" ? "screen" : "window", surfaceName: p.get("surfaceName") || "会议窗口",
    } : {}) };
}
export const captureSource = (capture?: MeetingCapture) => capture?.kind === "meeting-video" ? "视频录制" : capture?.kind === "meeting-audio" ? "音频录制" : "网页录音";

export function meetingSourceKind(record: { source: string; capture?: MeetingCapture }) {
  if (record.capture?.kind === "meeting-video" || record.source === "视频录制") return "video";
  if (record.capture?.kind === "meeting-audio" || record.source === "音频录制") return "audio";
  if (["W1", "W2", "M1", "W-PEN"].includes(record.source) || /硬件|设备/.test(record.source)) return "hardware";
  if (/app|手机|移动端/i.test(record.source)) return "app";
  return "web";
}
