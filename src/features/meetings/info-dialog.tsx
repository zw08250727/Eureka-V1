"use client";

import { marketStorage } from "@/features/markets/storage";
import { routeMarket } from "@/features/markets/config";

import { useEffect, useRef, useState } from "react";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { M } from "@/features/spaces/model/store";
import { MeetingDialogs } from "./dialogs";
import { MdDialog } from "./reference-ui";
import { createMeetingDetails } from "./store";
import type { MeetingDetail } from "./types";
export interface MeetingInfoDialogProps {
  id: string;
  spaces?: SpacesController;
  space?: string;
  actor?: string;
  onClose: () => void;
  onSaved?: (record: MeetingDetail) => void | Promise<void>;
}
/** Opens the same metadata editor as MeetingPage without changing the current view. */
export function MeetingInfoDialog({
  id,
  spaces,
  space = "personal",
  actor = "zhang",
  onClose,
  onSaved,
}: MeetingInfoDialogProps) {
  const domestic = routeMarket() === "cn";
  const [market] = useState(routeMarket);
  const identity = `${market}:${space}:${actor}:${id}`;
  const session = useRef<string | null | undefined>(undefined);
  const [loadedFor, setLoadedFor] = useState("");
  const [record, setRecord] = useState<MeetingDetail | null>(null),
    [error, setError] = useState(""),
    repo = useRef<ReturnType<typeof createMeetingDetails> | null>(null);
  const w = spaces?.state?.spaces.find((w) => w.id === space),
    team = w?.type === "team";
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      try {
        if (domestic) {
          if (routeMarket() !== market) throw Error("市场已变更，请重新打开会议信息");
          const currentSession = marketStorage.getItem("eureka:auth:v1");
          if (session.current !== undefined && session.current !== currentSession) throw Error("账号已变更，请重新打开会议信息");
          session.current = currentSession;
          if (space !== "personal" && (!w || !team)) throw Error("工作区不可用或无权编辑此会议");
        }
        let r: MeetingDetail;
        if (team && w) {
          const f = M.visible(w, actor).find((f) => f.id === id);
          if (!f) throw Error("会议不存在或没有访问权限");
          if (!M.canEdit(w, f, actor))
            throw Error("此录音为只读，请确认编辑授权与工作区订阅");
          r = {
            id: f.id,
            title: f.title,
            summary: f.summary,
            transcript: f.transcript,
            verbatim: "",
            source: f.source,
            created: f.created,
            duration: f.duration,
            template: "通用",
            language: "中文（中国）",
            detail: "标准",
            speakers: w.members
              .filter((m) => m.status === "active")
              .map((m) => m.name),
            tags: f.tags,
            customer: "",
            project: "",
            location: "",
            updated: f.updated,
            generated: {},
            feedback: 0,
            ...f.detail,
          };
        } else {
          repo.current = createMeetingDetails(marketStorage);
          r = repo.current.read(id);
        }
        if (active) { setRecord(r); setLoadedFor(identity); setError(""); }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    });
    return () => {
      active = false;
    };
  }, [id, team, w, actor, space, domestic, market, identity]);
  if (!record || domestic && loadedFor !== identity)
    return (
      <MdDialog title="补充会议信息" onClose={onClose} error={error}>
        <p role="status">{error ? "无法编辑此会议" : "正在读取会议…"}</p>
      </MdDialog>
    );
  return (
    <MeetingDialogs
      key={domestic ? identity : undefined}
      kind="info"
      r={record}
      onClose={onClose}
      onSave={(patch) => {
        if (domestic) return (async () => {
          if (routeMarket() !== market || loadedFor !== identity || session.current !== marketStorage.getItem("eureka:auth:v1")) throw Error("账号或工作区已变更，请重新打开会议信息");
          if (space !== "personal" && (!team || !spaces)) throw Error("工作区不可用或无权编辑此会议");
          const latest = space === "personal" ? repo.current?.read(id) : record;
          if (!latest || latest.deleted || latest.purged) throw Error("会议不存在或已移入回收站");
          const next = { ...latest, ...patch, updated: new Date().toLocaleString("zh-CN", { hour12: false }) };
          if (space !== "personal") spaces!.change(s => M.saveDetail(M.get(s, space), id, patch, actor));
          else repo.current!.save(next);
          setRecord(next);
          try { await onSaved?.(next); }
          catch { throw Error("会议信息已保存，但列表刷新失败；输入已保留，可重试"); }
        })();
        const next = {
          ...record,
          ...patch,
          updated: new Date().toLocaleString("zh-CN", { hour12: false }),
        };
        if (team && spaces)
          spaces.change((s) => M.saveDetail(M.get(s, space), id, patch, actor));
        else repo.current!.save(next);
        setRecord(next);
        onSaved?.(next);
      }}
      onRemove={async () => {}}
      seek={() => {}}
      copyText=""
    />
  );
}
