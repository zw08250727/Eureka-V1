import { appUrl, type AppView } from "@/lib/routes";
import { M } from "./model/store";
import type { WorkspaceState } from "./model/types";
import { startCreationDemo, exitCreationDemo } from "./creation-demo";
import "./review-switch.css";

export function ReviewPerspectiveSwitch({ state, space, actor, view, memberView, creationDemo }: {
  state: WorkspaceState; space: string; actor: string; view: string; memberView: boolean; creationDemo: boolean;
}) {
  const account = state.account.id;
  const w = M.get(state, space);
  const team = w.type === "team" ? w : M.accountTeam(state, account);
  const value = w.type === "personal" ? "personal" : memberView || !M.admin(w, actor) ? "member" : "admin";
  return <div className="team-review-tools"><label className="team-review-switch" title="评审演示：切换视角或体验创建团队，保留原工作空间数据">
    <span>评审视角</span>
    <select aria-label="评审视角" value={creationDemo ? "creation-demo" : value} onChange={(e) => {
      const next = e.target.value;
      if (next === "creation-demo") { startCreationDemo(); return; }
      if (next === "exit-demo") { exitCreationDemo(); return; }
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
      {creationDemo ? <>
        <option value="creation-demo">创建团队演示</option>
        <option value="exit-demo">返回原工作空间</option>
      </> : <>
      <option value="personal">个人视角</option>
      <option value="admin" disabled={!team || !M.admin(team, account)}>管理员视角{!team ? "（未加入团队）" : ""}</option>
      <option value="member" disabled={!team}>成员视角{!team ? "（未加入团队）" : ""}</option>
      <option value="creation-demo">创建团队演示（未加入团队）</option>
      </>}
    </select>
  </label>{creationDemo ? <button type="button" className="team-review-reset" onClick={() => startCreationDemo(true)} title="只重置本次创建演示，保留原工作空间">重新体验</button> : null}</div>;
}
