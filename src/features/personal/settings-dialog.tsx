import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { basePath } from "@/lib/routes";

export function SettingsLogoutDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="pa-dialog"
      aria-label="退出登录？"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <form
        method="dialog"
        className="pa-modal-form"
        onSubmit={(e) => e.preventDefault()}
      >
        <header>
          <h2>退出登录？</h2>
          <button
            type="button"
            className="pa-btn "
            data-pa="modal-cancel"
            data-id=""
            aria-label="关闭对话框"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <p>当前个人记录会保留在此浏览器。</p>
        <p role="alert" data-pa-error hidden />
        <footer>
          <button
            type="button"
            className="pa-btn "
            data-pa="modal-cancel"
            data-id=""
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="pa-btn primary"
            data-pa="modal-confirm"
            data-id=""
            onClick={() => location.replace(basePath + "/")}
          >
            退出登录
          </button>
        </footer>
      </form>
    </dialog>,
    document.body,
  );
}
