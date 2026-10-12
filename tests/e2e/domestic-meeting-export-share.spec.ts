import { test, expect } from "@playwright/test";
import { contentOptions, getExportContent, serializeExport } from "../../src/features/meetings/export-content";
import { shareRepository, shareStatus, SHARE_STORAGE_KEY } from "../../src/features/meetings/share-links";
import { createMarketStorage } from "../../src/features/markets/storage";
import type { MeetingDetail } from "../../src/features/meetings/types";

function memory(): Storage {
  const entries = new Map<string, string>();
  return { get length() { return entries.size; }, key: i => [...entries.keys()][i] ?? null,
    getItem: key => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); },
    removeItem: key => { entries.delete(key); }, clear: () => entries.clear() };
}
const meeting: MeetingDetail = {
  id: "personal-meeting", title: "<script>alert(1)</script>", summary: "会议结论\n第二行", transcript: "原始转写", verbatim: "已整理逐字稿",
  source: "网页录音", created: "2026-10-12", duration: 2, template: "通用", language: "中文", detail: "标准",
  speakers: ["张伟", "Alice"], tags: [], customer: "", project: "", location: "", updated: "", generated: {}, feedback: 0,
  segments: [{ at: 4, speaker: 1, text: "这是 Alice 的发言", en: "Alice speaks" }],
};
const scope = { market: "cn", space: "personal", identity: "owner" };
const id = "00000000-0000-4000-8000-000000000001";
const input = () => ({ meetingId: meeting.id, title: meeting.title, contents: [getExportContent(meeting, "summary")], days: 3 });

test("CN export: incomplete generated assets stay disabled; selected content uses speaker indices and single-segment aliases", () => {
  for (const kind of ["verbatim", "mindmap", "visual"] as const) {
    expect(contentOptions(meeting).find(o => o.kind === kind)?.enabled).toBe(false);
    expect(() => getExportContent(meeting, kind)).toThrow();
    const ready = getExportContent({ ...meeting, generated: { [kind]: true, visualUrl: "/assets/summary.png" } }, kind);
    expect(kind === "visual" ? ready.images?.length : ready.sections.length).toBeGreaterThan(0);
    expect(contentOptions({ ...meeting, generated: { [kind]: "generating" } }).find(o => o.kind === kind)?.enabled).toBe(false);
  }
  expect(getExportContent(meeting, "transcript").sections[0].text).toContain("00:04 Alice");
  expect(getExportContent({ ...meeting, speakers: ["张伟", "新姓名"] }, "transcript").sections[0].text).toContain("新姓名");
  expect(getExportContent({ ...meeting, segments: [{ ...meeting.segments![0], speakerName: "单段名称" }] }, "transcript").sections[0].text).toContain("单段名称");
  expect(getExportContent(meeting, "translation").sections[0].text).toContain("Alice speaks");
});

test("CN assets: use real summary, verbatim and successful image; never synthesize missing content", () => {
  const r = { ...meeting, title: "真实会议", summary: "## 预算\n- 已批准 100 元\n## 风险\n- 交付延期", generated: { mindmap: true, verbatim: true, visual: true } };
  const mindmap = getExportContent(r, "mindmap");
  expect(mindmap.sourceMarkdown).toBe(`# 真实会议\n\n${r.summary}`);
  expect(mindmap.sections).toEqual([{ heading: "智能总结", text: r.summary }]);
  expect(serializeExport(r.title, mindmap, "md").body).toContain("## 预算\n- 已批准 100 元");
  expect(() => getExportContent({ ...r, summary: "" }, "mindmap")).toThrow();
  expect(getExportContent(r, "verbatim").sections[0].text).toBe(r.verbatim);
  expect(() => getExportContent({ ...r, verbatim: "", verbatimHtml: "<p>旧富文本</p>" }, "verbatim")).toThrow();
  expect(() => getExportContent(r, "visual")).toThrow();
  const imageRecord = { ...r, generated: { ...r.generated, visualUrl: "https://assets.example.com/real-summary.png" } };
  const visual = getExportContent(imageRecord, "visual");
  expect(visual.sections).toEqual([]);
  expect(visual.images).toEqual([{ name: "真实会议-图文摘要", url: imageRecord.generated.visualUrl }]);
  for (const format of ["txt", "json", "md", "html"] as const) expect(() => serializeExport(r.title, visual, format)).toThrow("原始图片");
  for (const visual of [false, "generating", "failed", "source-empty"]) expect(() => getExportContent({ ...imageRecord, generated: { ...imageRecord.generated, visual } }, "visual")).toThrow();
  expect(() => getExportContent({ ...imageRecord, generated: { ...imageRecord.generated, visualUrl: "javascript:alert(1)" } }, "visual")).toThrow();
  const repo = shareRepository(memory());
  const link = repo.create(scope, { ...input(), contents: [mindmap, visual] }, id, 1000);
  expect(repo.access(scope, link.id, 1000).contents).toEqual([mindmap, visual]);
});

