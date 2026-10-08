import { appUrl, type AppView } from "@/lib/routes";
import { M } from "./model/store";
import type { WorkspaceState } from "./model/types";
import "./review-switch.css";

export function ReviewPerspectiveSwitch({ state, space, actor, view, memberView }: {
  state: WorkspaceState; space: string; actor: string; view: string; memberView: boolean;
}) {
  const account = state.account.id;
  const w = M.get(state, space);
  const team = w.type === "team" ? w : M.accountTeam(state, account);
  const value = w.type === "personal" ? "personal" : memberView || !M.admin(w, actor) ? "member" : "admin";
  return <label className="team-review-switch" title="评审演示：切换查看与操作权限，不修改实际成员角色">
    <span>评审视角</span>
    <select aria-label="评审视角" value={value} onChange={(e) => {
      const next = e.target.value;
      if (next !== "personal" && (!team || (next === "admin" && !M.admin(team, account)))) return;
      const destination = next === "personal" ? "personal" : team!.id;
      const sameSpace = destination === space;
      const target = !sameSpace || (next === "member" && ["space-settings", "audit"].includes(view)) ? "home" : view;
      const current = new URLSearchParams(location.search);
      const url = new URL(appUrl(target as AppView, sameSpace && target === view ? current.get("id") || "" : "", destination, account), location.origin);
      if (next === "member") url.searchParams.set("perspective", "member");
      else url.searchParams.delete("perspective");
      location.assign(url.href);
    }}>
      <option value="personal">个人视角</option>
      <option value="admin" disabled={!team || !M.admin(team, account)}>管理员视角{!team ? "（未加入团队）" : ""}</option>
      <option value="member" disabled={!team}>成员视角{!team ? "（未加入团队）" : ""}</option>
    </select>
  </label>;
}
