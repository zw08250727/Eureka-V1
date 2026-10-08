import { useCallback, useMemo } from "react";
import { M } from "./model/store";
import type { WorkspaceState } from "./model/types";
import type { SpacesController } from "./use-spaces";

// Preview can only reduce permissions. Stored memberships never change.
export function memberPerspective(state: WorkspaceState, space: string, actor: string) {
  return {
    ...state,
    spaces: state.spaces.map((w) => w.id === space && w.type === "team" ? {
      ...w,
      members: w.members.map((m) => m.id === actor ? { ...m, role: "member" as const } : m),
    } : w),
  };
}

export function changeAsMember<T>(state: WorkspaceState, space: string, actor: string, change: (s: WorkspaceState) => T): T {
  const w = M.get(state, space);
  const member = w.type === "team" ? M.member(w, actor) : undefined;
  if (!member) return change(state);
  const role = member.role;
  member.role = "member";
  try {
    return change(state);
  } finally {
    member.role = role;
  }
}

export function useReviewPerspective(controller: SpacesController, space: string, actor: string, enabled: boolean): SpacesController {
  const { state, change } = controller;
  const preview = useMemo(() => state && enabled ? memberPerspective(state, space, actor) : state, [state, enabled, space, actor]);
  const previewChange = useCallback(<T,>(fn: (s: WorkspaceState) => T) => change((s) => enabled ? changeAsMember(s, space, actor, fn) : fn(s)), [change, enabled, space, actor]);
  return { ...controller, state: preview, change: previewChange };
}
