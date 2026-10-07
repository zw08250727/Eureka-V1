"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { MdButton as B, MdIcon as I, clockTime } from "./reference-ui";
import { sanitizeRichText } from "./store";
import type { MeetingDetail } from "./types";
export const meetingTabs = [
  ["summary", "智能总结"],
  ["transcript", "转译文本"],
  ["translation", "实时翻译"],
  ["mindmap", "思维导图"],
  ["visual", "图文摘要"],
  ["verbatim", "逐字稿"],
] as const;
export type MeetingTab = (typeof meetingTabs)[number][0];
export function linesFor(r: MeetingDetail) {
  const source = r.transcript;
  // Baseline snapshots contain prefixed transcript lines; original seeded rows use the four sample utterances.
  const baseline = /^0s 张伟：这是「/.test(source);
  if (source && !baseline)
    return source
      .split("\n")
      .filter(Boolean)
      .map((text, i) => ({
        at: i * 7,
        speaker: i % Math.max(1, r.speakers.length),
        text,
        en: `Demo translation: ${text}`,
      }));
  return [
    {
      at: 0,
      speaker: 0,
      text: `这是「${r.title}」的演示转译。我们先确认本次讨论的范围，重点看产品交付和客户试用反馈。`,
      en: `This is a demonstration transcript for “${r.title}”. Let's review product delivery and customer feedback.`,
    },
    {
      at: 7,
      speaker: 1,
      text: "当前最需要明确的是排期、负责人，以及需求进入研发之前的统一标准。建议先解决影响核心流程的问题。",
      en: "We need to clarify the timeline, owners, and criteria for development. Issues affecting the core workflow should come first.",
    },
    {
      at: 16,
      speaker: 0,
      text: "客户沟通中的问题需要沉淀到知识库。请把反馈按优先级整理，下一次评审时一起确认。",
      en: "Customer feedback should be captured in the knowledge base and prioritized for the next review.",
    },
    {
      at: 24,
      speaker: 2,
      text: "我来汇总这次讨论的行动项。产品侧补齐方案，研发确认时间，客户成功团队跟进试用反馈，下周检查进展。",
      en: "I will summarize the action items. Product will refine the proposal, engineering will confirm the timeline, and customer success will follow up next week.",
    },
  ];
}
export function transcriptText(r: MeetingDetail, translation = false) {
  return linesFor(r)
    .map(
      (l) =>
        `${clockTime(l.at)} ${r.speakers[l.speaker] || "发言人"}\n${translation ? l.en : l.text}`,
    )
    .join("\n\n");
}
export function currentText(r: MeetingDetail, tab: MeetingTab) {
  return tab === "summary"
    ? r.summary
    : tab === "translation"
      ? transcriptText(r, true)
      : tab === "visual"
        ? `${r.title}\n\n${r.summary}\n\n行动：补齐方案、确认排期、跟进客户反馈。`
        : tab === "verbatim"
          ? r.verbatim || transcriptText(r)
          : transcriptText(r);
}
export function Mindmap({ title, zoom = 1 }: { title: string; zoom?: number }) {
  return (
    <svg
      className="md-map"
      viewBox="0 0 850 350"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `scale(${zoom})` }}
    >
      <path
        d="M220 175H280V65H350M280 175H350M280 175V285H350"
        fill="none"
        stroke="#becbf7"
        strokeWidth="2"
      />
      <rect x="20" y="143" width="200" height="64" rx="12" fill="#637bdf" />
      <text x="120" y="171" textAnchor="middle" fill="white" fontSize="13">
        {title.slice(0, 13)}
      </text>
      <text x="120" y="193" textAnchor="middle" fill="#e0e6ff" fontSize="11">
        会议内容结构
      </text>
      {[
        ["关键问题", "核心流程 · 需求标准 · 客户反馈"],
        ["会议决策", "统一优先级 · 明确排期与负责人"],
        ["后续行动", "完善方案 · 实施验证 · 下周复查"],
      ].map(([a, b], i) => (
        <Fragment key={a}>
          <rect
            x="350"
            y={38 + i * 110}
            width="130"
            height="54"
            rx="8"
            fill="#eef2ff"
            stroke="#ccd6f6"
          />
          <text
            x="415"
            y={70 + i * 110}
            textAnchor="middle"
            fill="#455e9a"
            fontSize="14"
          >
            {a}
          </text>
          <path d={`M480 ${65 + i * 110}H510`} stroke="#becbf7" />
          <text x="522" y={70 + i * 110} fill="#69788c" fontSize="13">
            {b}
          </text>
        </Fragment>
      ))}
    </svg>
  );
}
export function InlineEditor({
  html,
  onDraft,
  onExit,
  onSave,
}: {
  html: string;
  onDraft: (html: string) => void;
  onExit: () => void;
  onSave: (text: string, html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    initial = useRef(html),
    [error, setError] = useState("");
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = sanitizeRichText(initial.current);
      ref.current.focus({ preventScroll: true });
    }
  }, []); // Only the user-authored rich-text fragment is inserted; page structure is React.
  return (
    <>
      <div className="md-panel-tools md-inline-edit-tools">
        <small>正在编辑</small>
        <div>
          <B action="exit-edit" onClick={onExit}>
            退出编辑
          </B>
          <B
            action="save-inline"
            className="md-btn md-primary"
            onClick={() => {
              try {
                const text = ref.current!.innerText.trim();
                if (!text) throw Error("正文不能为空");
                onSave(text, sanitizeRichText(ref.current!.innerHTML));
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            保存
          </B>
        </div>
      </div>
      <div className="md-inline-editor">
        <div
          className="md-editor-toolbar"
          role="toolbar"
          aria-label="正文格式"
          onMouseDown={(e) => e.preventDefault()}
        >
          {[
            ["undo", "↶ 撤销"],
            ["redo", "↷ 重做"],
            ["bold", "B"],
            ["italic", "I"],
            ["underline", "U"],
            ["insertUnorderedList", "• 列表"],
            ["removeFormat", "清除格式"],
          ].map(([cmd, text]) => (
            <B
              key={cmd}
              action="inline-format"
              className=""
              data-command={cmd}
              aria-label={
                (
                  {
                    bold: "加粗",
                    italic: "斜体",
                    underline: "下划线",
                  } as Record<string, string>
                )[cmd] || text
              }
              onClick={() => {
                document.execCommand(cmd, false);
                onDraft(ref.current!.innerHTML);
              }}
            >
              {text}
            </B>
          ))}
        </div>
        <div
          ref={ref}
          id="md-edit-body"
          className="md-prose md-inline-editable"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="编辑正文"
          aria-multiline="true"
          onInput={(e) => onDraft(e.currentTarget.innerHTML)}
          onPaste={(e) => {
            e.preventDefault();
            document.execCommand(
              "insertText",
              false,
              e.clipboardData.getData("text/plain"),
            );
          }}
        />
        <p className="md-inline-edit-status" role="status">
          {error}
        </p>
      </div>
    </>
  );
}
export function MeetingContent({
  r,
  tab,
  readonly,
  score,
  setScore,
  action,
  seek,
  zoom,
}: {
  r: MeetingDetail;
  tab: MeetingTab;
  readonly: boolean;
  score: number;
  setScore: (n: number) => void;
  action: (a: string) => void;
  seek: (n: number) => void;
  zoom: number;
}) {
  if (tab === "summary")
    return (
      <>
        <div className="md-panel-tools">
          <small>内容由AI生成，仅供参考</small>
          <div>
            <span>当前使用模板：</span>
            <B
              action="template"
              className="md-template-button"
              disabled={readonly}
              onClick={() => action("template")}
            >
              {r.template} ›
            </B>
            <B action="edit" disabled={readonly} onClick={() => action("edit")}>
              <I name="edit" /> 编辑
            </B>
          </div>
        </div>
        <Prose html={r.summaryHtml} text={r.summary} />
        <p className="md-edited">
          <I name="clock" /> 最后编辑：
          {r.updated || `${r.created.slice(0, 10)} 15:06`}
        </p>
        <section className="md-feedback">
          <div className="md-feedback-head">
            <span className="md-feedback-mark">
              <I name="spark" />
            </span>
            <div>
              <h3>
                欢迎评价本次结果，下次更懂你{" "}
                <span className="md-reward">✦ 奖励500积分</span>
              </h3>
              <p>
                {r.feedback
                  ? `已记录你的 ${r.feedback} 分评价，感谢反馈。`
                  : "提交评分反馈，帮助优化会议总结。"}{" "}
                <span className="md-demo">演示反馈 · 不发放真实积分</span>
              </p>
            </div>
          </div>
          <div className="md-feedback-bottom">
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                type="button"
                className="md-score"
                data-md-score={i + 1}
                aria-pressed={score === i + 1}
                aria-label={`评分 ${i + 1}`}
                onClick={() => setScore(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <B
              action="feedback"
              className="md-btn md-primary"
              disabled={!score || readonly}
              onClick={() => action("feedback")}
            >
              {r.feedback ? "更新反馈" : "提交反馈"}
            </B>
          </div>
        </section>
      </>
    );
  if (tab === "transcript" || tab === "translation")
    return (
      <>
        <div className="md-panel-tools">
          <small>
            {tab === "translation"
              ? "以下实时翻译结果，仅供参考"
              : "按发言人和时间整理 · 演示转译内容"}
          </small>
          <B action="copy" onClick={() => action("copy")}>
            <I name="copy" /> 复制全文
          </B>
        </div>
        {linesFor(r).map((l, i) => (
          <article className="md-speech" key={i}>
            <div className="md-speech-head">
              <B
                action="participants"
                className="md-speaker"
                disabled={readonly}
                onClick={() => action("participants")}
              >
                <I name="file" />
                {` ${r.speakers[l.speaker] || `发言人 ${l.speaker + 1}`}`}
              </B>
              <button
                type="button"
                data-md-seek={l.at}
                aria-label={`播放第 ${i + 1} 段`}
                onClick={() => seek(l.at)}
              >
                <time>{clockTime(l.at)}</time>
              </button>
            </div>
            <p>{tab === "translation" ? l.en : l.text}</p>
          </article>
        ))}
      </>
    );
  if (!r.generated[tab]) {
    const copy = {
      mindmap: [
        "会议内容结构化、快速理解主题和分支",
        "讨论结构更直观、主题层级清晰展开；适合复盘、汇报与分享",
      ],
      visual: [
        "图文版会议精简摘要，便捷复盘分享",
        "图文分层排版，重点直观突出，适合快速阅读、团队复盘与对外转发",
      ],
      verbatim: [
        "转译基础上做清洁整理，更适合阅读、复制、编辑",
        "适合复制、编辑与二次整理",
      ],
    }[tab];
    return (
      <div className="md-empty">
        <svg className="md-empty-art" viewBox="0 0 120 100" aria-hidden="true">
          <rect
            x="25"
            y="8"
            width="70"
            height="82"
            rx="9"
            fill="#f4f6ff"
            stroke="#dce3ff"
          />
          <path
            d="M42 30h37M42 42h28M42 54h36M42 66h20"
            stroke="#b6c4ff"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="91" cy="76" r="18" fill="#e9eeff" />
          <path d="M91 66v20M81 76h20" stroke="#6e87ff" strokeWidth="3" />
        </svg>
        <h2>{copy[0]}</h2>
        <p>{copy[1]}</p>
        <B
          action="generate"
          className="md-btn md-primary"
          disabled={readonly}
          onClick={() => action("generate")}
        >
          立即生成
        </B>
        <small>使用本地模拟数据展示生成结果</small>
      </div>
    );
  }
  return (
    <>
      <div className="md-generated-head">
        <span className="md-demo">
          演示生成 · {meetingTabs.find((t) => t[0] === tab)?.[1]}
        </span>
        <div>
          {tab === "mindmap" ? (
            <>
              <B action="zoom-out" onClick={() => action("zoom-out")}>
                −
              </B>
              <B action="zoom-in" onClick={() => action("zoom-in")}>
                ＋
              </B>
              <B action="fullscreen" onClick={() => action("fullscreen")}>
                全屏
              </B>
            </>
          ) : (
            <B action="copy" onClick={() => action("copy")}>
              复制全文
            </B>
          )}
          <B action="export-current" onClick={() => action("export-current")}>
            导出
          </B>
          {tab === "verbatim" ? (
            <B action="edit" disabled={readonly} onClick={() => action("edit")}>
              编辑
            </B>
          ) : null}
        </div>
      </div>
      {tab === "mindmap" ? (
        <div className="md-map-viewport">
          <Mindmap title={r.title} zoom={zoom} />
        </div>
      ) : tab === "visual" ? (
        <article className="md-visual">
          <small>MEETING BRIEF · {r.created.slice(0, 10)}</small>
          <h2>{r.title}</h2>
          <section>
            <h3>01　会议结论</h3>
            <p>{r.summary}</p>
          </section>
          <section>
            <h3>02　行动与负责人</h3>
            <p>
              产品：补齐方案与验收标准
              <br />
              研发：确认实施排期
              <br />
              客户成功：汇总试用反馈
            </p>
          </section>
          <section>
            <h3>03　下一步</h3>
            <p>下周例会检查进展，复查核心流程中的待解决问题。</p>
          </section>
        </article>
      ) : (
        <Prose html={r.verbatimHtml} text={r.verbatim || transcriptText(r)} />
      )}
    </>
  );
}
function Prose({ html, text }: { html?: string; text: string }) {
  return html ? (
    <div
      className="md-prose"
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  ) : (
    <div className="md-prose">{text}</div>
  );
}
