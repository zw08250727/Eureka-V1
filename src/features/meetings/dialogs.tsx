"use client";
/* eslint-disable @next/next/no-img-element -- Preserve the original image element sizing and local upload preview behavior. */

import { Select } from "@/components/ui/select";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { TemplateContent } from "./template-picker";
import { assetUrl } from "@/lib/routes";
import { routeMarket } from "@/features/markets/config";
import { DomesticExportShareDialog } from "./export-share-dialog";
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
  allImages,
  previewIndex,
  onPreview,
  onPlayParticipantSegment,
  onStopParticipantSegment,
  activeParticipantSegmentKey,
}: {
  kind: string;
  r: MeetingDetail;
  onClose: () => void;
  onSave: (patch: Partial<MeetingDetail>) => void | Promise<void>;
  onRemove: () => Promise<void>;
  seek: (n: number) => void;
  workspace?: Workspace;
  copyText: string;
  previewImage?: { name: string; url: string };
  allImages?: { name: string; url: string }[];
  previewIndex?: number;
  onPreview?: (index: number) => void;
  onPlayParticipantSegment?: (segment: { key: string; start: number; end?: number }) => void;
  onStopParticipantSegment?: () => void;
  activeParticipantSegmentKey?: string;
}) {

  const domestic = routeMarket() === "cn";
  const previewImages = allImages ?? r.images ?? (previewImage ? [previewImage] : []);
  const [imageIndex, setImageIndex] = useState(() => previewIndex ?? Math.max(0, previewImages.findIndex(image => image.url === previewImage?.url)));
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [failedImage, setFailedImage] = useState("");
  const [openedAt] = useState(() => Date.now());
  const [page, setPage] = useState(kind),
    [error, setError] = useState(""),
    [form, setForm] = useState({ ...r, tagsText: r.tags.join("，") }),
    [silent, setSilent] = useState<string[]>(() => domestic ? [...(r.silentParticipants || [])] : []),
    [choice, setChoice] = useState("summary"),
    [format, setFormat] = useState("txt"),
    [shareTypes, setShareTypes] = useState(Object.keys(shareNames)),
    [days, setDays] = useState(7),
    [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const stopParticipant = useRef(onStopParticipantSegment);
  useEffect(() => { stopParticipant.current = onStopParticipantSegment; }, [onStopParticipantSegment]);
  useEffect(() => () => {
    if (domestic && kind === "participants") stopParticipant.current?.();
  }, [domestic, kind]);
  if (domestic && (kind === "export" || kind.startsWith("share")))
    return <DomesticExportShareDialog kind={kind} r={r} workspace={workspace} onClose={onClose} />;
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
    if (domestic) {
      if (saving.current) return;
      saving.current = true;
      setBusy(true);
      setError("");
      void (async () => {
        try { await onSave(patch); onClose(); }
        catch (e) { setError(e instanceof Error ? e.message : "保存失败，输入已保留，请重试"); }
        finally { saving.current = false; setBusy(false); }
      })();
      return;
    }
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
    <B action="dismiss" disabled={domestic && busy} onClick={onClose}>
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
          disabled={domestic && busy}
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
                maxLength={domestic ? 50 : 80}
                placeholder={
                  customer ? "搜索或输入客户名称" : "搜索或输入商机项目"
                }
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
              <datalist id={`md-${key}s`}>
                {(customer
                  ? ["ABC Energy", "青禾科技"]
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
          maxLength: domestic ? 310 : 210,
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
          disabled={domestic && busy}
          onClick={() => {
            const tags = [
              ...new Set(
                form.tagsText
                  .split(/[,，]/)
                  .map((t) => t.trim())
                  .filter(Boolean),
              ),
            ];
            const tagLimit = domestic ? 30 : 20;
            if (tags.length > 10 || tags.some((t) => t.length > tagLimit)) {
              setError(`最多10个标签，每个标签不超过${tagLimit}字`);
              return;
            }
            if (domestic && (form.customer.trim().length > 50 || form.project.trim().length > 50)) { setError("客户名称和商机项目名称各不能超过50字"); return; }
            if (domestic && form.location.trim().length > 30) { setError("位置不能超过30字"); return; }
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
    const nameLimit = domestic ? 16 : 30;
    const participantLines = domestic ? linesFor(r) : [];
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
              if (!domestic && form.speakers.length + silent.length >= 20)
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
                maxLength={nameLimit}
                placeholder="输入参会人姓名"
                value={s}
                onChange={(e) =>
                  setSilent(
                    silent.map((v, j) => (j === i ? e.target.value : v)),
                  )
                }
              />
              {domestic ? <B action="remove-silent-person" aria-label={`删除未发言参会人 ${s || i + 1}`} onClick={() => setSilent(current => current.filter((_, j) => j !== i))}>删除</B> : null}
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
                  maxLength={nameLimit}
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
                <small>{domestic ? `${participantLines.filter(line => line.speaker === i).length} 个发言片段` : i < 3 ? "总发言时长" : "未发言"}</small>
              </header>
              {domestic ? participantLines.map((line, index) => ({ line, end: participantLines[index + 1]?.at, key: `${r.id}:${line.speaker}:${line.at}:${index}` })).filter(({ line }) => line.speaker === i).slice(0, 2).map(({ line, end, key }, index) => (
                <div className="md-clip" key={key}>
                  <B action="clip" className="md-link" data-at={line.at} aria-pressed={activeParticipantSegmentKey === key} aria-label={`${activeParticipantSegmentKey === key ? "暂停" : "播放"}${name}的第${index + 1}段发言`} onClick={() => {
                    if (activeParticipantSegmentKey === key && onStopParticipantSegment) onStopParticipantSegment();
                    else if (onPlayParticipantSegment) onPlayParticipantSegment({ key, start: line.at, ...(end !== undefined && end > line.at ? { end } : {}) });
                    else seek(line.at);
                  }}>
                    {`${activeParticipantSegmentKey === key ? "Ⅱ" : "▶"} ${clockTime(line.at)}${end !== undefined && end > line.at ? ` — ${clockTime(end)}` : ""}`}
                  </B>
                  <p>{line.text}</p>
                </div>
              )) : i < 3 ? (
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
          disabled={domestic && busy}
          onClick={() => {
            if (domestic) {
              const normalize = (value: string) => value.trim().replace(/\s+/g, " ");
              const speakers = form.speakers.map(normalize);
              const silentParticipants = silent.map(normalize);
              if ([...speakers, ...silentParticipants].some(value => !value)) { setError("请填写所有参会人姓名"); return; }
              if ([...speakers, ...silentParticipants].some(value => value.length > nameLimit)) { setError(`参会人姓名最多${nameLimit}字`); return; }
              // Keep speaker indices stable. A participant rename applies to that speaker's segments.
              const segments = r.segments?.map(segment => speakers[segment.speaker] !== r.speakers[segment.speaker] ? { ...segment, speakerName: undefined } : segment);
              save({ speakers, silentParticipants, ...(segments ? { segments } : {}) });
              return;
            }
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
    body = <TemplateContent value={{template:form.template,language:form.language,detail:form.detail}} onChange={patch=>setForm({...form,...patch})}/>;
    footer = (
      <>
        {cancel}
        <B
          action="regenerate"
          className="md-btn md-primary"
          disabled={domestic && busy}
          onClick={() =>
            save({
              template: form.template,
              language: form.language,
              detail: form.detail,
              // Domestic generation has no backend yet; only persist configuration.
              // Omit content fields so the latest saved summary and rich text survive.
              ...(domestic ? {} : { summary: regenerated(form), summaryHtml: "" }),
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
      ["audio", "音频", "会议录音文件"],
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
                  `${r.title}-音频`,
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
          <Select aria-label="分享类型">
            <option>公开链接 · 任何人通过链接都可以访问</option>
          </Select>
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
                ? "暂时无法生成分享链接，请稍后重试。"
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
    subtitle = "尚未发布";
    body = (
      <>
        <h2>{r.title}</h2>
        {shareTypes.map((t) => (
          <section key={t}>
            <h3>{shareNames[t]}</h3>
            {t === "audio" ? (
              <p className="md-notice">返回详情页播放音频</p>
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
  if (page === "image-preview" && (previewImage || domestic)) {
    const index = Math.max(0, Math.min((onPreview ? previewIndex : undefined) ?? imageIndex, previewImages.length - 1));
    const image = domestic ? previewImages[index] : previewImage;
    const changeImage = (next: number) => {
      setImageIndex(next);
      onPreview?.(next);
      setImageZoom(1);
      setImageRotation(0);
      setError("");
      setFailedImage("");
    };
    title = image?.name || "图片预览";
    subtitle = domestic ? `${previewImages.length ? index + 1 : 0} / ${previewImages.length}` : "本次会话上传的图片";
    body = !domestic && image ? <img className="md-preview-image" src={image.url} alt={image.name} /> : (
      image ? <div style={{ overflow: "auto", maxHeight: "60vh" }}><img
        className="md-preview-image"
        src={image.url}
        alt={image.name}
        style={{ width: `${imageZoom * 100}%`, maxWidth: "none", maxHeight: "none", transform: `rotate(${imageRotation}deg)` }}
        onError={() => setFailedImage(image.url)}
      /></div> : <p>暂无可查看的图片</p>
    );
    if (domestic && image && failedImage === image.url) body = <p role="alert">图片无法加载，请重新上传或选择其他图片。</p>;
    footer = domestic ? <div className="md-pills" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <B action="image-prev" disabled={index <= 0} onClick={() => changeImage(index - 1)}>上一张</B>
      <B action="image-next" disabled={index >= previewImages.length - 1} onClick={() => changeImage(index + 1)}>下一张</B>
      <B action="image-zoom-out" aria-label="缩小图片" disabled={!image || imageZoom <= .2} onClick={() => setImageZoom(zoom => Math.max(.2, zoom / 1.2))}>−</B>
      <B action="image-reset" disabled={!image} onClick={() => { setImageZoom(1); setImageRotation(0); }}>{Math.round(imageZoom * 100)}%</B>
      <B action="image-zoom-in" aria-label="放大图片" disabled={!image || imageZoom >= 7} onClick={() => setImageZoom(zoom => Math.min(7, zoom * 1.2))}>＋</B>
      <B action="image-rotate" disabled={!image} onClick={() => setImageRotation(rotation => (rotation + 90) % 360)}>旋转</B>
      <B action="image-download" disabled={busy || !image || failedImage === image?.url} onClick={async () => {
        if (!image || busy) return;
        setBusy(true); setError("");
        try {
          const url = new URL(image.url, location.href);
          if (!(url.protocol === "data:" && url.href.startsWith("data:image/")) && !(url.origin === location.origin && ["blob:", "http:", "https:"].includes(url.protocol))) throw Error("图片下载地址无效");
          const response = await fetch(url.href);
          if (!response.ok) throw Error("图片下载失败，请重试");
          const blob = await response.blob();
          const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/bmp": "bmp" };
          const extension = extensions[blob.type.split(";")[0]];
          if (!extension) throw Error("暂不支持下载此图片格式");
          if (routeMarket() !== "cn") throw Error("市场已切换，请重新打开图片");
          download(blob, extension, image.name.replace(/\.[^.]+$/, ""));
        } catch (e) { setError((e as Error).message); }
        finally { setBusy(false); }
      }}>{busy ? "下载中…" : "下载图片"}</B>
    </div> : (
      <B action="dismiss" onClick={onClose}>
        关闭
      </B>
    );
  }
  return (
    <MdDialog
      title={title}
      subtitle={subtitle}
      onClose={domestic && busy ? () => {} : onClose}
      footer={footer}
      error={domestic ? undefined : error}
      className={cls}
    >
      {body}
      {domestic && error ? <p role="alert">{error}</p> : null}
    </MdDialog>
  );
}
