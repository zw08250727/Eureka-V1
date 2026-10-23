import { M } from "@/features/spaces/model/store";
import type { Workspace } from "@/features/spaces/model/types";

/** Only confirmed final receipts may recover. The ledger still owns validation and idempotency. */
export function recoverableRuns(workspace: Workspace, actor: string) {
  try { M.assertEntitlement(workspace, actor); } catch { return []; }
  return (workspace.agentRuns || []).filter(run => run.actor === actor && run.status === "insufficient"
    && run.receipt?.final && run.cost !== null && run.cost <= M.creditBalance(workspace));
}
export function settleAvailableRuns(workspace: Workspace, actor: string) {
  for (const run of recoverableRuns(workspace, actor).slice().reverse()) {
    if ((run.cost || 0) > M.creditBalance(workspace)) continue;
    M.recordAgentUsage(workspace, run.runId, run.task, run.receipt, actor, run.scene);
  }
}
