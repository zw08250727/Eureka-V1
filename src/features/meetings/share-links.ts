import { contentLabels, safeImageUrl, safeVisualUrl, type ExportContent } from "./export-content";
import { isSafeAudioUrl } from "./audio-source";

export const SHARE_STORAGE_KEY = "eureka:meeting-share-links:v1";
export interface ShareScope { market: string | null; space: string; identity: string }
export interface MeetingShareLink {
  id: string;
  meetingId: string;
  market: "cn" | "global";
  space: "personal";
  owner: string;
  title: string;
  createdAt: number;
  expiresAt: number | null;
  revokedAt: number | null;
  contents: ExportContent[];
}
export function assertPersonalShare(scope: ShareScope) {
  if ((scope.market !== "cn" && scope.market !== "global") || scope.space !== "personal" || !scope.identity)
    throw Error("当前账号或工作区无权访问此分享");
}
export function shareStatus(link: MeetingShareLink, now = Date.now()) {
  return link.revokedAt !== null ? "已失效" : link.expiresAt !== null && now >= link.expiresAt ? "已过期" : "生效中";
}
function object(v: unknown): v is Record<string, unknown> { return !!v && typeof v === "object" && !Array.isArray(v); }
function validContent(v: unknown): v is ExportContent {
  return object(v) && typeof v.kind === "string" && Object.hasOwn(contentLabels, v.kind) && typeof v.label === "string" &&
    Array.isArray(v.sections) && v.sections.every(s => object(s) && typeof s.heading === "string" && typeof s.text === "string") &&
    (v.sourceMarkdown === undefined || typeof v.sourceMarkdown === "string") &&
    (v.images === undefined || Array.isArray(v.images) && v.images.every(i => object(i) && typeof i.name === "string" && (v.kind === "visual" ? safeVisualUrl(i.url) : safeImageUrl(i.url))));
}
function validLink(v: unknown): v is MeetingShareLink {
  return object(v) && typeof v.id === "string" && /^[a-zA-Z0-9-]{16,100}$/.test(v.id) && typeof v.meetingId === "string" && !!v.meetingId &&
    (v.market === "cn" || v.market === "global") && v.space === "personal" && typeof v.owner === "string" && !!v.owner && typeof v.title === "string" &&
    typeof v.createdAt === "number" && Number.isFinite(v.createdAt) &&
    (v.expiresAt === null || typeof v.expiresAt === "number" && Number.isFinite(v.expiresAt)) &&
    (v.revokedAt === null || typeof v.revokedAt === "number" && Number.isFinite(v.revokedAt)) &&
    Array.isArray(v.contents) && v.contents.length > 0 && v.contents.every(validContent);
}
export function shareRepository(storage: Pick<Storage, "getItem" | "setItem">) {
  function read() {
    const raw = storage.getItem(SHARE_STORAGE_KEY);
    if (raw === null) return { raw, links: [] as MeetingShareLink[] };
    let value: unknown;
    try { value = JSON.parse(raw); } catch { throw Error("分享记录无法读取，请保留浏览器数据后重试"); }
    if (!object(value) || value.version !== 1 || !Array.isArray(value.links) || !value.links.every(validLink))
      throw Error("分享记录格式无效，请保留浏览器数据后重试");
    return { raw, links: value.links as MeetingShareLink[] };
  }
  function write(raw: string | null, links: MeetingShareLink[]) {
    if (storage.getItem(SHARE_STORAGE_KEY) !== raw) throw Error("另一页面已更新分享记录，请重试");
    storage.setItem(SHARE_STORAGE_KEY, JSON.stringify({ version: 1, links }));
  }
  function owns(scope: ShareScope, link: MeetingShareLink) { return link.owner === scope.identity && link.market === scope.market && link.space === scope.space; }
  return {
    list(scope: ShareScope, meetingId: string) {
      assertPersonalShare(scope);
      return read().links.filter(l => owns(scope, l) && l.meetingId === meetingId).sort((a, b) => b.createdAt - a.createdAt);
    },
    create(scope: ShareScope, input: { meetingId: string; title: string; contents: ExportContent[]; days: number }, id: string, now = Date.now()) {
      assertPersonalShare(scope);
      if (![0, 3, 7, 30].includes(input.days)) throw Error("请选择有效的分享期限");
      if (input.contents.some(c => c.kind === "audio" && !isSafeAudioUrl(c.audioUrl))) throw Error("暂无可用的原始音频");
      if (input.contents.some(c => c.kind === "mindmap" && !c.sourceMarkdown?.trim() || c.kind === "visual" && !c.images?.some(i => safeVisualUrl(i.url)))) throw Error("分享内容尚未生成完成");
      const link: MeetingShareLink = { id, meetingId: input.meetingId, title: input.title, market: scope.market as MeetingShareLink["market"], space: "personal", owner: scope.identity,
        createdAt: now, expiresAt: input.days ? now + input.days * 86400000 : null, revokedAt: null, contents: structuredClone(input.contents) };
      if (!validLink(link)) throw Error("请选择有效的分享内容");
      const { raw, links } = read();
      if (links.some(l => l.id === id)) throw Error("分享链接已存在，请重试");
      write(raw, [link, ...links]);
      return link;
    },
    access(scope: ShareScope, id: string, now = Date.now()) {
      assertPersonalShare(scope);
      const link = read().links.find(l => l.id === id && owns(scope, l));
      if (!link) throw Error("链接不存在或当前账号无权访问");
      const status = shareStatus(link, now);
      if (status !== "生效中") throw Error(`分享链接${status}`);
      return link;
    },
    revoke(scope: ShareScope, id: string, meetingId: string, now = Date.now()) {
      assertPersonalShare(scope);
      const { raw, links } = read();
      const link = links.find(l => l.id === id && l.meetingId === meetingId && owns(scope, l));
      if (!link) throw Error("无权修改此分享记录");
      if (link.revokedAt === null) link.revokedAt = now;
      write(raw, links);
    },
  };
}
