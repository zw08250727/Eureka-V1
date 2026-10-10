import { createContacts } from "./store";
import { createMeetingDetails } from "@/features/meetings/store";
import { createWorkspaceStore, M } from "@/features/spaces/model/store";
import type { ContactInteraction } from "./contact-rules";

export type CustomerTodo = NonNullable<ContactInteraction["todos"]>[number];

export function setCustomerTodoCompleted(storage: Storage, actor: string, space: string,
  owner: string, customerId: string, meetingId: string, index: number,
  expected: CustomerTodo, completed: boolean) {
  if (owner !== actor && (space === "personal" || !M.admin(M.get(createWorkspaceStore(storage).read(), space), actor))) throw Error("仅所属成员或管理员可以维护联系人待办");
  createContacts(storage, actor, space, owner).change(s => {
    const person = s.personal.contacts.find(p => p.id === customerId);
    const event = person?.interactions?.find(m => m.id === meetingId);
    const todo = event?.todos?.[index];
    if (!event?.sourceAvailable || !event.verifiedParticipation || !todo ||
      todo.title !== expected.title || todo.side !== expected.side || todo.due !== expected.due)
      throw Error("待办已更新，请刷新后重试");
    const source = space === "personal" && actor === "zhang"
      ? createMeetingDetails(storage).read(meetingId)
      : M.getFile(M.get(createWorkspaceStore(storage).read(), space), meetingId, actor);
    if (source.deleted || source.summary !== event.extractedSummary)
      throw Error("来源会议已变更，请更新待办后重试");
    todo.completed = completed;
  });
}
