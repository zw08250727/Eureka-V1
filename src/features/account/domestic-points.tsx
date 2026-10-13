"use client";

import { useEffect, useId, useRef, useState } from "react";
import { marketConfig } from "@/features/markets/config";
import { M } from "@/features/spaces/model/store";
import PS from "@/features/spaces/model/subscription";
import type { Workspace } from "@/features/spaces/model/types";
import { appUrl } from "@/lib/routes";
import { AiIcon } from "@/components/ui/ai-icon";
import { Icon } from "@/components/ui/icon";
import { countMonthlyFeedbackRewards, rewardState } from "./rewards";
import type { AccountPanel } from "./experience";
import "./domestic-points.css";

type PointsProps = { w: Workspace; actor: string; onPanel: (panel: AccountPanel) => void };
const number = (value: number) => value.toLocaleString("zh-CN");

/** Shared by the header popover, account menu and mobile navigation. */
export function DomesticPointsCard({ w, actor, onPanel, onNavigate }: PointsProps & { onNavigate?: () => void }) {
  const team = w.type === "team", admin = M.admin(w, actor), active = w.status === "active";
  const subscription = team ? null : PS.current(w);
  const paid = !!subscription?.credits;
  const config = marketConfig();
  const day = new Date().toLocaleDateString("sv-SE"), entries = rewardState(w).entries;
  const signed = entries.some(entry => entry.id === `signin:${day}`);
  const signLimit = entries.filter(entry => entry.id.startsWith(`signin:${day.slice(0, 7)}`)).length >= config.rewardLimits.signin;
  const feedbackLimit = countMonthlyFeedbackRewards(entries) >= config.rewardLimits.feedback;
  function navigate(view: "subscription" | "settings", id = "") {
    onNavigate?.();
    location.assign(appUrl(view, id, w.id, actor));
  }
  return <section className="cn-points-card" aria-label={team ? "团队积分与订阅" : "个人积分与会员"}>
    <div className="cn-points-membership">
      <div><h2>{team ? (active ? "团队版" : "团队版已到期") : `${subscription!.plan}会员`}</h2>
        <p>{team ? w.name : paid ? `每月享 ${number(subscription!.credits!)} 积分` : "升级获取更多权益"}</p></div>
      {team && !admin ? <span className="cn-points-member-label">成员</span> : <button type="button" className="cn-points-upgrade" onClick={() => navigate("subscription")}>
        <AiIcon variant={team || paid ? "tasks" : "upgrade"} size={16}/>{team ? (active ? "管理订阅" : "续费") : paid ? "管理会员" : "升级"}
      </button>}
    </div>
    <div className="cn-points-rows">
      <button type="button" className="cn-points-row" onClick={() => navigate("settings", "credits")}>
        <span>{team ? "团队可用积分" : "可用积分"}</span><strong>{number(M.creditBalance(w))}</strong><span className="cn-points-chevron" aria-hidden="true">›</span>
      </button>
      {team ? <p className="cn-points-team-note">团队成员共享使用{active ? "，由管理员统一充值。" : "；续费后可继续使用。"}</p> : <>
        <button type="button" className="cn-points-row" onClick={() => onPanel("signin")} disabled={signed || signLimit}>
          <span>每日签到</span><span>{signed ? "今日已签到" : signLimit ? "本月已领满" : `+${number(config.rewards.signin)} 积分`}</span><span className="cn-points-chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" className="cn-points-row" onClick={() => onPanel("feedback")} disabled={feedbackLimit}>
          <span>满意度打分</span><span>{feedbackLimit ? "本月已领满" : `+${number(config.rewards.feedback)} 积分`}</span><span className="cn-points-chevron" aria-hidden="true">›</span>
        </button>
      </>}
    </div>
    <div className="cn-points-actions">
      <button type="button" className="cn-points-secondary" onClick={() => team ? navigate("settings", "credits") : onPanel("tasks")}>
        {team ? <Icon name="book"/> : <AiIcon variant="tasks" size={16}/>}{team ? "积分明细" : "做任务赚积分"}
      </button>
      <button type="button" className="cn-points-primary credit-recharge-cta" disabled={team && (!admin || !active)} onClick={() => onPanel("recharge")}>
        <AiIcon size={16} tone="inherit"/>{team && !admin ? "联系管理员充值" : team && !active ? "续费后可充值" : "充值积分"}
      </button>
    </div>
  </section>;
}

