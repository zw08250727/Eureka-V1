"use client";

import { useState } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import { AiIcon } from "@/components/ui/ai-icon";
import { routeMarket } from "@/features/markets/config";
import { DomesticInlineEditor } from "./domestic-inline-editor";
import type { MeetingDetail } from "./types";
import styles from "./document-editor.module.css";

/** Full-page editing surface, backed by the existing sanitized, undoable editor.
 * The draft remains owned by detail.tsx; opening/closing this surface cannot save it.
 */
export function MeetingDocumentEditor({ html, title, meeting, onDraft, onExit, onSave }: {
  html: string; title: string; meeting: MeetingDetail; team?: boolean;
  onDraft: (html: string) => void; onExit: () => void;
  onSave: (text: string, html: string, title?: string) => void;
}) {
  const [name, setName] = useState(title), [assistant, setAssistant] = useState(true);
  const [prompt, setPrompt] = useState(""), [selection, setSelection] = useState(""), [error, setError] = useState("");
  return <ReferenceDialog className={styles.surface} label="文档编辑" onClose={onExit}>
    <header className={styles.header}>
      <div><strong>{title}</strong><p>选中文字可调整格式或添加到 Ask AI · Ctrl / ⌘ + Z 撤销</p></div>
      <button className="md-btn" aria-expanded={assistant} onClick={()=>setAssistant(!assistant)}><AiIcon size={16}/> Ask AI</button>
    </header>
    <div className={styles.layout} data-assistant={assistant}>
      <section className={styles.document} aria-label="编辑文档" onMouseUp={()=>{const text=window.getSelection()?.toString().trim();if(text)setSelection(text);}}>
        <input className={styles.title} aria-label="文档标题" maxLength={100} value={name} onChange={event=>setName(event.target.value)}/>
        <DomesticInlineEditor html={html} onDraft={onDraft} onExit={onExit} onSave={(text,rich)=>{if(!name.trim())throw Error("请填写文档标题");onSave(text,rich,name.trim());}}/>
      </section>
      {assistant && <aside className={styles.assistant} aria-label="AI 写作助手">
        <header><strong><AiIcon size={20}/>{routeMarket()==="cn" ? "百智 AI 写作助手" : "EurekaMind AI 写作助手"}</strong><button className="md-btn" aria-label="收起 AI 写作助手" onClick={()=>setAssistant(false)}>×</button></header>
        <div className={styles.intro}><h2>一起完善这份文档</h2><p>可围绕会议内容提问，或选中文字提出润色、扩写、翻译要求。</p></div>
        <form onSubmit={event=>{event.preventDefault();setError("AI 写作服务尚未连接，输入已保留。你仍可编辑并保存正文。");}}>
          <span className={styles.attachment} title={meeting.title}>{meeting.title}.md</span>
          {selection && <div className={styles.selection}><span>已选文字：{selection}</span><button type="button" aria-label="移除选中文字" onClick={()=>setSelection("")}>×</button></div>}
          <textarea aria-label="AI 写作要求" placeholder="输入你的写作要求…" value={prompt} onChange={event=>{setPrompt(event.target.value);setError("");}}/>
          <button className="md-btn md-primary" disabled={!prompt.trim()}>发送</button>
          {error && <p role="status">{error}</p>}
        </form>
        <small>AI 生成内容仅供参考，请核对后使用。</small>
      </aside>}
    </div>
  </ReferenceDialog>;
}
