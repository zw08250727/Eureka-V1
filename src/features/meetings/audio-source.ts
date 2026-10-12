import { assetUrl } from "@/lib/routes";
import baseline from "./baseline.json";
import type { MeetingDetail } from "./types";

// Exact fixture IDs only. Never infer sample status from a prefix, title, source,
// duration or the absence of an audio URL. Team IDs mirror core.seed/enrich.
const fixtureIds = new Set<string>([
  ...baseline.map(record => record.id),
  "team-review", "team-customer", "team-private", "team-market",
  "team-demo-delivery", "team-demo-pilot", "team-demo-research",
  "team-demo-planning", "team-demo-sales", "team-demo-design",
  "team-demo-launch", "team-demo-retro",
  "daily-insight-team-eureka-0", "daily-insight-team-eureka-1", "daily-insight-team-eureka-2",
  ...["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"]
    .flatMap(date => [0, 1].map(index => `demo-week-team-eureka-${date}-${index}`)),
]);

/** Only explicit web resources; reject executable/data/file URLs and URL ambiguity. */
export function isSafeAudioUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value || /[\s\u0000-\u001f\u007f\\<>"']/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  if (!/^https:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && Boolean(url.hostname);
  } catch { return false; }
}

export function meetingAudioSource(r: Pick<MeetingDetail, "id" | "audioUrl" | "deleteSourceAudio" | "deleted" | "purged">): string {
  if (r.deleteSourceAudio === true || r.deleted || r.purged) return "";
  // A malformed explicit source is an error, not permission to play a fixture.
  if (r.audioUrl !== undefined && r.audioUrl !== "") return isSafeAudioUrl(r.audioUrl) ? r.audioUrl : "";
  return fixtureIds.has(r.id) ? assetUrl("meeting-demo.wav") : "";
}