export function DomesticPointsEntry(props: PointsProps) {
  const id = useId(), panel = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  function position() {
    const popup = panel.current, button = trigger.current;
    if (!popup || !button) return;
    const rect = button.getBoundingClientRect(), viewport = window.visualViewport;
    const width = viewport?.width ?? innerWidth, height = viewport?.height ?? innerHeight;
    const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
    popup.style.width = `${Math.min(360, width - 24)}px`;
    popup.style.maxHeight = `${height - 24}px`;
    popup.style.left = `${Math.max(left + 12, Math.min(rect.right - popup.offsetWidth, left + width - popup.offsetWidth - 12))}px`;
    popup.style.top = `${Math.max(top + 12, Math.min(rect.bottom + 10, top + height - popup.offsetHeight - 12))}px`;
  }
  function close() { panel.current?.hidePopover(); }
  useEffect(() => {
    if (!open) return;
    const outsideFocus = (event: FocusEvent) => {
      if (!panel.current?.contains(event.target as Node) && event.target !== trigger.current) panel.current?.hidePopover();
    };
    const dismiss = () => panel.current?.hidePopover();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    document.addEventListener("focusin", outsideFocus);
    window.addEventListener("eureka:account-panel", dismiss);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      document.removeEventListener("focusin", outsideFocus);
      window.removeEventListener("eureka:account-panel", dismiss);
    };
  }, [open]);
  return <>
    <button type="button" className="cn-points-trigger" ref={trigger} popoverTarget={id} aria-haspopup="dialog" aria-expanded={open} aria-controls={id}>
      <AiIcon/><span>积分额度</span><strong>{number(M.creditBalance(props.w))}</strong>
    </button>
    <div className="cn-points-popover" id={id} ref={panel} popover="auto" role="dialog" aria-label="积分与会员"
      onToggle={event => {
        const visible = event.newState === "open";
        setOpen(visible);
        if (visible) { position(); panel.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }); }
      }}>
      <DomesticPointsCard {...props} onNavigate={close} onPanel={value => { close(); props.onPanel(value); }}/>
    </div>
  </>;
}

export function DomesticPointsGuide({ w, actor, onPanel }: PointsProps) {
  const team = w.type === "team", admin = M.admin(w, actor), active = w.status === "active";
  const { rewards, rewardLimits } = marketConfig();
  const monthly = rewards.signin * rewardLimits.signin + rewards.feedback * rewardLimits.feedback;
  return <button type="button" className="cn-points-guide" aria-label={team ? "团队积分" : "赚积分"} title={team ? "团队积分" : "赚积分"} onClick={() => {
    if (!team) onPanel("tasks");
    else if (admin && active) onPanel("recharge");
    else location.assign(appUrl(admin ? "subscription" : "settings", admin ? "" : "credits", w.id, actor));
  }}>
    <AiIcon size={24}/><span className="cn-points-guide-copy"><strong>{team ? "团队积分" : "赚积分"}</strong>
      <span>{team ? <>可用 <b>{number(M.creditBalance(w))}</b> · {admin ? (active ? "去充值" : "去续费") : "查看明细"}</> : <>每月任务最高赚 <b>{number(monthly)} 积分</b></>}</span>
    </span><span className="cn-points-chevron" aria-hidden="true">›</span>
  </button>;
}

/** Compact account summary; rewards and actions share the menu's quiet hierarchy. */
export function DomesticAccountPoints({ w, actor, onPanel, onSignin }: PointsProps & { onSignin?: () => void }) {
  if (w.type === "team") return <DomesticPointsCard w={w} actor={actor} onPanel={onPanel}/>;
  const day = new Date().toLocaleDateString("sv-SE"), config = marketConfig();
  const entries = rewardState(w).entries.filter(e => e.id.startsWith(`signin:${day.slice(0, 7)}`));
  const signed = entries.some(e => e.id === `signin:${day}`), limited = entries.length >= config.rewardLimits.signin;
  const total = entries.reduce((sum, e) => sum + e.amount, 0), sub = PS.current(w);
  return <section className="cn-account-points" aria-label="个人积分与会员">
    <div className="cn-account-membership"><span>{sub.plan}会员</span><button type="button" onClick={() => location.assign(appUrl("subscription", "", w.id, actor))}>{sub.credits ? "管理会员" : "升级"}<span aria-hidden="true"> ›</span></button></div>
    <div className="cn-signin-card">
      <div className="cn-signin-body">
        <button type="button" className="cn-signin-balance" onClick={() => location.assign(appUrl("settings", "credits", w.id, actor))}><span>当前可用积分</span><b>{number(M.creditBalance(w))}<small> 积分</small></b><span aria-hidden="true">›</span></button>
        <div className="cn-signin-main"><div><p>每日签到</p><strong>+{number(config.rewards.signin)}<small> 积分</small></strong></div><button type="button" onClick={() => onPanel("tasks")}>赚积分 <span aria-hidden="true">›</span></button></div>
        <p className="cn-signin-progress">本月签到 {entries.length}/{config.rewardLimits.signin} 次，累计 {number(total)} 积分</p>
        <footer><button type="button" className="credit-recharge-cta" onClick={() => onPanel("recharge")}>充值</button><button type="button" className="cn-signin-claim" disabled={signed || limited} onClick={() => onSignin ? onSignin() : onPanel("signin")}>{signed ? "明日再来" : limited ? "下月再来" : "立即签到"}</button></footer>
      </div>
    </div>
  </section>;
}
