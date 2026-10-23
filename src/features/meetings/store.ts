import { createWorkspaceStore } from "@/features/spaces/model/store";
import seeds from "./baseline.json";
import baseline from "@/features/workbench/model/baseline.json";
import { createJsonStore, createActions } from "@/features/personal/store";
import type { MeetingDetail } from "./types";
import type { Upload } from "@/features/workbench/model/types";
export function createMeetingDetails(storage: Storage) {
  const store = createJsonStore<Record<string, Partial<MeetingDetail>>>(
    storage,
    "eureka:meeting-details:v1",
    () => ({}),
    (v) => !!v && typeof v === "object" && !Array.isArray(v),
  );
  return {
    read(id: string): MeetingDetail {
      const patch = store.read()[id] || {},
        upload = (
          JSON.parse(
            storage.getItem("eureka:audio-uploads:v1") || "[]",
          ) as Upload[]
        ).find((x) => x.id === id && !x.deleted),
        record = createActions(storage)
          .read()
          .meetings.find((m) => m.id === id);
      const workspace = createWorkspaceStore(storage).read();
      const device = workspace?.spaces
        .find((w) => w.id === "personal")
        ?.files.find((f) => f.id === id && !f.deleted);
      if (patch.deleted || patch.purged) throw Error("会议已移入回收站");
      const seed = seeds.find((m) => m.id === id);
      const row = baseline.meetings.find((m) => m.id === id);
      if (!seed && !upload && !record && !device)
        throw Error("会议不存在或已移入回收站");
      const title =
        device?.title || seed?.title || upload?.title || record?.title || "";
      return {
        id,
        title,
        summary:
          device?.summary ||
          record?.summary ||
          seed?.summary ||
          upload?.note ||
          "录音已保存，等待转写处理。",
        transcript:
          device?.transcript ||
          record?.transcript ||
          seed?.transcript ||
          upload?.note ||
          "",
        verbatim: "",
        source:
          device?.source || seed?.source || (upload ? "文件上传" : "网页录音"),
        recordingMode: device?.recordingMode,
        created:
          device?.created ||
          seed?.created ||
          upload?.created ||
          record!.created,
        duration:
          device?.duration ||
          (record ? Math.max(1, Math.ceil(record.seconds / 60)) : 0) ||
          Number.parseFloat(String(seed?.duration)) ||
          0,
        template: record?.template || "通用",
        language: record?.language || "中文（中国）",
        detail: record?.detail || "标准",
        speakers: ["张伟", "Kevin", "Alice"],
        tags:
          device?.tags ||
          (row?.tag ? row.tag.split("、") : upload ? ["上传录音"] : []),
        customer: "",
        project: "",
        location: "",
        updated: "",
        marks: record?.marks || [],
        generated: {},
        feedback: 0,
        ...patch,
        ...(patch.summaries ? {summaries:patch.summaries.map(s=>({...s,feedback:workspace?.spaces.find(w=>w.type==="personal")?.meetingFeedback?.[`${id}/${s.id}`] || s.feedback}))} : {}),
        ...(workspace?.spaces.find(w => w.type === "personal")?.meetingFeedback?.[id] ? {feedback: workspace.spaces.find(w => w.type === "personal")!.meetingFeedback![id].score, feedbackDetail: workspace.spaces.find(w => w.type === "personal")!.meetingFeedback![id]} : {}),
      };
    },
    save(record: MeetingDetail) {
      store.change((s) => {
        s[record.id] = structuredClone(record);
      });
    },
  };
}
export function sanitizeRichText(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const allowed = new Set([
    "A", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL", "SPAN", "FONT",
    "BR", "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6",
    "UL", "OL", "LI", "TABLE", "THEAD", "TBODY", "TR", "TD", "TH",
    "BLOCKQUOTE", "PRE", "CODE", "HR",
  ]);
  const blocked = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE"]);
  const fonts = new Set([
    "sans-serif", "serif", "monospace", "Arial", "Arial Black", "Georgia",
    "Impact", "Tahoma", "Times New Roman", "Verdana", "Courier New",
    "Lucida Console", "Monaco",
  ]);
  const sizes = new Set([10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 48, 72]);
  const legacySizes = [10, 13, 16, 18, 24, 32, 48];
  function walk(root: ParentNode) {
    for (const n of [...root.childNodes]) {
      if (n.nodeType === 3) continue;
      if (!(n instanceof HTMLElement) || blocked.has(n.tagName)) {
        n.remove();
        continue;
      }
      walk(n);
      if (!allowed.has(n.tagName)) {
        n.replaceWith(...n.childNodes);
        continue;
      }
      // Rebuild only editor formatting. Never retain arbitrary CSS, URLs or events.
      const style = document.createElement("span").style;
      // Only parsed color literals survive; never retain url(), variables or CSS expressions.
      const color = (value: string) => /^(#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\))$/i.test(value) ? value : "";
      style.color = color(n.style.color || (n.tagName === "FONT" ? n.getAttribute("color") || "" : ""));
      style.backgroundColor = color(n.style.backgroundColor);
      let href = "";
      if(n.tagName === "A") {
        try { const url=new URL(n.getAttribute("href") || "");if(["http:","https:","mailto:"].includes(url.protocol))href=url.href; } catch { /* Unsafe/relative links become ordinary text. */ }
      }
      const family = n.style.fontFamily.replace(/["']/g, "");
      if (fonts.has(family)) style.fontFamily = family;
      if (/^\d+px$/.test(n.style.fontSize) && sizes.has(Number.parseInt(n.style.fontSize)))
        style.fontSize = n.style.fontSize;
      if (["normal", "bold", "400", "700"].includes(n.style.fontWeight))
        style.fontWeight = n.style.fontWeight;
      if (["normal", "italic"].includes(n.style.fontStyle))
        style.fontStyle = n.style.fontStyle;
      const decoration = n.style.textDecorationLine;
      if (["none", "underline", "line-through", "underline line-through", "line-through underline"].includes(decoration))
        style.textDecorationLine = decoration;
      const alignment = n.style.textAlign || n.getAttribute("align") || "";
      if (["left", "center", "right", "justify"].includes(alignment))
        style.textAlign = alignment;
      if (n.tagName === "FONT") {
        const face = n.getAttribute("face") || "";
        const size = n.getAttribute("size") || "";
        if (!style.fontFamily && fonts.has(face)) style.fontFamily = face;
        if (!style.fontSize && /^[1-7]$/.test(size))
          style.fontSize = `${legacySizes[Number(size) - 1]}px`;
      }
      for (const a of [...n.attributes]) n.removeAttribute(a.name);
      if (style.cssText) n.setAttribute("style", style.cssText);
      if(n.tagName === "A") {
        if(href){n.setAttribute("href",href);n.setAttribute("target","_blank");n.setAttribute("rel","noopener noreferrer");}
        else n.replaceWith(...n.childNodes);
      }
    }
  }
  walk(template.content);
  return template.innerHTML;
}
