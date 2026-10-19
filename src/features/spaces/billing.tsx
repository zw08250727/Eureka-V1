"use client";
import { creditText, teamMoney } from "@/features/markets/config";
import { productName } from "@/features/markets/brand";


import { marketConfig } from "@/features/markets/config";
import { Select } from "@/components/ui/select";
import { useEffect, useState, type ReactNode } from "react";
import { M } from "./model/store";
import PS from "./model/subscription";
import type { Cycle, Workspace } from "./model/types";
import type { SpacesController } from "./use-spaces";
import { RefIcon } from "@/features/reference/symbols";
import { orderReceipt } from "@/features/account/orders";
import { appUrl } from "@/lib/routes";
import {
  creditNumber,
  date,
  downloadText,
  money,
  WsButton as Button,
  WsDialog,
  WsRoot,
  WsToast,
} from "./billing-ui";
import {
  CreditsBilling,
  PersonalBilling,
  TeamBilling,
  type BillingOrder,
} from "./billing-panels";
import { DomesticMembership } from "./domestic-membership";
import { TimeCheckout } from "./time-checkout";
import { createTimeOrder, payTimeOrder, cancelTimeOrder } from "./model/time-packs";
import { CheckoutDialog, type OrderKind } from "./billing-checkout";
import { useAirwallexCheckout, usesAirwallexSandbox } from "./use-airwallex-checkout";
type Dialog =
  | { type: "checkout"; kind: OrderKind; id: string }
  | { type: "time"; id: string }
  | { type: "seats"; increaseOnly: boolean }
  | { type: "pack" }
  | { type: "billing" }
  | { type: "confirm"; title: string; copy: ReactNode; run: () => void }
  | null;
