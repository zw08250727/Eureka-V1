import "./team-overview-ui.css";
import { PrivateOverview } from "./private-overview";
import { RefIcon } from "@/features/reference/symbols";
import { navigateLegacy } from "@/lib/routes";
import type { Workspace } from "./model/types";
import type { WeeklySummaryGenerationRequest } from "./model/weekly-summary";
import { WeeklyMeetings } from "./weekly-summary";

export function TeamOverview({ now, workspace, actor, readOnly, agentOpen, onAsk, onReviewWeek, onUpload }: {
  now: Date;
  workspace: Workspace;
  actor: string;
  readOnly: boolean;
  agentOpen: boolean;
  onAsk: () => void;
  onReviewWeek: (prompt:string,fileIds:string[])=>void;
  onUpload: () => void;
  onNote: () => void;
}) {
  return <div className="team-overview team-overview-refined">
    <header className="team-overview-head">
      <div className="team-overview-title"><h1>工作概览</h1><span>{now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}</span></div>
      <div className="team-overview-actions">
        <button className="team-primary" id="module-start-recording" disabled={readOnly} onClick={() => navigateLegacy("recording")}><RefIcon name="mic" />开始录音</button>
        <button disabled={readOnly} onClick={onUpload}><RefIcon name="upload" />上传</button>
        <button disabled={readOnly} aria-label="Ask Agent" aria-expanded={agentOpen} onClick={() => onAsk()}><RefIcon name="spark" />{agentOpen ? "收起 Agent" : "Ask Agent"}</button>
      </div>
    </header>
    <section className="team-overview-canvas" aria-label="团队工作概览">
      <div className="team-overview-main">
        <WeeklyMeetings workspace={workspace} space={workspace.id} actor={actor} now={now} readOnly={readOnly}
          onAsk={(request:WeeklySummaryGenerationRequest)=>onReviewWeek(request.prompt,request.sourceIds)}/>
      </div>
      <PrivateOverview key={`${workspace.id}:${actor}`} space={workspace.id} actor={actor} now={now} readOnly={readOnly} />
    </section>
  </div>;
}
