/* eslint-disable @next/next/no-img-element -- Preserve the original image element sizing and local upload preview behavior. */
"use client";
import { useState, type ReactNode } from "react";
import {
  MdDialog,
  MdButton as B,
  NativeDialog,
  DeleteOverlay,
  download,
  clockTime,
} from "./reference-ui";
import { RefIcon } from "@/features/reference/symbols";
import { linesFor, transcriptText } from "./content";
import type { MeetingDetail } from "./types";
import type { Workspace } from "@/features/spaces/model/types";
import { assetUrl } from "@/lib/routes";
const templates: Record<string, string[]> = {
  白领办公: [
    "日常工作例会",
    "项目进度",
    "工作部署",
    "月度 / 季度工作总结",
    "周度工作复盘与规划会",
  ],
  知识教育: ["培训学习笔记", "学术或产品分享", "党课学习教育总结", "党会沉淀"],
  通用: [
    "智能匹配",
    "通用",
    "播客访谈",
    "党课学习教育总结",
    "商务洽谈合作",
    "学术或产品分享",
    "日常工作例会",
    "项目进度",
    "工作部署",
    "月度 / 季度工作总结",
    "培训学习笔记",
    "周度工作复盘与规划会",
  ],
  销售管理: ["商务洽谈合作", "客户需求访谈"],
  法律: ["法律咨询纪要"],
  投研分析: ["投研会议纪要"],
  人力资源: ["面试评估"],
  金融: ["金融业务会议"],
  媒体: ["播客访谈"],
  我的模版: [],
};
const shareNames: Record<string, string> = {
  audio: "音频",
  transcript: "转译文本",
  translation: "实时翻译",
  summary: "总结",
};
function regenerated(r: MeetingDetail) {
  if (r.language === "English")
    return `${r.title}\n\nMeeting summary · ${r.template}\nThe team reviewed delivery progress and customer feedback.\n\nDecisions\nPrioritize the core workflow and clarify acceptance criteria.\n\nAction items\nProduct: refine the proposal. Engineering: confirm the timeline. Customer success: gather feedback.\n\nNext review: follow up in the next weekly meeting.`;
  if (r.detail === "精简")
    return `【${r.template}】\n明确需求优先级与实施排期；产品补齐方案、研发确认时间、客户成功跟进反馈，下周复查。`;
  return `【${r.template}】\n\n本次会议围绕「${r.title}」展开讨论，重点确认产品交付、客户反馈与后续协作安排。参会人对当前问题、需求优先级和排期进行了梳理，一致同意优先完善核心使用流程，并将客户试用反馈统一沉淀到知识库。\n\n后续由产品侧补齐方案与验收标准，研发侧确认实施排期，客户成功团队持续跟进试用情况；下周例会共同检查行动项进展。\n\n行动项\n1. 产品：补齐方案与验收标准。\n2. 研发：确认实施排期与技术依赖。\n3. 客户成功：汇总试用反馈。${r.detail === "详细" ? "\n\n风险与待确认\n需求范围与资源投入需要进一步核对；下次评审确认验收口径。\n\n后续安排\n会前同步方案，会中核对分工，会后检查行动项。" : ""}`;
}
export function MeetingDialogs({
  kind,
  r,
  onClose,
  onSave,
  onRemove,
  seek,
  workspace,
  copyText,
  previewImage,
}: {
  kind: string;
  r: MeetingDetail;
  onClose: () => void;
  onSave: (patch: Partial<MeetingDetail>) => void;
  onRemove: () => Promise<void>;
  seek: (n: number) => void;
  workspace?: Workspace;
  copyText: string;
  previewImage?: { name: string; url: string };
}) {

  const [openedAt] = useState(() => Date.now());
  const [page, setPage] = useState(kind),
    [error, setError] = useState(""),
    [form, setForm] = useState({ ...r, tagsText: r.tags.join("，") }),
    [silent, setSilent] = useState<string[]>([]),
    [category, setCategory] = useState("通用"),
    [choice, setChoice] = useState("summary"),
    [format, setFormat] = useState("txt"),
    [shareTypes, setShareTypes] = useState(Object.keys(shareNames)),
    [days, setDays] = useState(7),
    [busy, setBusy] = useState(false);
  const field = (
    key: "title" | "customer" | "project" | "location" | "tagsText",
    label: string,
    props: Record<string, unknown> = {},
  ) => (
    <label className="md-field">
      <span>{label}</span>
      <input
        id={`md-${key === "title" ? "rename" : key === "tagsText" ? "tags" : key}`}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        {...props}
      />
    </label>
  );
  const save = (patch: Partial<MeetingDetail>) => {
    try {
      onSave(patch);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const back = () => {
    setPage("share");
    setError("");
  };
  let title = "",
    subtitle = "",
    body: ReactNode = null,
    footer: ReactNode = null,
    cls = "";
  const cancel = (
    <B action="dismiss" onClick={onClose}>
      取消
    </B>
  );
  if (page === "rename") {
    title = "修改录音标题";
    body = field("title", "录音标题", { maxLength: 120, autoFocus: true });
    footer = (
      <>
        {cancel}
        <B
          action="save-name"
          className="md-btn md-primary"
          onClick={() =>
            form.title.trim()
              ? save({ title: form.title.trim() })
              : setError("请输入录音标题")
          }
        >
          保存
        </B>
      </>
    );
  }
  if (page === "info") {
    title = "补充会议信息";
    subtitle = "完善客户、商机与标签，便于查找和整理。";
    body = (
      <>
        {(["customer", "project"] as const).map((key) => {
          const customer = key === "customer";
          const types = customer
            ? ["CRM客户", "非CRM客户"]
            : ["CRM商机", "非CRM商机"];
          const typeKey = customer ? "customerType" : "projectType";
          return (
            <label className="md-field" key={key}>
              <span>{customer ? "客户名称" : "商机项目名称"}</span>
              <span className="md-inline md-radio-row">
                {types.map((type) => (
                  <label key={type}>
                    <input
                      type="radio"
                      name={`md-${key}-type`}
                      value={type}
                      checked={(form[typeKey] || types[0]) === type}
                      onChange={() => setForm({ ...form, [typeKey]: type })}
                    />
                    {type}
                  </label>
                ))}
              </span>
              <input
                id={`md-${key}`}
                list={`md-${key}s`}
                maxLength={80}
                placeholder={
                  customer ? "搜索或输入客户名称" : "搜索或输入商机项目"
                }
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
              <datalist id={`md-${key}s`}>
                {(customer
                  ? ["ABC Energy", "演示科技"]
                  : ["产品试用项目", "客户合作方案"]
                ).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </datalist>
            </label>
          );
        })}
        {field("location", "手动添加位置", {
          maxLength: 30,
          placeholder: "输入位置（最多30字）",
        })}
        <div className="md-pills">
          {["线上会议", "会议室 A", "会议室 B"].map((x) => (
            <B
              key={x}
              action="location"
              className=""
              data-value={x}
              onClick={() => setForm({ ...form, location: x })}
            >
              {x}
            </B>
          ))}
        </div>
        {field("tagsText", "已选标签（最多10个）", {
          maxLength: 210,
          placeholder: "用逗号分隔多个标签",
        })}
        <small>常用标签</small>
        <div className="md-pills">
          {["产品复盘", "需求讨论", "客户访谈", "项目评审"].map((x) => (
            <B
              key={x}
              action="tag"
              className=""
              data-value={x}
              onClick={() => {
                const tags = form.tagsText
                  .split(/[,，]/)
                  .map((t) => t.trim())
                  .filter(Boolean);
                if (!tags.includes(x) && tags.length < 10)
                  setForm({ ...form, tagsText: [...tags, x].join("，") });
              }}
            >
              {x}
            </B>
          ))}
        </div>
      </>
    );
    footer = (
      <>
        {cancel}
        <B
          action="save-info"
          className="md-btn md-primary"
          onClick={() => {
            const tags = [
              ...new Set(
                form.tagsText
                  .split(/[,，]/)
                  .map((t) => t.trim())
                  .filter(Boolean),
              ),
            ];
            if (tags.length > 10 || tags.some((t) => t.length > 20)) {
              setError("最多10个标签，每个标签不超过20字");
              return;
            }
            save({
              customer: form.customer.trim(),
              project: form.project.trim(),
              location: form.location.trim(),
              customerType: form.customerType,
              projectType: form.projectType,
              tags,
            });
          }}
        >
          保存
        </B>
      </>
    );
  }
  if (page === "participants") {
    title = "编辑参会人";
    subtitle = "修改名称会同步到转译文本和逐字稿。";
    body = (
      <>
        <div className="md-inline">
          <strong>未发言参会人</strong>
          <B
            action="add-person"
            className="md-link"
            onClick={() => {
              if (form.speakers.length + silent.length >= 20)
                setError("最多添加20位参会人");
              else setSilent([...silent, ""]);
            }}
          >
            ＋ 添加
          </B>
        </div>
        <div id="md-silent-people">
          {silent.map((s, i) => (
            <label className="md-field" key={i}>
              <input
                data-md-person
                aria-label="未发言参会人"
                maxLength={30}
                placeholder="输入参会人姓名"
                value={s}
                onChange={(e) =>
                  setSilent(
                    silent.map((v, j) => (j === i ? e.target.value : v)),
                  )
                }
              />
            </label>
          ))}
        </div>
        <div id="md-people">
          {form.speakers.map((name, i) => (
            <section className="md-participant" key={i}>
              <header>
                <input
                  data-md-person
                  aria-label={`参会人 ${i + 1}`}
                  maxLength={30}
                  value={name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      speakers: form.speakers.map((v, j) =>
                        i === j ? e.target.value : v,
                      ),
                    })
                  }
                />
                <small>{i < 3 ? "总发言时长 · 演示" : "未发言"}</small>
              </header>
              {i < 3 ? (
                <div className="md-clip">
                  <B
                    action="clip"
                    className="md-link"
                    data-at={i * 8}
                    onClick={() => seek(i * 8)}
                  >
                    {`▶ ${clockTime(i * 8)} — ${clockTime(i * 8 + 7)}`}
                  </B>
                  <p>{linesFor(r)[i]?.text}</p>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </>
    );
    footer = (
      <>
        {cancel}
        <B
          action="save-people"
          className="md-btn md-primary"
          onClick={() => {
            const people = [...form.speakers, ...silent].map((s) => s.trim());
            if (people.some((s) => !s)) setError("请填写所有参会人姓名");
            else save({ speakers: people });
          }}
        >
          保存
        </B>
      </>
    );
  }
  if (page === "template") {
    title = "重新总结";
    subtitle = "以下为当前已选配置，可直接修改后重新总结";
    cls = "md-template-dialog";
    body = (
      <div className="md-template-layout">
        <nav className="md-categories" aria-label="模板分类">
          {Object.keys(templates).map((x) => (
            <B
              key={x}
              action="category"
              className=""
              data-value={x}
              aria-pressed={category === x}
              onClick={() => setCategory(x)}
            >
              {x}
            </B>
          ))}
        </nav>
        <div>
          <div className="md-inline">
            <strong>选择总结模板</strong>
            <B
              action="template-help"
              className="md-link"
              onClick={() =>
                setError(
                  "模板决定总结的组织方式；“详细程度”控制示例内容的篇幅。",
                )
              }
            >
              查看模板说明 ›
            </B>
          </div>
          <div className="md-template-grid" id="md-template-grid">
            {templates[category].length ? (
              templates[category].map((x) => (
                <B
                  key={x}
                  action="choose-template"
                  className="md-template-card"
                  data-value={x}
                  aria-label={x}
                  aria-pressed={form.template === x}
                  onClick={() => setForm({ ...form, template: x })}
                >
                  <span>▤</span>
                  {x}
                </B>
              ))
            ) : (
              <p className="md-notice">还没有自定义模板。请选择系统模板。</p>
            )}
          </div>
          <strong>全局设置</strong>
          <p style={{ color: "#9da4b1" }}>生成配置</p>
          <div className="md-settings">
            {(["language", "detail"] as const).map((key) => (
              <label className="md-field" key={key}>
                <span>{key === "language" ? "总结语言" : "详细程度"}</span>
                <select
                  id={`md-${key}`}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                >
                  {(key === "language"
                    ? ["中文（中国）", "English"]
                    : ["精简", "标准", "详细"]
                  ).map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="md-notice">
            演示模式：按所选模板重排本地示例内容，未连接 AI 总结服务。
          </div>
        </div>
      </div>
    );
    footer = (
      <>
        {cancel}
        <B
          action="regenerate"
          className="md-btn md-primary"
          onClick={() =>
            save({
              template: form.template,
              language: form.language,
              detail: form.detail,
              summary: regenerated(form),
              summaryHtml: "",
            })
          }
        >
          开始重新总结
        </B>
      </>
    );
  }
  if (page === "export") {
    title = "选择导出内容";
    subtitle = "请选择您需要导出的内容类型";
    body = [
      ["audio", "音频", "会议录音文件（演示音频）"],
      ["transcript", "转译文本", "会议语音转文字内容"],
      ["translation", "实时翻译", "会议实时翻译内容"],
      ["summary", `总结-${r.title}`, "AI生成的会议总结"],
    ].map(([id, label, desc]) => (
      <label className="md-choice" key={id}>
        <input
          type="radio"
          name="md-export"
          value={id}
          checked={choice === id}
          onChange={() => setChoice(id)}
        />
        <span>
          <strong>导出{label}</strong>
          <small>导出{desc}</small>
        </span>
      </label>
    ));
    footer = (
      <>
        {cancel}
        <B
          action="export-next"
          className="md-btn md-primary"
          onClick={() => {
            setFormat(choice === "audio" ? "wav" : "txt");
            setPage("formats");
          }}
        >
          下一步
        </B>
      </>
    );
  }
  if (page === "formats") {
    title = "选择导出格式";
    subtitle = "请选择您需要导出的格式";
    body = (
      choice === "audio"
        ? [["wav", "WAV", "音频文件"]]
        : [
            ["txt", "TXT", "纯文本格式"],
            ["json", "JSON", "结构化数据格式"],
          ]
    ).map(([id, label, desc]) => (
      <label className="md-choice" key={id}>
        <input
          type="radio"
          name="md-format"
          value={id}
          checked={format === id}
          onChange={() => setFormat(id)}
        />
        <span>
          <strong>{label}</strong>
          <small>
            {desc} · .{id}文件
          </small>
        </span>
      </label>
    ));
    footer = (
      <>
        <B action="export" onClick={() => setPage("export")}>
          上一步
        </B>
        <B
          action="download"
          className="md-btn md-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              if (format === "wav") {
                const response = await fetch(assetUrl("meeting-demo.wav"));
                if (!response.ok) throw Error("下载失败，请稍后重试。");
                download(
                  await response.blob(),
                  "wav",
                  `${r.title}-演示音频`,
                  "audio/wav",
                );
              } else {
                const text =
                  choice === "summary"
                    ? r.summary
                    : transcriptText(r, choice === "translation");
                download(
                  format === "json"
                    ? JSON.stringify(
                        {
                          title: r.title,
                          type: choice,
                          content: text,
                          speakers: r.speakers,
                          demo: true,
                        },
                        null,
                        2,
                      )
                    : `${r.title}\n\n${text}`,
                  format,
                  r.title,
                  format === "json"
                    ? "application/json"
                    : "text/plain;charset=utf-8",
                );
              }
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          下载
        </B>
      </>
    );
  }
  if (page === "share") {
    title = "分享配置";
    body = (
      <>
        <label className="md-field">
          <span>分享类型</span>
          <select aria-label="分享类型">
            <option>公开链接 · 任何人通过链接都可以访问</option>
          </select>
        </label>
        <div className="md-inline">
          <strong>分享内容</strong>
          <label>
            <input
              id="md-share-all"
              type="checkbox"
              checked={shareTypes.length === 4}
              onChange={(e) =>
                setShareTypes(e.target.checked ? Object.keys(shareNames) : [])
              }
            />
            全选
          </label>
        </div>
        <p style={{ color: "#9ba0aa" }}>仅已选择的内容可供访问者查看</p>
        <div className="md-pills">
          {Object.entries(shareNames).map(([k, v]) => (
            <B
              key={k}
              action="share-type"
              className=""
              data-value={k}
              aria-pressed={shareTypes.includes(k)}
              onClick={() =>
                setShareTypes(
                  shareTypes.includes(k)
                    ? shareTypes.filter((t) => t !== k)
                    : [...shareTypes, k],
                )
              }
            >
              {v}
            </B>
          ))}
        </div>
        <strong>有效期设置</strong>
        <div className="md-pills">
          {[3, 7, 30, 0].map((n) => (
            <B
              key={n}
              action="share-days"
              className=""
              data-days={n}
              aria-pressed={days === n}
              onClick={() => setDays(n)}
            >
              {n ? `${n}天` : "永久"}
            </B>
          ))}
        </div>
        <p id="md-share-expiry" style={{ color: "#9aa1af" }}>
          {days
            ? `有效至：${new Date(openedAt + days * 86400000).toLocaleString("zh-CN")}`
            : "链接永久有效"}
        </p>
        <div className="md-notice">
          当前为本地原型，未连接分享服务。可预览访问者看到的内容，不会发布公开链接。
        </div>
      </>
    );
    footer = (
      <>
        <B
          action="share-history"
          className="md-link"
          onClick={() => {
            setPage("share-history");
            setError("");
          }}
        >
          查看分享记录
        </B>
        <B
          action="share-preview"
          onClick={() => {
            if (!shareTypes.length) setError("请至少选择一项分享内容");
            else {
              setPage("share-preview");
              setError("");
            }
          }}
        >
          预览分享内容
        </B>
        <B
          action="share-create"
          className="md-btn md-primary"
          onClick={() =>
            setError(
              shareTypes.length
                ? "尚未连接分享服务，无法生成公开链接。可先预览分享内容。"
                : "请至少选择一项分享内容",
            )
          }
        >
          生成分享链接
        </B>
      </>
    );
  }
  if (page === "share-preview") {
    title = "分享内容预览";
    subtitle = "仅本地预览 · 尚未发布";
    body = (
      <>
        <h2>{r.title}</h2>
        {shareTypes.map((t) => (
          <section key={t}>
            <h3>{shareNames[t]}</h3>
            {t === "audio" ? (
              <p className="md-notice">演示音频 · 返回详情页播放</p>
            ) : (
              <div className="md-prose">
                {t === "summary"
                  ? r.summary
                  : transcriptText(r, t === "translation")}
              </div>
            )}
          </section>
        ))}
      </>
    );
    footer = (
      <B action="share" onClick={back}>
        返回配置
      </B>
    );
  }
  if (page === "share-history") {
    title = "分享记录";
    body = (
      <div className="md-empty" style={{ minHeight: 160 }}>
        <h2>暂无分享记录</h2>
        <p>当前原型尚未发布公开分享链接。</p>
      </div>
    );
    footer = (
      <B action="share" onClick={back}>
        返回配置
      </B>
    );
  }
  if (page === "delete" && workspace)
    return (
      <NativeDialog
        className="ws-dialog"
        id="ws-dialog"
        label="ws-delete-title"
        onClose={onClose}
      >
        <div className="ws-dialog-head">
          <h2 id="ws-delete-title">移入回收站？</h2>
          <button
            type="button"
            className="ws-btn ws-icon-button"
            data-ws-action="close-dialog"
            aria-label="关闭"
            onClick={onClose}
          >
            <RefIcon name="x" className="ws-icon" />
          </button>
        </div>
        <div className="ws-dialog-content">
          <p>
            此录音将从列表中移除，伙伴的访问权限也会暂时失效。30
            天内可在录音回收站恢复。
          </p>
          <p className="ws-form-error" role="alert">
            {error}
          </p>
          <footer className="ws-dialog-footer">
            <button type="button" className="ws-btn" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="ws-btn primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onRemove();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              确认
            </button>
          </footer>
        </div>
      </NativeDialog>
    );
  if (page === "delete")
    return (
      <DeleteOverlay onClose={onClose}>
        <div className="modal-head">
          <h3 id="delete-confirm-title">确认删除录音文件？</h3>
          <button
            className="close-btn"
            aria-label="关闭删除确认"
            onClick={onClose}
          >
            <RefIcon name="x" />
          </button>
        </div>
        <div className="modal-body">
          <p id="delete-confirm-description">
            删除后文件移入回收站，30 天内可恢复，超期永久删除；相关转写和 AI
            总结一并移除。
          </p>
          {error ? <p role="alert">{error}</p> : null}
        </div>
        <div className="modal-foot">
          <button className="secondary-btn" onClick={onClose}>
            取消
          </button>
          <button
            className="danger-btn"
            id="delete-confirm-submit"
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onRemove();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            确定
          </button>
        </div>
      </DeleteOverlay>
    );
  if (page === "copy") {
    title = "复制内容";
    subtitle = "浏览器未允许自动复制，可选择下面的文本手动复制。";
    body = <textarea readOnly aria-label="待复制内容" value={copyText} />;
    footer = (
      <B action="dismiss" onClick={onClose}>
        关闭
      </B>
    );
  }
  if (page === "image-preview" && previewImage) {
    title = previewImage.name;
    subtitle = "本次会话上传的图片";
    body = (
      <img
        className="md-preview-image"
        src={previewImage.url}
        alt={previewImage.name}
      />
    );
    footer = (
      <B action="dismiss" onClick={onClose}>
        关闭
      </B>
    );
  }
  return (
    <MdDialog
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={footer}
      error={error}
      className={cls}
    >
      {body}
    </MdDialog>
  );
}
