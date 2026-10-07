"use client";
import { useState } from "react";
import { M } from "./model/store";
import PS from "./model/subscription";
import type { Cycle, Workspace } from "./model/types";
import type { SpacesController } from "./use-spaces";
import { RefIcon } from "@/features/reference/symbols";
import { appUrl } from "@/lib/routes";
import {
  creditNumber,
  date,
  dollars,
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
import { CheckoutDialog, type OrderKind } from "./billing-checkout";
type Dialog =
  | { type: "checkout"; kind: OrderKind; id: string }
  | { type: "seats"; increaseOnly: boolean }
  | { type: "pack" }
  | { type: "billing" }
  | { type: "leave" }
  | { type: "confirm"; title: string; copy: string; run: () => void }
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
  const [cycle, setCycle] = useState<Cycle>("year"),
    [modal, setModal] = useState<Dialog>(null),
    [count, setCount] = useState(""),
    [pack, setPack] = useState(M.CREDIT_PACKS[0].id),
    [method, setMethod] = useState("Visa ···· 4242"),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const w = M.get(controller.state!, space),
    personal = w.type === "personal";
  const mutate = <T,>(fn: (current: Workspace) => T) =>
    controller.change((s) => fn(M.get(s, space)));
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
  function confirm(title: string, copy: string, run: () => void) {
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
    setMethod("Visa ···· 4242");
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
          : M.payCreditOrder(current, id, result, actor),
    );
  }
  function act(action: string, value = "") {
    guard(() => {
      if (action === "personal-cycle") {
        setCycle(value as Cycle);
        return;
      }
      if (action === "personal-buy") {
        const order = mutate((current) => PS.create(current, cycle));
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
        if (action === "personal-fail") setMethod("Visa ···· 4242");
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
            : "到期按当前套餐价格续费（本地模拟）。",
          () => {
            mutate((current) => PS.renew(current, !sub.renew));
            close();
          },
        );
        return;
      }
      if (action === "personal-restore") {
        mutate((current) => PS.restore(current));
        setToast("已恢复本浏览器的有效个人订阅，没有再次扣款或发放 Credits");
        return;
      }
      if (action === "personal-receipt") {
        const o = PS.get(w, value) as BillingOrder;
        if (o.status !== "paid") throw Error("订单尚未支付");
        downloadText(
          o.invoiceId + ".txt",
          `EurekaMind 个人订阅账单（本地模拟）\n订单：${o.id}\n账单：${o.invoiceId}\nPro ${o.cycle === "year" ? "年付" : "月付"}\n金额：${dollars(o.amount)} USD\n支付时间：${o.paidAt}\n未发生真实扣款。`,
        );
        return;
      }
      if (action === "closure-receipt") {
        const c = M.get(controller.state!, value)
          .closure as Workspace["closure"] & { actor?: string };
        if (!c || c.actor !== M.SELF) throw Error("无权下载此记录");
        downloadText(
          c.name + "-解散结算记录.json",
          JSON.stringify(
            { notice: "本地模拟；未发生退款。真实结算规则待确认。", ...c },
            null,
            2,
          ),
        );
        return;
      }
      if (action === "leave") {
        if (!M.member(w, actor)) throw Error("请进入有效的团队空间");
        if (actor !== M.SELF)
          throw Error("请先切回自己的视角，再操作团队退出或解散");
        setModal({ type: "leave" });
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
          `改为${w.cycle === "year" ? "月付" : "年付"}后，下一周期费用为 ${money((w.pendingSeats ?? w.seats) * M.price(w.cycle === "year" ? "month" : "year"))}。本次为演示，不产生真实扣款。`,
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
            : "将模拟完成团队续费，所有有效成员的权益统一延长一个计费周期，再恢复录音、转写和 Agent 分析。不会真实扣款。",
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
          `EurekaMind 模拟账单\n${i.id}\n${w.billing.company}\n${i.label}\n${money(i.amount)}\n${date(i.date)}\n仅供演示，不作为真实支付或报销凭证。`,
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
        confirm("取消 Credits 订单？", "取消后不会扣款或增加 Credits。", () => {
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
          <PersonalBilling
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
          <TeamBilling w={w} actor={actor} act={act} />
        )}
      </WsRoot>
      <WsToast message={toast} onClear={() => setToast("")} />
      {modal?.type === "checkout" && order ? (
        <CheckoutDialog
          w={w}
          email={controller.state!.account.email}
          kind={modal.kind}
          order={order}
          act={act}
          error={error}
          method={method}
          setMethod={setMethod}
          onClose={close}
          onSubmit={(e) => {
            e.preventDefault();
            guard(() => pay("success", modal.kind, modal.id));
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
          <p>{modal.copy}</p>
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
                <strong>{money((n - w.seats) * M.price(w.cycle))}</strong>
                <small>本次应付 · 演示按完整周期计价</small>
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
          title="购买 Credits"
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
                  <strong>{creditNumber(p.credits)} Credits</strong>
                  <small>一次性购买 · 团队共享</small>
                </span>
                <b>{money(p.amount)}</b>
              </label>
            ))}
          </div>
          <input type="hidden" name="workspaceId" value={w.id} />
          <p className="ws-muted">
            演示价格，不会真实扣款。购买 Credits
            不改变席位数、个人空间余额或转写权益。
          </p>
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
            模拟支付方式
            <select name="method" defaultValue={w.billing.method}>
              <option>Visa ···· 4242</option>
              <option>Mastercard ···· 5555</option>
            </select>
          </label>
        </WsDialog>
      ) : null}
      {modal?.type === "leave" ? (
        <WsDialog
          title="退出团队"
          form="leave"
          error={error}
          onClose={close}
          footer={
            <>
              {cancel}
              <button className="ws-btn danger" type="submit">
                确认退出团队
              </button>
            </>
          }
          onSubmit={(e) => {
            e.preventDefault();
            guard(() => {
              controller.change((s) => M.leave(s, M.get(s, space), actor));
              location.assign(appUrl("home", "", "personal", M.SELF));
            });
          }}
        >
          <p className="ws-exit-name">{w.name}</p>
          <dl className="ws-exit-rules">
            {[
              [
                "席位与订阅",
                "释放你占用的 1 个席位，管理员可重新分配；已购席位、账单和续费不变，不自动退款或减席。",
              ],
              [
                "转写与 Credits",
                "你的团队 Unlimited 转写权益立即停止；Credits 属于团队，余额及历史消耗保留，不能带走。个人套餐与用量、其他团队权益不变。",
              ],
              [
                "资料与设备",
                "你将无法访问该团队的资料，已有资料留在原团队且保持原授权，不自动转入个人空间。你的设备解除与该团队的绑定，你在该团队创建的自动任务暂停。",
              ],
              [
                "重新加入",
                "退出后回到个人空间。再次加入需要管理员重新邀请，不会自动恢复设备绑定或启用自动任务。",
              ],
            ].map(([title, copy]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{copy}</dd>
              </div>
            ))}
          </dl>
          <input type="hidden" name="workspaceId" value={w.id} />
          <input type="hidden" name="actor" value={actor} />
        </WsDialog>
      ) : null}
    </>
  );
}
