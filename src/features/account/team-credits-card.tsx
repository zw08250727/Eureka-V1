"use client";

import { Icon } from "@/components/ui/icon";
import { AiIcon } from "@/components/ui/ai-icon";
import { M } from "@/features/spaces/model/store";
import type { Workspace } from "@/features/spaces/model/types";
import { appUrl } from "@/lib/routes";
import "./team-credits-card.css";

/** Overseas account summary; balances and permissions belong to the current team. */
export function TeamCreditsCard({ w, actor, onRecharge }: {
  w: Workspace; actor: string; onRecharge: () => void;
}) {
  const admin = M.admin(w, actor), active = w.status === "active";
  const details = () => location.assign(appUrl("settings", "credits", w.id, actor));
  return <section className="team-credits-card" aria-label="团队 Credits 与订阅">
    <header className="team-credits-membership">
      <div><h2>{active ? "团队版" : "团队版已到期"}</h2><p>{w.name}</p></div>
      {admin ? <button type="button" onClick={() => location.assign(appUrl("subscription", "", w.id, actor))}>
        <AiIcon variant="tasks" size={16}/>{active ? "管理订阅" : "续费"}
      </button> : <span className="team-credits-member">成员</span>}
    </header>
    <button type="button" className="team-credits-balance" onClick={details}>
      <span>团队可用 Credits</span><strong>{M.creditBalance(w).toLocaleString("en-US")}</strong><span aria-hidden="true">›</span>
    </button>
    <p className="team-credits-note">团队成员共享使用{active ? "，由管理员统一充值。" : "；续费后可继续使用。"}</p>
    <footer className="team-credits-actions">
      <button type="button" onClick={details}><Icon name="book"/>Credits 明细</button>
      <button type="button" className="team-credits-recharge" disabled={!admin || !active} onClick={onRecharge}>
        <AiIcon size={16} tone="inherit"/>{!admin ? "联系管理员充值" : !active ? "续费后可充值" : "充值 Credits"}
      </button>
    </footer>
  </section>;
}
