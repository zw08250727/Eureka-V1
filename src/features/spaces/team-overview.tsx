import { useState } from "react";
import { RefIcon } from "@/features/reference/symbols";
import { appUrl, navigateLegacy } from "@/lib/routes";
import type { Insight, Workspace } from "./model/types";

export function TeamOverview({ now, workspace, actor, insights, readOnly, agentOpen, onAsk, onInsight, onUpload, onNote }: {
  now: Date;
  workspace: Workspace;
  actor: string;
  insights: Insight[];
  readOnly: boolean;
  agentOpen: boolean;
  onAsk: () => void;
  onInsight: (id: string) => void;
  onUpload: () => void;
  onNote: () => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const names = (insight: Insight) => [...new Set(insight.sources.map(source => {
    const owner = workspace.files.find(f => f.id === source.fileId)?.owner;
    return workspace.members.find(m => m.id === owner)?.name || "已移除成员";
  }))].join("、");
  return <div className="team-overview">
    <header className="team-overview-head">
      <div className="team-overview-title"><h1>工作概览</h1><span>{now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}</span></div>
      <div className="team-overview-actions">
        <button className="team-primary" id="module-start-recording" disabled={readOnly} onClick={() => navigateLegacy("recording")}><RefIcon name="mic" />开始录音</button>
        <button disabled={readOnly} onClick={onUpload}><RefIcon name="upload" />上传</button>
        <button disabled={readOnly} aria-label="Ask Agent" aria-expanded={agentOpen} onClick={() => onAsk()}><RefIcon name="spark" />{agentOpen ? "收起 Agent" : "Ask Agent"}</button>
        <button disabled={readOnly} onClick={onNote}>新建笔记</button>
      </div>
    </header>
    <section className="team-overview-canvas" aria-label="团队工作概览">
      <div className="team-overview-main">
        <section className="team-brief-column ws-team-brief" aria-label="团队简报">
          <header className="team-section-heading"><h2><RefIcon name="spark" />Agent 团队简报</h2><span>近 7 天 · 含未闭环事项</span></header>
          {readOnly ? <p className="team-brief-empty">团队订阅已暂停，简报暂不可用。已有录音、转录与笔记仍可检索。</p> : insights.length ? <div className="team-insights">
            {insights.slice(0, 2).map((insight, index) => <article className="team-insight" key={insight.id} data-insight-id={insight.id}>
              <span className="team-insight-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div className="team-insight-content"><h3 title={insight.title}>{insight.title.replace(" · 跨会议讨论", "")}</h3><p className="team-insight-body"><span>{insight.description}</span>{" "}
                <span className="team-insight-foot"><span title={`${names(insight)}提供 · ${insight.sources.length} 场会议`}>{names(insight)}提供 · {insight.sources.length} 场会议</span><button disabled={readOnly} aria-label={`问问 Agent：${insight.title}`} onClick={() => onInsight(insight.id)}>问问 Agent ↗</button><button aria-expanded={expanded.includes(insight.id)} aria-controls={`insight-evidence-${insight.id}`} onClick={() => setExpanded(current => current.includes(insight.id) ? current.filter(id => id !== insight.id) : [...current, insight.id])}><span aria-hidden="true">{expanded.includes(insight.id) ? "▾" : "▸"}</span>查看会议依据</button></span></p>
                <div className="team-insight-evidence" id={`insight-evidence-${insight.id}`} hidden={!expanded.includes(insight.id)}><p>{insight.description}</p><div>{insight.sources.map(source => <blockquote key={source.fileId}><a href={appUrl("meeting", source.fileId, workspace.id, actor)}>{source.title} ↗</a><p>{source.quote}</p></blockquote>)}</div></div>
              </div>
            </article>)}
          </div> : <p className="team-brief-empty">暂无可整理的会议进展。完成录音或上传后，Agent 将根据您有权访问的会议提炼重点。</p>}
        </section>
      </div>
    </section>
  </div>;
}