export function BillingPage({
  controller,
  space,
  actor,
  credits = false,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  credits?: boolean;
}) {
  const w = M.get(controller.state!, space), personal = w.type === "personal";
  const autoSeats = typeof location !== "undefined" && new URLSearchParams(location.search).get("addSeats") === "1" && !personal && M.admin(w, actor);
  const [cycle, setCycle] = useState<Cycle>("year"),
    [modal, setModal] = useState<Dialog>(autoSeats ? { type: "seats", increaseOnly: true } : null),
    [count, setCount] = useState(autoSeats ? String(w.seats + 1) : ""),
    [pack, setPack] = useState(M.CREDIT_PACKS[0].id),
    [method, setMethod] = useState(marketConfig().payments.subscription[0]),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const airwallex = useAirwallexCheckout();
  const mutate = <T,>(fn: (current: Workspace) => T) =>
    controller.change((s) => fn(M.get(s, space)));
  useEffect(() => {
    if (new URLSearchParams(location.search).get("addSeats") === "1" && w.type === "team" && M.admin(w, actor)) {
      const url = new URL(location.href); url.searchParams.delete("addSeats"); history.replaceState(null, "", url);
    }
  }, [w, actor]);
  const close = () => {
    setModal(null);
    setError("");
  };
  function guard(fn: () => void) {
    try {
      setError("");
      fn();
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      if (!modal) setToast(message);
    }
  }
  function confirm(title: string, copy: ReactNode, run: () => void) {
    setModal({ type: "confirm", title, copy, run });
  }
  function checkout(kind: OrderKind, id: string) {
    if (kind !== "personal") M.govern(w, actor);
    const order = (
      kind === "personal"
        ? w.personalOrders
        : kind === "seat"
          ? w.seatOrders
          : w.creditOrders
    )?.find((o) => o.id === id);
    if (!order) throw Error("订单不存在");
    if (order.status === "cancelled") throw Error("订单已取消");
    setMethod(kind === "credit" ? marketConfig().payments.credits[0] : marketConfig().payments.subscription[0]);
    setModal({ type: "checkout", kind, id });
  }
  function seats(value: number, increaseOnly = false) {
    M.govern(w, actor);
    M.writable(w);
    setCount(String(value));
    setModal({ type: "seats", increaseOnly });
  }
  function pay(result: "success" | "failure", kind: OrderKind, id: string) {
    mutate((current) =>
      kind === "personal"
        ? PS.pay(current, id, result, method)
        : kind === "seat"
          ? M.paySeatOrder(current, id, result, actor)
          : M.payCreditOrder(current, id, result, actor, method),
    );
  }
  function act(action: string, value = "") {
    guard(() => {
      if (action === "personal-cycle") {
        setCycle(value as Cycle);
        return;
      }
      if (action === "time-buy") {
        const order = mutate(current => createTimeOrder(current, value));
        setMethod(marketConfig().payments.subscription[0]);
        setModal({ type: "time", id: order.id });
        return;
      }
      if (action === "personal-buy") {
        const order = mutate((current) => PS.create(current, cycle, value || "professional"));
        setModal({ type: "checkout", kind: "personal", id: order.id });
        return;
      }
      if (
        action === "personal-checkout" ||
        action === "seat-checkout" ||
        action === "credit-checkout"
      ) {
        checkout(action.split("-")[0] as OrderKind, value);
        return;
      }
      if (
        action === "personal-fail" ||
        action === "seat-pay-fail" ||
        action === "credit-pay-fail"
      ) {
        pay("failure", action.split("-")[0] as OrderKind, value);
        if (action === "personal-fail") setMethod(marketConfig().payments.subscription[0]);
        return;
      }
      if (action === "personal-cancel") {
        PS.get(w, value);
        confirm(
          "取消个人订阅订单？",
          "未支付的订单取消后不会扣款或开通权益。",
          () => {
            mutate((current) => PS.cancel(current, value));
            close();
          },
        );
        return;
      }
      if (action === "personal-renew") {
        const sub = PS.current(w);
        confirm(
          sub.renew ? "取消自动续费？" : "恢复自动续费？",
          sub.renew
            ? "当前已购权益将保留至到期，不再自动续费。"
            : "到期按当前套餐价格续费。",
          () => {
            mutate((current) => PS.renew(current, !sub.renew));
            close();
          },
        );
        return;
      }
      if (action === "personal-restore") {
        mutate((current) => PS.restore(current));
        setToast("已恢复有效个人订阅");
        return;
      }
      if (action === "personal-receipt") {
        const receipt = orderReceipt(w, actor, "personal", value);
        downloadText(receipt.filename, receipt.text);
        return;
      }
      M.govern(w, actor);
      if (action === "add-seats") {
        if (w.seats >= 50) throw Error("已达 50 席位上限");
        seats(w.seats + 1, true);
        return;
      }
      if (action === "seats") {
        seats(w.pendingSeats ?? w.seats);
        return;
      }
      if (action === "seat-back") {
        const order = w.seatOrders?.find((o) => o.id === value);
        if (!order) throw Error("订单不存在");
        seats(order.targetSeats!);
        return;
      }
      if (action === "seat-cancel") {
        mutate((current) => M.cancelSeatOrder(current, value, actor));
        close();
        setToast("订单已取消，席位未变更");
        return;
      }
      if (action === "cancel-reduction") {
        mutate((current) => {
          M.govern(current, actor);
          current.pendingSeats = null;
          M.log(current, "取消下周期减席", actor);
        });
        return;
      }
      if (action === "cycle") {
        confirm(
          "切换计费周期？",
          <>
            <div className="ws-table-scroll">
              <table className="ws-table" aria-label="切换计费周期明细">
                <thead><tr><th scope="col">项目</th><th scope="col">切换后</th></tr></thead>
                <tbody>
                  <tr><th scope="row">计费周期</th><td>{w.cycle === "year" ? "月付" : "年付"}</td></tr>
                  <tr><th scope="row">席位数量</th><td>{w.pendingSeats ?? w.seats} 席位</td></tr>
                  <tr><th scope="row">每席单价</th><td>{teamMoney(M.price(w.cycle === "year" ? "month" : "year"))} / {w.cycle === "year" ? "月" : "年"}</td></tr>
                  <tr><th scope="row">下期费用</th><td>{w.pendingSeats ?? w.seats} × {teamMoney(M.price(w.cycle === "year" ? "month" : "year"))} = <strong>{teamMoney((w.pendingSeats ?? w.seats) * M.price(w.cycle === "year" ? "month" : "year"))} / {w.cycle === "year" ? "月" : "年"}</strong></td></tr>
                  <tr><th scope="row">生效日期</th><td>{w.nextDate}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="ws-muted">税费另计。当前账期保持不变，新计费周期从上述日期开始。</p>
          </>,
          () => {
            mutate((current) => {
              M.govern(current, actor);
              M.writable(current);
              current.pendingCycle =
                current.cycle === "year" ? "month" : "year";
              M.log(current, "安排下周期切换计费方式", actor);
            });
            close();
          },
        );
        return;
      }
      if (action === "cancel-cycle") {
        mutate((current) => {
          M.govern(current, actor);
          current.pendingCycle = null;
        });
        return;
      }
      if (action === "advance-cycle") {
        confirm(
          "模拟下一账期？",
          "将应用已安排的席位与计费周期变更，生成模拟续费账单。已取消续费的空间将进入只读。",
          () => {
            mutate((current) => M.advanceCycle(current, actor));
            close();
          },
        );
        return;
      }
      if (action === "billing-info") {
        setModal({ type: "billing" });
        return;
      }
      if (action === "renew") {
        confirm(
          w.renew && w.status === "active" ? "取消自动续费？" : "恢复订阅？",
          w.renew && w.status === "active"
            ? `当前权益保留至 ${w.nextDate}，到期后进入只读模式。`
            : "完成团队续费，所有有效成员的权益统一延长一个计费周期，再恢复录音、转写和 Agent 分析。",
          () => {
            mutate((current) => {
              M.govern(current, actor);
              if (current.status !== "active") {
                current.renew = true;
                M.advanceCycle(current, actor);
              } else current.renew = !current.renew;
              M.log(current, "更新自动续费设置", actor);
            });
            close();
          },
        );
        return;
      }
      if (action === "expire") {
        confirm(
          "模拟订阅到期？",
          "用于体验只读状态，文件仍可查看与导出；可随时在此恢复订阅。",
          () => {
            mutate((current) => {
              M.govern(current, actor);
              current.status = "expired";
              M.log(current, "模拟订阅到期", actor);
            });
            close();
          },
        );
        return;
      }
      if (action === "invoice") {
        const i = w.invoices.find((i) => i.id === value);
        if (!i) throw Error("账单不存在");
        downloadText(
          i.id + ".txt",
          `${productName()} 模拟账单\n${i.id}\n${w.billing.company}\n${i.label}\n${money(i.amount, i.currency)}\n${date(i.date)}\n仅供演示，不作为真实支付或报销凭证。`,
        );
        return;
      }
      if (action === "topup") {
        M.writable(w);
        setPack(M.CREDIT_PACKS[0].id);
        setModal({ type: "pack" });
        return;
      }
      if (action === "credit-back") {
        const o = w.creditOrders?.find((o) => o.id === value);
        if (!o) throw Error("订单不存在");
        mutate((current) => M.cancelCreditOrder(current, value, actor));
        setPack(o.packId || M.CREDIT_PACKS[0].id);
        setModal({ type: "pack" });
        return;
      }
      if (action === "credit-cancel") {
        confirm(creditText("取消 Credits 订单？"), creditText("取消后不会扣款或增加 Credits。"), () => {
          mutate((current) => M.cancelCreditOrder(current, value, actor));
          close();
          setToast("订单已取消");
        });
      }
    });
  }
  const order =
    modal?.type === "checkout"
      ? ((modal.kind === "personal"
          ? w.personalOrders
          : modal.kind === "seat"
            ? w.seatOrders
            : w.creditOrders
        )?.find((o) => o.id === modal.id) as BillingOrder | undefined)
      : undefined;
  const n = Number(count),
    validCount =
      count !== "" &&
      Number.isInteger(n) &&
      n <= 50 &&
      n >=
        (modal?.type === "seats" && modal.increaseOnly
          ? w.seats + 1
          : Math.max(2, M.usedSeats(w)));
  const cancel = (
    <Button action="close-dialog" onClick={close}>
      取消
    </Button>
  );
  return (
    <>
      <WsRoot w={w} actor={actor} view={credits ? "credits" : "subscription"}>
        {personal ? (
          marketConfig().id === "cn" ? <DomesticMembership w={w} account={controller.state!.account} cycle={cycle} act={act}/> : <PersonalBilling
            w={w}
            state={controller.state!}
            actor={actor}
            cycle={cycle}
            act={act}
          />
        ) : credits && !M.admin(w, actor) ? (
          <div className="ws-empty">
            <RefIcon name="folder" className="ws-icon" />
            <h3>此页面暂不可访问</h3>
            <p>仅管理员可执行此操作</p>
            <Button
              className="primary"
              onClick={() => location.assign(appUrl("home", "", space, actor))}
            >
              返回团队首页
            </Button>
          </div>
        ) : credits ? (
          <CreditsBilling w={w} actor={actor} act={act} />
        ) : (
          <TeamBilling w={w} actor={actor} act={act} checkoutPending={airwallex.pending} checkoutError={airwallex.error} />
        )}
      </WsRoot>
      {modal?.type === "time" && w.timeOrders?.find(o => o.id === modal.id) && <TimeCheckout order={w.timeOrders.find(o => o.id === modal.id)!} error={error} method={method} setMethod={setMethod} onClose={close} onPay={() => guard(() => { mutate(current => payTimeOrder(current, modal.id, "success", method)); })} onCancel={() => guard(() => { mutate(current => cancelTimeOrder(current, modal.id)); close(); })} onReceipt={() => guard(() => { const receipt = orderReceipt(w, actor, "time", modal.id); downloadText(receipt.filename, receipt.text); })}/>}
      <WsToast message={toast} onClear={() => setToast("")} />
      {modal?.type === "checkout" && order ? (
        <CheckoutDialog
          w={w}
          email={controller.state!.account.email}
          kind={modal.kind}
          order={order}
          act={act}
          error={error || (modal.kind !== "credit" ? airwallex.error : "")}
          sandbox={modal.kind !== "credit" && usesAirwallexSandbox()}
          pending={airwallex.pending}
          method={method}
          setMethod={setMethod}
          onClose={() => { if (!airwallex.pending) close(); }}
          onSubmit={(e) => {
            e.preventDefault();
            if (modal.kind === "personal" && usesAirwallexSandbox()) {
              void airwallex.begin(w, actor, order, () => {
                mutate(current => PS.pay(current, modal.id, "success", "Airwallex"));
              }, "personal");
            } else if (modal.kind === "seat" && usesAirwallexSandbox()) {
              void airwallex.begin(w, actor, order, () => {
                mutate(current => {
                  const paid = M.paySeatOrder(current, modal.id, "success", actor);
                  const invoice = current.invoices.find(item => item.id === paid.invoiceId);
                  if (invoice) invoice.label = `沙盒加席演示 · ${paid.added} 席位（原型参考价）`;
                });
                setModal({ type: "checkout", kind: "seat", id: modal.id });
              });
            } else guard(() => pay("success", modal.kind, modal.id));
          }}
        />
      ) : null}
      {modal?.type === "confirm" ? (
        <WsDialog
          title={modal.title}
          error={error}
          onClose={close}
          footer={
            <>
              {cancel}
              <Button
                action="confirm"
                className="primary"
                onClick={() => guard(modal.run)}
              >
                确认
              </Button>
            </>
          }
        >
          {typeof modal.copy === "string" ? <p>{modal.copy}</p> : modal.copy}
        </WsDialog>
      ) : null}
      {modal?.type === "seats" ? (
        <WsDialog
          title={modal.increaseOnly ? "增加席位" : "管理席位"}
          form="seats"
          onClose={close}
          error={error}
          footer={
            <>
              {cancel}
              <button type="submit" className="ws-btn primary">
                {!validCount
                  ? "下一步"
                  : n > w.seats
                    ? "下一步：确认费用"
                    : n < w.seats
                      ? "确认下期调整"
                      : "确认"}
              </button>
            </>
          }
          onSubmit={(e) => {
            e.preventDefault();
            guard(() => {
              if (n > w.seats) {
                const o = mutate((current) =>
                  M.createSeatOrder(current, n, actor),
                );
                setModal({ type: "checkout", kind: "seat", id: o.id });
              } else {
                mutate((current) => M.seats(current, n, actor));
                close();
              }
            });
          }}
        >
          <label className="ws-field">
            调整后的总席位数
            <input
              name="seats"
              type="number"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              required
              min={
                modal.increaseOnly ? w.seats + 1 : Math.max(2, M.usedSeats(w))
              }
              max={50}
              step={1}
            />
          </label>
          <p>
            当前已购 {w.seats} 席位，已分配 {M.usedSeats(w)}{" "}
            席位（含待接受邀请）。
          </p>
          <div
            id="ws-seat-estimate"
            className="ws-seat-estimate"
            aria-live="polite"
          >
            {!validCount ? (
              "请输入有效的席位数量"
            ) : n > w.seats ? (
              <>
                <span>
                  新增 {n - w.seats} 席位 ·{" "}
                  {w.cycle === "year" ? "年付" : "月付"}
                </span>
                <strong>{teamMoney((n - w.seats) * M.price(w.cycle))}</strong>
                <small>本次应付 · 按完整周期计价</small>
              </>
            ) : n < w.seats ? (
              `将于 ${w.nextDate} 调整为 ${n} 席位，本次无需支付。`
            ) : w.pendingSeats ? (
              "将取消已安排的减席，保持当前席位，本次无需支付。"
            ) : (
              "席位数量未变化，本次无需支付。"
            )}
          </div>
          <p className="ws-muted">
            新增席位支付成功后生效；减少席位在下一账期生效。
          </p>
        </WsDialog>
      ) : null}
      {modal?.type === "pack" ? (
        <WsDialog
          title={creditText("购买 Credits")}
          form="credit-pack"
          error={error}
          onClose={close}
          footer={
            <>
              {cancel}
              <button type="submit" className="ws-btn primary">
                下一步：确认订单
              </button>
            </>
          }
          onSubmit={(e) => {
            e.preventDefault();
            guard(() => {
              const o = mutate((current) =>
                M.createCreditOrder(current, pack, actor),
              );
              setModal({ type: "checkout", kind: "credit", id: o.id });
            });
          }}
        >
          <div className="ws-steps">
            <b>1 选择套餐</b>
            <span>2 确认并支付</span>
            <span>3 到账</span>
          </div>
          <p>购买后进入「{w.name}」的共享池，供所有成员的 Agent 使用。</p>
          <div className="ws-credit-packs">
            {M.CREDIT_PACKS.map((p) => (
              <label key={p.id}>
                <input
                  type="radio"
                  name="packId"
                  value={p.id}
                  checked={pack === p.id}
                  onChange={() => setPack(p.id)}
                  required
                />
                <span>
                  <strong>{creditNumber(p.credits)}{creditText(" Credits")}</strong>
                  <small>一次性购买 · 团队共享</small>
                </span>
                <b>{money(p.amount,marketConfig().currency)}</b>
              </label>
            ))}
          </div>
          <input type="hidden" name="workspaceId" value={w.id} />
          <p className="ws-muted">{creditText("购买 Credits 不改变席位数、个人空间余额或转写权益。")}</p>
        </WsDialog>
      ) : null}
      {modal?.type === "billing" ? (
        <WsDialog
          title="账单信息"
          form="billing"
          error={error}
          onClose={close}
          footer={
            <>
              {cancel}
              <button type="submit" className="ws-btn primary">
                保存
              </button>
            </>
          }
          onSubmit={(e) => {
            e.preventDefault();
            const values = new FormData(e.currentTarget);
            guard(() => {
              mutate((current) => {
                M.govern(current, actor);
                current.billing = {
                  company: String(values.get("company")),
                  email: String(values.get("email")),
                  taxId: String(values.get("taxId")),
                  method: String(values.get("method")),
                };
                M.log(current, "更新账单信息", actor);
              });
              close();
            });
          }}
        >
          {(
            [
              ["公司名称", "company", "text"],
              ["账单邮箱", "email", "email"],
              ["税号（可选）", "taxId", "text"],
            ] as const
          ).map(([label, name, type]) => (
            <label key={name} className="ws-field">
              {label}
              <input
                name={name}
                type={type}
                defaultValue={w.billing[name]}
                required={name !== "taxId"}
              />
            </label>
          ))}
          <label className="ws-field">
            支付方式
            <Select name="method" defaultValue={w.billing.method}>
              {(marketConfig().id === "cn" ? marketConfig().payments.subscription : ["Visa ···· 4242", "Mastercard ···· 5555"]).map(value => <option key={value}>{value}</option>)}
            </Select>
          </label>
        </WsDialog>
      ) : null}

    </>
  );
}
