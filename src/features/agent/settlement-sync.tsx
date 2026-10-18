"use client";
import { useContext, useEffect, useRef } from "react";
import { M } from "@/features/spaces/model/store";
import { AgentScope } from "./scope";
import { useCreditReview } from "./credit-preview";
import { recoverableRuns, settleAvailableRuns } from "./settlement";

/** Local adapter for the eventual server settlement notification; never resends a question. */
export function AgentSettlementSync() {
  const scope = useContext(AgentScope), review = useCreditReview();
  const attempted = useRef<unknown>(null);
  const state = scope?.controller.state, change = scope?.controller.change;
  const space = scope?.space, actor = scope?.actor;
  useEffect(() => {
    if (!state || !change || !space || !actor || review?.armed || attempted.current === state) return;
    const workspace = M.get(state, space);
    if (!recoverableRuns(workspace, actor).length) return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      attempted.current = state;
      try { change(next => settleAvailableRuns(M.get(next, space), actor)); }
      catch { window.dispatchEvent(new CustomEvent("eureka:notice", { detail: "Credits 状态暂未同步，请刷新后重试；不会重复生成回答。" })); }
    });
    return () => { active = false; };
  }, [state, change, space, actor, review?.armed]);
  return null;
}
