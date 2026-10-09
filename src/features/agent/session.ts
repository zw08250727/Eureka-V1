"use client";
import { M, createWorkspaceStore } from "@/features/spaces/model/store";
import { CREATION_DEMO_KEY } from "@/features/spaces/creation-demo";
import { useRef } from "react";
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
}
export const SESSION_KEY = "eureka:agent-sessions:v1";
export function readSessions(storage: Storage): AgentSession[] {
  const value = JSON.parse(storage.getItem(SESSION_KEY) || "[]");
  if (!Array.isArray(value) || value.some((s) => !s?.id || !s.space || !s.actor || !Array.isArray(s.messages)))
    throw Error("会话记录无法读取，请保留浏览器数据后重试");
  return value;
}
export function appendSession(storage: Storage, context: Omit<AgentSession, "title" | "time" | "messages">, prompt: string, answer: string, initial?: { title: string; messages: AgentSession["messages"] }) {
  const sessions = readSessions(storage);
  const previous = sessions.find((s) => s.id === context.id);
  if (previous && (previous.space !== context.space || previous.actor !== context.actor))
    throw Error("无法访问此会话");
  const next = {
    ...context,
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
  const space = query.get("space") || "personal", actor = query.get("actor") || "zhang";
  const storageKey = query.get("demo") === "create-team" ? CREATION_DEMO_KEY : M.KEY;
  function ensureAvailable() {
    const w = M.get(createWorkspaceStore(localStorage, () => new Date(), { key: storageKey }).read(), space);
    M.assertEntitlement(w, actor);
    if (w.type === "team" && scene === "meeting" && sourceId) M.getFile(w, sourceId, actor);
  }
  const current = useRef({ id: resumeId || "", sourceId, scene });
  function reset() { current.current = { id: "", sourceId, scene }; }
  function record(prompt: string, answer: string) {
    if (current.current.sourceId !== sourceId || current.current.scene !== scene) reset();
    if (!current.current.id) current.current.id = crypto.randomUUID();
    ensureAvailable();
    createWorkspaceStore(localStorage, () => new Date(), { key: storageKey }).change(s => {
      const w = M.get(s, space);
      const usage = M.simulatedTokenUsage(prompt, answer);
      M.settleCredits(w, crypto.randomUUID(), prompt, usage, actor);
    });
    const route = agentRoute(scene);
    try {
      appendSession(localStorage, {
        ...route, id: current.current.id, scene, sourceId,
        space, actor,
      }, prompt, answer, current.current.id === resumeId ? initial : undefined);
      window.dispatchEvent(new Event("eureka:agent-history"));
    } catch (error) {
      window.dispatchEvent(new CustomEvent("eureka:notice", { detail: "回答已生成，但历史会话保存失败：" + (error as Error).message }));
    }
    return answer;
  }
  function run(prompt: string, adapter: (route: ReturnType<typeof agentRoute>) => string) {
    try { ensureAvailable(); return record(prompt, adapter(agentRoute(scene))); }
    catch (error) { const message = (error as Error).message; window.dispatchEvent(new CustomEvent("eureka:notice", { detail: message })); return message; }
  }
  return { record, run, reset, ensureAvailable };
}
