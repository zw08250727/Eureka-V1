export type RecordingMode = "environment" | "call";

// Explicit built-in review examples; a device model by itself never implies a call.
const callSamples = new Set(["meeting-3", "meeting-4", "meeting-14", "team-demo-pilot", "team-demo-research", "team-demo-sales"]);
export function recordingMode(record: { id?: string; source: string; recordingMode?: string }): RecordingMode {
  if (!["W1", "W2", "M1"].includes(record.source)) return "environment";
  if (record.recordingMode === "environment") return "environment";
  return record.recordingMode === "call" || callSamples.has(record.id || "") ? "call" : "environment";
}
export const recordingModeLabel = (record: Parameters<typeof recordingMode>[0]) => recordingMode(record) === "call" ? "通话模式" : "环境模式";
