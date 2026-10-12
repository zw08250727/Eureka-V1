import type { MeetingDetail } from "./types";
import { meetingAudioSource } from "./audio-source";

export const contentLabels = {
  audio: "音频", transcript: "转译文本", translation: "实时翻译", summary: "总结",
  verbatim: "逐字稿", mindmap: "思维导图", visual: "图文摘要", images: "图片",
} as const;
export type ContentKind = keyof typeof contentLabels;
export type ExportFormat = "txt" | "json" | "md" | "html";
export interface ContentSection { heading: string; text: string }
export interface ContentImage { name: string; url: string }
export interface ExportContent {
  kind: ContentKind;
  label: string;
  sections: ContentSection[];
  images?: ContentImage[];
  sourceMarkdown?: string;
  audioUrl?: string;
  segments?: { at: number; speaker: string; text: string }[];
}
export interface ContentOption { kind: ContentKind; label: string; enabled: boolean; reason: string }

// Structural optional fields keep the dialog compatible with both detail contracts.
function optional(r: MeetingDetail, name: string): unknown {
  return (r as unknown as Record<string, unknown>)[name];
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export function safeImageUrl(value: unknown): value is string {
  return typeof value === "string" && (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value) || /^\/(?!\/)[^\s\\"<>]+$/.test(value));
}
export function safeVisualUrl(value: unknown): value is string {
  if (safeImageUrl(value)) return true;
  if (typeof value !== "string" || !/^https:\/\//.test(value)) return false;
  try { const url = new URL(value); return !url.username && !url.password; } catch { return false; }
}
export function mindmapSource(title: string, summary: string) {
  // Same source and title escaping as DomesticAssets.NativeMindmap.
  const escapedTitle = title.replace(/[\\`*_{}\[\]<>#!|]/g, "\\$&").replace(/\r?\n/g, " ");
  return `# ${escapedTitle}\n\n${summary}`;
}
export function contentImages(r: MeetingDetail): ContentImage[] {
  const value = optional(r, "images");
  return Array.isArray(value) ? value.flatMap((item, i) => {
    if (!object(item) || !safeImageUrl(item.url)) return [];
    return [{ name: typeof item.name === "string" ? item.name : `图片 ${i + 1}`, url: item.url }];
  }) : [];
}
function segments(r: MeetingDetail, translation = false): NonNullable<ExportContent["segments"]> {
  const value = optional(r, "segments");
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!object(item)) return [];
    const text = translation ? item.en ?? item.translation : item.text;
    if (typeof text !== "string" || !text.trim()) return [];
    const at = typeof item.at === "number" ? item.at : typeof item.start === "number" ? item.start : 0;
    const speaker = typeof item.speakerName === "string" && item.speakerName.trim() ? item.speakerName : typeof item.speaker === "number" ? r.speakers[item.speaker] || "发言人" : typeof item.speaker === "string" ? item.speaker : "发言人";
    return [{ at: Math.max(0, at), speaker, text }];
  });
}
function completed(r: MeetingDetail, key: string) {
  const value = r.generated[key];
  return value === true || (typeof value === "string" && /^(true|done|completed|success)$/i.test(value));
}
function rawText(r: MeetingDetail, kind: "transcript" | "translation") {
  if (kind === "transcript") return r.transcript || "";
  const value = optional(r, "translation");
  return typeof value === "string" ? value : "";
}
export function contentOptions(r: MeetingDetail): ContentOption[] {
  const removed = !!(r.deleted || r.purged);
  const ready: Record<ContentKind, boolean> = {
    audio: !!meetingAudioSource(r),
    transcript: !!(segments(r).length || r.transcript.trim()),
    translation: !!(segments(r, true).length || rawText(r, "translation").trim()),
    summary: !!r.summary.trim() && r.summary !== "录音已保存，等待转写处理。",
    verbatim: completed(r, "verbatim") && !!r.verbatim.trim(),
    mindmap: completed(r, "mindmap") && !!(typeof r.generated.mindmapSourceText === "string" ? r.generated.mindmapSourceText : r.summary).trim(),
    visual: completed(r, "visual") && safeVisualUrl(r.generated.visualUrl),
    images: contentImages(r).length > 0,
  };
  return (Object.keys(contentLabels) as ContentKind[]).map(kind => ({
    kind, label: contentLabels[kind], enabled: !removed && ready[kind],
    reason: removed ? "会议已移入回收站" : kind === "images" ? "暂无可用图片" : kind === "audio" ? r.deleteSourceAudio ? "原始音频已删除" : "暂无可用的原始音频" : kind === "visual" && !safeVisualUrl(r.generated.visualUrl) ? "暂无图文摘要图片" : "内容尚未生成完成",
  }));
}
const timestamp = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
export function getExportContent(r: MeetingDetail, kind: ContentKind): ExportContent {
  const option = contentOptions(r).find(o => o.kind === kind);
  if (!option?.enabled) throw Error(option?.reason || "请选择有效内容");
  const result: ExportContent = { kind, label: contentLabels[kind], sections: [] };
  if (kind === "audio") return { ...result, audioUrl: meetingAudioSource(r) };
  if (kind === "images") return { ...result, images: contentImages(r) };
  if (kind === "visual") return { ...result, images: [{ name: `${r.title}-图文摘要`, url: String(r.generated.visualUrl) }] };
  if (kind === "transcript" || kind === "translation") {
    const rows = segments(r, kind === "translation");
    return { ...result, segments: rows, sections: [{ heading: result.label, text: rows.length ? rows.map(s => `${timestamp(s.at)} ${s.speaker}\n${s.text}`).join("\n\n") : rawText(r, kind) }] };
  }
  if (kind === "summary" || kind === "verbatim") {
    const text = kind === "summary" ? r.summary : r.verbatim;
    return { ...result, sections: [{ heading: result.label, text }] };
  }
  return { ...result, sourceMarkdown: mindmapSource(r.title, typeof r.generated.mindmapSourceText === "string" ? r.generated.mindmapSourceText : r.summary), sections: [{ heading: String(r.generated.mindmapSourceTitle || "智能总结"), text: typeof r.generated.mindmapSourceText === "string" ? r.generated.mindmapSourceText : r.summary }] };
}
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const escapeMarkdown = (s: string) => s.replace(/([\\`*_{}\[\]()#+.!|>~-])/g, "\\$1").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function serializeExport(title: string, content: ExportContent, format: ExportFormat) {
  if (content.kind === "audio") throw Error("音频请下载原始文件");
  if (content.kind === "visual") throw Error("图文摘要请下载原始图片");
  if (format === "json") return { extension: "json", mime: "application/json;charset=utf-8", body: JSON.stringify({ title, ...content }, null, 2) };
  if (format === "md") return { extension: "md", mime: "text/markdown;charset=utf-8", body: content.kind === "mindmap" && content.sourceMarkdown ? content.sourceMarkdown.replace(/</g, "&lt;").replace(/>/g, "&gt;") : `# ${escapeMarkdown(title)}\n\n${content.sections.map(s => `## ${escapeMarkdown(s.heading)}\n\n${escapeMarkdown(s.text)}`).join("\n\n")}\n${(content.images || []).map(i => `![${escapeMarkdown(i.name)}](<${i.url}>)`).join("\n\n")}\n` };
  if (format === "html") return { extension: "html", mime: "text/html;charset=utf-8", body: `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:16px/1.7 system-ui,sans-serif;color:#262626;max-width:900px;margin:32px auto;padding:0 24px;overflow-wrap:anywhere}section{margin:24px 0}p{white-space:pre-wrap}img{max-width:100%;height:auto}h1{font-size:28px}h2{font-size:20px}</style></head><body><main><h1>${escapeHtml(title)}</h1>${content.sections.map(s => `<section><h2>${escapeHtml(s.heading)}</h2><p>${escapeHtml(s.text)}</p></section>`).join("")}${(content.images || []).map(i => `<figure><img src="${escapeHtml(i.url)}" alt="${escapeHtml(i.name)}"><figcaption>${escapeHtml(i.name)}</figcaption></figure>`).join("")}</main></body></html>` };
  return { extension: "txt", mime: "text/plain;charset=utf-8", body: `${title}\n\n${content.sections.map(s => `${s.heading}\n${s.text}`).join("\n\n")}${(content.images || []).map(i => `\n\n${i.name}\n${i.url}`).join("")}\n` };
}
