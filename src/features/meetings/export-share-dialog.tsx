"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MdDialog, MdButton as B, download } from "./reference-ui";
import { contentOptions, getExportContent, serializeExport, type ExportFormat } from "./export-content";
import { meetingSummaries, summaryView } from "./summaries";
import { SharedMeetingContent } from "./share-content";
import { SHARE_STORAGE_KEY, shareRepository, shareStatus, type MeetingShareLink } from "./share-links";
import { currentShareScope, meetingShareUrl, verifyShareScope } from "./share-browser";
import { marketStorage, scopedKey } from "@/features/markets/storage";
import { isSafeAudioUrl } from "./audio-source";
import { routeMarket } from "@/features/markets/config";
import type { MeetingDetail } from "./types";
import type { Workspace } from "@/features/spaces/model/types";

const formats = [
  { id: "txt", label: "TXT", description: "纯文本格式" },
  { id: "json", label: "JSON", description: "结构化数据格式" },
  { id: "md", label: "MARKDOWN", description: "Markdown 文档" },
  { id: "html", label: "HTML", description: "可在浏览器打开的网页" },
] as const;
const message = (error: unknown) => error instanceof Error ? error.message : "操作失败，请重试";

export function DomesticExportShareDialog({ kind, r, workspace, onClose }: {
  kind: string; r: MeetingDetail; workspace?: Workspace; onClose: () => void;
}) {
  const options = contentOptions(r).flatMap(option => option.kind === "summary" && r.summaries?.length ? meetingSummaries(r).map(summary => ({...option, id: `summary:${summary.id}`, label: `智能总结-${summary.title}`, enabled: !r.deleted && !r.purged && !!summary.text.trim(), record: summaryView(r,summary.id)})) : [{...option, id: option.kind as string, record: r}]);
  const exportContent = (id: string) => {
    const option = options.find(o=>o.id===id);
    if(!option?.enabled)throw Error("所选内容暂不可导出");
    const content = getExportContent(option.record,option.kind);
    return {...content,label:option.label};
  };
  const [page, setPage] = useState(kind === "export" ? "export" : "share");
  const [choice, setChoice] = useState<string>(() => options.find(o => o.kind === "summary" && o.enabled)?.id || options.find(o => o.enabled)?.id || "summary");
  const [format, setFormat] = useState<ExportFormat>("txt");
  const [selected, setSelected] = useState<string[]>(() => options.filter(o => o.enabled).map(o => o.id));
  const [days, setDays] = useState(7);
  const [initialScope] = useState(() => {
    try { return { scope: currentShareScope(), error: "" }; }
    catch (error) { return { scope: { market: routeMarket(), space: "", identity: "" }, error: message(error) }; }
  });
  const scope = initialScope.scope;
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState(initialScope.error);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [records, setRecords] = useState<MeetingShareLink[]>([]);
  const [created, setCreated] = useState<MeetingShareLink | null>(null);
  const [revokeId, setRevokeId] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");
  const available = options.filter(o => o.enabled);
  const selectedAvailable = available.filter(o => selected.includes(o.id));
  const canShare = !workspace && (scope.market === "cn" || scope.market === "global") && scope.space === "personal" && !!scope.identity;
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    const changed = (event: StorageEvent) => {
      if (event.key === null || event.key === scopedKey("eureka:auth:v1", routeMarket())) onClose();
      if (canShare && event.key === scopedKey(SHARE_STORAGE_KEY, routeMarket())) {
        try { verifyShareScope(scope, r.id); setRecords(shareRepository(marketStorage).list(scope, r.id)); }
        catch (error) { setError(message(error)); }
      }
    };
    window.addEventListener("storage", changed);
    return () => { clearInterval(timer); window.removeEventListener("storage", changed); };
  }, [onClose, canShare, scope, r.id]);
  const go = (next: string) => { setPage(next); setError(""); setNotice(""); setFallbackUrl(""); setRevokeId(""); };
  const check = () => {
    if (!canShare) throw Error("团队会议请通过团队共享设置接收人");
    verifyShareScope(scope, r.id);
  };
  const refreshHistory = () => {
    check();
    setRecords(shareRepository(marketStorage).list(scope, r.id));
  };
  const copy = async (record: MeetingShareLink) => {
    setError(""); setNotice("");
    try {
      check();
      shareRepository(marketStorage).access(scope, record.id);
      const url = meetingShareUrl(record.id);
      setFallbackUrl(url);
      try { await navigator.clipboard.writeText(url); setNotice("分享链接已复制"); }
      catch { setNotice("请选中下方链接复制"); }
    } catch (e) { setError(message(e)); }
  };
  const generate = () => {
    if (operation.current) return;
    operation.current = true;
    setError("");
    try {
      check();
      if (!selectedAvailable.length) throw Error("请至少选择一项分享内容");
      const record = shareRepository(marketStorage).create(scope, {
        meetingId: r.id, title: r.title, days,
        contents: selectedAvailable.map(o => exportContent(o.id)),
      }, Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join(""));
      setCreated(record);
      go("share-created");
    } catch (e) { setError(message(e)); }
    finally { operation.current = false; }
  };
  const cancel = <B action="dismiss" onClick={onClose}>取消</B>;
  const back = <B action="share" onClick={() => go("share")}>返回配置</B>;
  let title = "分享配置", subtitle = "", body: ReactNode, footer: ReactNode;
  if (page.startsWith("share") && !canShare) {
    return <MdDialog title="分享配置" onClose={onClose}><p role="alert">{error || "当前会议无法生成分享链接，请使用当前工作区的共享设置。"}</p></MdDialog>;
  }
  if (page === "export") {
    title = "选择导出内容"; subtitle = "请选择您需要导出的内容类型";
    body = options.filter(o => o.kind !== "images").map(o => <label className="md-choice" key={o.id} style={{ opacity: o.enabled ? 1 : .5 }}>
      <input type="radio" name="md-export" value={o.id} checked={choice === o.id} disabled={!o.enabled} onChange={() => setChoice(o.id)} />
      <span><strong>导出{o.label}{o.kind === "summary" ? `-${r.title}` : ""}</strong><small>{o.enabled ? o.kind === "audio" ? "导出会议录音文件" : `导出会议${o.label}内容` : o.reason}</small></span>
    </label>);
    footer = <>{cancel}<B action="export-next" className="md-btn md-primary" disabled={!options.find(o => o.id === choice)?.enabled} onClick={() => { setFormat("txt"); go("formats"); }}>下一步</B></>;
  } else if (page === "formats") {
    title = "选择导出格式"; subtitle = "请选择您需要导出的格式";
    body = choice === "visual" ? <label className="md-choice"><input type="radio" checked readOnly /><span><strong>原始图片</strong><small>保留图文摘要图片的原始格式</small></span></label> : choice === "audio" ? <label className="md-choice"><input type="radio" checked readOnly /><span><strong>原始音频</strong><small>保留原始录音文件格式</small></span></label> : formats.map(f => <label className="md-choice" key={f.id}>
      <input type="radio" name="md-format" value={f.id} checked={format === f.id} onChange={() => setFormat(f.id)} /><span><strong>{f.label}</strong><small>{f.description} · .{f.id} 文件</small></span>
    </label>);
    footer = <><B action="export" disabled={busy} onClick={() => go("export")}>上一步</B><B action="download" className="md-btn md-primary" disabled={busy || !options.find(o => o.id === choice)?.enabled} onClick={async () => {
      if (operation.current) return;
      operation.current = true; setBusy(true); setError("");
      try {
        const content = exportContent(choice);
        if (choice === "visual") {
          const image = content.images?.[0];
          if (!image) throw Error("暂无图文摘要图片");
          const response = await fetch(image.url, { credentials: "omit", referrerPolicy: "no-referrer" });
          if (!response.ok) throw Error("图文摘要图片下载失败，请重试");
          const blob = await response.blob();
          const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/bmp": "bmp" } as Record<string, string>)[blob.type.split(";")[0]];
          if (!extension) throw Error("图片格式无法确认，请重试");
          if (routeMarket() !== scope.market || currentShareScope().space !== scope.space || currentShareScope().identity !== scope.identity) throw Error("账号或工作区已变更，请重新导出");
          download(blob, extension, image.name, blob.type);
        } else if (choice === "audio") {
          if (!isSafeAudioUrl(content.audioUrl)) throw Error("暂无可用的原始音频");
          const response = await fetch(content.audioUrl, { credentials: "omit", referrerPolicy: "no-referrer" });
          if (!response.ok) throw Error("下载失败，请稍后重试");
          const bytes = await response.arrayBuffer();
          const signature = new TextDecoder("ascii").decode(bytes.slice(0, 12));
          const wav = signature.startsWith("RIFF") && signature.slice(8, 12) === "WAVE";
          const mime = response.headers.get("content-type")?.split(";")[0].toLowerCase() || "";
          const extension = wav ? "wav" : ({ "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/ogg": "ogg", "audio/webm": "webm", "audio/flac": "flac", "audio/x-flac": "flac", "audio/amr": "amr" } as Record<string, string>)[mime];
          if (!bytes.byteLength || !extension) throw Error("音频格式无法确认，请稍后重试");
          if (routeMarket() !== scope.market || currentShareScope().space !== scope.space || currentShareScope().identity !== scope.identity) throw Error("账号或工作区已变更，请重新导出");
          const audioMime = wav ? "audio/wav" : mime;
          download(new Blob([bytes], { type: audioMime }), extension, `${r.title}-音频`, audioMime);
        } else {
          const file = serializeExport(r.title, exportContent(choice), format);
          download(file.body, file.extension, `${r.title}-${options.find(o => o.id === choice)?.label}`, file.mime);
        }
        onClose();
      } catch (e) { setError(message(e)); }
      finally { operation.current = false; setBusy(false); }
    }}>{busy ? "下载中…" : "下载"}</B></>;
  } else if (page === "share-preview") {
    title = "分享内容预览"; subtitle = "尚未发布";
    body = <SharedMeetingContent title={r.title} contents={selectedAvailable.map(o => exportContent(o.id))} />;
    footer = <>{back}<B action="share-create" className="md-btn md-primary" disabled={!selectedAvailable.length} onClick={generate}>生成分享链接</B></>;
  } else if (page === "share-created" && created) {
    title = "分享链接已生成";
    body = <><label className="md-field"><span>分享链接</span><input aria-label="分享链接" readOnly value={meetingShareUrl(created.id)} onFocus={e => e.currentTarget.select()} /></label><p>{created.expiresAt ? `有效期至：${new Date(created.expiresAt).toLocaleString("zh-CN")}` : "永久有效"}</p><p>{created.contents.map(c => c.label).join("、")}</p></>;
    footer = <>{back}<B action="share-open" onClick={() => {
      try { check(); shareRepository(marketStorage).access(scope, created.id); window.open(meetingShareUrl(created.id), "_blank", "noopener,noreferrer"); }
      catch (e) { setError(message(e)); }
    }}>查看分享</B><B action="share-copy" className="md-btn md-primary" onClick={() => void copy(created)}>复制链接</B></>;
  } else if (page === "share-history") {
    title = "分享记录";
    body = records.length ? records.map(record => {
      const status = shareStatus(record, now);
      return <section key={record.id} style={{ border: "1px solid var(--market-border)", borderRadius: 8, padding: 16, marginBottom: 12 }}>
        <div className="md-inline"><strong>{record.contents.map(c => c.label).join("、")}</strong><span>{status}</span></div>
        <p>创建于：{new Date(record.createdAt).toLocaleString("zh-CN")}</p><p>{record.expiresAt ? `有效期至：${new Date(record.expiresAt).toLocaleString("zh-CN")}` : "永久有效"}</p>
        {revokeId === record.id ? <div role="group" aria-label="确认使分享链接失效"><p>确认使此分享链接失效？失效后无法继续访问。</p><B onClick={() => setRevokeId("")}>取消</B><B action="share-revoke-confirm" onClick={() => {
          try { check(); shareRepository(marketStorage).revoke(scope, record.id, r.id); refreshHistory(); setRevokeId(""); setNotice("分享链接已失效"); }
          catch (e) { setError(message(e)); }
        }}>确认失效</B></div> : <div className="md-pills"><B action="share-copy" disabled={status !== "生效中"} onClick={() => void copy(record)}>复制链接</B><B action="share-revoke" disabled={status !== "生效中"} onClick={() => setRevokeId(record.id)}>手动失效</B></div>}
      </section>;
    }) : <div className="md-empty" style={{ minHeight: 160 }}><h2>暂无分享记录</h2></div>;
    footer = <>{back}<B onClick={() => { try { refreshHistory(); setError(""); } catch (e) { setError(message(e)); } }}>刷新记录</B></>;
  } else {
    body = <>
      <label className="md-field"><span>分享类型</span><input readOnly value="链接分享" /></label>
      <div className="md-inline"><strong>分享内容</strong><label><input id="md-share-all" type="checkbox" checked={available.length > 0 && selectedAvailable.length === available.length} disabled={!available.length} onChange={e => setSelected(e.target.checked ? available.map(o => o.id) : [])} />全选</label></div>
      <p style={{ color: "#666" }}>仅已选择的内容可供访问者查看</p>
      <div className="md-pills">{options.map(o => <B key={o.id} action="share-type" className="" disabled={!o.enabled} aria-pressed={selectedAvailable.some(s => s.id === o.id)} title={o.enabled ? o.label : o.reason} onClick={() => setSelected(current => current.includes(o.id) ? current.filter(k => k !== o.id) : [...current, o.id])}>{o.label}{!o.enabled ? `（${o.reason}）` : ""}</B>)}</div>
      <strong>有效期设置</strong><div className="md-pills">{[3, 7, 30, 0].map(n => <B key={n} action="share-days" className="" aria-pressed={days === n} onClick={() => setDays(n)}>{n ? `${n}天` : "永久"}</B>)}</div>
      <p id="md-share-expiry" style={{ color: "#666" }}>{days ? `有效期至：${new Date(now + days * 86400000).toLocaleString("zh-CN")}` : "链接永久有效"}</p>
    </>;
    footer = <><B action="share-history" className="md-link" onClick={() => { try { refreshHistory(); go("share-history"); } catch (e) { setError(message(e)); } }}>查看分享记录</B><B action="share-preview" disabled={!selectedAvailable.length} onClick={() => { try { check(); go("share-preview"); } catch (e) { setError(message(e)); } }}>预览分享内容</B><B action="share-create" className="md-btn md-primary" disabled={!selectedAvailable.length} onClick={generate}>生成分享链接</B></>;
  }
  return <MdDialog title={title} subtitle={subtitle} onClose={onClose} footer={footer}>
    {body}
    {fallbackUrl ? <label className="md-field"><span>复制链接</span><input readOnly value={fallbackUrl} aria-label="复制链接" onFocus={e => e.currentTarget.select()} /></label> : null}
    {error ? <p role="alert">{error}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
  </MdDialog>;
}
