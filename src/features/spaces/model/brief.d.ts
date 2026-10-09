export interface BriefSourceFile {
  id: string;
  title: string;
  owner: string;
  created: string;
  occurredAt?: string;
  summary: string;
  transcript: string;
  detail?: { briefFacts?: unknown };
}
export interface BriefItem {
  id: string;
  topic: string;
  title: string;
  label: string;
  kind: "risk" | "fact";
  description: string;
  next: string;
  impact: string;
  sources: {
    fileId: string;
    title: string;
    owner: string;
    created: string;
    quote: string;
  }[];
  updatedAt: string;
  priority: number;
  timestamp: number;
}
export function buildTeamBrief(
  files: BriefSourceFile[],
  now?: Date,
): BriefItem[];
