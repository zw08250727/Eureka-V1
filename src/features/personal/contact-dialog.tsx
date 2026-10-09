import { useEffect, useRef, useState } from "react";
import type { Contact } from "./store";
import type { CustomerSource } from "./contact-identity";
import { crmCustomers } from "./customer-crm-demo";

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
  const [channel, setChannel] = useState<CustomerSource["channel"]>("manual");
  const [subjectType, setSubjectType] = useState(person?.subjectType || "person");
  const [crmId, setCrmId] = useState<string>(crmCustomers[0].crmId);
  const crm = crmCustomers.find((c) => c.crmId === crmId)!;
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
      : kind === "edit" ? "编辑客户" : "添加客户";
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
            ) : (
              <>
                {kind === "add" && <>
                  <div className="customer-methods" role="group" aria-label="录入方式">
                    {([["manual", "手动录入"], ["crm", "CRM 系统导入"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={channel === value} onClick={() => { setChannel(value); setError(""); }}>{label}</button>)}
                  </div>
                  <input type="hidden" name="channel" value={channel} />
                  <input type="hidden" name="sourceId" value={channel === "crm" ? crmId : sourceId} />
                </>}
                {kind === "add" && channel === "crm" ? <>
                  <p className="customer-import-notice">演示 CRM · 本地示例记录，尚未连接真实 CRM 系统。</p>
                  <input type="hidden" name="crmSystem" value="演示 CRM" />
                  <label>选择 CRM 客户<select aria-label="选择 CRM 客户" name="crmId" value={crmId} onChange={(e) => setCrmId(e.target.value)}>
                    {crmCustomers.map((c) => <option key={c.crmId} value={c.crmId}>{c.name} · {c.subjectType === "enterprise" ? "企业" : "自然人"}</option>)}
                  </select></label>
                  <section className="customer-import-preview" aria-label="导入预览">
                    <strong>{crm.name}</strong><p>{crm.subjectType === "enterprise" ? "企业" : "自然人"} · {crm.region}</p>
                    <p>{crm.company} · {crm.role}</p><p>{crm.email || "未提供邮箱"}</p><p>{crm.summary}</p>
                    <small>CRM 客户编号：{crm.crmId}</small>
                  </section>
                  {Object.entries(crm).filter(([key]) => key !== "crmId").map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
                  {crm.subjectType === "person" && <input type="hidden" name="verifiedEmail" value="yes" />}
                  <p className="contacts-muted">仅导入到当前工作区的“我的客户”。本人已有匹配档案将更新，CRM 已有字段优先；不同成员、不同工作区保持独立。</p>
                </> : <>
                  <div className="contacts-form-grid">
                    <label>主体类型<select aria-label="主体类型" name="subjectType" value={subjectType} onChange={(e) => setSubjectType(e.target.value as "person" | "enterprise")} disabled={kind === "edit"}>
                      <option value="person">自然人</option><option value="enterprise">企业</option>
                    </select></label>
                    {kind === "edit" && <input type="hidden" name="subjectType" value={subjectType} />}
                    <label>{subjectType === "enterprise" ? "企业名称" : "客户姓名"}<input name="name" required maxLength={100} defaultValue={person?.name || ""} /></label>
                    {subjectType === "person" && <label>所属公司<input name="company" maxLength={100} defaultValue={person?.company || ""} /></label>}
                    <label>{subjectType === "enterprise" ? "所属行业" : "职务 / 角色"}<input name="role" maxLength={100} defaultValue={person?.role || ""} /></label>
                    <label>联系邮箱<input name="email" type="email" defaultValue={person?.email === "待补充" ? "" : person?.email || ""} /></label>
                    <label>所在地区<input name="region" maxLength={100} defaultValue={person?.region || ""} /></label>
                    <label>客户标签<input name="tag" maxLength={50} placeholder="如潜在客户、合作伙伴" defaultValue={person?.tag || ""} /></label>
                  </div>
                  {kind === "add" && subjectType === "person" && <label className="contacts-identity-check"><input type="checkbox" name="verifiedEmail" />此邮箱已核实为客户个人邮箱</label>}
                  <label>客户简介<textarea name="summary" maxLength={1000} rows={3} defaultValue={person?.summary || ""} placeholder="记录业务背景、需求与合作情况" /></label>
                  <p className="contacts-muted">同名客户可以分别保存。客户资料默认仅自己可见；本人已有 CRM 字段优先。</p>
                </>}
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
                    ? channel === "crm" ? "确认导入" : "添加客户"
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
