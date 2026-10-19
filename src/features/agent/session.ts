"use client";
import { marketStorage, captureMarketStorage } from "@/features/markets/storage";

import { M, createWorkspaceStore } from "@/features/spaces/model/store";
import { CREATION_DEMO_KEY } from "@/features/spaces/creation-demo";
import { mockUsageReceipt, type UsageReceipt } from "./usage";
import { reportAgentAttempt } from "./feedback";
import { AgentScope } from "./scope";
import { useContext, useRef } from "react";
import { agentRoute, SCENES } from "./registry";
export type AgentScene = keyof typeof SCENES;
export interface AgentSession {
  id: string;
  agentId: string;
  scene: AgentScene;
  dataMcp: string[];
  skills: string[];
  space: string;
  actor: string;
  sourceId: string;
  title: string;
  time: string;
  messages: { role: string; text: string }[];
  runIds?: string[];
}
export const SESSION_KEY = "eureka:agent-sessions:v1";
export function readSessions(storage: Storage): AgentSession[] {
  const value = JSON.parse(storage.getItem(SESSION_KEY) || "[]");
  if (!Array.isArray(value) || value.some((s) => !s?.id || !s.space || !s.actor || !Array.isArray(s.messages)))
    throw Error("会话记录无法读取，请保留浏览器数据后重试");
  return value;
}
export function appendSession(storage: Storage, context: Omit<AgentSession, "title" | "time" | "messages">, prompt: string, answer: string, initial?: { title: string; messages: AgentSession["messages"] }, runId?: string) {
  const sessions = readSessions(storage);
  const previous = sessions.find((s) => s.id === context.id);
  if (previous && (previous.space !== context.space || previous.actor !== context.actor))
    throw Error("无法访问此会话");
  if (runId && previous?.runIds?.includes(runId)) return previous;
  const next = {
    ...context,
    runIds: [...(previous?.runIds || []), ...(runId ? [runId] : [])],
    title: previous?.title || initial?.title || prompt.slice(0, 60),
    time: new Date().toISOString(),
    messages: [...(previous?.messages || initial?.messages || []), { role: "user", text: prompt }, { role: "assistant", text: answer }],
  };
  storage.setItem(SESSION_KEY, JSON.stringify([next, ...sessions.filter((s) => s.id !== context.id)]));
  return next;
}
// All scene UIs use this one session service. Adapters retain scene-specific local data and confirmation flows.
export function useSceneAgent(scene: AgentScene, sourceId = "", resumeId?: string, initial?: { title: string; messages: AgentSession["messages"] }) {
  const query = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
  const scope = useContext(AgentScope);
  const space = scope?.space || query.get("space") || "personal", actor = scope?.actor || query.get("actor") || "zhang";
  const storageKey = query.get("demo") === "create-team" ? CREATION_DEMO_KEY : M.KEY;
  function ensureAvailable() {
    const w = M.get(createWorkspaceStore(marketStorage, () => new Date(), { key: storageKey }).read(), space);
    reportAgentAttempt(w, actor);
    M.assertAgentAvailable(w, actor);
    if (w.type === "team" && scene === "meeting" && sourceId) M.getFile(w, sourceId, actor);
  }
  const current = useRef({ id: resumeId || "", sourceId, scene });
  function reset() { current.current = { id: "", sourceId, scene }; }
  type Origin = { runId: string; sessionId: string; storage: Storage; route: ReturnType<typeof agentRoute> };
  function record(prompt: string, answer: string, receipt: UsageReceipt | null = mockUsageReceipt(crypto.randomUUID()), origin?: Origin) {
    if (!origin) {
      if (current.current.sourceId !== sourceId || current.current.scene !== scene) reset();
      if (!current.current.id) current.current.id = crypto.randomUUID();
    }
    const runId = origin?.runId || receipt?.runId || crypto.randomUUID();
    const storage = origin?.storage || marketStorage, sessionId = origin?.sessionId || current.current.id;
    createWorkspaceStore(storage, () => new Date(), { key: storageKey }).change(s => {
      const w = M.get(s, space);
      M.assertEntitlement(w, actor);
      M.recordAgentUsage(w, runId, prompt, receipt, actor, scene);
    });
    try {
      appendSession(storage, {
        ...(origin?.route || agentRoute(scene)), id: sessionId, scene, sourceId, space, actor,
      }, prompt, answer, sessionId === resumeId ? initial : undefined, runId);
      window.dispatchEvent(new Event("eureka:agent-history"));
    } catch (error) {
      window.dispatchEvent(new CustomEvent("eureka:notice", { detail: "回答已生成，但历史会话保存失败：" + (error as Error).message }));
    }
    return answer;
  }
  function begin(prompt: string) {
    ensureAvailable();
    if (current.current.sourceId !== sourceId || current.current.scene !== scene) reset();
    if (!current.current.id) current.current.id = crypto.randomUUID();
    const origin: Origin = { sessionId: current.current.id, storage: captureMarketStorage(), runId: crypto.randomUUID(), route: agentRoute(scene) };
    return {
      runId: origin.runId,
      complete: (answer: string, receipt: UsageReceipt | null) => record(prompt, answer, receipt, origin),
      pending: () => createWorkspaceStore(origin.storage, () => new Date(), { key: storageKey }).change(s => {
        const w = M.get(s, space);
        // A failed transport does not prove zero token usage. Never replace a final receipt.
        if (!w.agentRuns?.some(r => r.runId === origin.runId)) M.recordAgentUsage(w, origin.runId, prompt, null, actor, scene);
      }),
    };
  }
  function run(prompt: string, adapter: (route: ReturnType<typeof agentRoute>) => string) {
    try { ensureAvailable(); return record(prompt, adapter(agentRoute(scene))); }
    catch (error) { const message = (error as Error).message; window.dispatchEvent(new CustomEvent("eureka:notice", { detail: message })); return undefined; }
  }
  return { record, run, reset, ensureAvailable, begin };
}
