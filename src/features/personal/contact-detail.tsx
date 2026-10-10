import type { ReactNode } from "react";
import type { Contact, ContactsState } from "./store";
import type { CustomerTodo } from "./customer-todos";
import { appUrl } from "@/lib/routes";
import { keywordRule, meetingKeywords, profileDimensions, useCustomerMeetings, type CustomerMeeting } from "./contact-insights";

export function ContactTag({ children }: { children: string }) {
  return <span className="contacts-tag">{children}</span>;
}
export function ContactCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="contacts-card"><h2>{title}</h2>{children}</section>;
}
export function ContactLine({ title, children }: { title: ReactNode; children: ReactNode }) {
  return <div className="contacts-line"><strong>{title}</strong><small>{children}</small></div>;
}
function Followups({ meetings, space, actor }: { meetings: CustomerMeeting[]; space: string; actor: string }) {
  if (!meetings.length) return <p className="contacts-muted">暂无会议跟进记录</p>;
  return <div className="customer-followups">{meetings.map((m) => <a className="customer-meeting" key={m.id} href={appUrl("meeting", m.id, space, actor)}>
    <time>{m.occurredAt.slice(0, 10)}</time><strong>{m.title}<span aria-hidden="true"> ↗</span></strong>
    <p>{(m.summary.match(/[^。！？.!?]+[。！？.!?]?/g) || [m.summary]).slice(0, 3).join("")}</p>
    <small>查看会议详情</small>
  </a>)}</div>;
}
export function ContactDetail({ person, tab, notes, space, actor, readonly = false, onEditNote, onDeleteNote, onToggleTodo }: {
  person: Contact; tab: string; notes: ContactsState["notes"][string]; space: string; actor: string;
  readonly?: boolean;
  onEditNote: (index: number) => void; onDeleteNote: (index: number) => void;
  onToggleTodo: (meetingId: string, index: number, todo: CustomerTodo) => void;
}) {
  const meetings = useCustomerMeetings(person, actor, space);
  const keywords = meetingKeywords(meetings);
  if (tab === "概览") return <div className="contacts-detail-grid">
    <div className="contacts-wide"><ContactCard title="客户简介"><p>{person.summary || "暂无客户简介"}</p></ContactCard></div>
    <ContactCard title="客户档案"><dl className="contacts-facts">
      <dt>主体类型</dt><dd>{person.subjectType === "enterprise" ? "企业" : "自然人"}</dd>
      <dt>{person.subjectType === "enterprise" ? "企业" : "所属公司"}</dt><dd>{person.company || "待补充"}</dd>
      <dt>{person.subjectType === "enterprise" ? "行业" : "职务"}</dt><dd>{person.role || "待补充"}</dd>
      <dt>手机</dt><dd>{person.phone || "待补充"}</dd><dt>地区</dt><dd>{person.region || "待补充"}</dd><dt>邮箱</dt><dd>{person.email || "待补充"}</dd>
    </dl></ContactCard>
    <ContactCard title="关键主题"><div className="customer-keywords">{keywords.length ? keywords.map((k) => <span key={k.word} className="contacts-tag">{k.word}<small>{k.count} 场会议</small></span>) : <p className="contacts-muted">暂无会议关键词</p>}</div><details className="customer-rule"><summary>关键词如何生成</summary><p>{keywordRule}</p></details></ContactCard>
    <div className="contacts-wide"><ContactCard title="跟进记录"><Followups meetings={meetings} space={space} actor={actor} /></ContactCard></div>
  </div>;
  if (tab === "时间线") return <ContactCard title="跟进记录"><p className="contacts-muted">按会议时间倒序排列，点击记录回到会议详情。</p><Followups meetings={meetings} space={space} actor={actor} /></ContactCard>;
  if (tab === "承诺") return <>
    <p className="contacts-muted customer-todo-hint">Agent 从会议中提取双方待办，点击勾选完成，再次点击可恢复。</p>
    <div className="contacts-detail-grid">{(["theirs", "mine"] as const).map((side) => <ContactCard key={side} title={side === "mine" ? "我的待办" : "客户的待办"}>
      {meetings.some((m) => m.todos?.some((t) => t.side === side)) ? meetings.flatMap((m) => (m.todos || []).map((t, i) => t.side !== side ? null : <div className={`contacts-line customer-todo${t.completed ? " is-done" : ""}`} key={`${m.id}:${i}`}>
        <button type="button" className="customer-todo-toggle" aria-pressed={!!t.completed} disabled={readonly}
          aria-label={`完成状态：${t.title}`} onClick={() => onToggleTodo(m.id, i, t)}>
          <span className="customer-todo-check" aria-hidden="true">{t.completed ? "✓" : ""}</span>
          <span className="customer-todo-title">{t.title}</span>
        </button>
        <small><time>{t.due || "时间未约定"}</time><a className="customer-source" href={appUrl("meeting", m.id, space, actor)}>来源：{m.title} ↗</a></small>
      </div>)) : <p className="contacts-muted">暂无会议提取的待办</p>}
    </ContactCard>)}</div>
  </>;
  return <>
    <ContactCard title="客户画像"><p className="contacts-muted">从多次会议中整理业务信息；每项保留来源，缺少依据时待补充。{meetings.length ? `最近会议：${meetings[0].occurredAt.slice(0, 10)}` : ""}</p>
      <div className="customer-profile-grid">{profileDimensions.map((dimension) => {
        const source = meetings.find((m) => m.profile?.[dimension]);
        return <section key={dimension}><h3>{dimension}</h3><p>{source?.profile?.[dimension] || "待补充，暂无会议依据"}</p>{source && <a className="customer-source" href={appUrl("meeting", source.id, space, actor)}>{source.title} · {source.occurredAt.slice(0, 10)} ↗</a>}</section>;
      })}</div>
    </ContactCard>
    <ContactCard title={person.ownerId && person.ownerId !== actor ? "所属成员备注" : "我的备注"}>{notes.length ? notes.map((note, index) => <ContactLine key={index} title={note.text}>{note.time}<span className="customer-note-actions"><button type="button" disabled={readonly} className="contacts-button" onClick={() => onEditNote(index)}>编辑备注</button><button type="button" disabled={readonly} className="contacts-button" onClick={() => onDeleteNote(index)}>删除备注</button></span></ContactLine>) : <p className="contacts-muted">暂无备注</p>}</ContactCard>
  </>;
}
