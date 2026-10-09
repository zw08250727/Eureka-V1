import { useEffect, useRef, useState } from "react";
import type { Contact } from "./store";

export type ContactDialogKind = "add" | "edit" | "note" | "followup";
export function ContactDialog({
  kind,
  person,
  onClose,
  onSave,
  noteText = "",
}: {
  noteText?: string;
  kind: ContactDialogKind;
  person?: Contact;
  onClose: () => void;
  onSave: (values: FormData) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const [error, setError] = useState("");
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;

    dialog
      .querySelector<HTMLElement>("input:not([type=hidden]),textarea,select")
      ?.focus();
    return () => {
      previous?.focus({ preventScroll: true });
    };
  }, []);
  const title =
    kind === "note"
      ? "添加备注"
      : kind === "followup"
        ? "创建跟进"
        : kind === "edit"
          ? "编辑联系人"
          : "添加联系人";
  return (
    <div
      ref={ref}
      className="contacts-overlay show"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          closeRef.current();
        }
        if (e.key === "Tab") {
          const nodes = [
            ...e.currentTarget.querySelectorAll<HTMLElement>(
              "button,input:not([type=hidden]),textarea,select,a[href]",
            ),
          ].filter((x) => !x.hasAttribute("disabled"));
          const first = nodes[0],
            last = nodes.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="contacts-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button
            type="button"
            data-contact-action="close-dialog"
            aria-label="关闭"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="contacts-dialog-body">
          <form
            data-contact-form={kind}
            onSubmit={(e) => {
              e.preventDefault();
              try {
                onSave(new FormData(e.currentTarget));
              } catch (cause) {
                setError((cause as Error).message);
              }
            }}
          >
            {kind !== "add" ? (
              <input type="hidden" name="person" value={person?.id || ""} />
            ) : null}
            {kind === "note" ? (
              <label>
                备注内容
                <textarea
                  name="text"
                  defaultValue={noteText}
                  required
                  rows={5}
                  maxLength={2000}
                  placeholder="记录这段关系中需要保留的上下文"
                />
              </label>
            ) : ["add", "edit"].includes(kind) ? (
              <>
                <div className="contacts-form-grid">
                  <label>
                    姓名
                    <input
                      name="name"
                      required
                      maxLength={100}
                      defaultValue={kind === "edit" ? person?.name : ""}
                    />
                  </label>
                  <label>
                    公司
                    <input
                      name="company"
                      maxLength={100}
                      defaultValue={kind === "edit" ? person?.company : ""}
                    />
                  </label>
                  <label>
                    角色
                    <input
                      name="role"
                      maxLength={100}
                      defaultValue={kind === "edit" ? person?.role : ""}
                    />
                  </label>
                  <label>
                    邮箱
                    <input
                      name="email"
                      type="email"
                      defaultValue={
                        kind === "edit" && person?.email !== "待补充"
                          ? person?.email
                          : ""
                      }
                    />
                  </label>
                  <label>
                    所在地
                    <input
                      name="region"
                      defaultValue={
                        kind === "edit" && person?.region !== "待补充"
                          ? person?.region
                          : ""
                      }
                    />
                  </label>
                  <label>
                    关系类型
                    <input
                      name="tag"
                      placeholder="客户、同事、合作伙伴等"
                      defaultValue={kind === "edit" ? person?.tag : ""}
                    />
                  </label>
                </div>
                <p className="contacts-muted">
                  允许同名联系人，请用公司或邮箱区分。保存的资料视为你已确认。
                </p>
                <label>
                  关系摘要
                  <textarea
                    name="summary"
                    defaultValue={kind === "edit" ? person?.summary : ""}
                    maxLength={1000}
                    placeholder="补充这位联系人的背景与当前关系"
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  跟进标题
                  <input
                    name="title"
                    required
                    defaultValue={`跟进 ${person?.name || ""} 的开放承诺`}
                    maxLength={120}
                  />
                </label>
                <label>
                  跟进说明
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue="结合联系人关系上下文，确认下一步行动并记录结果。"
                  />
                </label>
                <label>
                  负责人
                  <input name="owner" value="张伟" readOnly />
                </label>
              </>
            )}
            <p className="contacts-form-error" role="alert">
              {error}
            </p>
            <div className="contacts-dialog-actions">
              <button
                type="button"
                className="contacts-button"
                data-contact-action="close-dialog"
                data-value=""
                onClick={onClose}
              >
                取消
              </button>
              <button className="contacts-button primary" type="submit">
                {kind === "note"
                  ? "保存备注"
                  : kind === "add"
                    ? "添加联系人"
                    : kind === "edit"
                      ? "保存修改"
                      : "创建跟进"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
