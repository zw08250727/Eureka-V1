"use client";
import { useEffect, useRef, useState } from "react";
import { PersonalHistoryAgent } from "@/features/spaces/management-history";
import { Button } from "@/components/ui/button";
import { TodayOverview } from "./components/today-overview";
import { MeetingTable } from "./components/meeting-table";
import { UploadDialog } from "./components/upload-dialog";
import { AgentPanel, type AgentDraft } from "./components/agent-panel";
import { useWorkbench } from "./hooks/use-workbench";
import { reminders } from "./model/selectors";
import type { AgentContext } from "./model/types";
export function Workbench({
  recycle = false,
  historyId,
}: {
  recycle?: boolean;
  historyId?: string;
}) {
  const {
    data,
    error,
    loading,
    reload,
    toggleTodo,
    upload,
    setUploadDeleted,
    setMeetingTag,
    purgeUpload,
  } = useWorkbench();
  const [agent, setAgent] = useState(false),
    [uploadOpen, setUploadOpen] = useState(false),
    [title, setTitle] = useState(reminders[0]),
    [now, setNow] = useState<Date | null>(null);
  const [draft, setDraft] = useState<AgentDraft>({
    context: { kind: "page", title: "个人首页", lines: [] },
    text: "",
    sequence: 0,
  });
  const host = useRef<HTMLDivElement>(null);
  const historyReady = !!data && !!now;
  useEffect(() => {
    if (!historyId || !historyReady) return;
    // Match the original action: lay out the home before expanding its history.
    const frame = requestAnimationFrame(() => setAgent(true));
    return () => cancelAnimationFrame(frame);
  }, [historyId, historyReady]);
  function rotate() {
    let previous = "";
    try {
      previous = sessionStorage.getItem("eureka:last-today-reminder") || "";
    } catch {
      /* greeting is not business data */
    }
    const choices = reminders.filter((r) => r !== previous);
    const next = choices[Math.floor(Math.random() * choices.length)];
    setTitle(next);
    try {
      sessionStorage.setItem("eureka:last-today-reminder", next);
    } catch {
      /* keep in-memory greeting */
    }
  }
  useEffect(() => {
    const start = requestAnimationFrame(() => {
      setNow(new Date());
      rotate();
    });
    const timer = setInterval(() => {
      if (!document.hidden) {
        setNow(new Date());
        rotate();
      }
    }, 60000);
    return () => {
      cancelAnimationFrame(start);
      clearInterval(timer);
    };
  }, []);
  function openAgent(context?: AgentContext) {
    if (context) {
      setDraft((d) => ({
        context,
        text: `请结合今天的日程、待办、灵感与记账，整理当前重点、建议的行动顺序和需要确认的问题。请说明依据，不把建议当成已经完成的工作。\n\n今日工作简报：\n${context.lines.join("\n\n")}`,
        sequence: d.sequence + 1,
      }));
      setAgent(true);
    } else setAgent((v) => !v);
  }
  if (recycle && data)
    return (
      <MeetingTable
        recycle
        meetings={data.meetings}
        recycled={data.recycled}
        setUploadDeleted={setUploadDeleted}
        purgeUpload={purgeUpload}
        setMeetingTag={setMeetingTag}
      />
    );
  return (
    <div className="main-inner" data-main-view="home">
      <section className="recording-home" aria-label="录音工作首页">
        <div
          ref={host}
          className={`meeting-agent-grid ${agent ? "agent-open" : ""}`}
          id="meeting-agent-grid"
        >
          <div className="home-content-stack">
            {error ? (
              <div role="alert">
                {error}
                <Button onClick={() => void reload()}>重新读取</Button>
              </div>
            ) : null}
            {loading && !data ? <p role="status">正在读取个人工作台…</p> : null}
            {data && now ? (
              <>
                <TodayOverview
                  data={data}
                  now={now}
                  title={title}
                  onHomeAgent={openAgent}
                  agentOpen={agent}
                  onUpload={() => setUploadOpen(true)}
                  onToggle={(id) => void toggleTodo(id)}
                />
                <div className="pa-archive-wrap">
                  <MeetingTable
                    meetings={data.meetings}
                    recycled={data.recycled}
                    setUploadDeleted={setUploadDeleted}
                    purgeUpload={purgeUpload}
                    setMeetingTag={setMeetingTag}
                  />
                </div>
              </>
            ) : null}
          </div>
          {historyId ? (
            data && now && agent ? (
              <PersonalHistoryAgent
                id={historyId}
                onClose={() => setAgent(false)}
              />
            ) : null
          ) : (
            <AgentPanel
              files={data?.meetings}
              open={agent}
              onClose={() => setAgent(false)}
              host={host}
              draft={draft}
            />
          )}
        </div>
      </section>
      {uploadOpen ? (
        <UploadDialog onClose={() => setUploadOpen(false)} onUpload={upload} />
      ) : null}
    </div>
  );
}
