"use client";
import { useRef, useState } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import { RefIcon } from "@/features/reference/symbols";
import { validateUpload } from "../model/local-repository";
export function UploadDialog({
  onClose,
  onUpload,
  target = "个人工作空间",
  team = false,
}: {
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  target?: string;
  team?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null),
    [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dragging, setDragging] = useState(false);
  function select(files: FileList | null) {
    setFile(null);
    try {
      if (!files || files.length !== 1) throw Error("每次请选择一个音频文件。");
      validateUpload(files[0]);
      setFile(files[0]);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function submit() {
    if (!file || busy) return;
    setBusy(true);
    try {
      await onUpload(file);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const size = (n: number) =>
    n < 1024
      ? `${n} B`
      : n < 1048576
        ? `${(n / 1024).toFixed(1)} KB`
        : `${(n / 1048576).toFixed(1)} MB`;
  return (
    <ReferenceDialog
      id="audio-upload-dialog"
      className="audio-upload-dialog"
      label="上传录音"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <header>
        <div>
          <h2 id="audio-upload-title">上传录音</h2>
          <p>添加已有音频，继续整理会议内容。</p>
        </div>
        <button
          type="button"
          aria-label="关闭上传"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="audio-upload-body">
        <div className="audio-upload-target">
          保存到 <strong>{target}</strong>
          {team ? " · 团队成员可查看" : " · 仅自己可见"}
        </div>
        <button
          type="button"
          id="audio-upload-drop"
          className={dragging ? "dragging" : ""}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            select(e.dataTransfer.files);
          }}
        >
          <RefIcon name="upload" />
          <strong>点击选择文件，或拖放到这里</strong>
          <span>m4a、mp3、wav、opus、flac、aac</span>
        </button>
        <input
          ref={input}
          id="audio-upload-input"
          type="file"
          aria-label="选择音频文件"
          accept=".m4a,.mp3,.wav,.opus,.flac,.aac"
          hidden
          onChange={(e) => select(e.target.files)}
        />
        <div id="audio-upload-file" aria-live="polite">
          {file ? file.name + " · " + size(file.size) : "尚未选择文件"}
        </div>
        <p id="audio-upload-error" role="alert">
          {error}
        </p>
        <p className="audio-upload-demo">
          本地演示仅保存文件信息，原音频不会上传。录音进入会议列表后显示为“待处理”。
        </p>
      </div>
      <footer>
        <button type="button" disabled={busy} onClick={onClose}>
          取消
        </button>
        <button
          type="button"
          id="audio-upload-submit"
          disabled={!file || busy}
          onClick={() => void submit()}
        >
          {busy ? "正在保存…" : "上传"}
        </button>
      </footer>
    </ReferenceDialog>
  );
}
