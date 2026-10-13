import { marketUrl } from "@/features/markets/config";

// Only the domestic workbench can receive a resumed personal/team intent.
// Never forward credentials, foreign-market URLs or arbitrary return destinations.
export function personalDestination(value?: string | null) {
  const fallback = marketUrl("cn", "workbench/?view=home&space=personal");
  if (!value) return fallback;
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || url.pathname !== marketUrl("cn", "workbench/")) return fallback;
    return url.pathname + url.search;
  } catch { return fallback; }
}
// Full-page navigation keeps enterprise authentication ready for its own domain.
// Until a domain is supplied, use the independent local enterprise route.
export function enterpriseLoginUrl() {
  return marketUrl("cn", "enterprise/login/");
}
