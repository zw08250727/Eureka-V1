"use client";
import { useState } from "react";
import type { Contact } from "@/features/personal/store";
import type { SpacesController } from "./use-spaces";
import { M } from "./model/store";
import { RecipientDialog } from "./sharing-settings";
import { appUrl } from "@/lib/routes";
export function ContactSharing({ controller, space, actor, person }: { controller: SpacesController; space: string; actor: string; person?: Contact }) {
  const [open, setOpen] = useState(false);
  const w = M.get(controller.state!, space);
  const snapshots = M.visible(w, actor).filter(f => f.source === "联系人");
  const existing = person && snapshots.find(f => f.owner === actor && f.sourceRecordId === person.id);
  return <>
    {person ? <button disabled={w.status !== "active"} className="contacts-button" type="button" onClick={() => setOpen(true)}>共享联系人快照</button> : snapshots.length > 0 && <section className="contacts-card" style={{ padding: 20 }} aria-label="联系人共享快照"><h3>联系人共享快照</h3><p>邀请查看不会合并或改写任何成员的客户档案。</p>{snapshots.map(f => <p key={f.id}><a href={appUrl("meeting", f.id, space, actor)}>{f.title}</a> · {f.owner === actor ? "我共享的" : `共享给我 · ${M.canEdit(w, f, actor) ? "可编辑快照" : "仅查看"}`}</p>)}</section>}
    {open && person && <RecipientDialog w={w} actor={actor} initial={existing?.shared} initialEditors={existing?.editors} title="联系人快照共享权限" onClose={() => setOpen(false)} onSave={(users, editors) => { controller.change(s => {
      const current = M.get(s, space);
      const previous = current.files.find(f => !f.deleted && f.source === "联系人" && f.sourceRecordId === person.id && f.owner === actor);
      const summary = `${person.name}\n公司：${person.company}\n职位：${person.role}\n邮箱：${person.email}\n地区：${person.region}\n\n${person.summary}\n\n由本人主动共享的资料快照；不会合并或写入接收成员的客户档案。`;
      const file = previous ? M.edit(current, previous.id, { summary, title: person.name + " · 联系人快照" }, actor) : M.addFile(current, { title: person.name + " · 联系人快照", source: "联系人", transcript: "", summary }, actor);
      file.sourceRecordId = person.id;
      M.share(current, file.id, users, actor, editors);
    }); setOpen(false); }} />}
  </>;
}
