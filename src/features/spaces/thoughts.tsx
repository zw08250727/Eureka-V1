"use client";
import { useState } from "react";
import { M } from "./model/store";
import type { SpacesController } from "./use-spaces";
import { RecipientDialog } from "./sharing-settings";
import { ManagementRoot, ManagementHeading, ManagementButton as Button, ManagementDialog as Dialog } from "./management-ui";
export function TeamThoughtsPage({ controller, space, actor }: { controller: SpacesController; space: string; actor: string }) {
  const w = M.get(controller.state!, space), thoughts = M.visibleThoughts(w, actor), readonly = w.status !== "active";
  const [editing, setEditing] = useState<string | null>(null), [sharing, setSharing] = useState<string | null>(null);
  const selected = thoughts.find(t => t.id === editing), shared = thoughts.find(t => t.id === sharing);
  return <ManagementRoot w={w} actor={actor}><ManagementHeading w={w} actor={actor} title="我的闪念与获邀内容" subtitle="在当前工作区创建的闪念默认私有。只有您邀请的成员可以查看，管理员也需获邀。" actions={<Button disabled={readonly} onClick={() => setEditing("new")}>新建闪念</Button>} />
    <section className="ws-surface" style={{ padding: 24 }}>
      {!thoughts.length && <p className="ws-muted">暂无闪念，记录你的第一个想法。</p>}
      {thoughts.map(t => <article key={t.id} style={{ padding: "20px 0", borderBottom: "1px solid var(--border, #eee)" }}><h3>{t.title}</h3><p style={{ whiteSpace: "pre-wrap" }}>{t.detail}</p><p className="ws-muted">{t.owner === actor ? (t.shared?.length ? `已邀请 ${t.shared.length} 位成员` : "仅自己可见") : `共享给我 · ${M.canEdit(w, t, actor) ? "可编辑" : "仅查看"}`} · {t.date}</p>{!readonly && <div className="ws-actions">{M.canEdit(w, t, actor) && <Button onClick={() => setEditing(t.id)}>编辑</Button>}{t.owner === actor && <Button onClick={() => setSharing(t.id)}>共享与权限</Button>}</div>}</article>)}
    </section>
    {editing !== null && (editing === "new" || selected) && <Dialog title={selected ? "编辑闪念" : "新建闪念"} form="thought" onClose={() => setEditing(null)} onSubmit={data => { controller.change(s => { const workspace = M.get(s, space), input = { title: String(data.get("title")), detail: String(data.get("detail")) }; if (selected) M.editThought(workspace, selected.id, input, actor); else M.addThought(workspace, input, actor); }); setEditing(null); }} footer={<button className="ws-btn primary" type="submit">保存闪念</button>}><label className="ws-field">标题<input name="title" required maxLength={200} defaultValue={selected?.title} /></label><label className="ws-field">内容<textarea name="detail" maxLength={5000} rows={6} defaultValue={selected?.detail} /></label><p className="ws-muted">新闪念遵循当前工作区的本人内容权限，历史内容可单独邀请或撤销。</p></Dialog>}
    {shared && <RecipientDialog w={w} actor={actor} initial={shared.shared} initialEditors={shared.editors} onClose={() => setSharing(null)} onSave={(users, editors) => { controller.change(s => M.shareThought(M.get(s, space), shared.id, users, actor, editors)); setSharing(null); }} />}
  </ManagementRoot>;
}
