import { countMonthlyFeedbackRewards } from "@/features/account/rewards";
import { marketConfig } from "@/features/markets/config";
import { M } from "@/features/spaces/model/store";
import { grantCredits } from "@/features/spaces/model/credit-ledger";
import type { WorkspaceState } from "@/features/spaces/model/types";
import type { MeetingFeedback } from "./types";
/** The rating and reward use the same workspace transaction; retries cannot grant twice. */
export function submitMeetingFeedback(state:WorkspaceState, workspaceId:string, meetingId:string, actor:string, rating:MeetingFeedback, summaryId?:string) {
  const feedbackKey=summaryId ? `${meetingId}/${summaryId}` : meetingId;
  if(!Number.isInteger(rating.score)||rating.score<1||rating.score>10||rating.content.length>100||(rating.score<=6&&!rating.reasons.length))throw Error("请完善评分和评价原因");
  const w=M.get(state,workspaceId);
  if(w.type==='team') {
    const file=M.visible(w,actor).find(f=>f.id===meetingId);
    if(!file||!M.canEdit(w,file,actor))throw Error("此录音为只读");
    if(summaryId) {
      const summaries=file.detail?.summaries as import("./summaries").MeetingSummary[] | undefined;
      const selected=summaries?.find(s=>s.id===summaryId);
      if(!selected)throw Error("总结不存在");
      if(selected.feedback)throw Error("已提交评价");
      M.saveDetail(w,meetingId,{summaries:summaries!.map(s=>s.id===summaryId?{...s,feedback:rating}:s)},actor);
    } else {
      if(file.detail?.feedbackDetail)throw Error("已提交评价");
      M.saveDetail(w,meetingId,{feedback:rating.score,feedbackDetail:rating},actor);
    }
  } else {
    if(!M.member(w,actor))throw Error("无权评价此录音");
    w.meetingFeedback ||= {};
    if(w.meetingFeedback[feedbackKey])throw Error("已提交评价");
    w.meetingFeedback[feedbackKey]=rating;
  }
  // Team credits remain an administrator-funded pool. A member's reward, when
  // their personal account is available, always belongs to that personal account.
  const personal=state.spaces.find(p=>p.type==='personal' && !!M.member(p,actor));
  if(personal){
    const now=new Date(rating.time),expires=new Date(now);expires.setFullYear(expires.getFullYear()+1);
    const id=`meeting-feedback:${workspaceId}:${feedbackKey}:${actor}`;
    const rewards=personal.rewards ||= {entries:[]};
    const used=countMonthlyFeedbackRewards(rewards.entries, now);
    if(used >= marketConfig().rewardLimits.feedback)return;
    grantCredits(personal,{id,category:'task',label:'会议总结评分奖励',amount:500,remaining:500,time:now.toISOString(),expires:expires.toISOString()});
    if(!rewards.entries.some(e=>e.id===id))rewards.entries.unshift({id,label:'会议总结评分奖励',amount:500,time:now.toISOString(),expires:expires.toISOString()});
  }
}
