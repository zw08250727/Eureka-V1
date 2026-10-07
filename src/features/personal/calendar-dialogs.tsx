"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import type { ActionRecord } from "@/features/workbench/model/types";
import { reminders, createActions, createThoughts } from "./store";
import { usePersonal } from "./use-personal";

export const actionSource = (r: ActionRecord) =>
  ({ manual: "手动创建", agent: "Agent 创建", capture: "闪念提取" })[
    r.source
  ] || "闪念提取";
export function localDate(value: string) {
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
    ? new Date(Date.parse(value) + 8 * 3600000)
        .toISOString()
        .replace("T", " ")
        .slice(0, 16)
    : String(value || "")
        .replace("T", " ")
        .slice(0, 16);
}
export function useLivePersonal() {
  const controller = usePersonal();
  const { repo, refresh } = controller;
  useEffect(() => {
    const reload = () => {
      if (!repo.current) return;
      try {
        repo.current.actions = createActions(localStorage);
        repo.current.thoughts = createThoughts(localStorage);
        refresh();
      } catch {
        /* Keep the last readable snapshot; mutations retain their explicit error reporting. */
      }
    };
    window.addEventListener("storage", reload);
    window.addEventListener("eureka:data", reload);
    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener("eureka:data", reload);
    };
  }, [repo, refresh]);
  return controller;
}
export function RefDialog({
  children,
  className,
  label,
  id,
  onClose,
}: {
  children: ReactNode;
  className: string;
  label: string;
  id?: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const target = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>("[name=title]")?.focus();
    }
    return () => {
      dialog?.close();
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, []);
  return typeof document === "undefined"
    ? null
    : createPortal(
        <dialog
          ref={ref}
          id={id}
          className={className}
          aria-label={label}
          onCancel={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          {children}
        </dialog>,
        document.body,
      );
}
export function PersonalToast({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [message, onDone]);
  return message && typeof document !== "undefined"
    ? createPortal(
        <div className="toast show" role="status">
          {message}
        </div>,
        document.body,
      )
    : null;
}
export function PaButton({
  children,
  action,
  id = "",
  className = "",
  onClick,
  ...props
}: {
  children: ReactNode;
  action?: string;
  id?: string;
  className?: string;
  onClick?: () => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "id">) {
  return (
    <button
      type="button"
      className={`pa-btn ${className}`}
      data-pa={action}
      data-id={id}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
export function ActionFields({ record }: { record: ActionRecord }) {
  return (
    <>
      <label className="pa-field">
        标题
        <input
          name="title"
          type="text"
          defaultValue={record.title}
          required
          maxLength={200}
          placeholder="为这次安排起个名字"
          autoFocus
        />
      </label>
      <div className="pa-form-grid">
        <label className="pa-field">
          {record.type === "schedule" ? "开始时间" : "截止时间"}
          <input
            name="start"
            type="datetime-local"
            defaultValue={record.start}
            required
          />
        </label>
        {record.type === "schedule" && (
          <label className="pa-field">
            结束时间
            <input
              name="end"
              type="datetime-local"
              defaultValue={record.end}
              required
            />
          </label>
        )}
        <label className="pa-field">
          提醒时间
          <select name="reminder" defaultValue={record.reminder}>
            {reminders.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <p className="pa-hint">时间统一按 GMT+8（北京时间）</p>
      </div>
      {record.type === "schedule" && (
        <div className="pa-form-grid">
          <label className="pa-field">
            地点
            <input
              name="location"
              type="text"
              defaultValue={record.location}
              maxLength={300}
              placeholder="线上链接或会议地点"
            />
          </label>
          <label className="pa-field">
            参与人
            <input
              name="participants"
              type="text"
              defaultValue={record.participants}
              maxLength={300}
              placeholder="用顿号分隔姓名"
            />
          </label>
        </div>
      )}
      <label className="pa-field">
        我的备注
        <textarea
          name="notes"
          maxLength={2000}
          rows={4}
          placeholder="补充需要记住的内容"
          defaultValue={record.notes}
        />
        <small>最多 2000 字</small>
      </label>
    </>
  );
}
export function actionValues(
  form: HTMLFormElement,
  base: ActionRecord,
): ActionRecord {
  return { ...base, ...Object.fromEntries(new FormData(form)) };
}
export function PaModal({
  title,
  children,
  confirm = "保存",
  onClose,
  onSave,
}: {
  title: string;
  children: ReactNode;
  confirm?: string;
  onClose: () => void;
  onSave: (form: HTMLFormElement) => void;
}) {
  const [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const save = () => {
    try {
      onSave(form.current!);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <RefDialog className="pa-dialog" label="编辑个人记录" onClose={onClose}>
      <form
        ref={form}
        method="dialog"
        className="pa-modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <header>
          <h2>{title}</h2>
          <PaButton
            action="modal-cancel"
            aria-label="关闭对话框"
            onClick={onClose}
          >
            ×
          </PaButton>
        </header>
        {children}
        <p role="alert" data-pa-error hidden={!error}>
          {error}
        </p>
        <footer>
          <PaButton action="modal-cancel" onClick={onClose}>
            取消
          </PaButton>
          <PaButton action="modal-confirm" className="primary" onClick={save}>
            {confirm}
          </PaButton>
        </footer>
      </form>
    </RefDialog>
  );
}
export function ActionEditor({
  record,
  onSave,
  onClose,
  variant = "quick",
}: {
  record: ActionRecord;
  onSave: (r: ActionRecord) => void;
  onClose: () => void;
  variant?: "quick" | "create" | "page";
}) {
  const [base] = useState(record),
    [error, setError] = useState(""),
    [guard, setGuard] = useState(false);
  const form = useRef<HTMLFormElement>(null),
    initial = useRef(""),
    continuation = useRef<null | (() => void)>(null),
    bypassNavigation = useRef(false);
  useLayoutEffect(() => {
    if (form.current)
      initial.current = JSON.stringify(actionValues(form.current, base));
  }, [base]);
  const dirty = () =>
    !!form.current &&
    JSON.stringify(actionValues(form.current, base)) !== initial.current;
  const finish = () => {
    const next = continuation.current;
    continuation.current = null;
    setGuard(false);
    onClose();
    bypassNavigation.current = true;
    next?.();
  };
  const close = () => (dirty() ? setGuard(true) : finish());
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const changed = (e: StorageEvent) => {
      if (e.key === "eureka:personal-actions:v1")
        setError("另一页面已更新，请保留输入后重新打开记录");
    };
    const nav = (e: MouseEvent) => {
      if (bypassNavigation.current) return;
      const target =
        e.target instanceof Element
          ? e.target.closest<HTMLElement>(
              "a[href],.sidebar-quick-nav button,#home-entry,[data-meeting-view],.ws-menu-space,.ws-menu-item,.nav-item,.side-sub-item",
            )
          : null;
      if (target && !target.closest("dialog,#personal-actions") && dirty()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        continuation.current = () => target.click();
        setGuard(true);
      }
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("storage", changed);
    window.addEventListener("click", nav, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("storage", changed);
      window.removeEventListener("click", nav, true);
    };
  });
  const persist = () => {
    if (!form.current?.reportValidity()) throw Error("请填写有效的标题和时间");
    onSave(actionValues(form.current, base));
    finish();
  };
  const save = (e?: FormEvent) => {
    e?.preventDefault();
    try {
      persist();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const quick = variant === "quick",
    page = variant === "page",
    title =
      (variant === "create" ? "新建" : "编辑") +
      (base.type === "schedule" ? "日程" : "待办");
  const content = (
    <>
      {page ? (
        <header className="pa-page-head">
          <div>
            <p className="pa-eyebrow">{actionSource(base)} · GMT+8</p>
            <h1>{title}</h1>
          </div>
        </header>
      ) : (
        <header>
          <h2>{title}</h2>
          {quick ? (
            <button
              type="button"
              className="th-btn th-close"
              data-ap="close"
              aria-label="关闭记录弹窗"
              onClick={close}
            >
              ×
            </button>
          ) : (
            <PaButton action="cancel-create" onClick={close}>
              ×
            </PaButton>
          )}
        </header>
      )}
      <form
        ref={form}
        id={quick ? "ap-edit-form" : "pa-edit-form"}
        className={page ? "pa-card pa-editor" : undefined}
        onSubmit={save}
      >
        <ActionFields record={base} />
        <p
          className={quick ? "th-error" : undefined}
          role="alert"
          data-pa-error={quick ? undefined : ""}
          hidden={!error}
        >
          {error}
        </p>
        <footer>
          {quick ? (
            <button
              type="button"
              className="th-btn "
              data-ap="close"
              onClick={close}
            >
              取消
            </button>
          ) : (
            <PaButton
              action={page ? "cancel-edit" : "cancel-create"}
              onClick={close}
            >
              {page ? "退出编辑" : "取消"}
            </PaButton>
          )}
          <button
            className={quick ? "th-btn primary" : "pa-btn primary"}
            type="submit"
          >
            保存
          </button>
        </footer>
      </form>
    </>
  );
  return (
    <>
      {page ? (
        content
      ) : (
        <RefDialog
          id={quick ? "action-quick-dialog" : undefined}
          className={quick ? "th-dialog ap-dialog" : "pa-create-dialog"}
          label={quick ? title : "新建日程或待办"}
          onClose={close}
        >
          {content}
        </RefDialog>
      )}
      {guard &&
        (quick ? (
          <RefDialog
            className="th-dialog ap-guard"
            label="保留记录修改"
            onClose={() => setGuard(false)}
          >
            <h2>保留这次修改？</h2>
            <p>还有未保存的内容。</p>
            <footer>
              <button
                type="button"
                className="th-btn "
                data-ap="discard"
                onClick={finish}
              >
                放弃修改
              </button>
              <button
                type="button"
                className="th-btn primary"
                data-ap="continue"
                onClick={() => setGuard(false)}
              >
                继续编辑
              </button>
            </footer>
          </RefDialog>
        ) : (
          <PaModal
            title="保留这次修改？"
            confirm="保存并继续"
            onClose={() => setGuard(false)}
            onSave={persist}
          >
            <p>还有未保存的内容。你可以继续编辑、放弃修改，或保存后继续。</p>
            <PaButton action="discard" onClick={finish}>
              放弃修改
            </PaButton>
          </PaModal>
        ))}
    </>
  );
}
export function ActionPreview({
  record: r,
  onClose,
  onEdit,
  onDetails,
  onToggle,
}: {
  record: ActionRecord;
  onClose: () => void;
  onEdit: () => void;
  onDetails: () => void;
  onToggle: () => void;
}) {
  const [error, setError] = useState("");
  return (
    <RefDialog
      id="action-quick-dialog"
      className="th-dialog ap-dialog"
      label={r.type === "todo" ? "待办预览" : "日程预览"}
      onClose={onClose}
    >
      <header>
        <h2>{r.title}</h2>
        <button
          type="button"
          className="th-btn th-close"
          data-ap="close"
          aria-label="关闭记录弹窗"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="ap-meta">
        <span className="th-type">{r.type === "todo" ? "待办" : "日程"}</span>
        <span>{actionSource(r)}</span>
        {r.type === "todo" && <span>{r.done ? "已完成" : "待完成"}</span>}
      </div>
      <dl className="ap-summary">
        <div>
          <dt>{r.type === "todo" ? "截止时间" : "日程时间"}</dt>
          <dd>
            {localDate(r.start)}
            {r.type === "schedule" ? " — " + localDate(r.end) : ""}
          </dd>
        </div>
        {r.type === "schedule" && (
          <>
            <div>
              <dt>地点</dt>
              <dd>{r.location || "未设置"}</dd>
            </div>
            <div>
              <dt>参与人</dt>
              <dd>{r.participants || "未设置"}</dd>
            </div>
          </>
        )}
        <div>
          <dt>提醒</dt>
          <dd>{reminders.find(([v]) => v === r.reminder)?.[1] || "不提醒"}</dd>
        </div>
        <div>
          <dt>备注</dt>
          <dd>{r.notes || "暂无备注"}</dd>
        </div>
      </dl>
      {r.capture && (
        <details className="th-original">
          <summary>原始捕获</summary>
          <p>{r.capture}</p>
        </details>
      )}
      {error && (
        <p className="th-error" role="alert">
          {error}
        </p>
      )}
      <footer>
        {r.type === "todo" && (
          <button
            type="button"
            className="th-btn "
            data-ap="toggle"
            onClick={() => {
              try {
                onToggle();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {r.done ? "重新打开待办" : "标记完成"}
          </button>
        )}
        <button
          type="button"
          className="th-btn "
          data-ap="details"
          onClick={onDetails}
        >
          详情
        </button>
        <button
          type="button"
          className="th-btn primary"
          data-ap="edit"
          onClick={onEdit}
        >
          编辑
        </button>
      </footer>
    </RefDialog>
  );
}
