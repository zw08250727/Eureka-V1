export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const assetUrl = (path: string) =>
  `${basePath}/prototype/one-to-one-reference/assets/${path}`;
export const prdUrl = `${basePath}/prototype/prd/index.html`;
export type AppView =
  | "home"
  | "calendar"
  | "contacts"
  | "thoughts"
  | "meeting"
  | "recording"
  | "devices"
  | "settings"
  | "subscription"
  | "history"
  | "spaces"
  | "create-team"
  | "invitations"
  | "members"
  | "credits"
  | "space-settings"
  | "audit"
  | "tasks"
  | "trash";
export function appUrl(
  view: AppView = "home",
  id = "",
  space?: string,
  actor?: string,
) {
  const current =
    typeof window === "undefined" ? null : new URLSearchParams(location.search);
  const workspace = space ?? current?.get("space") ?? "personal";
  const query = new URLSearchParams({
    view: view === "spaces" ? "home" : view,
    space: view === "spaces" ? id : workspace,
  });
  if (id && view !== "spaces") query.set("id", id);
  if (actor || current?.get("actor"))
    query.set("actor", actor || current!.get("actor")!);
  return `${basePath}/workbench/?${query}`;
}
export const legacyUrl = appUrl;
export const requestRecording = (id = "") =>
  window.dispatchEvent(
    new CustomEvent("eureka:record-request", { detail: { id } }),
  );
export const navigateLegacy = (view: AppView, id?: string) =>
  view === "recording"
    ? requestRecording(id)
    : window.location.assign(appUrl(view, id));
