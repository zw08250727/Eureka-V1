"use client";
import { useEffect, useState } from "react";
import styles from "./credits.module.css";
import type { AgentProcess, AgentProcessEvent } from "./demo-stream";
const messages = {
  thinking: ["让问题的线头，慢慢露出来…", "先把思路理顺，好答案就近了一步…"],
  skill: ["给这道题挑一套趁手的工具…", "小小工具箱，正在准备就绪…", "整理方法，让接下来的思路更顺…"],
  mcp: ["让线索跑一会儿，答案正在路上…", "去资料里找找，看看有没有关键拼图…", "多一点依据，少一点猜测…"],
  file: ["翻开资料，把有用的线索留下来…", "让文档里的重点，慢慢浮出来…"],
  writing: ["把零散信息串起来…", "给重点排好队，让答案更好读…", "把下一步，写得再清楚一点…"],
};
export type ExecutionState = "running" | "completed" | "stopped" | "failed";
function ProcessIcon({ kind }: { kind: AgentProcess["kind"] | "completed" }) {
  return <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "file" ? <><path d="M5 2.5h6l4 4v11H5zM11 2.5v4h4M8 10h4M8 13h4"/></> : kind === "mcp" ? <><rect x="2.5" y="6" width="5" height="8" rx="1.5"/><rect x="12.5" y="6" width="5" height="8" rx="1.5"/><path d="M7.5 10h5M5 3v3M15 14v3"/></> : kind === "skill" ? <><path d="m10 2 2.4 5.6L18 10l-5.6 2.4L10 18l-2.4-5.6L2 10l5.6-2.4z"/></> : kind === "completed" ? <path d="m4 10 4 4 8-8"/> : <><path d="m4 14 9-9 3 3-9 9H4zM12 6l3 3M4 3h5"/></>}
  </svg>;
}
function WaitingCopy({ process }: { process: AgentProcess }) {
  const [step, setStep] = useState(0);
  useEffect(() => { const timer = setInterval(() => setStep(value => value + 1), 1200); return () => clearInterval(timer); }, []);
  const copy = messages[process.kind];
  return <div className={styles.waitingCopy} aria-hidden="true" data-testid="agent-waiting-copy">{step >= 24 ? "这一步有点久，你可以继续等待，也可以停止生成。" : copy[step % copy.length]}</div>;
}
const eventState = { running: "进行中", completed: "已完成", stopped: "已停止", failed: "未完成" };
/** Inline process rows follow actual event data. Timers change reassurance, never task state. */
export function AgentWaiting({ process = { kind: "writing", label: "正在生成" }, state = "running" }: { process?: AgentProcess; state?: ExecutionState }) {
  const running = state === "running";
  const events = (process.events || []).map((event): AgentProcessEvent => ({ ...event, state: event.state === "running" && !running ? state === "completed" ? "stopped" : state : event.state }));
  if (!running && !events.length) return null;
  const title = running ? process.label : state === "completed" ? `已完成 ${events.filter(event => event.state === "completed").length} 项操作` : state === "stopped" ? "执行已停止" : "本轮执行未完成";
  const content = <>
    <ProcessIcon kind={running ? process.kind : state === "completed" ? "completed" : process.kind}/>
    <div className={styles.executionTitle} data-testid={running ? "agent-process-label" : "agent-process-summary"}>{title}</div>
    <div className={styles.executionState}>{running && <i className={styles.spinner} aria-hidden="true"/>}{running ? process.kind === "file" ? "读取中" : process.kind === "skill" ? "加载中" : process.kind === "mcp" ? "调用中" : "生成中" : eventState[state]}</div>
  </>;
  return <div className={styles.execution} data-state={state} data-testid="agent-execution">
    {events.length ? <details className={styles.executionDetails}>
      <summary className={styles.executionHeader} aria-label={`${title}，展开或收起执行步骤`}>{content}<svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true"><path d="m4 2 4 4-4 4"/></svg></summary>
      <ol className={styles.executionSteps} aria-label="执行步骤">
        {events.map(event => <li key={event.id} data-state={event.state}><ProcessIcon kind={event.kind}/><div><div className={styles.stepTitle}>{event.title}</div><div className={styles.stepDetail}>{event.detail}</div></div><div className={styles.stepState}>{event.state === "completed" ? "✓ 已完成" : eventState[event.state]}</div></li>)}
      </ol>
    </details> : <div className={styles.executionHeader}>{content}</div>}
    {running && <WaitingCopy key={`${process.kind}:${process.label}`} process={process} />}
    <div className={styles.srOnly} role="status">{title}{running ? "，可随时停止。" : "。"}</div>
  </div>;
}
