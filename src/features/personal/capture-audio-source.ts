import baseline from "@/features/workbench/model/baseline.json";
import { demoWeek } from "@/features/workbench/model/demo-week";
import { assetUrl } from "@/lib/routes";
import { isSafeAudioUrl } from "@/features/meetings/audio-source";

// Only existing, explicit sample records may use the repository's audio fixture.
const samples = new Set([
  ...baseline.actions.records.filter(r => r.source === "capture").map(r => r.id),
  ...baseline.thoughts.filter(r => r.source === "capture").map(r => r.id),
  ...demoWeek.flatMap(d => ["schedule", "todo", "inspiration", "ledger"].map(t => `demo-week-${d.date}-${t}`)),
]);
export function captureAudioSource(record: { id: string; source?: string; captureAudioUrl?: string; deleted?: boolean }) {
  if (record.deleted) return "";
  if (record.captureAudioUrl !== undefined)
    return isSafeAudioUrl(record.captureAudioUrl) ? record.captureAudioUrl : "";
  return record.source === "capture" && samples.has(record.id) ? assetUrl("meeting-demo.wav") : "";
}
