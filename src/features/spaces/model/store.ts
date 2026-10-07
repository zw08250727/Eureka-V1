import M from "./core";
import type { WorkspaceState, Workspace } from "./types";
export { M };
export function createWorkspaceStore(storage: Storage) {
  let raw = storage.getItem(M.KEY);
  function parse(): WorkspaceState {
    if (raw === null) return M.seed();
    const state = JSON.parse(raw);
    if (
      state?.version !== 2 ||
      !Array.isArray(state.spaces) ||
      !state.account ||
      !state.spaces.some((s: Workspace) => s.id === "personal")
    )
      throw Error("工作空间数据无法读取，请保留浏览器数据后重试");
    return M.enrich(state);
  }
  let state = parse();
  return {
    read: () => structuredClone(state),
    reload() {
      raw = storage.getItem(M.KEY);
      state = parse();
      return structuredClone(state);
    },
    change<T>(fn: (s: WorkspaceState) => T): T {
      if (storage.getItem(M.KEY) !== raw)
        throw Error("空间已在其他页面更新，请保留输入并刷新重试");
      const next = structuredClone(state);
      const result = fn(next);
      const json = JSON.stringify(next);
      try {
        storage.setItem(M.KEY, json);
      } catch {
        throw Error("保存失败，请检查浏览器存储空间。输入已保留");
      }
      state = next;
      raw = json;
      window.dispatchEvent(new Event("eureka:data"));
      return result;
    },
  };
}
