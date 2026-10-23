/* eslint-disable @next/next/no-img-element -- Reuse the project's original microphone/ear SVG assets. */
import { basePath } from "@/lib/routes";
import { recordingMode, recordingModeLabel } from "./recording-mode";

export function RecordingModeIcon({ record, size = 24, className }: {
  record: Parameters<typeof recordingMode>[0]; size?: number; className?: string;
}) {
  const mode = recordingMode(record), label = recordingModeLabel(record);
  return <img className={className} src={`${basePath}/assets/baizhi/meeting/recording-${mode === "call" ? "ear" : "mic"}-source.svg`} width={size} height={size} alt={label} title={label} data-recording-mode={mode} />;
}
