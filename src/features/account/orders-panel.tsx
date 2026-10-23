"use client";
import { creditText, marketConfig, formatMarketMoney, personalPlanName, routeMarket } from "@/features/markets/config";

import { marketStorage } from "@/features/markets/storage";

import { Select } from "@/components/ui/select";
import { useState } from "react";
import { M } from "@/features/spaces/model/store";
import { TimeCheckout } from "@/features/spaces/time-checkout";
import { payTimeOrder, cancelTimeOrder } from "@/features/spaces/model/time-packs";
import PS from "@/features/spaces/model/subscription";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { CheckoutDialog } from "@/features/spaces/billing-checkout";
import { useAirwallexCheckout, usesAirwallexCheckout } from "@/features/spaces/use-airwallex-checkout";
import { openAirwallexInvoice } from "@/features/spaces/open-airwallex-invoice";
import { downloadText } from "@/features/spaces/billing-ui";
import { ReferenceDialog } from "@/features/reference/dialog";
import { AccountTabs, AccountStatus } from "./ui";
import { accountOrders, orderReceipt, assertOrderAccess, type AccountOrder } from "./orders";

const statuses = { pending: "待支付", paid: "已支付", failed: "支付失败", cancelled: "已取消" };
const filters = ["全部", ...Object.values(statuses)];
export function OrdersPanel({controller, space, actor, resumeCredit}: {
  controller: SpacesController; space: string; actor: string; resumeCredit: (id: string) => void;
}) {
  const [filter, setFilter] = useState("全部"), [kind, setKind] = useState("all");
  const [invoice, setInvoice] = useState(false), [cancel, setCancel] = useState<AccountOrder | null>(null);
  const [checkout, setCheckout] = useState(""), [method, setMethod] = useState(marketConfig().payments.subscription[0]);
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const airwallex = useAirwallexCheckout();
  const w = M.get(controller.state!, space);
  const allowed = !!M.member(w, actor) && (w.type === "personal" || M.admin(w, actor));
  const orders = allowed ? accountOrders(w, actor) : [];
  const visible = orders.filter(o => (filter === "全部" || statuses[o.status] === filter) && (kind === "all" || kind === o.kind));
  const personal = orders.find((o): o is Extract<AccountOrder, { kind: "personal" | "credit" }> => o.id === checkout && o.kind === "personal");
  const time = orders.find((o): o is Extract<AccountOrder, { kind: "time" }> => o.id === checkout && o.kind === "time");
  function run(action: () => void) {
    try { setError(""); setMessage(""); assertOrderAccess(M.get(controller.state!, space), actor); action(); }
    catch (cause) { setError((cause as Error).message); }
  }
  function receipt(o: AccountOrder) {
    run(() => { const r = orderReceipt(M.get(controller.state!, space), actor, o.kind, o.id); downloadText(r.filename, r.text); });
  }
  function pay(outcome: "success" | "failure") {
    run(() => controller.change(st => { const current=M.get(st,space); assertOrderAccess(current,actor); PS.pay(current,checkout,outcome,method); }));
  }
  function resume(o: AccountOrder) {
    run(() => {
      if (o.kind === "time") { setCheckout(o.id); return; }
      if (!usesAirwallexCheckout()) {
        if (o.kind === "credit") { resumeCredit(o.id); return; }
        setCheckout(o.id);
        return;
      }
      void airwallex.begin(w, actor, o, () => {
        controller.change(st => {
          const current = M.get(st, space);
          assertOrderAccess(current, actor);
          if (o.kind === "credit") M.payCreditOrder(current, o.id, "success", actor);
          else PS.pay(current, o.id, "success", "Airwallex");
        });
        setMessage(o.kind === "credit" ? "Credits 已到账" : "个人订阅已生效");
      }, o.kind === "credit" ? "credits" : "personal");
    });
  }
  function viewInvoice(o: AccountOrder) {
    run(() => {
      if (routeMarket() !== "global" || o.kind === "time") { receipt(o); return; }
      if (!usesAirwallexCheckout()) throw Error("当前环境暂不支持查看 Airwallex invoice");
      void openAirwallexInvoice(space, actor, o.id).catch(cause => setError((cause as Error).message));
    });
  }
  if (!allowed) return <div className="ex-empty">账单由团队管理员管理<span>请联系管理员查看和处理团队订单。</span></div>;
  return <>
    {!personal && !time && !cancel && <AccountStatus message={error || airwallex.error || message} error={!!(error || airwallex.error)}/>}
    <div className="ex-order-scope">{w.name} · {w.type === "personal" ? creditText("个人订阅与 Credits 充值统一记账") : creditText("团队 Credits 充值")}</div>
    <div className="ex-order-tools">
      <AccountTabs items={filters} value={filter} onChange={setFilter} label="订单状态" panelId="account-orders"/>
      <button disabled={!orders.some(o => o.status === "paid")} onClick={() => setInvoice(!invoice)}>开发票</button>
    </div>
    {w.type === "personal" && <label className="ex-order-kind">订单类型<Select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">全部类型</option><option value="personal">个人订阅</option>{marketConfig().id === "cn" && <option value="time">加时包</option>}<option value="credit">{creditText("Credits 充值")}</option></Select></label>}
    {invoice && <form className="ex-summary" onSubmit={event=>{
      event.preventDefault(); const values=Object.fromEntries(new FormData(event.currentTarget));
      run(()=>{
        values.title = String(values.title || '').trim();
        values.email = String(values.email || '').trim();
        if (!values.title || !values.email) throw Error('请填写发票抬头和接收邮箱');
        const paid=accountOrders(M.get(controller.state!,space),actor).find(o=>`${o.kind}:${o.id}`===values.order && o.status==='paid');
        if(!paid)throw Error("订单状态已变化，请重新选择已支付订单");
        marketStorage.setItem(`eureka:invoice-request:${space}:${actor}:${paid.kind}:${paid.id}`,JSON.stringify({...values,workspaceId:space,orderId:paid.id,kind:paid.kind,createdAt:new Date().toISOString()}));
        setInvoice(false);setMessage("发票申请已保存");
      });
    }}>
      <label>选择已支付订单<Select name="order" required>{orders.filter(o=>o.status==='paid').map(o=><option key={`${o.kind}:${o.id}`} value={`${o.kind}:${o.id}`}>{o.kind==='personal'?`${o.planName || personalPlanName()} 订阅`:o.kind==='time'?`${o.minutes} 分钟加时包`:creditText('Credits 充值')} · {o.id}</option>)}</Select></label>
      <label>发票抬头<input name="title" required/></label><label>接收邮箱<input name="email" type="email" required/></label>
      <div className="ex-footer"><button type="button" onClick={()=>setInvoice(false)}>取消</button><button className="primary">保存申请</button></div>
    </form>}
    <div id="account-orders" role="tabpanel" aria-labelledby={`account-orders-tab-${filters.indexOf(filter)}`} tabIndex={0}>
      {visible.map(o=><article className="ex-order" key={`${o.kind}:${o.id}`} data-order-id={o.id}>
        <header><strong>{o.kind==='personal'?`${o.planName || personalPlanName()} 个人订阅 · ${o.cycle==='year'?'年付':'月付'}`:o.kind==='time'?`${o.minutes} 分钟加时包`:creditText(`${o.credits?.toLocaleString()} Credits`)}</strong><span className={`ex-order-state ${o.status}`}>{statuses[o.status]}</span></header>
        <div className="ex-order-meta"><span>订单 {o.id}<small>{o.created.replace('T',' ').slice(0,16)}</small></span><strong>{formatMarketMoney(o.amount, o.currency)} <small>{o.currency || 'USD'}</small></strong></div>
        <footer className="ex-order-actions">
          {o.status==='paid' && <button className="ex-link" onClick={()=>viewInvoice(o)}>{routeMarket() === "global" && o.kind !== "time" ? "查看 invoice" : "下载账单"}</button>}
          {['pending','failed'].includes(o.status) && <><button className="ex-link" disabled={airwallex.pending} onClick={()=>resume(o)}>继续支付</button><button className="ex-link" disabled={airwallex.pending} onClick={()=>{setError('');setCancel(o)}}>取消订单</button></>}
          {o.status==='cancelled' && <small className="ex-muted">已关闭 · 未扣款，未发放权益</small>}
        </footer>
      </article>)}
      {!visible.length && <div className="ex-empty">暂无{filter==='全部'?'':filter}订单<span>订阅和充值的订单记录会保留在这里。</span></div>}
    </div>
    {time && <TimeCheckout order={time} error={error} method={method} setMethod={setMethod} onClose={()=>{setCheckout('');setError('')}} onPay={()=>run(()=>controller.change(st=>{const current=M.get(st,space);assertOrderAccess(current,actor);payTimeOrder(current,time.id,"success",method)}))} onCancel={()=>{setError('');setCancel(time)}} onReceipt={()=>receipt(time)}/>}
    {personal && <CheckoutDialog w={w} email={controller.state!.account.email} kind="personal" order={personal} error={error} method={method} setMethod={setMethod} onClose={()=>{setCheckout('');setError('')}} onSubmit={event=>{event.preventDefault();pay('success')}} act={action=>{
      if(action==='personal-fail')pay('failure');
      if(action==='personal-cancel'){setError('');setCancel(personal)}
      if(action==='personal-receipt')receipt(personal);
    }}/>}
    {cancel && <ReferenceDialog className="ex-dialog ex-order-confirm" label="取消订单？" onClose={()=>{setCancel(null);setError('')}}><header className="ex-head"><h2>取消订单？</h2><button className="ex-close" aria-label="关闭" onClick={()=>setCancel(null)}>×</button></header><div className="ex-body"><p>此订单取消后不会扣款或发放权益，已有订阅和余额不受影响。</p><AccountStatus message={error} error/><div className="ex-footer"><button onClick={()=>setCancel(null)}>保留订单</button><button className="primary" onClick={()=>run(()=>{
      controller.change(st=>{const current=M.get(st,space);assertOrderAccess(current,actor);if(cancel.kind==='personal')PS.cancel(current,cancel.id);else if(cancel.kind==='time')cancelTimeOrder(current,cancel.id);else M.cancelCreditOrder(current,cancel.id,actor)});
      setCancel(null);setCheckout('');setMessage('订单已取消');
    })}>确认取消</button></div></div></ReferenceDialog>}
  </>;
}
