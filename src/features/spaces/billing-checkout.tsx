"use client";
import { creditText, personalPlanName, routeMarket } from "@/features/markets/config";
import { reviewToolsEnabled } from "@/features/markets/review";

import { marketConfig } from "@/features/markets/config";
import { Select } from "@/components/ui/select";
import type { FormEvent, ReactNode } from "react";
import { M } from "./model/store";
import type { Workspace } from "./model/types";
import type { BillingAction, BillingOrder } from "./billing-panels";
import {
  creditNumber,
  date,
  dollars,
  money,
  WsButton as Button,
  WsDialog,
} from "./billing-ui";
export type OrderKind = "personal" | "seat" | "credit";
export function CheckoutDialog({
  w,
  email,
  kind,
  order: o,
  act,
  error,
  method,
  setMethod,
  onSubmit,
  onClose,
  sandbox = false,
  pending = false,
}: {
  sandbox?: boolean;
  pending?: boolean;
  w: Workspace;
  email: string;
  kind: OrderKind;
  order: BillingOrder;
  act: BillingAction;
  error: string;
  method: string;
  setMethod: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const cn = routeMarket() === "cn";
  const paid = o.status === "paid",
    personal = kind === "personal",
    seat = kind === "seat";
  let title: string, body: ReactNode, footer: ReactNode;
  if (paid) {
    title = personal ? `${o.planName || personalPlanName()} 已生效` : seat ? "席位已增加" : creditText("Credits 已到账");
    body = personal ? (
      <>
        <div className="ws-success">
          <span className="ws-credit-success-mark">✓</span>
          <h3>支付成功</h3>
          <strong>{o.planName || personalPlanName()} · {o.cycle === "year" ? (cn ? "1 年" : "连续包年") : (cn ? "1 个月" : "连续包月")}</strong>
          <p>每月 {(o.monthlyCredits ?? marketConfig().benefits.proCredits).toLocaleString()}{creditText(" Credits ·")}{o.monthlyMinutes === null ? "无限录音转写时长" : `${(o.monthlyMinutes ?? marketConfig().benefits.proMinutes).toLocaleString()} 分钟`}</p>
          <p>权益至 {date(o.subscription?.endsAt)}</p>
        </div>
        <p className="ws-muted">
          本次 {money(o.amount, o.currency)}{" "}
          {o.currency}；个人权益已更新。
        </p>
      </>
    ) : seat ? (
      <>
        <div className="ws-steps">
          <span>1 选择席位</span>
          <span>2 确认并支付</span>
          <b>3 已生效</b>
        </div>
        <div className="ws-success">
          <h3>支付成功</h3>
          <p>
            新增 {o.added} 席位已生效，总席位 {o.targetSeats} 个。
          </p>
          <strong>{money(o.amount, o.currency)}</strong>
          <p>账单 {o.invoiceId}</p>
        </div>
        <p className="ws-muted">
          已更新可用席位与账单记录，可继续邀请成员。
        </p>
      </>
    ) : (
      <>
        <div className="ws-steps">
          <span>1 选择套餐</span>
          <span>2 确认并支付</span>
          <b>3 已到账</b>
        </div>
        <div className="ws-success">
          <span className="ws-credit-success-mark">✓</span>
          <h3>支付成功</h3>
          <strong>+{creditNumber(o.credits)}{creditText(" Credits")}</strong>
          <p>已加入「{w.name}」共享池</p>
          {o.creditsExpireAt && <p>积分有效期至 {date(o.creditsExpireAt)}</p>}
          <p>当前可用 {creditNumber(M.creditBalance(w))}{creditText(" Credits")}</p>
        </div>
        <div className="ws-order">
          <p>订单 {o.id}</p>
          {o.expiresAt && <p>请于 {date(o.expiresAt)} 前支付</p>}
          <p>
            实付 {money(o.amount, o.currency)} · 账单 {o.invoiceId}
          </p>
        </div>

      </>
    );
    footer = (
      <>
        {!seat ? (
          <Button
            action={personal ? "personal-receipt" : "invoice"}
            value={personal ? o.id : o.invoiceId}
            onClick={() =>
              act(
                personal ? "personal-receipt" : "invoice",
                personal ? o.id : o.invoiceId,
              )
            }
          >
            下载账单
          </Button>
        ) : null}
        <Button action="close-dialog" className="primary" onClick={onClose}>
          完成
        </Button>
      </>
    );
  } else {
    title = personal
      ? "确认个人订阅"
      : seat
        ? "确认加席订单"
        : creditText("确认 Credits 订单");
    body = personal ? (
      <>
        <div className="ws-steps">
          <span>1 选择套餐</span>
          <b>2 确认并支付</b>
          <span>3 权益生效</span>
        </div>
        <div className="ws-order">
          <h3>{o.planName || personalPlanName()} · {o.cycle === "year" ? (cn ? "1 年" : "连续包年") : (cn ? "1 个月" : "连续包月")}</h3>
          <p>订单 {o.id}</p>
          {o.expiresAt && <p>请于 {date(o.expiresAt)} 前支付</p>}
          <div>
            <span>账户</span>
            <strong>{email}</strong>
          </div>
          <div>
            <span>每月权益</span>
            <strong>{(o.monthlyCredits ?? marketConfig().benefits.proCredits).toLocaleString()}{creditText(" Credits ·")}{o.monthlyMinutes === null ? "无限录音转写时长" : `${(o.monthlyMinutes ?? marketConfig().benefits.proMinutes).toLocaleString()} 分钟`}</strong>
          </div>
          <div>
            <span>本次应付</span>
            <strong>{money(o.amount, o.currency)} {o.currency}</strong>
          </div>
        </div>
        {!sandbox && <label className="ws-field">
          支付方式
          <Select
            name="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {marketConfig().payments.subscription.map(method => <option key={method}>{method}</option>)}
          </Select>
        </label>}
        <p className="ws-muted">
          {cn ? "单次购买，支付成功后立即生效，不自动续费。年付会员积分仍随会员周期按月发放至个人账户。" : creditText(`支付成功后立即生效，随后每${o.cycle === "year" ? "年" : "月"}按 ${dollars(o.amount)} 自动续费，可随时取消续费并保留已购期间权益。年付的分钟数与 Credits 仍按月刷新。`)}
        </p>
        {o.status === "failed" && <p className="ws-seat-payment-error" role="alert">支付失败，未扣款、未开通权益。可重试或取消。</p>}
        <input type="hidden" name="orderId" value={o.id} />
        <input type="hidden" name="workspaceId" value={w.id} />
      </>
    ) : seat ? (
      <>
        <div className="ws-steps">
          <span>1 选择席位</span>
          <b>2 确认并支付</b>
          <span>3 生效</span>
        </div>
        <div className="ws-order ws-seat-order">
          <h3>{w.name}</h3>
          <p>订单 {o.id}</p>
          {o.expiresAt && <p>请于 {date(o.expiresAt)} 前支付</p>}
          <div>
            <span>总席位</span>
            <strong>
              {o.fromSeats} → {o.targetSeats} 席位
            </strong>
          </div>
          <div>
            <span>新增席位</span>
            <strong>
              {o.added} × {money(o.unitPrice ?? M.price(o.cycle), o.currency)} /{" "}
              {o.cycle === "year" ? "年" : "月"}
            </strong>
          </div>
          <div className="ws-seat-total">
            <span>本次应付</span>
            <strong>{money(o.amount, o.currency)}</strong>
          </div>
        </div>
        <p className="ws-muted">
          按新增席位的完整{o.cycle === "year" ? "年度" : "月度"}
          原价计费，税费另计；不按剩余天数折算，现有账期不变。
        </p>
        {w.pendingSeats ? (
          <p className="ws-info">支付成功后，将取消已安排的减席计划。</p>
        ) : null}
        {o.status === "failed" ? (
          <div className="ws-seat-payment-error" role="alert">
            支付失败，未扣款、未增加席位。可以重试或取消订单。
          </div>
        ) : null}
        <input type="hidden" name="orderId" value={o.id} />
        <input type="hidden" name="workspaceId" value={w.id} />

      </>
    ) : (
      <>
        <div className="ws-steps">
          <span>1 选择套餐</span>
          <b>2 确认并支付</b>
          <span>3 到账</span>
        </div>
        <div className="ws-order">
          <h3>{w.name}</h3>
          <p>订单 {o.id}</p>
          {o.expiresAt && <p>请于 {date(o.expiresAt)} 前支付</p>}
          <div>
            <span>购买数量</span>
            <strong>{creditNumber(o.credits)}{creditText(" Credits")}</strong>
          </div>
          <div>
            <span>到账位置</span>
            <strong>当前团队共享池</strong>
          </div>
          <div>
            <span>本次应付</span>
            <strong>{money(o.amount, o.currency)}</strong>
          </div>
        </div>
        <label className="ws-field">支付方式
          {seat ? <strong>{sandbox ? "Airwallex 沙盒" : w.billing.method}</strong> : <Select name="method" value={method} onChange={e => setMethod(e.target.value)}>{marketConfig().payments.credits.map(value => <option key={value}>{value}</option>)}</Select>}
        </label>
        <p className="ws-muted">{creditText("一次性购买，无自动续购。支付成功后 Credits 才会到账，有效期一年；购买后不支持退款，如需发票请联系客服。")}</p>
        {o.status === "failed" ? (
          <div className="ws-seat-payment-error" role="alert">{creditText("支付失败，未扣款、未增加 Credits。可重试或取消订单。")}</div>
        ) : null}
        <input type="hidden" name="workspaceId" value={w.id} />
        <input type="hidden" name="orderId" value={o.id} />

      </>
    );
    footer = (
      <>
        {!personal ? (
          <Button
            disabled={pending}
            action={`${kind}-back`}
            value={o.id}
            onClick={() => act(`${kind}-back`, o.id)}
          >
            返回修改
          </Button>
        ) : null}
        <Button
          disabled={pending}
          action={`${kind}-cancel`}
          value={o.id}
          onClick={() => act(`${kind}-cancel`, o.id)}
        >
          取消订单
        </Button>
        {!sandbox && reviewToolsEnabled() && (<Button
          action={personal ? "personal-fail" : `${kind}-pay-fail`}
          value={o.id}
          className="link"
          onClick={() =>
            act(personal ? "personal-fail" : `${kind}-pay-fail`, o.id)
          }
        >
          模拟支付失败
        </Button>)}
        <button type="submit" className="ws-btn primary" disabled={pending}>
          {sandbox ? (pending ? "等待支付" : "前往支付") : personal
            ? "确认支付 " + money(o.amount, o.currency)
            : `${o.status === "failed" ? "重试支付" : "确认支付"} ${money(o.amount, o.currency)}`}
        </button>
      </>
    );
  }
  return (
    <WsDialog
      title={title}
      onClose={onClose}
      form={paid ? undefined : `${kind}-pay`}
      onSubmit={onSubmit}
      error={error}
      footer={footer}
    >
      {body}
    </WsDialog>
  );
}