test("CN export: TXT / JSON / Markdown / HTML contain actual formats and escape user markup", () => {
  const content = getExportContent(meeting, "summary");
  const txt = serializeExport(meeting.title, content, "txt");
  expect(txt.extension).toBe("txt"); expect(txt.body).toContain("会议结论\n第二行");
  const json = serializeExport(meeting.title, content, "json");
  expect(JSON.parse(json.body)).toMatchObject({ title: meeting.title, kind: "summary", sections: content.sections });
  const md = serializeExport(meeting.title, content, "md");
  expect(md.extension).toBe("md"); expect(md.mime).toContain("text/markdown"); expect(md.body).toMatch(/^# /); expect(md.body).toContain("## 总结"); expect(md.body).not.toContain("<script>");
  const html = serializeExport(meeting.title, content, "html");
  expect(html.extension).toBe("html"); expect(html.body).toMatch(/^<!doctype html>/); expect(html.body).toContain("<meta charset=\"utf-8\">"); expect(html.body).not.toContain("<script>"); expect(html.body).toContain("&lt;script&gt;");
});

test("SHARE-01 / MARKET-01: selected snapshots, expiry and revocation stay confined to domestic personal account", () => {
  const raw = memory(), cn = createMarketStorage(raw, "cn"), global = createMarketStorage(raw, "global");
  const repo = shareRepository(cn), data = input();
  const created = repo.create(scope, data, id, 1000);
  data.contents[0].sections[0].text = "生成后变更";
  expect(repo.access(scope, id, 1000).contents).toHaveLength(1);
  expect(repo.access(scope, id, 1000).contents[0].sections[0].text).toBe(meeting.summary);
  expect(global.getItem(SHARE_STORAGE_KEY)).toBeNull();
  expect(() => repo.access({ ...scope, identity: "another" }, id, 1000)).toThrow();
  expect(() => repo.access({ ...scope, space: "team" }, id, 1000)).toThrow();
  expect(() => repo.create({ ...scope, market: "global" }, input(), id, 1000)).toThrow();
  expect(() => repo.create({ ...scope, space: "team" }, input(), id, 1000)).toThrow();
  expect(shareStatus(created, created.expiresAt! - 1)).toBe("生效中");
  expect(() => repo.access(scope, id, created.expiresAt!)).toThrow("已过期");
  repo.revoke(scope, id, meeting.id, 2000);
  expect(() => repo.access(scope, id, 2001)).toThrow("已失效");
  expect(repo.list(scope, meeting.id)[0].revokedAt).toBe(2000);
});

test("SHARE-01: invalid storage and failed writes never overwrite records or report success", () => {
  const raw = memory(); raw.setItem(SHARE_STORAGE_KEY, "invalid-json");
  expect(() => shareRepository(raw).create(scope, input(), id)).toThrow();
  expect(raw.getItem(SHARE_STORAGE_KEY)).toBe("invalid-json");
  const denied = { getItem: () => null, setItem: () => { throw Error("QuotaExceededError"); } };
  expect(() => shareRepository(denied).create(scope, input(), id)).toThrow("QuotaExceededError");
  const repo = shareRepository(memory());
  expect(() => repo.create(scope, { ...input(), contents: [] }, id)).toThrow();
  expect(() => repo.create(scope, { ...input(), days: -1 }, id)).toThrow();
  const forever = repo.create(scope, { ...input(), days: 0 }, id, 1000);
  expect(forever.expiresAt).toBeNull();
  expect(repo.access(scope, id, 999999999999).id).toBe(id);
  expect(() => repo.revoke({ ...scope, identity: "another" }, id, meeting.id)).toThrow();
});
