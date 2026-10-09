"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { RefIcon } from "@/features/reference/symbols";
import { appUrl, type AppView } from "@/lib/routes";
import { M } from "./model/store";
import type { Workspace } from "./model/types";

export const managementDate = (value?: string) =>
  String(value || "")
    .replace("T", " ")
    .slice(0, 16);
export const managementMoney = (value: number) =>
  "¥" +
  value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export function ManagementIcon({ name }: { name: string }) {
  return <RefIcon name={name} className="ws-icon" />;
}
export function ManagementButton({
  className = "",
  action,
  value = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  action?: string;
  value?: string;
}) {
  return (
    <button
      type="button"
      className={`ws-btn ${className}`}
      data-ws-action={action}
      data-value={value}
      {...props}
    />
  );
}
export function ManagementBadge({
  children,
  kind = "",
}: {
  children: ReactNode;
  kind?: string;
}) {
  return <span className={`ws-badge ${kind}`}>{children}</span>;
}
export function ManagementEmpty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ws-empty">
      <ManagementIcon name="folder" />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function ManagementHeading({
  w,
  actor,
  title,
  subtitle,
  actions,
}: {
  w: Workspace;
  actor: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="ws-page-head">
      <div>
        <div className="ws-eyebrow">
          {w.name}{" "}
          <ManagementBadge>
            {w.type === "team"
              ? M.admin(w, actor)
                ? "管理员"
                : "成员"
              : "Personal"}
          </ManagementBadge>
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="ws-actions">{actions}</div>
    </header>
  );
}
export function ManagementTabs({
  space,
  actor,
  selected,
  admin = true,
}: {
  space: string;
  actor: string;
  selected: string;
  admin?: boolean;
}) {
  const tabs: [AppView, string, string][] = [
    ["content-permissions", "permissions", "内容权限"],
    ["subscription", "billing", "订阅与席位"],
    ["credits", "credits", "Credits"],
    ["space-settings", "settings", "基本设置"],
    ["audit", "audit", "活动记录"],
  ];
  return (
    <nav className="ws-tabs" aria-label="空间设置">
      {tabs.filter(([, key]) => admin || key === "permissions").map(([view, key, label]) => (
        <ManagementButton
          key={key}
          action="page"
          value={key}
          className={selected === key ? "active" : ""}
          onClick={() => location.assign(appUrl(view, "", space, actor))}
        >
          {label}
        </ManagementButton>
      ))}
    </nav>
  );
}
export function ManagementRoot({
  w,
  actor,
  children,
  rail,
}: {
  w: Workspace;
  actor: string;
  children?: ReactNode;
  rail?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const fit = () =>
      node.style.setProperty(
        "--ws-top",
        `${node.getBoundingClientRect().top + (node.closest(".main")?.scrollTop || 0)}px`,
      );
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <section
      ref={ref}
      id="ws-view"
      className="ws-view"
      data-main-view="workspaces"
      style={{ "--ws-top": "88px" } as CSSProperties}
    >
      {w.type === "team" && w.status !== "active" ? (
        <div className="ws-readonly">
          当前空间已到期，文件可继续查看与导出。
          {M.admin(w, actor) ? (
            <ManagementButton
              action="page"
              value="billing"
              className="link"
              onClick={() =>
                location.assign(appUrl("subscription", "", w.id, actor))
              }
            >
              恢复订阅 →
            </ManagementButton>
          ) : null}
        </div>
      ) : null}
      <div className={`ws-layout${rail ? " with-agent" : ""}`}>
        <div className="ws-content">
          {children}
          <footer className="ws-demo-footer">
            交互演示 · 数据保存在本浏览器
            {w.type === "team" ? (
              <label>
                体验成员视角{" "}
                <select
                  id="ws-actor"
                  aria-label="体验成员视角"
                  value={actor}
                  onChange={(e) =>
                    location.assign(appUrl("home", "", w.id, e.target.value))
                  }
                >
                  {w.members
                    .filter((m) => m.status === "active")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {m.role === "admin" ? "管理员" : "成员"}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
          </footer>
        </div>
        {rail}
      </div>
    </section>
  );
}
export function ManagementToast({ message }: { message: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const reset = window.setTimeout(() => setHidden(false), 0);
    const timer = window.setTimeout(() => setHidden(true), 3800);
    return () => {
      clearTimeout(reset);
      clearTimeout(timer);
    };
  }, [message]);
  return typeof document === "undefined" || !message || hidden
    ? null
    : createPortal(
        <div
          id="ws-toast"
          className="ws-toast"
          role="status"
          hidden={!message || hidden}
        >
          {message}
        </div>,
        document.body,
      );
}
export function ManagementDialog({
  title,
  children,
  footer,
  form,
  onSubmit,
  onClose,
  wide = false,
  error = "",
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  form?: string;
  onSubmit?: (data: FormData) => void | Promise<void>;
  onClose: () => void;
  wide?: boolean;
  error?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    const focus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (focus?.isConnected) focus.focus({ preventScroll: true });
    };
  }, []);
  const content = (
    <>
      {children}
      <p className="ws-form-error" role="alert">
        {failure || error}
      </p>
      {footer ? <footer className="ws-dialog-footer">{footer}</footer> : null}
    </>
  );
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog
      ref={ref}
      id="ws-dialog"
      className={`ws-dialog${wide ? " ws-dialog-wide" : ""}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="ws-dialog-head">
        <h2>{title}</h2>
        <ManagementButton
          action="close-dialog"
          className="ws-icon-button"
          aria-label="关闭"
          onClick={onClose}
        >
          <ManagementIcon name="x" />
        </ManagementButton>
      </div>
      {form ? (
        <form
          className="ws-dialog-content"
          data-ws-form={form}
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            try {
              setFailure("");
              await onSubmit?.(data);
            } catch (reason) {
              setFailure((reason as Error).message);
            }
          }}
        >
          {content}
        </form>
      ) : (
        <div className="ws-dialog-content">{content}</div>
      )}
    </dialog>,
    document.body,
  );
}
