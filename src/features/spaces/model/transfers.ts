import type { WorkspaceState } from "./types";
import type { ContactsState } from "@/features/personal/store";
import type { ActionState, ThoughtRecord, ActionRecord } from "@/features/workbench/model/types";

/** Stage all local prototype stores before committing a member removal. */
export function stageMemberTransfers(storage: Storage, before: WorkspaceState, after: WorkspaceState) {
  const writes = new Map<string, string>();
  const read = (key: string) => writes.get(key) ?? storage.getItem(key);
  for (const workspace of after.spaces) {
    const done = new Set(before.spaces.find(w => w.id === workspace.id)?.ownershipTransfers?.map(t => t.id));
    for (const transfer of workspace.ownershipTransfers || []) {
      if (done.has(transfer.id)) continue;
      const { from, to, time } = transfer;
      const contactMap = new Map<string, string>();
      const key = "baizhi-v14-contacts", raw = read(key);
      if (raw) {
        const all: Record<string, ContactsState> = JSON.parse(raw);
        const sourceKey = `workspace:${workspace.id}:account:${from}`, targetKey = `workspace:${workspace.id}:account:${to}`;
        for (const [scopeKey, scope] of Object.entries(all)) if (scopeKey.startsWith(`workspace:${workspace.id}:account:`))
          for (const contact of scope.contacts) {
            const oldWorkspace = before.spaces.find(w => w.id === workspace.id)!;
            const scopeOwner = scopeKey.split("account:").pop()!;
            contact.sharedWith = (contact.sharedWith || (oldWorkspace.customerSharing?.[scopeOwner] ? oldWorkspace.members.filter(m => m.status === "active" && m.id !== scopeOwner).map(m => m.id) : [])).filter(id => id !== from);
          }
        const source = all[sourceKey];
        if (source) {
          const target = all[targetKey] ||= { contacts: [], notes: {}, tasks: [] };
          for (const contact of source.contacts) {
            const originalId = contact.id;
            if (target.contacts.some(c => c.id === contact.id)) contact.id = `${from}:${contact.id}`;
            contactMap.set(originalId, contact.id);
            contact.previousOwnerId ||= from; contact.ownerId = to; contact.transferredAt = time;
            contact.sharedWith = (contact.sharedWith || []).filter(id => id !== from && id !== to);
            target.contacts.push(contact);
            if (source.notes[originalId]) target.notes[contact.id] = source.notes[originalId];
          }
          target.tasks.push(...source.tasks.map(t => ({ ...t, contactId: contactMap.get(t.contactId) || t.contactId })));
          all[sourceKey] = { contacts: [], notes: {}, tasks: [], customerDemoVersion: source.customerDemoVersion, itemSharingVersion: 1 };

        }
        writes.set(key, JSON.stringify(all));
      }
      const sessionsKey = "eureka:agent-sessions:v1", sessionsRaw = read(sessionsKey);
      if (sessionsRaw) {
        const sessions = JSON.parse(sessionsRaw) as { actor: string; space: string; previousActor?: string; sourceId: string }[];
        for (const session of sessions) if (session.space === workspace.id && session.actor === from) {
          session.previousActor ||= from; session.actor = to;
          const id = session.sourceId?.replace(`${from}:`, "");
          if (contactMap.has(id)) session.sourceId = `${to}:${contactMap.get(id)}`;
        }
        writes.set(sessionsKey, JSON.stringify(sessions));
      }
      for (const kind of ["actions", "thoughts"] as const) {
        // Remove departed recipients from every member's existing action grants.
        if (kind === "actions") for (const member of workspace.members) {
          const grantKey = `eureka:actions:${workspace.id}:${member.id}:v1`;
          const value = read(grantKey);
          if (!value) continue;
          const scoped = JSON.parse(value) as ActionState;
          scoped.records.forEach(record => { record.sharedWith = (record.sharedWith || []).filter(id => id !== from); });
          writes.set(grantKey, JSON.stringify(scoped));
        }
        const fromKey = `eureka:${kind}:${workspace.id}:${from}:v1`, toKey = `eureka:${kind}:${workspace.id}:${to}:v1`;
        const original = read(fromKey);
        if (!original) continue;
        const source = JSON.parse(original) as Omit<ActionState, "records"> & { records: ((ActionRecord | ThoughtRecord) & { contactId?: string })[] };
        const target = JSON.parse(read(toKey) || JSON.stringify(kind === "actions" ? { version: 1, records: [], meetings: [], sessions: [], settings: {} } : { version: 1, records: [] })) as typeof source;
        for (const record of source.records) {
          if (target.records.some(r => r.id === record.id)) record.id = `${from}:${record.id}`;
          record.ownerId = to; record.previousOwnerId ||= from;
          if (record.contactId) record.contactId = contactMap.get(record.contactId) || record.contactId;
          target.records.push(record);
        }
        if (kind === "actions") {
          target.meetings.push(...source.meetings);
          target.sessions.push(...source.sessions);
          source.meetings = []; source.sessions = [];
        }
        source.records = [];
        writes.set(fromKey, JSON.stringify(source)); writes.set(toKey, JSON.stringify(target));
      }
    }
  }
  return writes;
}
