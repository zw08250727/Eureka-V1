"use client";
import "./sharing-settings.css";
import { useState } from "react";
import { M } from "./model/store";
import type { Workspace } from "./model/types";
import type { SpacesController } from "./use-spaces";
import { ManagementDialog as Dialog, ManagementButton as Button } from "./management-ui";
export function RecipientDialog({ w, actor, initial = [], initialEditors = [], title = "共享与权限", future = false, onSave, onClose }: { w: Workspace; actor: string; initial?: string[]; initialEditors?: string[]; title?: string; future?: boolean; onSave: (users: string[], editors: string[]) => void; onClose: () => void }) {
  const [users, setUsers] = useState(initial.filter(id => M.member(w, id) && id !== actor));
  const [editors, setEditors] = useState(initialEditors);
  return <Dialog title={title} form="recipients" onClose={onClose} onSubmit={() => onSave(users, editors.filter(id => users.includes(id)))} footer={<><Button onClick={onClose}>取消</Button><button type="submit" className="ws-btn primary">保存授权</button></>}>
    <p>{future ? "设置当前工作区后续内容的接收成员与权限，不补发或修改历史授权。" : "仅向当前工作区选中的成员开放，取消勾选即可撤销访问。"} 管理员也需获邀。</p>
    <p className="ws-muted">查看：阅读内容。编辑：查看并修改内容。删除和管理共享仍仅限所有者。</p>
    {w.members.filter(m => m.status === "active" && m.id !== actor).map(m => <div key={m.id} className="ws-recipient-row"><label className="ws-recipient-option"><input type="checkbox" checked={users.includes(m.id)} onChange={e => { setUsers(e.target.checked ? [...users, m.id] : users.filter(id => id !== m.id)); if (!e.target.checked) setEditors(editors.filter(id => id !== m.id)); }} />{m.name} · {m.role === "admin" ? "管理员" : "成员"}</label><select aria-label={`${m.name}的内容权限`} disabled={!users.includes(m.id)} value={editors.includes(m.id) ? "edit" : "view"} onChange={e => setEditors(e.target.value === "edit" ? [...editors, m.id] : editors.filter(id => id !== m.id))}><option value="view">查看</option><option value="edit">编辑</option></select></div>)}
  </Dialog>;
}
export function ContentSharingSettings({ controller, actor, space }: { controller: SpacesController; actor: string; space: string }) {
  const w = M.get(controller.state!, space), prefs = M.contentPreferences(w, actor), readonly = w.status !== "active";
  const [editing, setEditing] = useState<"meetings" | null>(null), [error, setError] = useState("");
  return <section className="ws-surface ws-sharing-settings" aria-label="我的内容权限">
    <h2>我的内容权限</h2><p className="ws-muted">仅设置「{w.name}」内您的内容向哪些成员开放查看或编辑。此设置不改变设备绑定或录音归属，管理员不能代您授权。</p>
    {(["meetings"] as const).map(kind => {
      const policy = prefs[kind], enabled = !!policy?.enabled;
      return <div key={kind} className="ws-section-head"><div><h3>会议信息共享给团队</h3><p className="ws-muted">适用于设备录音、软件录音、上传音频及其转录和笔记。</p><p className="ws-muted">{enabled ? `后续内容共享给：${(policy?.users || []).map(id => `${w.members.find(m => m.id === id)?.name || id}（${policy?.editors?.includes(id) ? "编辑" : "查看"}）`).filter(Boolean).join("、")}` : "已关闭 · 后续内容仅自己可见"}</p></div><div className="ws-actions"><button disabled={readonly} className="ws-sharing-switch" role="switch" aria-checked={enabled} aria-label="会议信息共享给团队" onClick={() => { if (!enabled) setEditing(kind); else try { controller.change(s => M.setDeviceSharing(s, space, actor, kind, false, [], actor)); setError(""); } catch (e) { setError((e as Error).message); } }}>{enabled ? "已开启" : "已关闭"}</button>{enabled && <Button disabled={readonly} onClick={() => setEditing(kind)}>管理接收成员</Button>}</div></div>;
    })}
    <div className="ws-section-head"><div><h3>我的客户共享给团队</h3><p className="ws-muted">开启后，当前团队的所有成员可查看您在此工作区创建的全部客户，包含已有和后续客户。客户仅由所属成员维护，不跨成员归一或去重。</p><p className="ws-muted">{w.customerSharing?.[actor] ? "已开启 · 当前团队成员可查看我的客户" : "已关闭 · 我的客户仅自己可见"}；始终可查看其他成员已共享的客户。</p></div><button disabled={readonly} className="ws-sharing-switch" role="switch" aria-label="我的客户共享给团队" aria-checked={!!w.customerSharing?.[actor]} onClick={() => { try { controller.change(s => M.setCustomerSharing(s, space, !w.customerSharing?.[actor], actor)); setError(""); } catch (e) { setError((e as Error).message); } }}>{w.customerSharing?.[actor] ? "已开启" : "已关闭"}</button></div>
    <p className="ws-muted">关闭客户共享立即收回他人的客户查看权限，不删除客户，不影响您查看其他成员共享的客户。客户始终保留在创建时的工作区，关联会议仍按会议权限访问。</p>
    <p className="ws-muted">会议共享默认关闭；开启前选择接收成员，不补发历史内容。关闭后停止后续共享，历史文件可在详情单独撤销授权；新成员不会自动获得权限。</p>
    {readonly && <p className="ws-info">当前工作区只读，内容权限设置暂停修改。已有授权保留，设备新同步的原始音频仅本人可见。</p>}
    {error && <p role="alert">{error}</p>}
    {editing && <RecipientDialog future w={w} actor={actor} title="选择后续内容的接收成员" initial={prefs[editing]?.users} initialEditors={prefs[editing]?.editors} onClose={() => setEditing(null)} onSave={(users, editors) => { controller.change(s => M.setDeviceSharing(s, space, actor, editing, true, users, actor, editors)); setEditing(null); }} />}
  </section>;
}
