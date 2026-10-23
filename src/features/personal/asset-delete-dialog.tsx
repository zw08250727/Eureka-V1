"use client";
import { useState } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import styles from "./asset-delete-dialog.module.css";

export function AssetDeleteDialog({ type, onClose, onConfirm }: {
  type: "schedule" | "todo" | "inspiration" | "ledger" | "other";
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [error, setError] = useState("");
  const title = `确认删除此条${{ schedule: "日程", todo: "待办", inspiration: "灵感", ledger: "记账", other: "其他" }[type]}吗？`;
  return <ReferenceDialog label={title} className={`th-dialog ${styles.dialog}`} onClose={onClose}>
    <h2>{title}</h2>
    <p>删除后不可恢复</p>
    {error && <p role="alert" className="th-error">{error}</p>}
    <footer>
      <button type="button" className="th-btn" data-autofocus onClick={onClose}>取消</button>
      <button type="button" className={`th-btn ${styles.danger}`} onClick={() => {
        try { onConfirm(); } catch (e) { setError((e as Error).message); }
      }}>删除</button>
    </footer>
  </ReferenceDialog>;
}
