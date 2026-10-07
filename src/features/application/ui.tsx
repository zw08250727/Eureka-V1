"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
export function PageHead({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="feature-head">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="feature-actions">{children}</div>
    </header>
  );
}
export function Card({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="feature-card">
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}
export function Tabs({
  value,
  items,
  onChange,
}: {
  value: string;
  items: string[];
  onChange: (s: string) => void;
}) {
  return (
    <div role="tablist" className="feature-tabs">
      {items.map((t) => (
        <button
          type="button"
          key={t}
          role="tab"
          aria-selected={t === value}
          onClick={() => onChange(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
export function Empty({ children = "暂无内容" }: { children?: ReactNode }) {
  return (
    <p role="status" className="feature-empty">
      {children}
    </p>
  );
}
export function DownloadButton({
  name,
  value,
  label = "导出",
}: {
  name: string;
  value: unknown;
  label?: string;
}) {
  return (
    <Button
      onClick={() => {
        const b = new Blob(
          [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
          {
            type:
              typeof value === "string"
                ? "text/plain;charset=utf-8"
                : "application/json",
          },
        );
        const u = URL.createObjectURL(b),
          a = document.createElement("a");
        a.href = u;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(u), 1000);
      }}
    >
      {label}
    </Button>
  );
}
export function FormModal({
  title,
  onClose,
  onSave,
  children,
  submit = "保存",
  dirty,
}: {
  title: string;
  onClose: () => void;
  onSave: (data: FormData) => unknown | Promise<unknown>;
  children: ReactNode;
  submit?: string;
  dirty?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const initial = useRef("");
  const [changed, setChanged] = useState(false);
  const isDirty = dirty ?? changed;
  useEffect(() => {
    if (form.current)
      initial.current = JSON.stringify([...new FormData(form.current)]);
  }, []);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [discard, setDiscard] = useState(false);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [isDirty]);
  const close = () => (isDirty ? setDiscard(true) : onClose());
  return (
    <Modal title={title} onClose={close}>
      <form
        className="feature-form"
        ref={form}
        onChange={() => {
          if (form.current)
            setChanged(
              JSON.stringify([...new FormData(form.current)]) !==
                initial.current,
            );
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const result = await onSave(new FormData(e.currentTarget));
            if (result !== false) onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {children}
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
        {discard ? (
          <p className="unsaved-prompt">
            有未保存的修改。
            <Button onClick={() => setDiscard(false)}>继续编辑</Button>
            <Button onClick={onClose}>放弃修改</Button>
          </p>
        ) : null}
        <footer>
          <Button onClick={close}>取消</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "正在保存…" : submit}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
export function Confirm({
  title,
  children,
  onClose,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => unknown | Promise<unknown>;
}) {
  return (
    <FormModal
      title={title}
      onClose={onClose}
      onSave={onConfirm}
      submit="确认"
      dirty={false}
    >
      {children}
    </FormModal>
  );
}
