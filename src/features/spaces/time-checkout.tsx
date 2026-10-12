"use client";
import type { TimeOrder } from "./model/time-packs";
import { WsDialog, money, date, WsButton } from "./billing-ui";
import { Select } from "@/components/ui/select";
import cn from "@/features/markets/cn.json";
export function TimeCheckout({ order, error, method, setMethod, onPay, onCancel, onClose, onReceipt }: {
  order: TimeOrder; error: string; method: string; setMethod: (method: string) => void;
  onPay: () => void; onCancel: () => void; onClose: () => void; onReceipt: () => void;
}) {
  const paid = order.status === "paid";
  return <WsDialog title={paid ? "加时包已到账" : "确认加时包订单"} error={error} onClose={onClose} form={paid ? undefined : "time-pay"} onSubmit={e => { e.preventDefault(); onPay(); }} footer={paid ? <><WsButton onClick={onReceipt}>下载账单</WsButton><WsButton className="primary" onClick={onClose}>完成</WsButton></> : <><WsButton onClick={onCancel}>取消订单</WsButton><button className="ws-btn primary" type="submit">确认支付 {money(order.amount, "CNY")}</button></>}>
    <div className="ws-order"><h3>{order.minutes.toLocaleString()} 分钟加时包</h3><p>订单 {order.id}</p><div><span>本次{paid ? "实付" : "应付"}</span><strong>{money(order.amount, "CNY")}</strong></div>{paid ? <p>有效期至 {date(order.validUntil)}</p> : <p>请于 {date(order.expiresAt)} 前支付</p>}</div>
    {!paid && <label className="ws-field">支付方式<Select value={method} onChange={e => setMethod(e.target.value)}>{cn.payments.subscription.map(m => <option key={m}>{m}</option>)}</Select></label>}
    <p>加时包为一次性购买的转写时长，有效期2年。转写时长叠加时，会优先消耗先到期的时长。</p>
    {order.status === "failed" && <p role="alert">支付失败，未扣款、未增加时长。可重试或取消。</p>}
  </WsDialog>;
}
