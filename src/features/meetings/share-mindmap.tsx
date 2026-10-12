"use client";

import { useEffect, useRef, useState } from "react";
import type { Markmap } from "markmap-view";

/** Read-only native Markmap of the selected summary snapshot, matching DomesticAssets. */
export function ShareMindmap({ title, sourceMarkdown }: { title: string; sourceMarkdown: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let instance: Markmap | undefined;
    let observer: ResizeObserver | undefined;
    async function render() {
      const [{ Transformer }, { Markmap }] = await Promise.all([import("markmap-lib"), import("markmap-view")]);
      if (disposed || !svg.current) return;
      const transformer = new Transformer([]);
      transformer.md.set({ html: false, linkify: false });
      transformer.md.disable(["image", "link"]);
      const { root } = transformer.transform(sourceMarkdown);
      instance = Markmap.create(svg.current, { duration: 0, maxWidth: 280, scrollForPan: false, zoom: true, pan: true });
      await instance.setData(root);
      if (disposed) return;
      await instance.fit(1);
      if (disposed) return;
      observer = new ResizeObserver(() => {
        if (!disposed) void instance?.fit(1).catch(() => { if (!disposed) setError(true); });
      });
      if (svg.current.parentElement) observer.observe(svg.current.parentElement);
    }
    void render().catch(() => { if (!disposed) setError(true); });
    return () => { disposed = true; observer?.disconnect(); instance?.destroy(); };
  }, [sourceMarkdown]);
  return <>
    {error ? <p role="alert">思维导图加载失败，可查看下方文字大纲。</p> : <svg ref={svg} role="img" aria-label={`${title}的思维导图`} style={{ display: "block", width: "100%", height: 400 }} />}
    <details><summary>查看文字大纲</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{sourceMarkdown}</pre></details>
  </>;
}
