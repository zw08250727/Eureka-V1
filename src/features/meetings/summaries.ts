import type { MeetingDetail, MeetingFeedback } from "./types";
export interface MeetingSummary {
  id: string;
  title: string;
  text: string;
  html?: string;
  template?: string;
  updated?: string;
  source?: "default" | "agent_generated";
  feedback?: MeetingFeedback;
}
/** Compatibility adapter: existing records keep their default summary. */
export function meetingSummaries(r: MeetingDetail): MeetingSummary[] {
  return r.summaries?.length ? r.summaries : [{id:"default",title:"默认总结",text:r.summary,html:r.summaryHtml,template:r.template,updated:r.updated,source:"default",feedback:r.feedbackDetail}];
}
export function summaryView(r: MeetingDetail, id: string): MeetingDetail {
  const summary=meetingSummaries(r).find(s=>s.id===id) || meetingSummaries(r).at(-1)!;
  return {...r,summary:summary.text,summaryHtml:summary.html,template:summary.template || r.template,updated:summary.updated || r.updated,feedback:summary.feedback?.score || 0,feedbackDetail:summary.feedback};
}
export function updateSummary(r: MeetingDetail, id: string, patch: Partial<MeetingDetail>): Partial<MeetingDetail> {
  if(patch.summaries)return patch;
  if(!r.summaries?.length || !("summary" in patch || "summaryHtml" in patch || "template" in patch || "feedbackDetail" in patch))return patch;
  const summaries=r.summaries.map(s=>s.id===id?{...s,...("summary" in patch?{text:patch.summary!}:{}),...("summaryHtml" in patch?{html:patch.summaryHtml}:{}),...("template" in patch?{template:patch.template}:{}),...("feedbackDetail" in patch?{feedback:patch.feedbackDetail}:{}),...("summary" in patch || "summaryHtml" in patch ? {updated:new Date().toISOString()} : {})}:s);
  const primary=summaries[0];
  return {...patch,summaries,summary:primary.text,summaryHtml:primary.html || "",template:primary.template || r.template,feedback:primary.feedback?.score || 0,feedbackDetail:primary.feedback};
}
