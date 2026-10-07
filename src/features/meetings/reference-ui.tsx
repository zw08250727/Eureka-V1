"use client";
import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
const paths: Record<string, string> = {
  file: "M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h6",
  close: "M6 6l12 12M6 18L18 6",
  edit: "M16 3l5 5-12 12H4v-5zM13 6l5 5",
  library: "M3 4h18v16H3zM9 4v16",
  location:
    "M12 22s8-8 8-14a8 8 0 10-16 0c0 6 8 14 8 14zM9 8a3 3 0 106 0 3 3 0 10-6 0",
  spark: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
  copy: "M9 8h11v13H9zM5 16H3V3h12v2",
  clock: "M21 12a9 9 0 11-18 0 9 9 0 0118 0M12 7v5l3 2",
  download: "M12 3v12M7 10l5 5 5-5M4 16v5h16v-5",
  share: "M12 16V3M7 8l5-5 5 5M5 12v9h14v-9",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
  play: "M8 4l12 8-12 8z",
  pause: "M8 4v16M16 4v16",
  plus: "M12 5v14M5 12h14",
};
export function MdIcon({ name }: { name: string }) {
  return (
    <svg className="md-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name] || paths.file} />
    </svg>
  );
}
export function MdButton({
  action,
  className = "md-btn",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { action?: string }) {
  return (
    <button
      type="button"
      className={className}
      data-md-action={action}
      {...props}
    />
  );
}
export function MdIconButton({
  action,
  name,
  label,
  onClick,
}: {
  action: string;
  name: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <MdButton
      action={action}
      className="md-icon-btn"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <MdIcon name={name} />
    </MdButton>
  );
}
export function NativeDialog({
  children,
  onClose,
  className,
  id,
  label,
}: {
  children: ReactNode;
  onClose: () => void;
  className: string;
  id?: string;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const cancel = (e: Event) => {
      e.preventDefault();
      close.current();
    };
    dialog.addEventListener("cancel", cancel);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      dialog.close();
      trigger?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog ref={ref} className={className} id={id} aria-labelledby={label}>
      {children}
    </dialog>,
    document.body,
  );
}
export function MdDialog({
  title,
  subtitle,
  children,
  footer,
  error,
  onClose,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  error?: string;
  onClose: () => void;
  className?: string;
}) {
  return (
    <NativeDialog
      className={`md-dialog ${className}`}
      label="md-dialog-title"
      onClose={onClose}
    >
      <header className="md-dialog-head">
        <div>
          <h2 id="md-dialog-title">{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <MdIconButton
          action="dismiss"
          name="close"
          label="关闭弹窗"
          onClick={onClose}
        />
      </header>
      <div className="md-dialog-body">{children}</div>
      <footer className="md-dialog-footer">
        <span className="md-status" role="status">
          {error}
        </span>
        {footer || (
          <MdButton action="dismiss" onClick={onClose}>
            取消
          </MdButton>
        )}
      </footer>
    </NativeDialog>
  );
}
export const clockTime = (seconds: number) =>
  `${String(Math.floor((seconds || 0) / 60)).padStart(2, "0")}:${String(Math.floor((seconds || 0) % 60)).padStart(2, "0")}`;
export function download(
  content: string | Blob,
  extension: string,
  name: string,
  mime = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type: mime }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[\\/:*?"<>|]/g, "-")}.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function DeleteOverlay({
  children,
  onClose,
  id = "delete-confirm-modal",
  modalClass = "delete-confirm-modal",
  labelledBy = "delete-confirm-title",
}: {
  children: ReactNode;
  onClose: () => void;
  id?: string;
  modalClass?: string;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLElement>(null),
    close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const buttons = ref.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        );
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      trigger?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <>
      <div className="scrim show" id="scrim" onClick={onClose} />
      <section
        ref={ref}
        className={`modal ${modalClass} show`}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </section>
    </>,
    document.body,
  );
}
