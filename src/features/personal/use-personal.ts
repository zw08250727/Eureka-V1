"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { ensureTeamCustomerDemo } from "./team-customer-demo";
import {
  createActions,
  createThoughts,
  createContacts,
  type ContactsState,
} from "./store";
import type {
  ActionState,
  ThoughtRecord,
} from "@/features/workbench/model/types";
export function usePersonal(accountId = "zhang", workspaceId = "personal") {
  const repo = useRef<{
    actions: ReturnType<typeof createActions>;
    thoughts: ReturnType<typeof createThoughts>;
    contacts: ReturnType<typeof createContacts>;
  } | null>(null);
  const [data, setData] = useState<{
      actions: ActionState;
      thoughts: ThoughtRecord[];
      contacts: ContactsState;
    } | null>(null),
    [error, setError] = useState("");
  const refresh = useCallback(() => {
    const r = repo.current;
    if (r)
      setData({
        actions: r.actions.read(),
        thoughts: r.thoughts.read().records,
        contacts: r.contacts.readVisible().personal,
      });
  }, []);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      try {
        ensureTeamCustomerDemo(localStorage, workspaceId, accountId);
        repo.current = {
          actions: createActions(localStorage, () => new Date(), accountId, workspaceId),
          thoughts: createThoughts(localStorage, () => new Date(), accountId, workspaceId),
          contacts: createContacts(localStorage, accountId, workspaceId),
        };
        if (active) refresh();
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    });
    const external = (event: StorageEvent) => {
      if (event.key !== null && !["baizhi-v14-contacts", "eureka:workspaces:v2"].includes(event.key)) return;
      if (!repo.current) return;
      try {
        repo.current.contacts = createContacts(localStorage, accountId, workspaceId);
        refresh();
        setError("");
      } catch (error) {
        setData(null);
        setError((error as Error).message);
      }
    };
    const local = () => external({ key: null } as StorageEvent);
    window.addEventListener("eureka:data", local);
    window.addEventListener("storage", external);
    return () => {
      active = false;
      window.removeEventListener("storage", external);
      window.removeEventListener("eureka:data", local);
    };
  }, [refresh, accountId, workspaceId]);
  return { data, error, repo, refresh };
}
export type PersonalController = ReturnType<typeof usePersonal>;
