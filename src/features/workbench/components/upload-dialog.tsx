"use client";
import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { validateUpload } from "../model/local-repository";
export function UploadDialog({
  onClose,
  onUpload,
}: {
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null),
    [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="上传音频"
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={!file || busy}
            onClick={() => void submit()}
          >
            {busy ? "正在保存…" : "上传"}
          </Button>
        </>
      }
    >
      <p className="upload-space">个人工作空间 · 仅自己可见</p>
      <button
        className="upload-drop"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          select(e.dataTransfer.files);
        }}
      >
        <Icon name="upload" width={28} height={28} />
        <strong>点击选择文件，或拖放到这里</strong>
        <span>m4a、mp3、wav、opus、flac、aac</span>
      </button>
      <input
        ref={input}
        type="file"
        className="sr-only"
        aria-label="选择音频文件"
        accept=".m4a,.mp3,.wav,.opus,.flac,.aac"
        onChange={(e) => select(e.target.files)}
      />
      <p aria-live="polite">
        {file ? `${file.name} · ${file.size} B` : "尚未选择文件"}
      </p>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <p className="muted text-xs">
        本地演示仅保存文件信息，原音频不会上传。录音进入会议列表后显示为“待处理”。
      </p>
    </Modal>
  );
}
