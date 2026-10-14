import { Select } from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";
import type { Contact } from "./store";

export type ContactDialogKind = "add" | "edit" | "note";
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
  const [channel, setChannel] = useState<"manual" | "phone">("manual");
  const [subjectType, setSubjectType] = useState(person?.subjectType || "person");
  const isPhoneGuide = kind === "add" && channel === "phone";
  const [sourceId] = useState(() => crypto.randomUUID());
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
      : kind === "edit" ? "编辑联系人" : "添加联系人";
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
              if (isPhoneGuide) return;
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
            ) : (
              <>
                {kind === "add" && <>
                  <div className="customer-methods" role="group" aria-label="录入方式">
                    {([["manual", "手动创建"], ["phone", "手机通讯录导入"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={channel === value} onClick={() => { setChannel(value); setError(""); }}>{label}</button>)}
                  </div>
                  {!isPhoneGuide && <>
                    <input type="hidden" name="channel" value="manual" />
                    <input type="hidden" name="sourceId" value={sourceId} />
                  </>}
                </>}
                {isPhoneGuide ? (
                  <section className="contacts-phone-guide" aria-label="手机 App 导入指引">
                    <h3>请在手机 App 中导入通讯录</h3>
                    <p>打开手机 App，使用与当前网页相同的账号登录。</p>
                    <p>切换到需要导入的个人或团队工作区，授权访问手机通讯录后，选择联系人完成导入。</p>
                  </section>
                ) : <>
                  <div className="contacts-form-grid">
                    <label>主体类型<Select aria-label="主体类型" name="subjectType" value={subjectType} onChange={(e) => setSubjectType(e.target.value as "person" | "enterprise")} disabled={kind === "edit"}>
                      <option value="person">自然人</option><option value="enterprise">企业</option>
                    </Select></label>
                    {kind === "edit" && <input type="hidden" name="subjectType" value={subjectType} />}
                    <label>{subjectType === "enterprise" ? "企业名称" : "客户姓名"}<input name="name" required maxLength={100} defaultValue={person?.name || ""} /></label>
                    {subjectType === "person" && <label>所属公司<input name="company" maxLength={100} defaultValue={person?.company || ""} /></label>}
                    <label>{subjectType === "enterprise" ? "所属行业" : "职务 / 角色"}<input name="role" maxLength={100} defaultValue={person?.role || ""} /></label>
                    <label>联系邮箱<input name="email" type="email" defaultValue={person?.email === "待补充" ? "" : person?.email || ""} /></label>
                    <label>联系电话<input name="phone" type="tel" maxLength={20} defaultValue={person?.phone || ""} /></label>
                    <label>所在地区<input name="region" maxLength={100} defaultValue={person?.region || ""} /></label>
                    <label>客户标签<input name="tag" maxLength={50} placeholder="如潜在客户、合作伙伴" defaultValue={person?.tag || ""} /></label>
                  </div>
                  <label>客户简介<textarea name="summary" maxLength={1000} rows={3} defaultValue={person?.summary || ""} placeholder="记录业务背景、需求与合作情况" /></label>
                  <p className="contacts-muted">同名客户可以分别保存。团队区资料默认本人及管理员可见；本人已有 CRM 字段优先。</p>
                </>}
              </>
            )}
            <p className="contacts-form-error" role="alert">
              {error}
            </p>
            <div className="contacts-dialog-actions">
              {isPhoneGuide ? (
                <button className="contacts-button primary" type="button" onClick={onClose}>知道了</button>
              ) : <>
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
              </>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
