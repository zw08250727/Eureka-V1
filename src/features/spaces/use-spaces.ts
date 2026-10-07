"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createWorkspaceStore, M } from "./model/store";
import type { WorkspaceState } from "./model/types";
export function useSpaces() {
  const repo = useRef<ReturnType<typeof createWorkspaceStore> | null>(null);
  const [state, setState] = useState<WorkspaceState | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      try {
        repo.current = createWorkspaceStore(localStorage);
        if (active) setState(repo.current.read());
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    });
    const external = (e: StorageEvent) => {
      if (e.key !== null && e.key !== M.KEY) return;
      try {
        setState(createWorkspaceStore(localStorage).read());
        setError("");
      } catch (e) {
        setError((e as Error).message);
      }
    };
    window.addEventListener("storage", external);
    return () => {
      window.removeEventListener("storage", external);
      active = false;
    };
  }, []);
  const change = useCallback(<T>(fn: (s: WorkspaceState) => T) => {
    if (!repo.current) throw Error("工作空间尚未加载");
    const value = repo.current.change(fn);
    setState(repo.current.read());
    setError("");
    return value;
  }, []);
  return { state, error, change, M };
}
export type SpacesController = ReturnType<typeof useSpaces>;
