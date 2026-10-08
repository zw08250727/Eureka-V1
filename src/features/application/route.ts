"use client";
import { useSyncExternalStore } from "react";
const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};
export function useAppRoute() {
  const query = useSyncExternalStore(
    subscribe,
    () => location.search,
    () => "",
  );
  const p = new URLSearchParams(query);
  return {
    view: p.get("view") || "home",
    id: p.get("id") || "",
    space: p.get("space") || "personal",
    actor: p.get("actor") || "zhang",
    memberView: p.get("perspective") === "member",
  };
}
