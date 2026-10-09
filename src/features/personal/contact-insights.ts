"use client";
import { useEffect, useState } from "react";
import type { Contact } from "./store";
import type { ContactInteraction } from "./contact-rules";
import { createMeetingDetails } from "@/features/meetings/store";
import { createWorkspaceStore, M } from "@/features/spaces/model/store";

export type CustomerMeeting = ContactInteraction & { title: string; summary: string };
export const profileDimensions = ["业务背景", "需求与目标", "决策与协作", "预算与约束", "时间与里程碑", "沟通偏好", "合作阶段"];
export const keywordRule = "每场会议从摘要提取 3–5 个业务关键词；合并同义词，同一会议内只计一次。按覆盖会议数降序取前 5 个，同次数按最近提及时间排序；仅使用当前有权查看的会议。";
export function meetingKeywords(meetings: CustomerMeeting[]) {
  const aliases: Record<string, string> = { pilot: "试点", "交期": "交付周期" };
  const words = new Map<string, { word: string; count: number; latest: string }>();
  for (const m of new Map(meetings.map((m) => [m.id, m])).values()) for (const word of new Set(m.themes.slice(0, 5).map((w) => aliases[w.trim().toLowerCase()] || w.trim()).filter(Boolean))) {
    const old = words.get(word);
    words.set(word, { word, count: (old?.count || 0) + 1, latest: old && old.latest > m.occurredAt ? old.latest : m.occurredAt });
  }
  return [...words.values()].sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest) || a.word.localeCompare(b.word, "zh-CN")).slice(0, 5);
}
export function useCustomerMeetings(person: Contact | undefined, actor: string, space: string) {
  const [value, setValue] = useState<{ key: string; meetings: CustomerMeeting[] }>();
  const key = `${space}:${actor}:${person?.ownerId || ""}:${person?.id || ""}`;
  useEffect(() => {
    const reload = () => {
      const meetings: CustomerMeeting[] = [];
      try {
        const read = space === "personal" && actor === "zhang" ? createMeetingDetails(localStorage) : null;
        const workspace = space !== "personal" ? M.get(createWorkspaceStore(localStorage).read(), space) : null;
        for (const event of new Map((person?.interactions || []).map((e) => [e.id, e])).values()) {
          if (!event.verifiedParticipation || !event.sourceAvailable) continue;
          try {
            const meeting = workspace ? M.getFile(workspace, event.id, actor) : read?.read(event.id);
            if (!meeting || meeting.deleted) continue;
            // Changed summaries invalidate old extraction instead of asserting stale evidence.
            const current = event.extractedSummary === meeting.summary;
            meetings.push({ ...event, title: meeting.title, summary: meeting.summary || "会议尚未生成摘要。", themes: current ? event.themes : [], todos: current ? event.todos : [], profile: current ? event.profile : {} });
          } catch { /* Deleted or revoked evidence must not expose its content. */ }
        }
      } catch { /* A removed member no longer has readable evidence. */ }
      setValue({ key, meetings: meetings.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)) });
    };
    reload();
    window.addEventListener("storage", reload);
    window.addEventListener("eureka:data", reload);
    return () => { window.removeEventListener("storage", reload); window.removeEventListener("eureka:data", reload); };
  }, [person, actor, space, key]);
  return value?.key === key ? value.meetings : [];
}
