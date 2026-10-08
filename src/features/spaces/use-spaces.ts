"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createWorkspaceStore, M } from "./model/store";
import type { WorkspaceState } from "./model/types";
import { CREATION_DEMO_KEY, creationDemoSeed } from "./creation-demo";
export function useSpaces(creationDemo = false) {
  const key = creationDemo ? CREATION_DEMO_KEY : M.KEY;
  const repo = useRef<ReturnType<typeof createWorkspaceStore> | null>(null);
  const [state, setState] = useState<WorkspaceState | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const open = () => createWorkspaceStore(localStorage, () => new Date(), creationDemo ? { key, seed: creationDemoSeed } : {});
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        repo.current = open();
        if (active) setState(repo.current.read());
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    });
    const external = (e: StorageEvent) => {
      if (e.key !== null && e.key !== key) return;
      try {
        repo.current = open();
        setState(repo.current.read());
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
  }, [creationDemo, key]);
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
