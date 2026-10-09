import M from "./model/core";
import { appUrl, basePath } from "@/lib/routes";

export const CREATION_DEMO_KEY = "eureka:team-creation-demo:v1";
export const CREATION_DEMO_DRAFT = "eureka:team-creation-draft:v1";
const RETURN_KEY = "eureka:team-creation-return:v1";

export function creationDemoSeed(now = new Date()) {
  const state = M.seed(now);
  state.spaces = state.spaces.filter((w) => w.type === "personal");
  state.devices = state.devices.filter((d) => d.spaceId === "personal");
  state.activeId = "personal";
  state.orders = [];
  return state;
}

export function startCreationDemo(restart = false) {
  try {
    if (!restart) sessionStorage.setItem(RETURN_KEY, location.href);
    localStorage.setItem(CREATION_DEMO_KEY, JSON.stringify(creationDemoSeed()));
    localStorage.removeItem(CREATION_DEMO_DRAFT);
    const url = new URL(appUrl("home", "", "personal", M.SELF), location.origin);
    url.searchParams.set("demo", "create-team");
    url.searchParams.delete("perspective");
    location.assign(url.href);
  } catch {
    window.dispatchEvent(new CustomEvent("eureka:notice", { detail: "演示数据保存失败，请检查浏览器存储后重试" }));
  }
}

export function exitCreationDemo() {
  const fallback = new URL(appUrl("home", "", "personal", M.SELF), location.origin);
  fallback.searchParams.delete("demo");
  fallback.searchParams.delete("perspective");
  let target = fallback;
  try {
    const saved = sessionStorage.getItem(RETURN_KEY);
    if (saved) {
      const url = new URL(saved);
      if (url.origin === location.origin && url.pathname === `${basePath}/workbench/` && !url.searchParams.has("demo")) target = url;
    }
  } catch { /* The original data remains available even without a saved route. */ }
  location.assign(target.href);
}
