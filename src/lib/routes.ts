export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const assetUrl = (path: string) =>
  `${basePath}/prototype/one-to-one-reference/assets/${path}`;
export const prdUrl = `${basePath}/prototype/prd/index.html`;
export type LegacyEntry =
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
  | "invitations";
export function legacyUrl(entry: LegacyEntry, id = "") {
  const query = new URLSearchParams({
    edition: "personal",
    personal: "1",
    migration: "1",
    entry,
  });
  if (id) query.set("target", id);
  return `${basePath}/prototype/one-to-one-reference/team-only-app.html?${query}`;
}
export const navigateLegacy = (entry: LegacyEntry, id?: string) => {
  window.location.assign(legacyUrl(entry, id));
};
