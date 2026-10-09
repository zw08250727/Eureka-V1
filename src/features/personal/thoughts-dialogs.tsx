"use client";
/* eslint-disable @next/next/no-img-element -- Preserve the reference guide image markup and dimensions. */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ThoughtRecord } from "@/features/workbench/model/types";
import { RefIcon } from "@/features/reference/symbols";
import { assetUrl } from "@/lib/routes";
import { ledgerCurrency, ledgerDate, money } from "./asset-rules";
import { RefDialog } from "./calendar-dialogs";
export const thoughtNames = {
  schedule: "日程",
  todo: "待办",
  inspiration: "灵感",
  ledger: "记账",
  other: "其他",
};
export const thoughtMoney = (
  r: Pick<ThoughtRecord, "direction" | "amount" | "currency">,
) =>
  `${r.direction === "income" ? "收入" : "支出"} ${money(r.amount ?? NaN, ledgerCurrency(r))}`;
export function ThButton({
  action,
  children,
  id = "",
  className = "",
  onClick,
}: {
  action: string;
  children: ReactNode;
  id?: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`th-btn ${className}`}
      data-th={action}
      data-id={id}
      aria-label={className === "th-close" ? "关闭闪念详情" : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function ThoughtDialog({
  record,
  editing,
  onEdit,
  onClose,
  onSave,
}: {
  record: ThoughtRecord;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSave: (r: ThoughtRecord) => void;
}) {
  const [base] = useState(record),
    [type, setType] = useState(record.type),
    [error, setError] = useState(""),
    [guard, setGuard] = useState(false);
  const form = useRef<HTMLFormElement>(null),
    initial = useRef("");
  const values = () => Object.fromEntries(new FormData(form.current!));
  useLayoutEffect(() => {
    if (editing && form.current) {
      initial.current = JSON.stringify(
        Object.fromEntries(new FormData(form.current)),
      );
      form.current.querySelector<HTMLInputElement>("[name=title]")?.focus();
    }
  }, [editing]);
  const dirty = () =>
    editing && !!form.current && JSON.stringify(values()) !== initial.current;
  const close = () => (dirty() ? setGuard(true) : onClose());
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const storage = (e: StorageEvent) => {
      if (e.key === "eureka:thoughts:v1" && editing)
        setError("另一页面已更新，请保留输入，重新打开后编辑");
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("storage", storage);
    };
  });
  const r = record;
  return (
    <>
      <RefDialog
        id="thought-record-dialog"
        className="th-dialog"
        label={editing ? "编辑闪念" : "闪念详情"}
        onClose={close}
      >
        {editing ? (
          <>
            <header>
              <h2>编辑闪念</h2>
              <ThButton action="close" className="th-close" onClick={close}>
                <RefIcon name="x" />
              </ThButton>
            </header>
            <form
              id="th-edit-form"
              ref={form}
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const f = values();
                  onSave({ ...base, ...f, type, amount: Number(f.amount) });
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <label>
                标题
                <input
                  name="title"
                  maxLength={200}
                  required
                  defaultValue={base.title}
                  placeholder="记下一个想法"
                />
              </label>
              <div className="th-form-grid">
                <label>
                  分类
                  <select
                    name="type"
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as ThoughtRecord["type"])
                    }
                  >
                    {(["inspiration", "ledger", "other"] as const).map((t) => (
                      <option key={t} value={t}>
                        {thoughtNames[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  记录日期
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={base.date}
                  />
                </label>
                <label>
                  时间
                  <input
                    name="time"
                    type="time"
                    required
                    defaultValue={base.time}
                  />
                </label>
              </div>
              <div
                className="th-form-grid th-ledger-fields"
                hidden={type !== "ledger"}
              >
                <label>
                  收支发生日期
                  <input
                    name="occurredOn"
                    type="date"
                    defaultValue={ledgerDate(base)}
                  />
                  <small>未知可留空，不计入当日收支</small>
                </label>
                <label>
                  币种
                  <input
                    name="currency"
                    maxLength={3}
                    pattern="[A-Z]{3}"
                    defaultValue={ledgerCurrency(base)}
                    placeholder="CNY / USD"
                  />
                </label>
                <label>
                  记录性质
                  <select
                    name="entryKind"
                    defaultValue={base.entryKind || "actual"}
                  >
                    <option value="actual">实际收支</option>
                    <option value="planned">
                      预算／计划（不计入实际收支）
                    </option>
                  </select>
                </label>
                <label>
                  收支
                  <select
                    name="direction"
                    defaultValue={
                      base.direction === "income" ? "income" : "expense"
                    }
                  >
                    <option value="expense">支出</option>
                    <option value="income">收入</option>
                  </select>
                </label>
                <label>
                  金额
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    max="999999999"
                    step="0.01"
                    defaultValue={base.amount || ""}
                  />
                </label>
              </div>
              <label>
                内容
                <textarea
                  name="detail"
                  rows={5}
                  maxLength={5000}
                  placeholder="补充想法、消费场景或需要记住的细节"
                  defaultValue={base.detail}
                />
              </label>
              <p className="th-error" role="alert" hidden={!error}>
                {error}
              </p>
              <footer>
                <ThButton action="close" onClick={close}>
                  取消
                </ThButton>
                <button type="submit" className="th-btn primary">
                  保存
                </button>
              </footer>
            </form>
          </>
        ) : (
          <>
            <header>
              <div>
                <span className="th-type">{thoughtNames[r.type]}</span>
                <h2>{r.title}</h2>
              </div>
              <ThButton action="close" className="th-close" onClick={onClose}>
                <RefIcon name="x" />
              </ThButton>
            </header>
            <div className="th-detail-meta">
              {`${r.date} ${r.time} · ${r.source === "manual" ? "手动创建" : "闪念提取"}${r.updated ? " · 已编辑" : ""}`}
            </div>
            {r.type === "ledger" && (
              <div className="th-detail-money">
                {thoughtMoney(r)}
                <p>
                  收支发生日期：{ledgerDate(r) || "待补充"}
                  {r.entryKind === "planned" ? " · 预算／计划" : ""}
                </p>
              </div>
            )}
            <p className="th-detail-content">{r.detail || "暂无补充内容"}</p>
            {r.capture && (
              <details className="th-original">
                <summary>原始捕获</summary>
                <p>{r.capture}</p>
              </details>
            )}
            <footer>
              <ThButton action="close" onClick={onClose}>
                关闭
              </ThButton>
              <ThButton
                action="edit"
                id={r.id}
                className="primary"
                onClick={onEdit}
              >
                编辑
              </ThButton>
            </footer>
          </>
        )}
      </RefDialog>
      {guard && (
        <RefDialog
          className="th-dialog th-guard"
          label="保留闪念修改"
          onClose={() => setGuard(false)}
        >
          <h2>保留这次修改？</h2>
          <p>还有未保存的内容，你可以继续编辑，或放弃后关闭。</p>
          <footer>
            <ThButton action="discard" onClick={onClose}>
              放弃修改
            </ThButton>
            <ThButton
              action="continue"
              className="primary"
              onClick={() => setGuard(false)}
            >
              继续编辑
            </ThButton>
          </footer>
        </RefDialog>
      )}
    </>
  );
}
export function ThoughtDeviceGuide({ onClose }: { onClose: () => void }) {
  return (
    <RefDialog
      id="ws-dialog"
      className="ws-dialog"
      label="绑定你的设备"
      onClose={onClose}
    >
      <div className="ws-dialog-head">
        <h2>绑定你的设备</h2>
        <button
          type="button"
          className="ws-btn ws-icon-button"
          data-ws-action="close-dialog"
          data-value=""
          aria-label="关闭"
          onClick={onClose}
        >
          <RefIcon name="x" />
        </button>
      </div>
      <div className="ws-dialog-content">
        <div className="ws-device-guide">
          <section className="ws-device-guide-card">
            <h3>已经有设备？</h3>
            <p>
              在手机上下载 EurekaMind App，
              <br />
              登录后即可绑定你的设备。
            </p>
            <div className="ws-device-guide-art ws-device-guide-qr">
              <img
                src={assetUrl("download/eurekamind-download-qr.png")}
                alt="扫码下载 EurekaMind App"
                width="240"
                height="240"
              />
            </div>
            <a
              className="ws-btn ws-device-download"
              href="https://eurekamind.ai/download"
              target="_blank"
              rel="noopener noreferrer"
            >
              <RefIcon name="phone" />
              下载 App <RefIcon name="expand" />
            </a>
            <small>iOS / Android · 手机扫码下载</small>
          </section>
          <section className="ws-device-guide-card">
            <h3>还没有设备？</h3>
            <p>
              了解 EurekaMind 录音设备，
              <br />
              让每一次对话都成为有价值的记录。
            </p>
            <div className="ws-device-guide-art">
              <img
                src={assetUrl("download/eurekamind-device.webp")}
                alt="EurekaMind 录音设备"
                width="280"
                height="280"
              />
            </div>
            <a
              className="ws-btn primary"
              href="https://eurekamind.ai/shop"
              target="_blank"
              rel="noopener noreferrer"
            >
              购买设备 <RefIcon name="expand" />
            </a>
            <small>前往 EurekaMind 官方商城</small>
          </section>
        </div>
        <p className="ws-device-guide-note">
          在 App
          中登录同一账号，选择「个人工作空间」完成设备绑定。绑定成功后，录音将同步到设备所属的工作空间。
        </p>
        <p className="ws-form-error" role="alert" />
      </div>
    </RefDialog>
  );
}
