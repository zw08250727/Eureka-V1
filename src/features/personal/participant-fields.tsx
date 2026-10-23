"use client";
import { useId, useState } from "react";
import { Select } from "@/components/ui/select";
import { ReferenceDialog } from "@/features/reference/dialog";
import type { Member } from "@/features/spaces/model/types";
import type { ActionRecord } from "@/features/workbench/model/types";
import styles from "./calendar-participants.module.css";

const namesIn = (text: string) => text.split(/[、，,;；\n]/).map(n => n.trim()).filter(Boolean);
export function ScheduleParticipants({ record, members, team, actor }: {record:ActionRecord;members:Member[];team:boolean;actor:string}) {
  const id = useId();
  const [text,setText] = useState(record.participants);
  const [selected,setSelected] = useState(record.participantIds || []);
  const choose = (member: Member) => {
    setSelected(ids => ids.includes(member.id) ? ids : [...ids,member.id]);
    setText(current => namesIn(current).includes(member.name) ? current : [...namesIn(current),member.name].join("、"));
  };
  return <div className="pa-field">
    <label htmlFor={id}>参与人</label>
    <input id={id} name="participants" value={text} maxLength={300} placeholder="手动填写姓名，用顿号分隔" onChange={e => {
      const value=e.target.value;setText(value);
      setSelected(ids => ids.filter(key => {const member=members.find(m=>m.id===key);return !member || namesIn(value).includes(member.name);}));
    }}/>
    {team && <>
      <Select aria-label="选择团队参与人" value="" onChange={e => {const member=members.find(m=>m.id===e.target.value);if(member)choose(member);}}>
        <option value="">选择团队成员</option>
        {members.map(m=><option key={m.id} value={m.id} disabled={selected.includes(m.id)}>{m.name}{m.id===actor?"（我）":""}</option>)}
      </Select>
      {!!selected.length && <div className={styles.chips} aria-label="已选团队参与人">{selected.map(key => {
        const member=members.find(m=>m.id===key);
        return <span key={key} className={styles.chip}>{member?.name || "已离开的成员"}
          <input type="hidden" name="participantIds" value={key}/>
          <button type="button" aria-label={`移除参与人 ${member?.name || "已离开的成员"}`} onClick={()=>{
            setSelected(ids=>ids.filter(id=>id!==key));
            if(member&&!selected.some(id=>id!==key&&members.find(m=>m.id===id)?.name===member.name))
              setText(current=>namesIn(current).filter(n=>n!==member.name).join("、"));
          }}>×</button>
        </span>;
      })}</div>}
      <small>选择成员不会自动共享；手动填写的姓名不产生访问权限。</small>
    </>}
  </div>;
}
/** Confirm newly granted and removed access in one save, while allowing either decision to be kept. */
export function ParticipantShareConfirm({members,revokeMembers=[],onClose,onSave}: {members:Member[];revokeMembers?:Member[];onClose:()=>void;onSave:(share:boolean,revoke:boolean)=>void}) {
  const [error,setError]=useState("");
  const [share,setShare]=useState(true),[revoke,setRevoke]=useState(true);
  const save=()=>{try{onSave(share,revoke);}catch(error){setError((error as Error).message);}};
  const title=members.length&&revokeMembers.length?"确认参会人与共享变更":members.length?"是否共享给参会人？":"是否撤销参会人共享？";
  return <ReferenceDialog className={`th-dialog ${styles.confirm}`} label={title} onClose={onClose}>
    <h2>{title}</h2>
    {!!members.length&&<label className={styles.choice}><input type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)}/><span>将此日程共享给新增参会人：{members.map(m=>m.name).join("、")}</span></label>}
    {!!revokeMembers.length&&<label className={styles.choice}><input type="checkbox" checked={revoke} onChange={e=>setRevoke(e.target.checked)}/><span>同时撤销已移除参会人的访问权限：{revokeMembers.map(m=>m.name).join("、")}</span></label>}
    <p>共享后仅可查看日程，不授予编辑或转共享权限。</p>
    {error&&<p role="alert" className="th-error">{error}</p>}
    <footer>
      <button type="button" className="th-btn" data-autofocus onClick={onClose}>返回编辑</button>
      <button type="button" className="th-btn primary" onClick={save}>保存变更</button>
    </footer>
  </ReferenceDialog>;
}
