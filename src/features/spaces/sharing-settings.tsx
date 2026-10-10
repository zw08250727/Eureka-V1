"use client";
import "./sharing-settings.css";
import { useState } from "react";
import { M } from "./model/store";
import type { Workspace } from "./model/types";
import { ManagementDialog as Dialog, ManagementButton as Button } from "./management-ui";
export function RecipientDialog({ w, actor, owner = actor, initial = [], title = "共享与权限", onSave, onClose }: { w: Workspace; actor: string; owner?: string; initial?: string[]; initialEditors?: string[]; title?: string; future?: boolean; onSave: (users: string[], editors: string[]) => void; onClose: () => void }) {
  const [users, setUsers] = useState(initial.filter(id => M.member(w, id) && id !== owner && !M.admin(w, id)));
  return <Dialog title={title} form="recipients" onClose={onClose} onSubmit={() => onSave(users, [])} footer={<><Button onClick={onClose}>取消</Button><button type="submit" className="ws-btn primary">保存授权</button></>}>
    <p>仅共享这一条内容。选中的普通成员只有只读权限，取消勾选立即撤回访问。</p>
    <p className="ws-muted">所属成员保留维护权限；团队管理员默认可编辑和管理，无需邀请。</p>
    {w.members.filter(m => m.status === "active" && m.id !== owner).map(m => <div key={m.id} className="ws-recipient-row"><label className="ws-recipient-option"><input type="checkbox" disabled={m.role === "admin"} checked={m.role === "admin" || users.includes(m.id)} onChange={e => setUsers(e.target.checked ? [...users, m.id] : users.filter(id => id !== m.id))} />{m.name}</label><span>{m.role === "admin" ? "可编辑 + 管理（默认）" : "只读"}</span></div>)}
  </Dialog>;
}
