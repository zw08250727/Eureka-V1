"use client";
import { AccountExperience, type AccountPanel } from "@/features/account/experience";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { M } from "@/features/spaces/model/store";
import type { WorkspaceState } from "@/features/spaces/model/types";
import { useCreditReview } from "./credit-preview";
import { useState } from "react";

/** Reuse the production checkout UI. Review orders operate solely on the preview workspace. */
export function AgentAccountPanel(props: { controller: SpacesController; space: string; actor: string; panel: AccountPanel; onClose: () => void }) {
  const review = useCreditReview();
  const [focusReturn] = useState(() => {
    const trigger = typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return { trigger, fallback: trigger?.closest<HTMLElement>("article, [role=alert]") };
  });
  function close() {
    review?.closeCheckout(); props.onClose();
    requestAnimationFrame(() => {
      if (focusReturn.trigger?.isConnected) focusReturn.trigger.focus({ preventScroll: true });
      else if (focusReturn.fallback?.isConnected) { focusReturn.fallback.tabIndex = -1; focusReturn.fallback.focus({ preventScroll: true }); }
    });
  }
  if (!review?.checkout || !props.controller.state) return <AccountExperience {...props} onClose={close} />;
  const state: WorkspaceState = { ...props.controller.state, spaces: props.controller.state.spaces.map(w => w.id === props.space ? review.checkout! : w) };
  const controller: SpacesController = { ...props.controller, state, change: <T,>(fn: (next: WorkspaceState) => T): T => {
    const next = structuredClone(state);
    const result = fn(next);
    review.updateCheckout(M.get(next, props.space));
    return result;
  } };
  return <AccountExperience {...props} controller={controller} onClose={close} />;
}
