import { appUrl, type AppView } from "@/lib/routes";
import { M } from "./model/store";
import type { Workspace } from "./model/types";
import "./review-switch.css";

export function TeamReviewSwitch({ w, account, actor, view, memberView }: {
  w: Workspace; account: string; actor: string; view: string; memberView: boolean;
}) {
  if (w.type !== "team" || !M.admin(w, account)) return null;
  const value = memberView || !M.admin(w, actor) ? "member" : "admin";
  return <label className="team-review-switch" title="评审演示：切换查看与操作权限，不修改实际成员角色">
    <span>评审视角</span>
    <select aria-label="评审视角" value={value} onChange={(e) => {
      const next = e.target.value;
      const target = next === "member" && ["space-settings", "audit"].includes(view) ? "home" : view;
      const current = new URLSearchParams(location.search);
      const url = new URL(appUrl(target as AppView, target === view ? current.get("id") || "" : "", w.id, account), location.origin);
      if (next === "member") url.searchParams.set("perspective", "member");
      else url.searchParams.delete("perspective");
      location.assign(url.href);
    }}>
      <option value="admin">管理员视角</option>
      <option value="member">成员视角</option>
    </select>
  </label>;
}
