"use client";
import { useState } from "react";
import { createWorkspaceStore, M } from "@/features/spaces/model/store";
import { createActions } from "./store";
import type {
  ActionRecord,
  ThoughtRecord,
} from "@/features/workbench/model/types";
import { ReferenceDialog } from "@/features/reference/dialog";
export function assetOwner(space: string, owner?: string) {
  if (space === "personal") return "";
  try {
    return (
      M.get(createWorkspaceStore(localStorage).read(), space).members.find(
        (m) => m.id === owner,
      )?.name || "原成员"
    );
  } catch {
    return "";
  }
}
export function canEditAsset(
  space: string,
  actor: string,
  r: { ownerId?: string },
) {
  if (space === "personal") return true;
  const w = M.get(createWorkspaceStore(localStorage).read(), space);
  return (
    w.status === "active" &&
    !!M.member(w, actor) &&
    (!r.ownerId || r.ownerId === actor || M.admin(w, actor))
  );
}
export function AssetSharing({
  space,
  actor,
  record,
  type,
  onSaved,
}: {
  space: string;
  actor: string;
  record?: ActionRecord;
  type?: ThoughtRecord["type"];
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false),
    [ids, setIds] = useState<string[]>([]),
    [error, setError] = useState("");
  if (space === "personal") return null;
  const w = M.get(createWorkspaceStore(localStorage).read(), space);
  if (record && (record.ownerId !== actor || record.previousOwnerId))
    return null;
  if (!M.member(w, actor)) return null;
  const label = record
    ? "共享"
    : `共享我的${type === "inspiration" ? "灵感" : type === "ledger" ? "记账" : "其他"}`;
  return (
    <>
      <button
        className="ex-share"
        disabled={w.status !== "active"}
        onClick={() => {
          setIds(
            record?.sharedWith || w.thoughtSharing?.[actor]?.[type!] || [],
          );
          setError("");
          setOpen(true);
        }}
      >
        {label}
      </button>
      {open && (
        <ReferenceDialog
          className="ex-dialog"
          label={
            record ? `共享${record.type === "todo" ? "待办" : "日程"}` : label
          }
          onClose={() => setOpen(false)}
        >
          <header className="ex-head">
            <h2>
              {record
                ? `共享${record.type === "todo" ? "待办" : "日程"}`
                : label}
            </h2>
            <button
              className="ex-close"
              aria-label="关闭"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="ex-body">
            <p>
              {record
                ? record.title
                : "按类型共享，覆盖当前工作区本人已有及未来内容；取消后立即撤销此类型授权。"}
            </p>
            <p className="ex-muted">
              接收成员仅可查看。管理员默认可编辑和管理；只有内容本人可以设置共享。
            </p>
            {w.members
              .filter((m) => m.status === "active" && m.id !== actor)
              .map((m) => (
                <label key={m.id}>
                  <input
                    type="checkbox"
                    checked={ids.includes(m.id)}
                    onChange={(e) =>
                      setIds(
                        e.target.checked
                          ? [...ids, m.id]
                          : ids.filter((id) => id !== m.id),
                      )
                    }
                  />{" "}
                  {m.name} ·{" "}
                  {m.role === "admin" ? "管理员（已有管理权限）" : "只读"}
                </label>
              ))}
            {error && <p role="alert">{error}</p>}
            <footer className="ex-footer">
              <button onClick={() => setOpen(false)}>取消</button>
              <button
                className="primary"
                onClick={() => {
                  try {
                    if (record) {
                      createActions(
                        localStorage,
                        () => new Date(),
                        actor,
                        space,
                      ).share(record.id, ids);
                    } else {
                      createWorkspaceStore(localStorage).change((st) => {
                        const current = M.get(st, space);
                        M.writable(current);
                        if (!M.member(current, actor))
                          throw Error("没有工作区访问权限");
                        if (ids.some((id) => !M.member(current, id)))
                          throw Error("接收成员已离开团队");
                        ((current.thoughtSharing ||= {})[actor] ||= {})[type!] =
                          [...new Set(ids)];
                      });
                    }
                    onSaved?.();
                    setOpen(false);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                保存共享
              </button>
            </footer>
          </div>
        </ReferenceDialog>
      )}
    </>
  );
}
