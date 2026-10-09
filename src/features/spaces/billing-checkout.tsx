"use client";
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
}: {
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
  const paid = o.status === "paid",
    personal = kind === "personal",
    seat = kind === "seat";
  let title: string, body: ReactNode, footer: ReactNode;
  if (paid) {
    title = personal ? "Pro 已生效" : seat ? "席位已增加" : "Credits 已到账";
    body = personal ? (
      <>
        <div className="ws-success">
          <span className="ws-credit-success-mark">✓</span>
          <h3>模拟支付成功</h3>
          <strong>Pro · {o.cycle === "year" ? "连续包年" : "连续包月"}</strong>
          <p>每月 5,000 Credits · 99,999 分钟</p>
          <p>权益至 {date(o.subscription?.endsAt)}</p>
        </div>
        <p className="ws-muted">
          本次 {dollars(o.amount)}{" "}
          USD；未发生真实扣款。个人权益已更新，团队订阅不受影响。
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
          <h3>模拟支付成功</h3>
          <p>
            新增 {o.added} 席位已生效，总席位 {o.targetSeats} 个。
          </p>
          <strong>{money(o.amount, o.currency)}</strong>
          <p>账单 {o.invoiceId}</p>
        </div>
        <p className="ws-muted">
          已更新可用席位与账单记录，可继续邀请成员。未发生真实扣款。
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
          <h3>模拟支付成功</h3>
          <strong>+{creditNumber(o.credits)} Credits</strong>
          <p>已加入「{w.name}」共享池</p>
          <p>当前可用 {creditNumber(M.creditBalance(w))} Credits</p>
        </div>
        <div className="ws-order">
          <p>订单 {o.id}</p>
          <p>
            实付 {money(o.amount, o.currency)} · 账单 {o.invoiceId}
          </p>
        </div>
        <p className="ws-muted">未发生真实扣款。重复查看此结果不会重复到账。</p>
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
        : "确认 Credits 订单";
    body = personal ? (
      <>
        <div className="ws-steps">
          <span>1 选择套餐</span>
          <b>2 确认并支付</b>
          <span>3 权益生效</span>
        </div>
        <div className="ws-order">
          <h3>Pro · {o.cycle === "year" ? "连续包年" : "连续包月"}</h3>
          <p>订单 {o.id}</p>
          <div>
            <span>账户</span>
            <strong>{email}</strong>
          </div>
          <div>
            <span>每月权益</span>
            <strong>5,000 Credits · 99,999 分钟</strong>
          </div>
          <div>
            <span>本次应付</span>
            <strong>{dollars(o.amount)} USD</strong>
          </div>
        </div>
        <label className="ws-field">
          模拟支付方式
          <select
            name="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option>Visa ···· 4242</option>
            <option>Apple Pay（模拟）</option>
          </select>
        </label>
        <p className="ws-muted">
          支付成功后立即生效，随后每{o.cycle === "year" ? "年" : "月"}按{" "}
          {dollars(o.amount)}{" "}
          自动续费，可随时取消续费并保留已购期间权益。年付的分钟数与 Credits
          仍按月刷新。
        </p>
        <p className="ws-info">
          本地模拟，不会扣款。切换套餐演示按新套餐全额计费、从支付日起重新起算，不折抵旧套餐；正式差价规则待确认。
        </p>
        {o.status === "failed" ? (
          <p className="ws-seat-payment-error" role="alert">
            模拟支付失败，未扣款、未开通权益。可重试或取消。
          </p>
        ) : null}
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
          演示按新增席位的完整{o.cycle === "year" ? "年度" : "月度"}
          原价计费，税费另计；首次开通优惠不重复用于加席，不按剩余天数折算，现有账期不变。
        </p>
        {o.snapshot !==
        JSON.stringify([
          w.id,
          w.seats,
          w.cycle,
          w.nextDate,
          w.pendingSeats ?? null,
          w.pendingCycle ?? null,
          w.renew,
          w.status,
        ]) ? (
          <p className="ws-seat-payment-error">
            席位或订阅已变化，请返回修改并重新确认费用。
          </p>
        ) : null}
        {w.pendingSeats ? (
          <p className="ws-info">支付成功后，将取消已安排的减席计划。</p>
        ) : null}
        <div className="ws-seat-payment-method">
          <span>模拟支付方式</span>
          <strong>{w.billing.method}</strong>
        </div>
        <p className="ws-muted">
          新增席位当前周期截止：{o.nextDate}
          {w.renew
            ? ` · ${o.targetSeats} 席位 · ${money(o.nextAmount ?? 0, o.currency)} / ${o.nextCycle === "year" ? "年" : "月"}`
            : "（自动续费已关闭）"}
        </p>
        {o.status === "failed" ? (
          <div className="ws-seat-payment-error" role="alert">
            模拟支付失败，未扣款、未增加席位。可以重试或取消订单。
          </div>
        ) : null}
        <input type="hidden" name="orderId" value={o.id} />
        <input type="hidden" name="workspaceId" value={w.id} />
        <div className="ws-info">
          本地模拟支付，不会真实扣款。关闭窗口后可在账单页继续支付。
        </div>
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
          <div>
            <span>购买数量</span>
            <strong>{creditNumber(o.credits)} Credits</strong>
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
        <div className="ws-seat-payment-method">
          <span>模拟支付方式</span>
          <strong>{w.billing.method}</strong>
        </div>
        <p className="ws-muted">
          一次性购买，无自动续购。支付成功后 Credits 才会到账，并生成独立账单。
        </p>
        {o.status === "failed" ? (
          <div className="ws-seat-payment-error" role="alert">
            模拟支付失败，未扣款、未增加 Credits。可重试或取消订单。
          </div>
        ) : null}
        <input type="hidden" name="workspaceId" value={w.id} />
        <input type="hidden" name="orderId" value={o.id} />
        <div className="ws-info">
          本地模拟支付，不会真实扣款。关闭窗口后，可从 Credits 页继续支付。
        </div>
      </>
    );
    footer = (
      <>
        {!personal ? (
          <Button
            action={`${kind}-back`}
            value={o.id}
            onClick={() => act(`${kind}-back`, o.id)}
          >
            返回修改
          </Button>
        ) : null}
        <Button
          action={`${kind}-cancel`}
          value={o.id}
          onClick={() => act(`${kind}-cancel`, o.id)}
        >
          取消订单
        </Button>
        <Button
          action={personal ? "personal-fail" : `${kind}-pay-fail`}
          value={o.id}
          className="link"
          onClick={() =>
            act(personal ? "personal-fail" : `${kind}-pay-fail`, o.id)
          }
        >
          模拟支付失败
        </Button>
        <button type="submit" className="ws-btn primary">
          {personal
            ? "模拟支付 " + dollars(o.amount)
            : `${o.status === "failed" ? "重试模拟支付" : "模拟支付"} ${money(o.amount, o.currency)}`}
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
