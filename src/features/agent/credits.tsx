"use client";
import { useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { M } from "@/features/spaces/model/store";
import { openAccount } from "@/features/account/experience";
import { appUrl } from "@/lib/routes";
import { AGENT_ATTEMPT, type AgentAttempt } from "./feedback";
import { AgentScope } from "./scope";
import { useCreditReview } from "./credit-preview";
import { AgentUsageFeedback } from "./usage-feedback";
import { AgentWaiting } from "./waiting";
import styles from "./credits.module.css";

export function AgentCredits({ busy = false, active = true, onStop, runId }: { busy?: boolean; active?: boolean; onStop?: () => void; runId?: string }) {
  const scope = useContext(AgentScope);
  const review = useCreditReview();
  const [recoveryRunId, setRecoveryRunId] = useState("");
  const spaceId = scope?.space, actorId = scope?.actor;
  useEffect(() => {
    const attempted = (event: Event) => {
      const detail = (event as CustomEvent<AgentAttempt>).detail;
      if (active && detail.space === spaceId && detail.actor === actorId) setRecoveryRunId(detail.runId);
    };
    window.addEventListener(AGENT_ATTEMPT, attempted);
    return () => window.removeEventListener(AGENT_ATTEMPT, attempted);
  }, [active, spaceId, actorId]);
  const w = scope?.controller.state ? M.get(scope.controller.state, scope.space) : null;
  // Opening a conversation must not surface old billing events as a new interaction.
  const [initialRuns] = useState(() => new Set((w?.agentRuns || []).map(r => r.runId)));
  if (!scope || !w || !active || review?.armed) return null;
  const { space, actor } = scope;
  const member = M.member(w, actor);
  const canPay = w.type === "personal" || !!member && member.role === "admin";
  const expired = w.type === "team" && w.status !== "active";
  const run = (w.agentRuns || []).find(r => r.actor === actor && (runId ? r.runId === runId : !initialRuns.has(r.runId) || r.runId === recoveryRunId));
  const blocked = run?.status === "insufficient";
  if (!busy && !run) return null;
  return <section className={styles.panel} aria-label="Agent Credits 反馈" data-testid="agent-credits">
    {busy ? <><AgentWaiting />{onStop && <Button onClick={onStop}>停止生成</Button>}</> : <AgentUsageFeedback run={run}>
      {run?.status !== "settled" && (expired ? canPay ? <a href={appUrl("subscription", "", space, actor)}>管理团队订阅</a> : <div className={styles.memberHelp}>请联系团队管理员续费</div>
        : blocked ? canPay ? <Button onClick={() => openAccount("recharge")}>充值 Credits</Button> : <div className={styles.memberHelp}>请联系团队管理员充值 · 不扣个人 Credits</div> : null)}
      {!expired && blocked && w.type === "personal" && <Button onClick={() => openAccount("tasks")}>做任务赚 Credits</Button>}
    </AgentUsageFeedback>}
  </section>;
}
