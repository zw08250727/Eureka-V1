"use client";
import { useState } from "react";
import type { MeetingFeedback } from "./types";
// MeetingSummaryFeedback (index-DEbbywsx.js): scores 1–6 require a reason,
// 7–10 allow optional reasons; the parent passes maxLength=100.
const negative = ["需求理解有偏差", "关键信息不完整", "存在事实或数据错误", "专业依据不充分", "分析不够深入", "其他"];
const positive = ["交付可用性强", "内容结构完整", "专业表达到位", "信息源充足可信", "分析逻辑清晰", "其他"];
export function DomesticFeedback({ value, readonly, reward, onSubmit }: { value?: MeetingFeedback; readonly: boolean; reward: boolean; onSubmit: (value: MeetingFeedback) => void }) {
  const [score, setScore] = useState(value?.score || 0), [reasons, setReasons] = useState(value?.reasons || []), [content, setContent] = useState(value?.content || ""), [error, setError] = useState("");
  const locked = readonly || !!value, current = value?.score || score, options = current <= 6 ? negative : positive;
  return <section className="md-feedback cn-meeting-feedback" aria-label="总结评价">
    <div className="md-feedback-head"><div><h3>欢迎评价本次结果，下次更懂你 {reward && !value && <span className="md-reward">奖励500积分</span>}</h3>{reward && <p>提交评分反馈后，积分自动发放到你的积分账户。</p>}</div></div>
    <div className="md-feedback-bottom"><div className="cn-score-options">{Array.from({length:10},(_,i)=>i+1).map(n=><button key={n} type="button" className="md-score" aria-label={`评分 ${n}`} aria-pressed={current===n} disabled={locked} onClick={()=>{setScore(n);setReasons([]);}}>{n}</button>)}</div><button className="md-btn md-primary" disabled={locked || !score || (score<=6 && !reasons.length)} onClick={()=>{try{onSubmit({score,reasons,content:content.trim(),time:new Date().toISOString()});setError("");}catch(e){setError((e as Error).message);}}}>{value ? "已提交" : "提交反馈"}</button></div>
    {current>0 && <div className="cn-feedback-reasons"><p>{current<=6?"请选择需要改进的地方 *":"这次结果好在哪里？（选填，可多选）"}</p><div>{options.map(reason=><button type="button" key={reason} aria-pressed={(value?.reasons || reasons).includes(reason)} disabled={locked} onClick={()=>setReasons(reasons.includes(reason)?reasons.filter(x=>x!==reason):[...reasons,reason])}>{reason}</button>)}</div><textarea aria-label="详细反馈" placeholder="欢迎分享详细信息（选填）" maxLength={100} disabled={locked} value={value?.content ?? content} onChange={e=>setContent(e.target.value)}/><small>{(value?.content ?? content).length}/100</small></div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
