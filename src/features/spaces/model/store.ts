import M from "./core";
import type { WorkspaceState, Workspace } from "./types";
import { stageMemberTransfers } from "./transfers";
export { M };
export function createWorkspaceStore(storage: Storage, now = () => new Date(), options: { key?: string; seed?: (now: Date) => WorkspaceState } = {}) {
  const key = options.key || M.KEY;
  let raw = storage.getItem(key);
  function parse(): WorkspaceState {
    if (raw === null) return (options.seed || M.seed)(now());
    const state = JSON.parse(raw);
    if (
      state?.version !== 2 ||
      !Array.isArray(state.spaces) ||
      !state.account ||
      !state.spaces.some((s: Workspace) => s.id === "personal")
    )
      throw Error("工作空间数据无法读取，请保留浏览器数据后重试");
    const cleaned = M.enrich(state, now());
    if (!JSON.parse(raw).demoWorkspaceCleanupVersion) {
      const json = JSON.stringify(cleaned);
      storage.setItem(key, json);
      raw = json;
    }
    return cleaned;
  }
  let state = parse();
  return {
    read: () => structuredClone(state),
    reload() {
      raw = storage.getItem(key);
      state = parse();
      return structuredClone(state);
    },
    change<T>(fn: (s: WorkspaceState) => T): T {
      if (storage.getItem(key) !== raw)
        throw Error("空间已在其他页面更新，请保留输入并刷新重试");
      const next = structuredClone(state);
      M.reconcileEntitlements(next, now());
      const result = fn(next);
      M.reconcileEntitlements(next, now());
      const json = JSON.stringify(next);
      const writes = stageMemberTransfers(storage, state, next);
      writes.set(key, json);
      const backups = new Map([...writes.keys()].map(k => [k, storage.getItem(k)]));
      const committed: string[] = [];
      try {
        for (const [k, value] of writes) { storage.setItem(k, value); committed.push(k); }
      } catch {
        for (const k of committed.reverse()) {
          const value = backups.get(k)!;
          if (value === null) storage.removeItem(k); else storage.setItem(k, value);
        }
        throw Error("保存失败，请检查浏览器存储空间。输入已保留");
      }
      state = next;
      raw = json;
      window.dispatchEvent(new Event("eureka:data"));
      return result;
    },
  };
}
