"use client";
import { scheduleAssistCopy, type ScheduleContext, type SchedulePhase } from "./schedule-context";
import styles from "./schedule-assist.module.css";

export function ScheduleAssistEntry({ phase, disabled, busy, onClick }: {phase: SchedulePhase;disabled:boolean;busy:boolean;onClick:()=>void}) {
  const copy = scheduleAssistCopy[phase];
  return <section className={`pa-card ${styles.entry}`} data-schedule-phase={phase}>
    <div><h2>{copy.heading}</h2><p>{copy.description}</p></div>
    <button type="button" className="pa-btn primary" data-pa="schedule-assist" disabled={disabled || busy} onClick={onClick}>{busy ? "正在整理资料…" : copy.button}</button>
  </section>;
}
export function ScheduleContextSources({context, web = true}: {context:ScheduleContext;web?:boolean}) {
  return <div className={styles.sources} data-schedule-context>
    <p className={styles.scope}>实体线索：{context.entities.join("、") || "待核实"} · 当前工作区</p>
    <details open>
      <summary>相关历史资产（{context.assets.length}）</summary>
      {context.assets.length ? <ol>{context.assets.map(a => <li key={`${a.kind}:${a.id}`}>
        <a href={a.url} target="_blank" rel="noopener noreferrer">{a.kind} · {a.title}</a>
        {a.at && <time>{a.at.replace("T", " ").slice(0,16)}</time>}
        <p>{a.text || "打开原始资产查看内容"}</p>
      </li>)}</ol> : <p>未找到当前有权访问的相关历史资产，可补充参与方名称或关联会议。</p>}
    </details>
    {web && <details open><summary>参与方公开资料</summary>
      <p>打开检索入口核对最新公开信息；尚未获取的网页内容不作为已确认事实。</p>
      {context.publicSearches.map(s => <a className={styles.search} href={s.url} target="_blank" rel="noopener noreferrer" key={s.name}>检索 {s.name} 的公开资料 ↗</a>)}
      {!context.publicSearches.length && <p>补充明确的企业或参与方名称后再检索。</p>}
    </details>}
  </div>;
}
export function ScheduleAssistAnswer({context,web}: {context:ScheduleContext;web:boolean}) {
  return <section data-schedule-answer>
    <h3>{scheduleAssistCopy[context.phase].heading} · {context.record.title}</h3>
    <p>{scheduleAssistCopy[context.phase].task}。</p>
    <ScheduleContextSources context={context} web={web}/>
    <p className={styles.scope}>以上按已保存资产整理。建议与结论需要结合本次实际沟通核对。</p>
  </section>;
}
