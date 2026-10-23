import type { Workspace } from "@/features/spaces/model/types";
export const AGENT_ATTEMPT = "eureka:agent-credit-attempt";
export type AgentAttempt = { space: string; actor: string; runId: string };
/** Surface an existing unsettled run only after the user tries to send again. */
export function reportAgentAttempt(workspace: Workspace, actor: string) {
  window.dispatchEvent(new CustomEvent<AgentAttempt>(AGENT_ATTEMPT, { detail: {
    space: workspace.id, actor,
    runId: workspace.agentRuns?.find(run => run.actor === actor && run.status !== "settled")?.runId || "",
  } }));
}
