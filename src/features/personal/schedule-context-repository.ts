import { createWorkspaceStore, M } from "@/features/spaces/model/store";
import { createLocalRepository } from "@/features/workbench/model/local-repository";
import { createMeetingDetails } from "@/features/meetings/store";
import { createActions, createContacts, createThoughts } from "./store";
import { buildScheduleContext, type ScheduleMeeting } from "./schedule-context";
import type { Market } from "@/features/markets/config";

/** Resolve again at opening/sending; inputs are never a cross-workspace search cache. */
export async function readScheduleContext(storage: Storage, market: Market, space: string, actor: string, id: string, now = new Date()) {
  const workspace = M.get(createWorkspaceStore(storage, () => now).read(), space);
  if (!M.member(workspace, actor)) throw Error("没有此工作空间的访问权限");
  M.assertEntitlement(workspace, actor);
  const actions = createActions(storage, () => now, actor, space).read().records;
  const record = actions.find(r => r.id === id && r.type === "schedule" && !r.deleted);
  if (!record) throw Error("日程已删除或没有查看权限，请重新打开");
  const contacts = createContacts(storage, actor, space).readVisible().personal.contacts;
  const thoughts = createThoughts(storage, () => now, actor, space).read().records;
  let meetings: ScheduleMeeting[] = [];
  if (workspace.type === "team") meetings = M.visible(workspace, actor).map(f => ({id:f.id,title:f.title,summary:f.summary,transcript:f.transcript,created:f.created,deleted:f.deleted}));
  else if (actor === M.SELF) {
    const snapshot = await createLocalRepository(storage, () => now).load();
    const details = createMeetingDetails(storage);
    meetings = snapshot.meetings.flatMap(m => {
      try { const r = details.read(m.id); return [{id:r.id,title:r.title,summary:r.summary,transcript:r.transcript,created:r.created,deleted:r.deleted}]; }
      catch { return []; } // Removed/unreadable recordings cannot become source context.
    });
  }
  return buildScheduleContext({record,actions,thoughts,contacts,meetings,market,space,actor,now});
}
