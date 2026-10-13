"use client";

import { useEffect, useState } from "react";
import { routeMarket } from "@/features/markets/config";
import { marketStorage, scopedKey } from "@/features/markets/storage";
import { SHARE_STORAGE_KEY, shareRepository, type MeetingShareLink } from "./share-links";
import { currentShareScope, verifyShareScope } from "./share-browser";
import { SharedMeetingContent } from "./share-content";

export function MeetingSharePage() {
  const [state, setState] = useState<{ link: MeetingShareLink | null; error: string; loading: boolean }>({ link: null, error: "", loading: true });
  useEffect(() => {
    let active = true;
    let previous = "";
    const refresh = () => {
      if (!active) return;
      try {
        const token = new URLSearchParams(location.search).get("token") || "";
        if (!/^[a-zA-Z0-9-]{16,100}$/.test(token)) throw Error("分享链接无效");
        const scope = currentShareScope();
        const link = shareRepository(marketStorage).access(scope, token);
        verifyShareScope(scope, link.meetingId);
        const signature = JSON.stringify(link);
        if (signature !== previous) { previous = signature; setState({ link, error: "", loading: false }); }
      } catch (error) {
        const message = error instanceof Error ? error.message : "无法读取分享内容";
        if (previous !== message) { previous = message; setState({ link: null, error: message, loading: false }); }
      }
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === null || [SHARE_STORAGE_KEY, "eureka:auth:v1", "eureka:meeting-details:v1", "eureka:audio-uploads:v1"].some(key => event.key === scopedKey(key, routeMarket()))) refresh();
    };
    queueMicrotask(refresh);
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("storage", storageChanged);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("storage", storageChanged); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return <main style={{ maxWidth: 900, margin: "32px auto", padding: "0 24px", fontSize: 14, lineHeight: 1.8, color: "var(--market-ink)", overflowWrap: "anywhere" }}>
    <header><h1 style={{ fontSize: 24 }}>会议分享</h1></header>
    {state.loading ? <p role="status">加载中…</p> : state.error ? <p role="alert">{state.error}</p> : state.link ? <>
      <p>{state.link.expiresAt ? `有效期至：${new Date(state.link.expiresAt).toLocaleString("zh-CN")}` : "永久有效"}</p>
      <SharedMeetingContent title={state.link.title} contents={state.link.contents} />
    </> : null}
  </main>;
}
