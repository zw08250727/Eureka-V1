"use client";
import type { ReactNode } from "react";
import type { AgentRun } from "./usage";
import styles from "./credits.module.css";
const number = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 3 });

/** System metadata stays visually subordinate to the answer, never inside its prose. */
export function AgentUsageFeedback({ run, note, children, testId }: { run?: AgentRun | null; note?: string; children?: ReactNode; testId?: string }) {
  if (!run && !note) return null;
  const warning = run?.status === "insufficient";
  const message = warning ? "Credits 不足，回答已保留。充值到账后将自动更新本轮状态。"
    : run?.status === "pending" ? "回答已保留，正在确认本轮费用。" : note;
  return <div className={styles.usageFeedback} data-tone={warning ? "warning" : "neutral"} data-testid="agent-usage-feedback">
    <div className={styles.usageCopy} role="status">
      {message && <div className={styles.systemNote} data-testid="agent-system-note">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 5.5v5M10 13v1"/></svg>
        <div>{message}</div>
      </div>}
      {run && <div className={styles.usageAmount} data-testid={testId}>{run.status === "settled" ? `本轮已扣 ${number(run.cost || 0)} Credits` : run.status === "insufficient" ? `待结算 ${number(run.cost || 0)} Credits` : "消耗待确认 · 暂未扣费"}</div>}
    </div>
    {children && <div className={styles.actions}>{children}</div>}
  </div>;
}
