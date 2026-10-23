import type { MeetingSummary } from "./summaries";
export interface TranscriptSegment {
  at: number;
  speaker: number;
  text: string;
  en: string;
  speakerName?: string;
  highlights?: { start: number; end: number }[];
}
export interface MeetingFeedback {
  score: number;
  reasons: string[];
  content: string;
  time: string;
}
/** Optional source context; absence does not imply a failure or disabled setting. */
export interface MeetingContentState {
  recordingStatus?: string | number;
  /** Source viewType 2/3 indicates no substantive content; never infer from duration. */
  viewType?: number;
  /** Source subStatus 300001 means transcription quota was insufficient. */
  transcriptSubStatus?: number;
  autoTranslateEverEnabled?: boolean | 0 | 1;
}
export interface MeetingDetail {
  recordingMode?: "environment" | "call";
  audioUrl?: string;
  deleteSourceAudio?: boolean;
  contentState?: MeetingContentState;
  summaries?: MeetingSummary[];
  segments?: TranscriptSegment[];
  silentParticipants?: string[];
  feedbackDetail?: MeetingFeedback;
  images?: {name: string; url: string}[];
  marks?: number[];
  deleted?: boolean;
  purged?: boolean;
  deletedAt?: string;
  id: string;
  title: string;
  summary: string;
  transcript: string;
  translation?: string;
  verbatim: string;
  summaryHtml?: string;
  verbatimHtml?: string;
  source: string;
  created: string;
  duration: number;
  template: string;
  language: string;
  detail: string;
  speakers: string[];
  tags: string[];
  customerType?: string;
  projectType?: string;
  customer: string;
  project: string;
  location: string;
  updated: string;
  generated: Record<string, string | boolean>;
  feedback: number;
}
