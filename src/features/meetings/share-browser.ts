import { routeMarket } from "@/features/markets/config";
import { marketStorage, readIdentity } from "@/features/markets/storage";
import { appUrl } from "@/lib/routes";
import { createMeetingDetails } from "./store";
import { assertPersonalShare, type ShareScope } from "./share-links";

export function currentShareScope(): ShareScope {
  const market = routeMarket();
  return { market, space: new URLSearchParams(location.search).get("space") || "personal", identity: market ? readIdentity(market)?.identity || "" : "" };
}
export function verifyShareScope(expected: ShareScope, meetingId: string) {
  assertPersonalShare(expected);
  const current = currentShareScope();
  if (current.market !== expected.market || current.space !== expected.space || current.identity !== expected.identity)
    throw Error("账号或工作区已变更，请重新打开分享");
  // This repository only resolves personal meetings, never team records/permissions.
  const record = createMeetingDetails(marketStorage).read(meetingId);
  if (record.deleted || record.purged) throw Error("会议已移入回收站");
}
export function meetingShareUrl(id: string) {
  const url = new URL(appUrl("meeting", "", "personal"), location.origin);
  url.pathname = url.pathname.replace(/workbench\/$/, "meeting-share/");
  url.search = new URLSearchParams({ token: id }).toString();
  return url.href;
}
