"use client";

import { useEffect, useRef, useState } from "react";
import type { Markmap } from "markmap-view";
import { basePath } from "@/lib/routes";
import { MdButton as B, MdIcon as I } from "./reference-ui";
import type { MeetingDetail } from "./types";
import "./domestic-assets.css";

export type DomesticAssetTab = "mindmap" | "visual" | "verbatim";
export interface DomesticAssetsProps {
  r: MeetingDetail;
  tab: DomesticAssetTab;
  readonly: boolean;
  action: (name: string) => void;
  zoom: number;
}

const art = {
  mindmap: "mind-map-generate-CJl7NqFy.png",
  visual: "visual-summary-empty-CF5U0pS6.png",
  verbatim: "verbatim-generate-D3O7gqto.png",
  failed: "verbatim-failed-CnM82x1c.png",
  "source-empty": "verbatim-empty-Bo9PLBdd.png",
};
const labels = { mindmap: "思维导图", visual: "图文摘要", verbatim: "逐字稿" };
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
};

// The official transcript view is plain text. Never insert user HTML into the DOM.
export function domesticVerbatimText(
  r: Pick<MeetingDetail, "verbatim" | "verbatimHtml">,
) {
  if (r.verbatim.trim()) return r.verbatim;
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return (r.verbatimHtml || "")
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<(script|style|iframe|object)\b[^>]*>[^]*?<\/\1\s*>/gi, "")
    .replace(/<br\s*\/?\s*>|<\/(?:p|div|h[1-6]|li|ul|ol)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
      (match, code: string) => {
        if (!code.startsWith("#")) return entities[code.toLowerCase()] || match;
        const n =
          code[1].toLowerCase() === "x"
            ? parseInt(code.slice(2), 16)
            : Number(code.slice(1));
        return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "�";
      },
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function Generate({
  retry = false,
  compact = false,
  action,
}: {
  retry?: boolean;
  compact?: boolean;
  action: DomesticAssetsProps["action"];
}) {
  return (
    <B
      className={`cn-asset-generate${compact ? " is-compact" : ""}`}
      action={retry ? "regenerate" : "generate"}
      onClick={() => action(retry ? "regenerate" : "generate")}
    >
      <I name="spark" />
      {retry ? "重新生成" : "立即生成"}
    </B>
  );
}

function Empty({
  tab,
  readonly,
  action,
  failed = false,
  sourceEmpty = false,
  description,
}: Pick<DomesticAssetsProps, "tab" | "readonly" | "action"> & {
  failed?: boolean;
  sourceEmpty?: boolean;
  description?: string;
}) {
  const [title, subtitle] = failed
    ? [
        tab === "visual" ? "暂无法生成图文摘要" : `${labels[tab]}生成失败`,
        description || (readonly ? "当前暂无可查看内容" : "您可重新生成"),
      ]
    : sourceEmpty
      ? ["暂无逐字稿", "无法生成逐字稿，请先检查转译文本是否正确"]
      : tab === "verbatim" && readonly
        ? ["转译基础上做清洁整理，更适合阅读和复制", "适合阅读与复制"]
        : copy[tab];
  return (
    <div
      className={`cn-asset-empty${failed ? " is-failed" : ""}${sourceEmpty ? " is-source-empty" : ""}`}
      role={failed ? "alert" : undefined}
    >
      {/* Official PNG assets are rendered at their source component dimensions. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${basePath}/assets/baizhi/meeting/${art[failed ? "failed" : sourceEmpty ? "source-empty" : tab]}`}
        width={failed ? 140 : sourceEmpty ? 180 : 240}
        height={failed ? 154 : sourceEmpty ? 128 : 146}
        alt=""
      />
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {!readonly && !sourceEmpty && <Generate retry={failed} action={action} />}
    </div>
  );
}

function Generating({ tab }: { tab: DomesticAssetTab }) {
  return (
    <div className="cn-asset-generating" role="status" aria-live="polite">
      <div>
        <span className="cn-asset-spinner" aria-hidden="true" />
        <p>正在生成{labels[tab]}，请稍后...</p>
      </div>
      <div className="cn-asset-skeleton" aria-hidden="true">
        {[0, 1, 2, 3].map((n) => (
          <span key={n} />
        ))}
      </div>
    </div>
  );
}

function Toolbar({
  r,
  tab,
  readonly,
  action,
}: Omit<DomesticAssetsProps, "zoom">) {
  const source = r.generated[`${tab}SourceTitle`];
  return (
    <div className="cn-asset-toolbar">
      <small>内容由AI生成，仅供参考</small>
      <div>
        {tab === "verbatim" ? (
          <>
            <B
              action="copy"
              onClick={() => action("copy")}
              aria-label="复制逐字稿全文"
            >
              <I name="copy" />
              复制全文
            </B>
            {!readonly && (
              <B
                action="edit"
                onClick={() => action("edit")}
                aria-label="编辑逐字稿"
              >
                <I name="edit" />
                编辑
              </B>
            )}
          </>
        ) : (
          <>
            {readonly ? (
              <span className="cn-asset-source">
                基于【
                {typeof source === "string" && source.trim()
                  ? source
                  : "智能总结"}
                】生成
              </span>
            ) : (
              <B action="asset-source" onClick={() => action("asset-source")}>
                基于【
                {typeof source === "string" && source.trim()
                  ? source
                  : "智能总结"}
                】生成<span aria-hidden="true">›</span>
              </B>
            )}
            {!readonly && <Generate retry compact action={action} />}
            {tab === "visual" && (
              <B
                action="export-current"
                onClick={() => action("export-current")}
              >
                <I name="download" />
                导出
              </B>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NativeMindmap({
  r,
  zoom,
  readonly,
  action,
}: Omit<DomesticAssetsProps, "tab">) {
  const sourceText=typeof r.generated.mindmapSourceText === "string" ? r.generated.mindmapSourceText : r.summary;
  const svg = useRef<SVGSVGElement>(null);
  const map = useRef<Markmap | null>(null);
  const zoomRef = useRef(zoom);
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    async function render() {
      const [{ Transformer }, { Markmap }] = await Promise.all([
        import("markmap-lib"),
        import("markmap-view"),
      ]);
      if (disposed || !svg.current) return;
      const transformer = new Transformer([]);
      transformer.md.set({ html: false, linkify: false });
      transformer.md.disable(["image", "link"]);
      const escapeTitle = r.title
        .replace(/[\\`*_{}\[\]<>#!|]/g, "\\$&")
        .replace(/\r?\n/g, " ");
      const { root } = transformer.transform(
        `# ${escapeTitle}\n\n${sourceText}`,
      );
      const instance = Markmap.create(svg.current, {
        duration: 0,
        maxWidth: 280,
        scrollForPan: false,
        zoom: false,
        pan: true,
      });
      map.current = instance;
      await instance.setData(root);
      if (disposed) return;
      await instance.fit(1);
      if (disposed) return;
      await instance.rescale(zoomRef.current);
      const fit = () => {
        if (!disposed)
          void instance.fit(1).then(() => {
            if (!disposed) return instance.rescale(zoomRef.current);
          });
      };
      observer = new ResizeObserver(fit);
      if (svg.current.parentElement)
        observer.observe(svg.current.parentElement);
    }
    void render().catch(() => {
      if (!disposed) setError(true);
    });
    return () => {
      disposed = true;
      observer?.disconnect();
      map.current?.destroy();
      map.current = null;
    };
  }, [sourceText, r.title]);
  useEffect(() => {
    const previous = zoomRef.current;
    zoomRef.current = zoom;
    if (map.current && previous > 0 && zoom !== previous)
      void map.current.rescale(zoom / previous);
  }, [zoom]);
  if (error)
    return (
      <Empty
        tab="mindmap"
        readonly={readonly}
        action={action}
        failed
        description="思维导图加载失败，请重新生成"
      />
    );
  return (
    <div className="cn-asset-map">
      <svg ref={svg} role="img" aria-label={`${r.title}的思维导图`} />
      <div className="cn-asset-zoom">
        <B action="zoom-reset" aria-label="恢复初始大小" onClick={()=>action("zoom-reset")}>1:1</B>
        <B
          action="zoom-in"
          aria-label="放大思维导图"
          onClick={() => action("zoom-in")}
        >
          ＋
        </B>
        <B
          action="zoom-out"
          aria-label="缩小思维导图"
          onClick={() => action("zoom-out")}
        >
          −
        </B>
        <B
          action="fullscreen"
          aria-label="全屏查看思维导图"
          onClick={() => action("fullscreen")}
        >
          ⛶
        </B>
      </div>
      <details className="cn-asset-outline">
        <summary>查看文字大纲</summary>
        <div>{r.summary}</div>
      </details>
    </div>
  );
}

function VisualImage({
  url,
  zoom,
  readonly,
  action,
}: { url: string } & Pick<
  DomesticAssetsProps,
  "zoom" | "readonly" | "action"
>) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  if (state === "failed")
    return (
      <Empty
        tab="visual"
        readonly={readonly}
        action={action}
        failed
        description="图文摘要加载失败，请重新生成"
      />
    );
  return (
    <div className="cn-asset-visual">
      {state === "loading" && <p role="status">图文摘要加载中...</p>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="图文摘要"
        draggable={false}
        style={{
          width: `${Math.max(25, Math.min(400, zoom * 100))}%`,
          visibility: state === "ready" ? "visible" : "hidden",
        }}
        onLoad={() => setState("ready")}
        onError={() => setState("failed")}
      />
      <div className="cn-asset-zoom">
        <B action="zoom-reset" aria-label="恢复初始大小" onClick={()=>action("zoom-reset")}>1:1</B>
        <B
          action="zoom-in"
          aria-label="放大图文摘要"
          onClick={() => action("zoom-in")}
        >
          ＋
        </B>
        <B
          action="zoom-out"
          aria-label="缩小图文摘要"
          onClick={() => action("zoom-out")}
        >
          −
        </B>
      </div>
    </div>
  );
}

export function DomesticAssets(props: DomesticAssetsProps) {
  const { r, tab, readonly, action, zoom } = props;
  const state = r.generated[tab];
  const text = domesticVerbatimText(r);
  const image = r.generated.visualUrl;
  const url =
    typeof image === "string" && /^(https:\/\/|\/(?!\/))/.test(image)
      ? image
      : "";
  let body;
  if (state === "generating") body = <Generating tab={tab} />;
  else if (state === "failed") body = <Empty {...props} failed />;
  else if (!state) body = <Empty {...props} />;
  else if (tab === "visual" && !url)
    body = (
      <Empty {...props} failed description="未获取到图文摘要图片，请重新生成" />
    );
  else if (tab === "mindmap" && !(typeof r.generated.mindmapSourceText === "string" ? r.generated.mindmapSourceText : r.summary).trim())
    body = (
      <Empty
        {...props}
        failed
        description="暂无可用的智能总结，请先生成智能总结"
      />
    );
  else if (tab === "verbatim" && (!text || state === "source-empty"))
    body = <Empty {...props} sourceEmpty />;
  else
    body = (
      <>
        <Toolbar {...props} />
        {tab === "mindmap" ? (
          <NativeMindmap
            key={`${r.id}:${String(state)}`}
            r={r}
            zoom={Number.isFinite(zoom) && zoom > 0 ? zoom : 1}
            readonly={readonly}
            action={action}
          />
        ) : tab === "visual" ? (
          <VisualImage
            key={url}
            url={url}
            zoom={zoom}
            readonly={readonly}
            action={action}
          />
        ) : (
          <div className="cn-asset-verbatim">{text}</div>
        )}
      </>
    );
  return (
    <section
      className={`cn-meeting-assets cn-meeting-assets--${tab}`}
      aria-label={labels[tab]}
    >
      {body}
    </section>
  );
}
