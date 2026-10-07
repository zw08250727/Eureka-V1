import type { WorkspaceState } from "@/features/spaces/model/types";
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
      const workspace = JSON.parse(
        storage.getItem("eureka:workspaces:v2") || "null",
      ) as WorkspaceState | null;
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
          seed?.summary ||
          upload?.note ||
          "本地演示录音，尚未连接真实转写服务。",
        transcript:
          device?.transcript || seed?.transcript || upload?.note || "",
        verbatim: "",
        source:
          device?.source || seed?.source || (upload ? "文件上传" : "网页录音"),
        created:
          device?.created ||
          seed?.created ||
          upload?.created ||
          record!.created,
        duration:
          device?.duration || Number.parseFloat(String(seed?.duration)) || 0,
        template: "通用",
        language: "中文（中国）",
        detail: "标准",
        speakers: ["张伟", "Kevin", "Alice"],
        tags:
          device?.tags ||
          (row?.tag ? row.tag.split("、") : upload ? ["上传录音"] : []),
        customer: "",
        project: "",
        location: "",
        updated: "",
        generated: {},
        feedback: 0,
        ...patch,
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
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "BR",
    "P",
    "DIV",
    "FONT",
    "H2",
    "H3",
    "UL",
    "OL",
    "LI",
  ]);
  function walk(root: ParentNode) {
    for (const n of [...root.childNodes]) {
      if (n.nodeType === 3) continue;
      if (!(n instanceof HTMLElement)) {
        n.remove();
        continue;
      }
      if (["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(n.tagName)) {
        n.remove();
        continue;
      }
      walk(n);
      if (!allowed.has(n.tagName)) n.replaceWith(...n.childNodes);
      else
        for (const a of [...n.attributes]) {
          const keep =
            n.tagName === "FONT" &&
            ((a.name === "size" && /^[1-7]$/.test(a.value)) ||
              (a.name === "face" &&
                ["sans-serif", "serif", "monospace"].includes(a.value)));
          if (!keep) n.removeAttribute(a.name);
        }
    }
  }
  walk(template.content);
  return template.innerHTML;
}
