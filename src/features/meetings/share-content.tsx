"use client";
/* eslint-disable @next/next/no-img-element -- Shared images preserve the source dimensions and data URLs. */
import { useState } from "react";
import { isSafeAudioUrl } from "./audio-source";
import { safeImageUrl, safeVisualUrl, type ExportContent, type ContentImage } from "./export-content";
import { ShareMindmap } from "./share-mindmap";

function SharedImage({ image }: { image: ContentImage }) {
  const [failed, setFailed] = useState(false);
  return <figure style={{ margin: "16px 0" }}>
    {failed ? <p role="alert">图片加载失败，请稍后重试。</p> : <img src={image.url} alt={image.name} referrerPolicy="no-referrer" onError={() => setFailed(true)} style={{ maxWidth: "100%", height: "auto" }} />}
    <figcaption>{image.name}</figcaption>
  </figure>;
}

function SharedAudio({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p role="alert">音频加载失败，原始资源暂不可用。</p> : <audio controls preload="metadata" src={url} aria-label="会议音频" onError={() => setFailed(true)} style={{ maxWidth: "100%" }} />;
}

export function SharedMeetingContent({ title, contents }: { title: string; contents: ExportContent[] }) {
  return <article style={{ overflowWrap: "anywhere" }}>
    <h2>{title}</h2>
    {contents.map((content, index) => <section key={`${content.kind}:${index}`} style={{ margin: "24px 0" }}>
      <h3>{content.label}</h3>
      {content.kind === "audio" ? isSafeAudioUrl(content.audioUrl) ? <SharedAudio key={content.audioUrl} url={content.audioUrl} /> : <p>此分享缺少可用的原始音频，请重新生成分享链接。</p> : null}
      {content.kind === "mindmap" ? content.sourceMarkdown ? <ShareMindmap key={content.sourceMarkdown} title={title} sourceMarkdown={content.sourceMarkdown} /> : <p>此分享缺少思维导图源内容，请重新生成分享链接。</p> : null}
      {content.kind !== "mindmap" && content.kind !== "visual" ? content.sections.map((section, index) => <section key={index}>
        {section.heading !== content.label ? <h4>{section.heading}</h4> : null}
        <p style={{ whiteSpace: "pre-wrap" }}>{section.text}</p>
      </section>) : null}
      {content.kind === "visual" && !content.images?.some(image => safeVisualUrl(image.url)) ? <p>此分享缺少图文摘要图片，请重新生成分享链接。</p> : null}
      {content.images?.filter(image => content.kind === "visual" ? safeVisualUrl(image.url) : safeImageUrl(image.url)).map((image, index) => <SharedImage key={`${image.url}-${index}`} image={image} />)}
    </section>)}
  </article>;
}
