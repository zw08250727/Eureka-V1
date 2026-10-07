"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { RefIcon } from "@/features/reference/symbols";
import { appUrl, type AppView } from "@/lib/routes";
import { M } from "./model/store";
import type { Workspace } from "./model/types";
export const money = (n: number) =>
  "¥" +
  Number(n).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const dollars = (n: number) => "$" + Number(n).toFixed(2);
export const creditNumber = (n: number = 0) =>
  Number(n).toLocaleString("zh-CN", { maximumFractionDigits: 3 });
export const date = (value?: string | null) =>
  String(value || "")
    .replace("T", " ")
    .slice(0, 16);
export function WsButton({
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
export function Badge({
  children,
  kind = "",
}: {
  children: ReactNode;
  kind?: string;
}) {
  return <span className={`ws-badge ${kind}`}>{children}</span>;
}
export function WsHeading({
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
          {w.type === "team" ? (
            <Badge>{M.admin(w, actor) ? "管理员" : "成员"}</Badge>
          ) : (
            <Badge>Personal</Badge>
          )}
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="ws-actions">{actions}</div>
    </header>
  );
}
export function ManagementTabs({
  w,
  actor,
  active,
}: {
  w: Workspace;
  actor: string;
  active: string;
}) {
  const tabs: [string, string, AppView][] = [
    ["billing", "订阅与席位", "subscription"],
    ["credits", "Credits", "credits"],
    ["settings", "空间设置", "space-settings"],
    ["audit", "活动记录", "audit"],
  ];
  return (
    <nav className="ws-tabs" aria-label="空间管理">
      {tabs.map(([key, label, view]) => (
        <WsButton
          key={key}
          action="page"
          value={key}
          className={active === key ? "active" : ""}
          onClick={() => location.assign(appUrl(view, "", w.id, actor))}
        >
          {label}
        </WsButton>
      ))}
    </nav>
  );
}
export function WsRoot({
  w,
  actor,
  view,
  children,
  agent,
}: {
  w: Workspace;
  actor: string;
  view: AppView;
  children: ReactNode;
  agent?: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const el = root.current;
      if (el)
        el.style.setProperty(
          "--ws-top",
          `${el.getBoundingClientRect().top + (el.closest(".main")?.scrollTop || 0)}px`,
        );
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <section
      ref={root}
      id="ws-view"
      className="ws-view"
      data-main-view="workspaces"
      aria-hidden={false}
    >
      {w.type === "team" && w.status !== "active" ? (
        <div className="ws-readonly">
          当前空间已到期，文件可继续查看与导出。
          {M.admin(w, actor) ? (
            <WsButton
              className="link"
              action="page"
              value="billing"
              onClick={() =>
                location.assign(appUrl("subscription", "", w.id, actor))
              }
            >
              恢复订阅 →
            </WsButton>
          ) : null}
        </div>
      ) : null}
      <div className={`ws-layout${agent ? " with-agent" : ""}`}>
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
                    location.assign(appUrl(view, "", w.id, e.target.value))
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
        {agent}
      </div>
    </section>
  );
}
export function WsDialog({
  title,
  children,
  footer,
  form,
  onSubmit,
  onClose,
  error = "",
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  form?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  error?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const el = ref.current!;
    const previous = document.activeElement;
    el.showModal();
    const cancel = (event: Event) => {
      event.preventDefault();
      closeRef.current();
    };
    el.addEventListener("cancel", cancel);
    return () => {
      el.removeEventListener("cancel", cancel);
      el.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  const content = (
    <>
      {children}
      <p className="ws-form-error" role="alert">
        {error}
      </p>
      {footer ? <footer className="ws-dialog-footer">{footer}</footer> : null}
    </>
  );
  return createPortal(
    <dialog id="ws-dialog" ref={ref} className="ws-dialog">
      <div className="ws-dialog-head">
        <h2>{title}</h2>
        <WsButton
          action="close-dialog"
          className="ws-icon-button"
          aria-label="关闭"
          onClick={onClose}
        >
          <RefIcon name="x" className="ws-icon" />
        </WsButton>
      </div>
      {form ? (
        <form
          className="ws-dialog-content"
          data-ws-form={form}
          onSubmit={onSubmit}
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
export function WsToast({
  message,
  onClear,
}: {
  message: string;
  onClear: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onClear, 3800);
    return () => clearTimeout(id);
  }, [message, onClear]);
  return !message || typeof document === "undefined"
    ? null
    : createPortal(
        <div id="ws-toast" className="ws-toast" role="status" hidden={!message}>
          {message}
        </div>,
        document.body,
      );
}
export function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
