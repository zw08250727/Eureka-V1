import type { ActionRecord } from "@/features/workbench/model/types";
import type { Workspace } from "@/features/spaces/model/types";

export interface ActionSaveOptions { participantShareIds?: string[]; participantRevokeIds?: string[] }
export function validateParticipantIds(record: ActionRecord, workspace: Workspace) {
  const ids = [...new Set(record.participantIds || [])];
  if (ids.some(id => !workspace.members.some(m => m.id === id && m.status === "active")))
    throw Error("所选参与人已离开团队，请移除后重新选择");
  return ids;
}
export function participantSharingCandidates(record: ActionRecord, workspace: Workspace, actor: string, base?: ActionRecord) {
  const ids = validateParticipantIds(record, workspace);
  if (workspace.type !== "team" || record.type !== "schedule" || record.previousOwnerId || record.ownerId && record.ownerId !== actor) return [];
  return workspace.members.filter(m => ids.includes(m.id) && m.id !== actor &&
    !base?.participantIds?.includes(m.id) && !record.sharedWith?.includes(m.id));
}
export function participantSharingRevocations(record: ActionRecord, workspace: Workspace, actor: string, base?: ActionRecord) {
  if (workspace.type !== "team" || record.type !== "schedule" || !base || record.previousOwnerId || base.ownerId && base.ownerId !== actor) return [];
  const nextIds=new Set(record.participantIds||[]),previousIds=new Set(base.participantIds||[]),shared=new Set(base.sharedWith||[]);
  return workspace.members.filter(member=>previousIds.has(member.id)&&!nextIds.has(member.id)&&shared.has(member.id));
}
