export interface MeetingDetail {
  marks?: number[];
  deleted?: boolean;
  purged?: boolean;
  deletedAt?: string;
  id: string;
  title: string;
  summary: string;
  transcript: string;
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
