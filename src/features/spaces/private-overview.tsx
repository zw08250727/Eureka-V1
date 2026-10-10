import { useLivePersonal } from "@/features/personal/calendar-dialogs";
import { money, scheduleTime } from "@/features/personal/asset-rules";
import { todayRecords } from "@/features/workbench/model/selectors";
import { appUrl } from "@/lib/routes";
import type { ActionRecord } from "@/features/workbench/model/types";
import { useState } from "react";

/** Same private asset stores and date rules as Personal; never feed the team brief. */
export function PrivateOverview({ space, actor, now, readOnly }: {
  space: string; actor: string; now: Date; readOnly: boolean;
}) {
  const { data, error, repo, refresh } = useLivePersonal(actor, space);
  const [notice, setNotice] = useState("");
  const r = todayRecords(data?.actions.records || [], data?.thoughts || [], now);
  const link = (view: "calendar" | "thoughts", id = "") => appUrl(view, id, space, actor);
  function toggle(record: ActionRecord) {
    try { repo.current!.actions.save({ ...record, done: !record.done }); refresh(); setNotice(""); }
    catch (e) { setNotice((e as Error).message); }
  }
  return <aside className="team-private-column" aria-label="我的闪念与安排">
    <header className="team-section-heading"><h2>我的今天 <span className="team-private-badge">仅自己可见</span></h2><a href={link("thoughts", "schedule")}>全部闪念 ↗</a></header>
    {(error || notice) && <p role="alert">{error || notice}</p>}
    <div className="team-private-agenda">
      <section aria-label="今日日程"><header><h3>今日日程 <span>{r.schedules.length}</span></h3><a href={link("calendar")}>日历 ↗</a></header>
        <div className="team-private-list">{!r.schedules.length && <p>今天暂无日程</p>}{r.schedules.slice(0, 2).map(s => <a key={s.id} href={link("calendar", s.id)} title={s.title}><time>{scheduleTime(s)}</time><span>{s.title}</span></a>)}</div>
      </section>
      <section aria-label="我的待办"><header><h3>待办 <span>{r.todos.filter(t => !t.done).length} 项未完成</span></h3><a href={link("calendar")}>全部 ↗</a></header>
        <div className="team-private-list">{!r.todos.length && <p>暂无待办</p>}{r.todos.slice(0, 2).map(t => <div className="team-private-todo" key={t.id}><button aria-label={`完成状态：${t.title}`} aria-pressed={t.done} disabled={readOnly} onClick={() => toggle(t)}>{t.done ? "✓" : ""}</button><button className="team-private-todo-title" aria-pressed={t.done} disabled={readOnly} onClick={() => toggle(t)} title={t.title}>{t.title}</button></div>)}</div>
      </section>
    </div>
    <div className="team-private-notes">
      <section aria-label="今日灵感"><header><h3>灵感 <span>{r.ideas.length}</span></h3><a href={link("thoughts", "inspiration")}>全部 ↗</a></header>
        <div className="team-private-list">{!r.ideas.length && <p>今天暂无灵感</p>}{r.ideas.slice(-2).reverse().map(i => <a className="team-private-idea" key={i.id} href={link("thoughts", i.id)} title={i.title}><span>{i.title}</span><time>{i.time}</time></a>)}</div>
      </section>
      <section aria-label="今日记账"><header><h3>今日记账</h3><a href={link("thoughts", "ledger")}>查看 ↗</a></header><div className="team-private-ledger">
        {!r.expenses.length && !r.income.length && <p>今日暂无收支</p>}
        {r.expenses.map(t => <p key={`expense-${t.currency}`}><span>支出</span><strong>{money(t.amount, t.currency)}</strong></p>)}
        {r.income.map(t => <p key={`income-${t.currency}`}><span>收入</span><strong>{money(t.amount, t.currency)}</strong></p>)}
      </div></section>
    </div>
  </aside>;
}
