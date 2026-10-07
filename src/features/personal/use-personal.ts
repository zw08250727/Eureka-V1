"use client";
import { useEffect, useRef, useState, useCallback } from "react";
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
export function usePersonal() {
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
        contacts: r.contacts.read().personal,
      });
  }, []);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      try {
        repo.current = {
          actions: createActions(localStorage),
          thoughts: createThoughts(localStorage),
          contacts: createContacts(localStorage),
        };
        if (active) refresh();
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    });
    return () => {
      active = false;
    };
  }, [refresh]);
  return { data, error, repo, refresh };
}
export type PersonalController = ReturnType<typeof usePersonal>;
