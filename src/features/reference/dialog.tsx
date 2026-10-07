"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
export function ReferenceDialog({
  children,
  className,
  label,
  onClose,
  id,
}: {
  children: ReactNode;
  className: string;
  label: string;
  onClose: () => void;
  id?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const node = ref.current,
      trigger = document.activeElement;
    if (!node) return;
    node.showModal();
    const cancel = (e: Event) => {
      e.preventDefault();
      close.current();
    };
    node.addEventListener("cancel", cancel);
    return () => {
      node.removeEventListener("cancel", cancel);
      node.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus({ preventScroll: true });
    };
  }, []);
  return typeof document === "undefined"
    ? null
    : createPortal(
        <dialog id={id} ref={ref} className={className} aria-label={label}>
          {children}
        </dialog>,
        document.body,
      );
}
