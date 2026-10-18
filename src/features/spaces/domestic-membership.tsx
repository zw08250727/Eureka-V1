"use client";
import { useEffect, useState } from "react";
import cn from "@/features/markets/cn.json";
import { openAccount } from "@/features/account/experience";
import type { Cycle, Workspace, WorkspaceState } from "./model/types";
import PS from "./model/subscription";
import { timeBalance } from "./model/time-packs";
import type { BillingAction } from "./billing-panels";
import { Badge, date, WsButton as Button } from "./billing-ui";
import "./domestic-membership.css";

function BenefitCheck() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11.0292 5.52925C11.2889 5.26955 11.711 5.26955 11.9707 5.52925C12.2304 5.78895 12.2304 6.21095 11.9707 6.47065L7.47065 10.9707L6.99995 11.4404L6.52925 10.9707L4.02925 8.47065C3.76955 8.21095 3.76955 7.78895 4.02925 7.52925C4.28895 7.26955 4.71095 7.26955 4.97065 7.52925L6.99995 9.55854L11.0292 5.52925Z" fill="currentColor"/></svg>;
}

export function DomesticMembership({ w, account, cycle, act }: {
  w: Workspace;
  account: WorkspaceState["account"];
  cycle: Cycle;
  act: BillingAction;
}) {
  const sub = PS.current(w), balance = timeBalance(w);
  const [tab, setTab] = useState("会员");
  useEffect(()=>{if(new URLSearchParams(location.search).get("id")==="time-pack")queueMicrotask(()=>setTab("加时包"));},[]);
  const [pack, setPack] = useState("time-2000");
  const [tier, setTier] = useState(sub.tier || cn.memberCatalog[0].id);
  const pending = w.personalOrders?.find(o => o.status === "pending" || o.status === "failed");
  const plan = cn.memberCatalog.find(p => p.id === tier) || cn.memberCatalog[0];
  const selectedPack = cn.timePacks.find(p => p.id === pack)!;
  const same = sub.tier === plan.id && sub.cycle === cycle;
  const downgrade = sub.tier === "excellent" && plan.id !== "excellent";
  const unlimited = !Number.isFinite(sub.minutes);
  const benefits = [
    plan.minutes === null ? "无限录音转写时长" : `${plan.minutes}分钟/月录音转写时长`,
    `${plan.monthlyCredits}Credits/月`,
    `${plan.storageGB}G的PC端知识库容量`,
    ...cn.memberFeatures,
  ];

  return (
    <section className="cn-membership" aria-label="个人订阅">
      <header className="ps-page-header">
        <div><h1>个人订阅</h1><p>给每一次记录，多一点可能。</p></div>
        <nav className="ex-tabs" aria-label="订阅服务">
          <button type="button" className="ex-button" onClick={() => openAccount("compare")}>权益对比</button>
          <button type="button" className="ex-button" onClick={() => openAccount("faq")}>常见问题</button>
          <button type="button" className="ex-button" onClick={() => openAccount("orders")}>我的订单</button>
        </nav>
      </header>

      <section className="ws-surface ps-account cn-member-account" aria-label="个人账号与转写额度">
        <div className="cn-member-identity">
          <span className="ws-mini-avatar" aria-hidden="true">{account.name[0]}</span>
          <div>
            <h2>{account.name} <Badge kind={sub.credits ? "blue" : "amber"}>{sub.plan}</Badge></h2>
            <p>{sub.endsAt && sub.credits ? `有效期至：${date(sub.endsAt)} · ${sub.cycle === "year" ? "1 年" : "1 个月"}` : `每月 ${sub.minutes.toLocaleString()} 分钟`}</p>
          </div>
        </div>
        <div className="cn-member-quota">
          <strong>{unlimited ? "无限时长" : balance.quota.toLocaleString()} <small>{unlimited ? "录音转写" : `/ ${sub.minutes.toLocaleString()} 分钟剩余`}</small></strong>
          <progress
            aria-label="剩余转写时长"
            aria-valuetext={unlimited ? "无限录音转写时长" : `${balance.quota.toLocaleString()} / ${sub.minutes.toLocaleString()} 分钟剩余`}
            max={unlimited ? 1 : sub.minutes}
            value={unlimited ? 1 : balance.quota}
          />
          <small>下次额度刷新：{date(balance.refreshAt)}</small>
          <small className="cn-member-pack-balance">加时包剩余 {balance.packs.toLocaleString()} 分钟 · 有效期内可叠加使用</small>
        </div>
      </section>

      {pending ? (
        <div className="cn-member-pending" role="status">
          <span>{pending.planName || "专业版"}订阅支付未完成</span>
          <Button action="personal-checkout" value={pending.id} onClick={() => act("personal-checkout", pending.id)}>继续支付</Button>
        </div>
      ) : null}

      <div className="ws-surface ps-plans cn-member-surface">
        <div className="cn-member-tabs" role="tablist" aria-label="购买类型">
          {["会员", "加时包"].map(value => (
            <button type="button" key={value} role="tab" id={`cn-member-tab-${value}`} aria-controls="cn-member-content" aria-selected={tab === value} onClick={() => setTab(value)}>{value}</button>
          ))}
        </div>
        <div id="cn-member-content" role="tabpanel" aria-labelledby={`cn-member-tab-${tab}`}>
          {tab === "会员" ? (
            <>
              <div className="cn-member-selection">
                <div className="cn-member-selection-row">
                  <div className="cn-member-tiers" role="group" aria-label="会员档位">
                    {cn.memberCatalog.map(item => (
                      <button type="button" key={item.id} aria-pressed={plan.id === item.id} onClick={() => setTier(item.id)}>{item.name}</button>
                    ))}
                  </div>
                  <p className="cn-member-tier-description">{plan.description}</p>
                </div>
                <ul className="cn-member-highlights" aria-label="核心权益">
                  <li><strong>{plan.minutes === null ? "无限" : plan.minutes.toLocaleString()}</strong><span>{plan.minutes === null ? "录音转写" : "分钟 / 月"}</span></li>
                  <li><strong>{plan.monthlyCredits.toLocaleString()}</strong><span>Credits / 月</span></li>
                  <li><strong>{plan.storageGB}G</strong><span>知识库空间</span></li>
                </ul>
              </div>

              <div className="ps-plan-options cn-member-cycles" role="group" aria-label="计费周期">
                {(["month", "year"] as const).map(value => (
                  <button
                    type="button"
                    key={value}
                    className={`ps-plan-option ${cycle === value ? "selected" : ""}`}
                    aria-pressed={cycle === value}
                    aria-label={value === "year" ? "按年" : "按月"}
                    data-ws-action="personal-cycle"
                    data-value={value}
                    onClick={() => act("personal-cycle", value)}
                  >
                    {value === "year" ? <span className="ps-saving">比月付节省{plan.saving}</span> : null}
                    <h3>{value === "year" ? "1 年" : "1 个月"}</h3>
                    <strong className="cn-member-total">¥{plan[value]}<small>/{value === "year" ? "年" : "月"}</small></strong>
                    <p className="ps-price-note">{value === "year" ? `约 ¥${plan.yearMonthly} / 月 · 按年支付` : "单次购买 · 1 个月"}</p>
                    {value === "year" ? <p className="ps-price-note"><del>原价 ¥{plan.originalYear}/年</del></p> : null}
                    <dl>
                      <dt>每月Credits</dt><dd>{plan.monthlyCredits.toLocaleString()} Credits</dd>
                      <dt>每月转写时长</dt><dd>{plan.minutes === null ? "无限时长" : `${plan.minutes.toLocaleString()} 分钟`}</dd>
                    </dl>
                  </button>
                ))}
              </div>

              <div className="ps-plan-footer">
                <Button className="primary cn-member-buy" action="personal-buy" value={plan.id} disabled={same || downgrade} onClick={() => act("personal-buy", plan.id)}>
                  {same ? "当前套餐" : downgrade ? "已享卓越版权益" : `立即升级 ${plan.name}`}
                </Button>
                <Button className="link" action="personal-restore" onClick={() => act("personal-restore")}>恢复购买</Button>
              </div>

              <section className="ps-plan-details cn-member-benefits" aria-label={`${plan.name}完整权益`}>
                <h3>包含的全部权益</h3>
                <p>年付套餐按年支付，转写额度与会员Credits按月刷新。</p>
                <ul>{benefits.map(text => <li key={text}><BenefitCheck/><span>{text}</span></li>)}</ul>
              </section>
            </>
          ) : (
            <div className="cn-time-packs">
              <div className="cn-time-options" role="group" aria-label="选择加时包">
                {cn.timePacks.map((p, index) => (
                  <button type="button" key={p.id} aria-pressed={pack === p.id} onClick={() => setPack(p.id)}>
                    {index === 2 ? <span className="cn-time-badge">最划算</span> : null}
                    <strong>{p.minutes}<small> 分钟</small></strong>
                    <span>约{p.unitPrice}元/分钟</span>
                    <div><del>¥{p.original}</del><b>¥{p.amount}</b></div>
                  </button>
                ))}
              </div>
              <ul className="cn-time-rules">
                <li>加时包为一次性购买的转写时长，有效期{cn.timePackPolicy.validMonths / 12}年</li>
                <li>转写时长叠加时，会优先消耗先到期的时长</li>
              </ul>
              <Button className="primary cn-member-buy cn-time-buy" onClick={() => act("time-buy", pack)}>购买 {selectedPack.minutes} 分钟 · ¥{selectedPack.amount}</Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
