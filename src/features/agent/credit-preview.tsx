"use client";
import { createContext, Fragment, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { M } from "@/features/spaces/model/store";
import type { Workspace } from "@/features/spaces/model/types";
import { marketConfig } from "@/features/markets/config";
import { mockUsageReceipt, tokenCost, type AgentRun } from "./usage";
import { openAccount } from "@/features/account/experience";
import { appUrl } from "@/lib/routes";
import { settleAvailableRuns } from "./settlement";
import { AgentUsageFeedback } from "./usage-feedback";
import { AgentWaiting, type ExecutionState } from "./waiting";
import { createDemoScript, demoFrame, DEMO_DURATION, type AgentProcess, type DemoProcessMode } from "./demo-stream";
import styles from "./credits.module.css";
const scenarios = { enough: "Credits 充足", insufficient: "余额不足以结算", empty: "余额为零", exact: "余额恰好耗尽", pending: "最终用量延迟", zero: "实际消耗为零", interrupted: "生成中断", failure: "调用失败／未产生用量", expired: "团队权益到期", concurrent: "团队并发消耗", duplicate: "重复用量回执" };
type Scenario = keyof typeof scenarios;
type Turn = { id: string; prompt: string; answer: string; run: AgentRun | null; note: string; process: AgentProcess; executionState: ExecutionState };
type SendResult = "sent" | "blocked" | null;
const number = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });
const CreditReview = createContext<{
  controls: ReactNode; turns: Turn[]; notice: string; running: boolean; armed: boolean;
  send: (prompt: string) => SendResult; stop: () => void; reset: () => void;
  setAvailable: (value: boolean) => void; recharge: () => void; checkout: Workspace | null; updateCheckout: (next: Workspace) => void; closeCheckout: () => void; member: boolean; expired: boolean; subscriptionUrl: string;
} | null>(null);
export function useCreditReview() { return useContext(CreditReview); }
export function useAgentCreditSimulation(active = true) {
  const review = useCreditReview();
  const setAvailable = review?.setAvailable;
  useEffect(() => { setAvailable?.(active); return () => setAvailable?.(false); }, [active, setAvailable]);
  return { send: review?.send || (() => null), running: review?.running || false, hasMessages: !!review?.turns.length, stop: review?.stop || (() => {}), reset: review?.reset || (() => {}) };
}
export function AgentCreditPreview() { return useCreditReview()?.controls; }
function NativeReply({ recording, children }: { recording: boolean; children: ReactNode }) {
  return recording ? <div className={styles.recordingBubble}>{children}</div> : children;
}
/** These are ordinary message rows inserted into each scene's existing message list. */
export function AgentSimulationMessages({ kind = "standard" }: { kind?: "standard" | "team" | "calendar" | "contacts" | "recording" }) {
  const review = useCreditReview(), end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [review?.turns, review?.notice]);
  if (!review?.armed || (!review.turns.length && !review.notice)) return null;
  const classes = kind === "team" ? ["ws-chat-user", "ws-chat-answer"] : kind === "calendar" ? ["pa-message", "pa-agent-answer"] : kind === "recording" ? ["recording-chat-row user", "recording-chat-row assistant"] : ["agent-history-message user", "agent-history-message assistant"];
  return <>
    {review.turns.map((turn, index) => <Fragment key={turn.id}>
      <article className={classes[0]} data-testid="simulation-user">{kind === "standard" || kind === "contacts" ? <><span>你</span><p>{turn.prompt}</p></> : <span>{turn.prompt}</span>}</article>
      <article className={classes[1]} data-testid="simulation-assistant">
        <NativeReply recording={kind === "recording"}>
        {kind === "standard" || kind === "contacts" ? <span>Ask Agent</span> : null}
        {turn.answer && <p className={review.running && index === review.turns.length - 1 ? styles.streamingAnswer : styles.answer} data-testid="preview-answer">{turn.answer}</p>}
        <AgentWaiting process={turn.process} state={review.running && index === review.turns.length - 1 ? "running" : turn.executionState} />
        {!(review.running && index === review.turns.length - 1) && <>
          <AgentUsageFeedback run={turn.run} note={turn.note} testId="preview-usage">
            {turn.run?.status === "insufficient" && (review.member ? <div className={styles.memberHelp}>请联系团队管理员充值 · 不扣个人 Credits</div> : <Button onClick={review.recharge}>充值 Credits</Button>)}
          </AgentUsageFeedback>
        </>}
        </NativeReply>
      </article>
    </Fragment>)}
    {review.notice && <div className={styles.inlineNotice} role="alert">{review.notice} {review.member ? <div>请联系团队管理员处理。</div> : review.expired ? <a href={review.subscriptionUrl}>管理订阅</a> : <button type="button" onClick={review.recharge}>充值 Credits</button>}</div>}
    <div ref={end} />
  </>;
}
export function CreditReviewProvider({ workspace, actor, onSend, children }: { workspace: Workspace; actor: string; onSend: () => void; children: ReactNode }) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [available, setAvailable] = useState(false), [armed, setArmed] = useState(false);
  const [processChoice, setProcessChoice] = useState<DemoProcessMode>("auto"), [processMode, setProcessMode] = useState<DemoProcessMode>("auto");
  const [choice, setChoice] = useState<Scenario>("enough"), [scenario, setScenario] = useState<Scenario>("enough");
  const [snapshot, setSnapshot] = useState<Workspace | null>(null), [turns, setTurns] = useState<Turn[]>([]);
  const [running, setRunning] = useState(false), [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef<{ workspace: Workspace; id: string; prompt: string; script: ReturnType<typeof createDemoScript>; started: number } | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!running || scenario === "failure") return;
    if (active.current) active.current.started = Date.now();
    const stream = setInterval(() => {
      const current = active.current; if (!current) return;
      const frame = demoFrame(current.script, Date.now() - current.started);
      setTurns(rows => rows.map(row => row.id === current.id ? { ...row, answer: frame.text, process: frame.process } : row));
    }, 80);
    return () => clearInterval(stream);
  }, [running, scenario]);
  const member = workspace.type === "team" && !M.admin(workspace, actor);
  const cost = tokenCost(mockUsageReceipt("preview"), marketConfig().rates);
  const opening = (value: Scenario) => value === "empty" ? 0 : value === "exact" ? cost : value === "insufficient" ? 0.5 : 10;
  const balance = snapshot ? M.creditBalance(snapshot) : opening(choice);
  const latest = turns.at(-1);
  function reset() {
    if (timer.current) clearTimeout(timer.current);
    active.current = null; setCheckoutOpen(false); setSnapshot(null); setTurns([]); setNotice(""); setRunning(false);
  }
  function apply() { reset(); setScenario(choice); setProcessMode(processChoice); setArmed(true); onSend(); }
  function finish(stopped = false) {
    const current = active.current; if (!current) return;
    active.current = null; if (timer.current) clearTimeout(timer.current);
    const receipt = mockUsageReceipt(current.id, scenario === "zero" || scenario === "failure");
    if (stopped || scenario === "interrupted") receipt.outputTokens = 200;
    if (scenario === "concurrent") current.workspace.credits = { total: 0.5, used: 0, logs: [] };
    const result = M.recordAgentUsage(current.workspace, current.id, current.prompt, scenario === "pending" && !stopped ? null : receipt, actor, "preview");
    if (scenario === "duplicate") M.recordAgentUsage(current.workspace, current.id, current.prompt, receipt, actor, "preview");
    const note = stopped || scenario === "interrupted" ? "已停止生成，已保留当前回答。" : scenario === "failure" ? "暂时未能完成回答，本轮未产生消耗，请重试。" : result.status === "pending" ? "回答已保留，结算确认后会更新。" : result.status === "insufficient" ? "Credits 不足，回答已保留。到账后自动更新本轮状态。" : M.creditBalance(current.workspace) === 0 ? "本轮已完成，Credits 刚好用尽。" : "";
    setTurns(rows => rows.map(row => row.id === current.id ? { ...row, answer: scenario === "failure" ? "" : stopped || scenario === "interrupted" ? row.answer : current.script.answer, run: { ...result }, note, process: stopped || scenario === "interrupted" || scenario === "failure" ? row.process : demoFrame(current.script, DEMO_DURATION).process, executionState: stopped || scenario === "interrupted" ? "stopped" : scenario === "failure" ? "failed" : "completed" } : row));
    setSnapshot(structuredClone(current.workspace)); setRunning(false);
  }
  function send(prompt: string): SendResult {
    if (!armed) return null;
    if (running || active.current || !prompt.trim()) return "blocked";
    const target = structuredClone(snapshot || workspace);
    if (!snapshot) { target.agentRuns = []; target.credits = { total: opening(scenario), used: 0, logs: [] }; if (scenario === "expired") target.status = "expired"; }
    try { M.assertAgentAvailable(target, actor); }
    catch (error) { setSnapshot(target); setNotice(target.status === "expired" ? "团队权益已到期，请联系管理员续费；输入已保留。" : (error as Error).message); return "blocked"; }
    const id = crypto.randomUUID(), script = createDemoScript(prompt, processMode); active.current = { workspace: target, id, prompt, script, started: 0 };
    setTurns(rows => [...rows, { id, prompt, answer: "", run: null, note: "", process: demoFrame(script, 0).process, executionState: "running" }]); setNotice(""); setRunning(true); setSnapshot(target);
    timer.current = setTimeout(() => finish(), scenario === "interrupted" ? 3200 : DEMO_DURATION);
    return scenario === "failure" ? "blocked" : "sent";
  }
  function settle() {
    if (!snapshot || !latest?.run) return;
    const target = structuredClone(snapshot), receipt = latest.run.receipt || mockUsageReceipt(latest.id);
    const result = M.recordAgentUsage(target, latest.id, latest.prompt, receipt, actor, "preview");
    setTurns(rows => rows.map(row => row.id === latest.id ? { ...row, run: { ...result }, note: result.status === "settled" ? "本轮已结算，回答保持不变。" : "Credits 不足，到账后将自动更新本轮状态。" } : row));
    setSnapshot(target); setNotice("");
  }
  function updateCheckout(next: Workspace) {
    const target = structuredClone(next);
    settleAvailableRuns(target, actor);
    setSnapshot(target);
    setTurns(rows => rows.map(row => {
      const run = target.agentRuns?.find(item => item.runId === row.id);
      return run ? { ...row, run: { ...run }, note: row.run?.status !== "settled" && run.status === "settled" ? "充值已到账，本轮费用已更新。" : row.note } : row;
    }));
    setNotice("");
  }
  function recharge() {
    if (member) return;
    if (!snapshot) { const target = structuredClone(workspace); target.agentRuns = []; target.credits = { total: opening(scenario), used: 0, logs: [] }; setSnapshot(target); }
    setCheckoutOpen(true); openAccount("recharge");
  }
  function topup() {
    if (!snapshot) return;
    const target = structuredClone(snapshot); target.credits.total += 10;
    if (target.credits.grants) target.credits.grants.push({ id: crypto.randomUUID(), category: "recharge", label: "预演到账", amount: 10, remaining: 10, time: new Date().toISOString(), expires: null });
    updateCheckout(target); onSend();
  }
  const controls = <section className={styles.preview} aria-label="Credits 评审配置">
    <h3>Credits 与计费状态预演</h3>
    <div className={styles.row}><span>{workspace.type === "team" ? "团队共享" : "个人"} Credits</span><strong>{number(M.creditBalance(workspace))} 可用</strong></div>
    <p>只配置测试状态。应用后使用 Agent 原有的推荐问题、输入框与发送按钮操作；不会改写账户余额或历史。MCP／skill 与文件名为本地演示，不连接外部服务、不读取真实文件。充值复用现有弹窗，仅写模拟池。</p>
    <label>预演场景<Select aria-label="计费预演场景" value={choice} disabled={running} onChange={event => setChoice(event.target.value as Scenario)}>{Object.entries(scenarios).filter(([key]) => workspace.type === "team" || !["expired", "concurrent"].includes(key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></label>
    <label>响应过程<Select aria-label="响应过程" value={processChoice} disabled={running} onChange={event => setProcessChoice(event.target.value as DemoProcessMode)}><option value="auto">根据问题自动演示</option><option value="text">仅流式回答</option><option value="skill">加载 skill 后回答</option><option value="mcp">调用 MCP 后回答</option><option value="file">读取文件后回答</option><option value="combined">加载 skill + 调用 MCP + 读取文件</option></Select></label>
    <div className={styles.row}><span>{armed ? "当前模拟可用 Credits" : "初始模拟 Credits"}</span><strong>{number(armed ? balance : opening(choice))}</strong></div>
    {armed && <p role="status">已启用：{scenarios[scenario]} · 从原输入框发送即可模拟</p>}
    {!available && <p>请先打开当前场景的 Agent。</p>}
    <div className={styles.actions}>
      <Button variant="primary" disabled={!available || running} onClick={apply}>应用到当前 Agent</Button>
      {armed && <Button onClick={() => { reset(); setArmed(false); }}>结束模拟</Button>}
      {armed && !running && snapshot && scenario !== "expired" && <Button onClick={topup}>{member ? "模拟管理员到账 +10 Credits" : "模拟到账 +10 Credits"}</Button>}
      {armed && snapshot?.status === "expired" && <Button onClick={() => { const target = structuredClone(snapshot); target.status = "active"; setSnapshot(target); setNotice("团队权益已恢复，可以继续发送问题。"); onSend(); }}>{member ? "模拟管理员续费" : "模拟团队续费"}</Button>}
      {latest?.run?.status === "pending" && <Button onClick={() => { settle(); onSend(); }}>模拟最终回执到达</Button>}
    </div>
  </section>;
  return <CreditReview.Provider value={{ controls, turns, notice, running, armed, send, stop: () => finish(true), reset, setAvailable, recharge, checkout: checkoutOpen ? snapshot : null, updateCheckout, closeCheckout: () => setCheckoutOpen(false), member, expired: snapshot?.status === "expired", subscriptionUrl: appUrl("subscription", "", workspace.id, actor) }}>{children}</CreditReview.Provider>;
}

export function AgentSendButton({ onSend, disabled, label, children, ...props }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type" | "aria-label"> & { onSend: () => void; label: string }) {
  const review = useCreditReview();
  return <button {...props} type="button" aria-label={review?.running ? "停止生成" : label} disabled={review?.running ? false : disabled} onClick={() => review?.running ? review.stop() : onSend()}>{review?.running ? <span aria-hidden="true">■</span> : children}</button>;
}
