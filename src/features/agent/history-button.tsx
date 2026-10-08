"use client";
import "./history.css";
import { createContext, useContext, useState } from "react";
import { RefIcon } from "@/features/reference/symbols";
import { ReferenceDialog } from "@/features/reference/dialog";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { M } from "@/features/spaces/model/store";
import { appUrl } from "@/lib/routes";
import { readSessions, SESSION_KEY } from "./session";

export const AgentScope = createContext<{
  controller: SpacesController;
  space: string;
  actor: string;
} | null>(null);
const seeds = [
  "本周会议决策整理", "研发周报自动整理", "客户访谈高频问题", "周报与行动项",
];
type HistoryRow = {
  id: string;
  title: string;
  time: string;
  kind: "team" | "session" | "seed";
};

export function AgentHistoryButton() {
  const scope = useContext(AgentScope);
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState("");
  if (!scope) return null;
  const { controller, space, actor } = scope;

  function refresh() {
    try {
      const w = M.get(controller.state!, space);
      if (!M.member(w, actor)) throw Error("没有访问此工作空间的权限");
      if (w.type === "team") {
        setRows(M.history(w, actor).map((t) => ({
          id: t.id, title: t.title || t.prompt, time: t.time, kind: "team",
        })));
      } else {
        const sessions = readSessions(localStorage).filter(
          (s) => s.space === space && s.actor === actor,
        );
        setRows([
          ...sessions.map((s): HistoryRow => ({
            id: s.id, title: s.title, time: s.time, kind: "session",
          })),
          ...(actor === M.SELF ? seeds
            .filter((title) => !sessions.some((s) => s.id === "seed:" + title))
            .map((title): HistoryRow => ({
              id: title, title, time: "示例会话", kind: "seed",
            })) : []),
        ]);
      }
      setError("");
    } catch (e) {
      setRows([]);
      setError((e as Error).message);
    }
  }

  function remove(id: string, kind: HistoryRow["kind"]) {
    try {
      if (kind === "team") {
        controller.change((s) => M.deleteConversation(M.get(s, space), id, actor));
      } else {
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          readSessions(localStorage).filter(
            (s) => !(s.id === id && s.space === space && s.actor === actor),
          ),
        ));
      }
      setRows((list) => list?.filter((s) => s.id !== id) || []);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <button
        type="button"
        className="agent-new-task agent-history-button"
        aria-label="历史会话"
        title="历史会话"
        onClick={refresh}
      >
        <RefIcon name="clock" />
      </button>
      {rows !== null && (
        <ReferenceDialog
          className="unified-agent-history"
          label="历史会话"
          onClose={() => setRows(null)}
        >
          <header>
            <div><h2>历史会话</h2><p>Ask Agent · 当前空间 · 仅本人可见</p></div>
            <button type="button" aria-label="关闭历史会话" onClick={() => setRows(null)}>
              <RefIcon name="x" />
            </button>
          </header>
          {error && <p role="alert">{error}</p>}
          {!rows.length && !error && (
            <p className="agent-history-empty">暂无历史会话，发送问题后会自动保存。</p>
          )}
          <div className="agent-history-list">
            {rows.map((row) => (
              <div className="agent-history-item" key={row.id}>
                <a href={appUrl("history", row.id, space, actor)}>
                  <span>{row.title}</span>
                  <small>{row.time === "示例会话" ? row.time : new Date(row.time).toLocaleString("zh-CN")}</small>
                </a>
                {row.kind !== "seed" && (
                  <button type="button" aria-label={"删除会话：" + row.title} onClick={() => remove(row.id, row.kind)}>
                    <RefIcon name="trash" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </ReferenceDialog>
      )}
    </>
  );
}
