"use client";
import { useState } from "react";
import { RefIcon } from "@/features/reference/symbols";
import { ReferenceDialog } from "@/features/reference/dialog";
import { Select } from "@/components/ui/select";
import { appUrl } from "@/lib/routes";
import { M } from "./model/store";
import type { Workspace } from "./model/types";
import { buildWeeklyMeetingSummary,buildWeeklySummaryGenerationRequest,completedSummaryWeeks,weeklySummaryExcerpt,type WeeklyMeetingSummary,type WeeklySummaryGenerationRequest,type SummaryWeek } from "./model/weekly-summary";
import styles from "./weekly-summary.module.css";

export function WeeklyMeetings({workspace,space,actor,now,readOnly,onAsk}: {
  workspace:Workspace;space:string;actor:string;now:Date;readOnly:boolean;
  onAsk:(request:WeeklySummaryGenerationRequest)=>void;
}) {
  const weeks=completedSummaryWeeks(now),latest=weeks[0].key;
  const [selection,setSelection]=useState<{anchor:string;week:string}|null>(null);
  const [detail,setDetail]=useState<string|null>(null);
  const chosen=selection?.anchor===latest?selection.week:latest;
  const week=weeks.find(w=>w.key===chosen)||weeks[0];
  const report=buildWeeklyMeetingSummary(M.visible(workspace,actor),week,now);
  return <section className="team-brief-column ws-team-brief" aria-label="周度会议总结">
    <header className="team-section-heading"><h2><RefIcon name="spark"/>周度会议总结</h2>
      <span className={styles.period}>{week.label.replace(/\d{4}\//g,"")}<span>{week.key===latest?"上周":"历史周"}</span></span>
    </header>
    {readOnly ? <p className="team-brief-empty">团队订阅已暂停，周度总结暂不可用。已有会议记录仍可查看。</p> : report.groups.length ? <div className={`team-insights ${styles.list}`}>
      {report.groups.map(group=><article key={group.id} className={styles.card}>
        <div>
          <h3>{group.title}<span>{group.sources.length} 场会议</span></h3>
          <p>{group.description}</p>
        </div>
      </article>)}
    </div> : <p className="team-brief-empty">该周暂无有权查看的会议记录。</p>}
    {!readOnly&&<footer className={styles.actions}>
      <button type="button" className={styles.actionLink} disabled={!report.sources.length} onClick={()=>setDetail("all")}>查看详情 <RefIcon name="chevron"/></button>
      <button type="button" className={`${styles.actionLink} ${styles.agentLink}`} disabled={!report.sources.length} onClick={()=>onAsk(buildWeeklySummaryGenerationRequest(report))}><RefIcon name="spark"/>基于本周总结问 Agent</button>
    </footer>}
    {detail!==null&&!readOnly&&<WeeklySummaryDetail report={report} weeks={weeks} category={detail} space={space} actor={actor}
      onClose={()=>setDetail(null)} onWeek={value=>setSelection({anchor:latest,week:value})} onAsk={()=>{
        onAsk(buildWeeklySummaryGenerationRequest(report));setDetail(null);
      }}/>}
  </section>;
}
function WeeklySummaryDetail({report,weeks,category,space,actor,onClose,onWeek,onAsk}: {
  report:WeeklyMeetingSummary;weeks:SummaryWeek[];category:string;space:string;actor:string;
  onClose:()=>void;onWeek:(week:string)=>void;onAsk:()=>void;
}) {
  const [active,setActive]=useState(category);
  const selected=report.groups.some(g=>g.id===active)?active:"all";
  const groups=selected==="all"?report.groups:report.groups.filter(g=>g.id===selected);
  return <ReferenceDialog className={`ws-dialog ${styles.dialog}`} label="周度会议总结详情" onClose={onClose}>
    <header className={styles.header}><div><h2>周度会议总结</h2><p>{report.week.label} · {report.sources.length} 场会议 · {report.creators} 位创建人</p></div>
      <button type="button" className="ws-btn ws-icon-button" aria-label="关闭周总结详情" onClick={onClose}><RefIcon name="x"/></button>
    </header>
    <div className={styles.content}>
      <label className={styles.weekSelect}>统计周<Select aria-label="选择总结周" value={report.week.key} onChange={e=>onWeek(e.target.value)}>{weeks.map((week,i)=><option key={week.key} value={week.key}>{i===0?"上周 · ":""}{week.label}</option>)}</Select></label>
      <p className={styles.scope}>按周一至周日汇总当前有权查看的会议，每周一更新上一完整周。以下摘要来自已保存记录，原始会议可逐项查看。</p>
      <nav className={styles.categories} aria-label="本周议题"><button type="button" aria-pressed={selected==="all"} onClick={()=>setActive("all")}>全部议题</button>{report.groups.map(g=><button type="button" key={g.id} aria-pressed={selected===g.id} onClick={()=>setActive(g.id)}>{g.title}（{g.sources.length}）</button>)}</nav>
      {!report.sources.length&&<p>该周暂无有权查看的会议记录，可切换其他统计周。</p>}
      {groups.map(group=><section className={styles.group} key={group.id}>
        <h3>{group.title}</h3><p>{group.description}</p>
        <h4>会议依据</h4>
        {group.sources.map(source=><article className={styles.source} key={source.id}>
          <a href={appUrl("meeting",source.id,space,actor)} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>
          <p className={styles.meta}>{source.created.replace("T"," ").slice(0,16)} · {source.source} · 会议创建人：{source.creator}</p>
          <p>{weeklySummaryExcerpt(source.summary || source.transcript,400)}</p>
          {!!source.observations.length&&<ul>{source.observations.map((fact,i)=><li key={i}>{fact.text}{fact.status&&<span className={styles.meta}> · 记录状态：{({open:"待跟进",in_progress:"进行中",blocked:"受阻",resolved:"已解决",cancelled:"已取消"} as Record<string,string>)[fact.status]||fact.status}</span>}</li>)}</ul>}
          {(source.summary || source.transcript).length>400&&<details><summary>展开完整记录摘要</summary><p className={styles.original}>{source.summary || source.transcript}</p></details>}
        </article>)}
      </section>)}
      {!!report.sources.length&&<section className={styles.next}><h3>后续关注</h3><p>结合原始会议核实结论、未解决问题及行动进展；记录中没有明确的负责人、截止时间或一致意见时，保留“待确认”，不代为推断。</p></section>}
    </div>
    <footer className={styles.footer}><button type="button" className="ws-btn" onClick={onClose}>关闭</button><button type="button" className="ws-btn primary" disabled={!report.sources.length} onClick={onAsk}>基于该周总结问 Agent</button></footer>
  </ReferenceDialog>;
}
