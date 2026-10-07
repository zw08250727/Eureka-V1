"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sidebar, TopBar } from "./components/app-navigation";
import { TodayOverview } from "./components/today-overview";
import { MeetingTable } from "./components/meeting-table";
import { UploadDialog } from "./components/upload-dialog";
import { AgentPanel, type AgentDraft } from "./components/agent-panel";
import { useWorkbench } from "./hooks/use-workbench";
import { reminders } from "./model/selectors";
import type { AgentContext } from "./model/types";
export function Workbench() {
  const {
    data,
    error,
    loading,
    reload,
    toggleTodo,
    upload,
    setUploadDeleted,
    purgeUpload,
  } = useWorkbench();
  const [collapsed, setCollapsed] = useState(false),
    [agent, setAgent] = useState(false),
    [uploadOpen, setUploadOpen] = useState(false),
    [title, setTitle] = useState(reminders[0]),
    [now, setNow] = useState<Date | null>(null);
  const [draft, setDraft] = useState<AgentDraft>({
    context: { kind: "page", title: "个人首页", lines: [] },
    text: "",
    sequence: 0,
  });
  const host = useRef<HTMLDivElement>(null);
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
        text: `帮我结合今天的记录安排下一步\n\n${context.lines.join("\n")}`,
        sequence: d.sequence + 1,
      }));
      setAgent(true);
    } else setAgent((v) => !v);
  }
  return (
    <div
      className={`workbench min-h-dvh ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <Sidebar
        collapsed={collapsed}
        toggle={() => setCollapsed((v) => !v)}
        data={data}
        onHome={() => {
          rotate();
          setCollapsed(false);
        }}
      />
      <div className="app-body min-w-0">
        <TopBar toggleSidebar={() => setCollapsed((v) => !v)} />
        <main className="app-main" id="home">
          <div
            ref={host}
            className={`workbench-layout ${agent ? "agent-open" : ""}`}
          >
            <div className="home-content min-w-0">
              {error ? (
                <div className="load-error" role="alert">
                  {error}
                  <Button onClick={() => void reload()}>重新读取</Button>
                </div>
              ) : null}
              {loading && !data ? (
                <p role="status" className="p-6 text-sm">
                  正在读取个人工作台…
                </p>
              ) : null}
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
                  <MeetingTable
                    meetings={data.meetings}
                    recycled={data.recycled}
                    setUploadDeleted={setUploadDeleted}
                    purgeUpload={purgeUpload}
                  />
                </>
              ) : null}
            </div>
            <AgentPanel
              open={agent}
              onClose={() => setAgent(false)}
              host={host}
              draft={draft}
            />
          </div>
        </main>
      </div>
      {uploadOpen ? (
        <UploadDialog onClose={() => setUploadOpen(false)} onUpload={upload} />
      ) : null}
    </div>
  );
}
