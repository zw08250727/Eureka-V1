"use client";
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
  onSaved?: (record: MeetingDetail) => void;
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
  const [record, setRecord] = useState<MeetingDetail | null>(null),
    [error, setError] = useState(""),
    repo = useRef<ReturnType<typeof createMeetingDetails> | null>(null);
  const w = spaces?.state?.spaces.find((w) => w.id === space),
    team = w?.type === "team";
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      try {
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
          repo.current = createMeetingDetails(localStorage);
          r = repo.current.read(id);
        }
        if (active) setRecord(r);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    });
    return () => {
      active = false;
    };
  }, [id, team, w, actor]);
  if (!record)
    return (
      <MdDialog title="补充会议信息" onClose={onClose} error={error}>
        <p role="status">{error ? "无法编辑此会议" : "正在读取会议…"}</p>
      </MdDialog>
    );
  return (
    <MeetingDialogs
      kind="info"
      r={record}
      actor={actor}
      onClose={onClose}
      onSave={(patch) => {
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
      onShare={() => {}}
      seek={() => {}}
      copyText=""
    />
  );
}
