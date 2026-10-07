"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createLocalRepository } from "../model/local-repository";
import type { WorkbenchRepository, WorkbenchSnapshot } from "../model/types";
export function useWorkbench() {
  const repo = useRef<WorkbenchRepository | null>(null);
  const [data, setData] = useState<WorkbenchSnapshot | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      repo.current ??= createLocalRepository(localStorage);
      setData(await repo.current.load());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "读取失败，请重试");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    const repository = createLocalRepository(localStorage);
    repo.current = repository;
    repository
      .load()
      .then((value) => {
        if (active) {
          setData(value);
          setError("");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(String(e.message));
          setLoading(false);
        }
      });
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === null ||
        e.key.startsWith("eureka:") ||
        e.key === "baizhi-v14-contacts"
      )
        void reload();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [reload]);
  const setMeetingTag = useCallback(async (id: string, tag: string) => {
    if (!repo.current) throw Error("页面尚未加载完成");
    setData(await repo.current.setMeetingTag(id, tag));
  }, []);
  const toggleTodo = useCallback(async (id: string) => {
    try {
      if (!repo.current) throw Error("页面尚未加载完成");
      setData(await repo.current.toggleTodo(id));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  const upload = useCallback(async (file: File) => {
    if (!repo.current) throw Error("页面尚未加载完成");
    setData(await repo.current.upload(file));
    setError("");
  }, []);
  const setUploadDeleted = useCallback(async (id: string, deleted: boolean) => {
    if (!repo.current) throw Error("页面尚未加载完成");
    setData(await repo.current.setUploadDeleted(id, deleted));
  }, []);
  const purgeUpload = useCallback(async (id: string) => {
    if (!repo.current) throw Error("页面尚未加载完成");
    setData(await repo.current.purgeUpload(id));
  }, []);
  return {
    data,
    error,
    loading,
    reload,
    toggleTodo,
    setMeetingTag,
    upload,
    setUploadDeleted,
    purgeUpload,
  };
}
