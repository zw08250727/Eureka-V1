"use client";
import { RefIcon } from "@/features/reference/symbols";
import type { Cycle, Order, Workspace, WorkspaceState } from "./model/types";
import { M } from "./model/store";
import PS from "./model/subscription";
import {
  Badge,
  creditNumber,
  date,
  dollars,
  ManagementTabs,
  money,
  WsButton as Button,
  WsHeading,
} from "./billing-ui";
export type BillingAction = (action: string, value?: string) => void;
export type BillingOrder = Order & {
  unitPrice?: number;
  nextAmount?: number;
  nextCycle?: Cycle;
  snapshot?: string;
  subscription?: { endsAt: string };
  paidAt?: string;
};
export function TeamTerm({ w }: { w: Workspace }) {
  return (
    <div className="ws-team-term">
      <strong>当前周期截止：{w.nextDate || "待确认"}</strong>
      <span>本工作区统一到期，中途加入不另起个人套餐；设置、账单、转写和 Credits 与其他工作区独立。</span>
      <span>本工作区累计转写：{w.transcriptionUsage?.used || 0} 分钟 · Unlimited</span>
      <small>
        {w.status !== "active"
          ? "当前团队权益已暂停"
          : w.renew
            ? "已开启自动续费，续费成功后统一延长"
            : "已关闭自动续费，到期未续费则统一暂停"}
      </small>
    </div>
  );
}
export function PersonalBilling({
  w,
  state,
  actor,
  cycle,
  act,
}: {
  w: Workspace;
  state: WorkspaceState;
  actor: string;
  cycle: Cycle;
  act: BillingAction;
}) {
  const sub = PS.current(w),
    remainingMinutes = Math.max(0, sub.minutes - (w.transcriptionUsage?.used || 0)),
    orders = w.personalOrders || [],
    pending = orders.find((o) => ["pending", "failed"].includes(o.status));
  const records = state.spaces.filter(
    (s) =>
      s.status === "dissolved" &&
      (s.closure as Workspace["closure"] & { actor?: string })?.actor ===
        M.SELF,
  );
  return (
    <>
      <WsHeading
        w={w}
        actor={actor}
        title="个人订阅"
        subtitle="查看个人工作区的套餐、用量与账单。"
      />
      <section className="ws-surface ps-account">
        <div>
          <span className="ws-mini-avatar">张</span>
          <div>
            <h2>
              张伟{" "}
              <Badge kind={sub.plan === "Pro" ? "blue" : "amber"}>
                {sub.plan}
              </Badge>
            </h2>
            <p>
              {sub.plan === "Pro"
                ? `${sub.renew ? "下次续费" : "权益保留至"}：${date(sub.endsAt)} · ${sub.cycle === "year" ? "连续包年" : "连续包月"}`
                : "标准版 · 每月 400 分钟"}
            </p>
          </div>
        </div>
        <div>
          <strong>
            {remainingMinutes.toLocaleString()}{" "}
            <small>/ {sub.minutes.toLocaleString()} 分钟剩余</small>
          </strong>
          <progress max={sub.minutes} value={remainingMinutes} />
          <small>
            {sub.nextRefresh
              ? "下次分钟 / Credits 刷新：" + date(sub.nextRefresh)
              : "个人订阅与团队席位分别计费"}
          </small>
        </div>
        {sub.plan === "Pro" ? (
          <Button
            action="personal-renew"
            className="link"
            onClick={() => act("personal-renew")}
          >
            {sub.renew ? "取消自动续费" : "恢复自动续费"}
          </Button>
        ) : null}
      </section>
      {pending ? (
        <div className="ws-seat-pending">
          <div>
            <strong>个人订阅支付未完成</strong>
            <span>
              Pro · {pending.cycle === "year" ? "连续包年" : "连续包月"} ·{" "}
              {dollars(pending.amount)}
            </span>
          </div>
          <Button
            action="personal-checkout"
            value={pending.id}
            onClick={() => act("personal-checkout", pending.id)}
          >
            继续支付
          </Button>
        </div>
      ) : null}
      <section className="ws-surface ps-plans">
        <div className="ps-plan-head">
          <span>✦ Pro</span>
          <p>在转写与摘要之外，解锁高级 AI 分析。</p>
        </div>
        <div className="ps-plan-options">
          {(
            [
              { cycle: "month", amount: 17.99 },
              { cycle: "year", amount: 99.99 },
            ] as const
          ).map((p) => (
            <button
              key={p.cycle}
              type="button"
              className={`ps-plan-option ${cycle === p.cycle ? "selected" : ""}`}
              data-ws-action="personal-cycle"
              data-value={p.cycle}
              aria-pressed={cycle === p.cycle}
              onClick={() => act("personal-cycle", p.cycle)}
            >
              {p.cycle === "year" ? (
                <span className="ps-saving">每年节省 $115.89</span>
              ) : null}
              <h3>{p.cycle === "year" ? "连续包年" : "连续包月"}</h3>
              <strong>
                {dollars(p.amount)}{" "}
                <small>/ {p.cycle === "year" ? "年" : "月"}</small>
              </strong>
              <dl>
                <dt>每月 Credits</dt>
                <dd>5,000 Credits</dd>
                <dt>每月转写与摘要分钟数</dt>
                <dd>99,999 分钟</dd>
              </dl>
            </button>
          ))}
        </div>
        <div className="ps-plan-details">
          <h3>订阅详情</h3>
          <p>
            每月 5,000 Credits，用于 Agent 分析；每月 99,999
            分钟转写与摘要时长。年付套餐按年支付，权益按月刷新。
          </p>
          <p>支付为本地模拟，不会真实扣款。标准版每月包含 400 分钟。</p>
        </div>
        <div className="ps-plan-footer">
          <Button
            action="personal-buy"
            className="primary"
            disabled={sub.plan === "Pro" && sub.cycle === cycle}
            onClick={() => act("personal-buy")}
          >
            {sub.plan === "Pro" && sub.cycle === cycle
              ? "当前套餐"
              : sub.plan === "Pro"
                ? "切换 Pro 套餐"
                : "立即升级 Pro"}
          </Button>
          <Button
            action="personal-restore"
            className="link"
            onClick={() => act("personal-restore")}
          >
            恢复购买
          </Button>
        </div>
      </section>
      <section className="ws-surface">
        <div className="ws-section-head">
          <h2>个人订阅订单</h2>
        </div>
        <div className="ws-table-scroll">
          <table className="ws-table">
            <thead>
              <tr>
                {["订单", "套餐", "金额", "状态", "操作"].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length ? (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.id}
                      <small>{date(o.created)}</small>
                    </td>
                    <td>Pro · {o.cycle === "year" ? "年付" : "月付"}</td>
                    <td>{dollars(o.amount)}</td>
                    <td>
                      <Badge>
                        {
                          {
                            pending: "待支付",
                            failed: "支付失败",
                            paid: "已支付",
                            cancelled: "已取消",
                          }[o.status]
                        }
                      </Badge>
                    </td>
                    <td>
                      {o.status === "paid" ? (
                        <Button
                          className="link"
                          action="personal-receipt"
                          value={o.id}
                          onClick={() => act("personal-receipt", o.id)}
                        >
                          下载账单
                        </Button>
                      ) : o.status === "cancelled" ? (
                        "—"
                      ) : (
                        <>
                          <Button
                            className="link"
                            action="personal-checkout"
                            value={o.id}
                            onClick={() => act("personal-checkout", o.id)}
                          >
                            继续支付
                          </Button>
                          <Button
                            className="link"
                            action="personal-cancel"
                            value={o.id}
                            onClick={() => act("personal-cancel", o.id)}
                          >
                            取消
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>暂无个人订阅订单</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {records.length ? (
        <section className="ws-surface">
          <h2>团队解散结算记录</h2>
          <p className="ws-muted">
            仅保留你操作解散的团队结算信息，不计入个人套餐。真实退款规则待确认。
          </p>
          {records.map((s) => (
            <div className="ws-settings-leave" key={s.id}>
              <div>
                <strong>{s.name}</strong>
                <p>
                  {date(s.closure!.endedAt)} · 冻结{" "}
                  {creditNumber(s.closure!.frozenCredits)} Credits · 未自动退款
                </p>
              </div>
              <Button
                action="closure-receipt"
                value={s.id}
                onClick={() => act("closure-receipt", s.id)}
              >
                下载结算记录
              </Button>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
export function TeamBilling({
  w,
  actor,
  act,
}: {
  w: Workspace;
  actor: string;
  act: BillingAction;
}) {
  const order = (w.seatOrders || []).find((o) =>
    ["pending", "failed"].includes(o.status),
  );
  if (!M.admin(w, actor))
    return (
      <>
        <WsHeading
          w={w}
          actor={actor}
          title="团队权益"
          subtitle="当前工作区的权益由管理员付费开通和管理。"
        />
        <section className="ws-surface ws-perks">
          <h2>Team Unlimited</h2>
          <p>你在本工作区使用工作区的 Unlimited 转写及共享 Credits；不会消耗其他团队或个人额度。内容仍默认私有。</p>
          <Badge kind={w.status === "active" ? "green" : "amber"}>
            {w.status === "active" ? "权益生效中" : "当前只读"}
          </Badge>
          <TeamTerm w={w} />
          <p>账单、席位和续费请联系团队管理员。</p>
        </section>
      </>
    );
  return (
    <>
      <WsHeading
        w={w}
        actor={actor}
        title="订阅与席位"
        subtitle="管理员为本工作区统一付款；成员在此使用同一套工作区权益，其他团队独立维护。"
      />
      <ManagementTabs w={w} actor={actor} active="billing" />
      {order ? (
        <div className="ws-seat-pending" role="status">
          <div>
            <strong>
              {order.status === "failed"
                ? "加席支付未完成"
                : "有一笔待支付的加席订单"}
            </strong>
            <span>
              增加 {order.added} 席位 · {money(order.amount, order.currency)} · 当前席位尚未变更
            </span>
          </div>
          <div className="ws-actions">
            <Button
              action="seat-checkout"
              value={order.id}
              onClick={() => act("seat-checkout", order.id)}
            >
              继续支付
            </Button>
            <Button
              action="seat-cancel"
              value={order.id}
              className="link"
              onClick={() => act("seat-cancel", order.id)}
            >
              取消订单
            </Button>
          </div>
        </div>
      ) : null}
      <div className="ws-billing-grid">
        <section className="ws-surface ws-plan-current">
          <div className="ws-section-head">
            <h2>Team Unlimited</h2>
            <Badge kind={w.status === "active" ? "green" : "amber"}>
              {w.status === "active"
                ? w.renew
                  ? "订阅生效中"
                  : "已取消自动续费"
                : "已到期 · 只读"}
            </Badge>
          </div>
          <div className="ws-plan-amount">
            {dollars(M.price(w.cycle) * w.seats)}
            <small>/ {w.cycle === "year" ? "年" : "月"}</small>
          </div>
          <p>
            {w.seats} 席位 × {dollars(M.price(w.cycle))} /{" "}
            {w.cycle === "year" ? "年" : "月"} · USD 续费价格，税费另计
          </p>
          <div className="ws-plan-divider" />
          <div className="ws-seat-usage">
            <strong>
              {M.usedSeats(w)} <small>/ {w.seats} 已分配</small>
            </strong>
            <span>{w.seats - M.usedSeats(w)} 个可用席位</span>
          </div>
          <progress max={w.seats} value={M.usedSeats(w)} />
          <div className="ws-actions">
            <Button
              action="add-seats"
              className="primary"
              disabled={w.seats >= 50 || w.status !== "active"}
              title={
                w.seats >= 50
                  ? "已达50席位上限"
                  : w.status !== "active"
                    ? "请先恢复订阅"
                    : undefined
              }
              onClick={() => act("add-seats")}
            >
              <RefIcon name="plus" className="ws-icon" />
              增加席位
            </Button>
            <Button action="seats" onClick={() => act("seats")}>
              管理席位
            </Button>
            <Button action="cycle" onClick={() => act("cycle")}>
              切换{w.cycle === "year" ? "月付" : "年付"}
            </Button>
          </div>
          {w.pendingCycle ? (
            <div className="ws-info">
              下周期改为 {w.pendingCycle === "year" ? "年付" : "月付"}{" "}
              <Button
                action="cancel-cycle"
                className="link"
                onClick={() => act("cancel-cycle")}
              >
                撤销
              </Button>
            </div>
          ) : null}
          {w.pendingSeats ? (
            <div className="ws-info">
              下周期调整为 {w.pendingSeats} 席位{" "}
              <Button
                action="cancel-reduction"
                className="link"
                onClick={() => act("cancel-reduction")}
              >
                撤销
              </Button>
            </div>
          ) : null}
          <TeamTerm w={w} />
        </section>
        <section className="ws-surface ws-billing-details">
          <h3>账单信息</h3>
          <dl>
            <dt>公司名称</dt>
            <dd>{w.billing.company}</dd>
            <dt>账单邮箱</dt>
            <dd>{w.billing.email}</dd>
            <dt>支付方式</dt>
            <dd>{w.billing.method}</dd>
          </dl>
          <Button action="billing-info" onClick={() => act("billing-info")}>
            编辑账单信息
          </Button>
          <div className="ws-plan-divider" />
          <div className="ws-actions">
            <Button
              action="renew"
              className="link"
              onClick={() => act("renew")}
            >
              {w.status !== "active"
                ? "恢复订阅"
                : w.renew
                  ? "取消自动续费"
                  : "恢复自动续费"}
            </Button>
            <Button
              action="advance-cycle"
              className="link"
              onClick={() => act("advance-cycle")}
            >
              模拟下一账期
            </Button>
            <Button
              action="expire"
              className="link danger"
              onClick={() => act("expire")}
            >
              模拟到期
            </Button>
          </div>
          <small>支付与订单均为本地演示，不会真实扣款。</small>
        </section>
      </div>
      <section className="ws-surface">
        <div className="ws-section-head">
          <h2>账单历史</h2>
        </div>
        <div className="ws-table-scroll">
          <table className="ws-table">
            <thead>
              <tr>
                {["账单", "项目", "金额", "状态", "凭证"].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {w.invoices.map((i) => (
                <tr key={i.id}>
                  <td>
                    {i.id}
                    <small>{date(i.date)}</small>
                  </td>
                  <td>{i.label}</td>
                  <td>{money(i.amount, i.currency)}</td>
                  <td>
                    <Badge kind="green">{i.status}</Badge>
                  </td>
                  <td>
                    <Button
                      action="invoice"
                      value={i.id}
                      className="link"
                      onClick={() => act("invoice", i.id)}
                    >
                      下载
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
export function CreditOrderActions({
  o,
  act,
}: {
  o: Order;
  act: BillingAction;
}) {
  return o.status === "paid" ? (
    <>
      <Button
        action="credit-checkout"
        value={o.id}
        className="link"
        onClick={() => act("credit-checkout", o.id)}
      >
        查看结果
      </Button>
      <Button
        action="invoice"
        value={o.invoiceId}
        className="link"
        onClick={() => act("invoice", o.invoiceId)}
      >
        下载账单
      </Button>
    </>
  ) : o.status === "cancelled" ? (
    <span className="ws-muted">已关闭</span>
  ) : (
    <>
      <Button
        action="credit-checkout"
        value={o.id}
        className="link"
        onClick={() => act("credit-checkout", o.id)}
      >
        {o.status === "failed" ? "重试支付" : "继续支付"}
      </Button>
      <Button
        action="credit-cancel"
        value={o.id}
        className="link danger"
        onClick={() => act("credit-cancel", o.id)}
      >
        取消
      </Button>
    </>
  );
}
export function CreditsBilling({
  w,
  actor,
  act,
}: {
  w: Workspace;
  actor: string;
  act: BillingAction;
}) {
  const c = w.credits,
    orders = w.creditOrders || [],
    pending = orders.find((o) => ["pending", "failed"].includes(o.status));
  return (
    <>
      <WsHeading
        w={w}
        actor={actor}
        title="团队 Credits"
        subtitle="所有成员共用一个 Credits 池。Agent 按输入与输出 token 用量扣减，与本工作区转写权益共同维护，不跨工作区扣减。"
      />
      <ManagementTabs w={w} actor={actor} active="credits" />
      {pending ? (
        <div className="ws-seat-pending">
          <div>
            <strong>
              {pending.status === "failed"
                ? "Credits 支付未完成"
                : "有一笔待支付的 Credits 订单"}
            </strong>
            <span>
              {creditNumber(pending.credits)} Credits · {money(pending.amount)}
            </span>
          </div>
          <div className="ws-actions">
            <CreditOrderActions o={pending} act={act} />
          </div>
        </div>
      ) : null}
      <section className="ws-surface ws-credit-summary">
        <div>
          <span>可用 Credits</span>
          <strong>{creditNumber(M.creditBalance(w))}</strong>
          <div className="ws-credit-balance-actions">
            <Button
              action="topup"
              className="primary"
              onClick={() => act("topup")}
            >
              <RefIcon name="plus" className="ws-icon" />
              购买 Credits
            </Button>
            <small>一次性加购，团队共享</small>
          </div>
        </div>
        <div>
          <span>累计消耗 Credits</span>
          <strong>{creditNumber(c.used)}</strong>
        </div>
      </section>
      <section className="ws-surface">
        <div className="ws-section-head">
          <div>
            <h2>使用记录</h2>
            <p className="ws-muted">
              Token 用量为本地模拟；正式接入后按模型返回的实际用量结算。
            </p>
          </div>
        </div>
        <div className="ws-table-scroll">
          <table className="ws-table ws-credit-usage">
            <thead>
              <tr>
                {["任务", "成员", "消耗 Credits", "时间"].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.logs.length ? (
                c.logs.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.user === actor ? l.task : "成员 Agent 用量（内容私有）"}
                      <small>
                        {l.inputTokens != null
                          ? "Token 用量模拟"
                          : "历史记录 · 未记录 Token 明细"}
                      </small>
                    </td>
                    <td>
                      {w.members.find((m) => m.id === l.user)?.name ||
                        "已移除成员"}
                    </td>
                    <td>−{creditNumber(l.amount)}</td>
                    <td>{date(l.time)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>暂无使用记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="ws-surface">
        <div className="ws-section-head">
          <h2>购买记录</h2>
        </div>
        <div className="ws-table-scroll">
          <table className="ws-table ws-credit-orders">
            <thead>
              <tr>
                {["订单", "Credits", "金额", "状态", "操作"].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length ? (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.id}
                      <small>{date(o.created)}</small>
                    </td>
                    <td>{creditNumber(o.credits)}</td>
                    <td>{money(o.amount)}</td>
                    <td>
                      <Badge kind={o.status === "paid" ? "green" : ""}>
                        {
                          {
                            pending: "待支付",
                            failed: "支付失败",
                            paid: "已到账",
                            cancelled: "已取消",
                          }[o.status]
                        }
                      </Badge>
                    </td>
                    <td>
                      <div className="ws-actions">
                        <CreditOrderActions o={o} act={act} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>暂无 Credits 购买记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
