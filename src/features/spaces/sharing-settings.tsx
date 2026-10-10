"use client";
import "./sharing-settings.css";
import { appUrl } from "@/lib/routes";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { M } from "./model/store";
import type { Workspace } from "./model/types";
import type { SpacesController } from "./use-spaces";
import { ManagementDialog as Dialog, ManagementButton as Button } from "./management-ui";
export function RecipientDialog({ w, actor, owner = actor, initial = [], title = "共享与权限", onSave, onClose }: { w: Workspace; actor: string; owner?: string; initial?: string[]; initialEditors?: string[]; title?: string; future?: boolean; onSave: (users: string[], editors: string[]) => void; onClose: () => void }) {
  const [users, setUsers] = useState(initial.filter(id => M.member(w, id) && id !== owner && !M.admin(w, id)));
  return <Dialog title={title} form="recipients" onClose={onClose} onSubmit={() => onSave(users, [])} footer={<><Button onClick={onClose}>取消</Button><button type="submit" className="ws-btn primary">保存授权</button></>}>
    <p>仅共享这一条内容。选中的普通成员只有只读权限，取消勾选立即撤回访问。</p>
    <p className="ws-muted">所属成员保留维护权限；团队管理员默认可编辑和管理，无需邀请。</p>
    {w.members.filter(m => m.status === "active" && m.id !== owner).map(m => <div key={m.id} className="ws-recipient-row"><label className="ws-recipient-option"><input type="checkbox" disabled={m.role === "admin"} checked={m.role === "admin" || users.includes(m.id)} onChange={e => setUsers(e.target.checked ? [...users, m.id] : users.filter(id => id !== m.id))} />{m.name}</label><span>{m.role === "admin" ? "可编辑 + 管理（默认）" : "只读"}</span></div>)}
  </Dialog>;
}
function SharingHelp({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <span ref={root} className="ws-sharing-help" onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="ws-sharing-help-trigger" aria-label={`${title}说明`} aria-expanded={open} aria-controls={id} aria-haspopup="dialog" onClick={() => setOpen(value => !value)}>
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" /><path d="M10 9v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><circle cx="10" cy="6.4" r=".9" fill="currentColor" /></svg>
    </button>
    <span id={id} role="dialog" aria-label={`${title}说明`} className="ws-sharing-help-panel" hidden={!open}>
      <span className="ws-sharing-help-panel-title">{title}<button type="button" aria-label="关闭说明" onClick={() => { setOpen(false); trigger.current?.focus(); }}>×</button></span>
      {children}
    </span>
  </span>;
}
export function ContentSharingSettings({ controller, actor, space }: { controller: SpacesController; actor: string; space: string }) {
  const w = M.get(controller.state!, space);
  return <section className="ws-surface ws-sharing-settings" aria-label="内容权限">
    <div className="ws-sharing-heading ws-sharing-heading-main"><h2>内容权限</h2><SharingHelp title="内容权限"><span>共享在单条会议或单个通讯录联系人上设置，普通成员仅可查看获授权内容。撤回立即生效，不影响其他记录。</span><span>团队管理员默认可查看、编辑和管理本区全部内容，包含闪念、日程、待办、灵感和记账；个人工作区保持独立。</span></SharingHelp></div>
    <div className="ws-section-head"><div><h3>团队管理员</h3><p className="ws-muted">本区全部内容</p></div><span className="ws-badge">可编辑 + 管理 · 默认</span></div>
    <div className="ws-section-head"><div><h3>单条会议</h3><p className="ws-muted">在会议详情选择只读接收成员</p></div><a className="ws-btn" href={appUrl("home", "", space, actor)}>管理会议 ↗</a></div>
    <div className="ws-section-head"><div><h3>单个联系人</h3><p className="ws-muted">在联系人详情选择只读接收成员</p></div><a className="ws-btn" href={appUrl("contacts", "", space, actor)}>打开通讯录 ↗</a></div>
    {w.status !== "active" && <p className="ws-info">工作区处于只读模式，管理员和成员均不能修改内容或授权。</p>}
  </section>;
}
