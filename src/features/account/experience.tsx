"use client";
import { useState, useEffect } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import { M } from "@/features/spaces/model/store";
import type { Workspace } from "@/features/spaces/model/types";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { appUrl } from "@/lib/routes";
import { claimReward, rewardState } from "./rewards";
import "./experience.css";
export type AccountPanel =
  | "credits"
  | "tasks"
  | "recharge"
  | "notifications"
  | "compare"
  | "faq"
  | "orders"
  | "rules"
  | "feedback"
  | "download"
  | null;
export const openAccount = (panel: AccountPanel) =>
  window.dispatchEvent(
    new CustomEvent("eureka:account-panel", { detail: panel }),
  );
const format = (n: number) => n.toLocaleString("en-US");
const originals = [89, 159, 199];
export function CreditsPromo({
  w,
  compact = false,
}: {
  w: Workspace;
  compact?: boolean;
}) {
  const monthly = rewardState(w).entries.filter((e) =>
      e.id.startsWith(
        "signin:" + new Date().toLocaleDateString("sv-SE").slice(0, 7),
      ),
    ),
    team = w.type === "team";
  return (
    <div className="ex-promo">
      <header>
        {team
          ? "团队 Credits"
          : `本月签到 ${monthly.length}/15 次 · 累计 ${format(monthly.length * 1000)} Credits`}
        {!team && (
          <button className="ex-link" onClick={() => openAccount("tasks")}>
            赚 Credits ›
          </button>
        )}
      </header>
      <strong>
        {format(M.creditBalance(w))}{" "}
        <small style={{ fontSize: 12 }}>Credits</small>
      </strong>
      {!compact && !team && (
        <span className="ex-muted">每日签到 +1,000 Credits</span>
      )}
      <footer>
        <button className="ex-button" onClick={() => openAccount("recharge")}>
          充值
        </button>
        {!team && (
          <button
            className="ex-button primary"
            onClick={() => openAccount("tasks")}
          >
            立即领取
          </button>
        )}
      </footer>
    </div>
  );
}
export function AccountExperience({
  controller,
  space,
  actor,
  panel,
  onClose,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  panel: AccountPanel;
  onClose: () => void;
}) {
  const [page, setPage] = useState(panel),
    [tab, setTab] = useState("新手成长"),
    [sku, setSku] = useState("credits-15k"),
    [orderId, setOrderId] = useState(""),
    [notice, setNotice] = useState(""),
    [feedback, setFeedback] = useState(""),
    [channel, setChannel] = useState("Card"),
    [onlyDiff, setOnlyDiff] = useState(false),
    [orderFilter, setOrderFilter] = useState("全部"),
    [readIds, setReadIds] = useState<string[]>([]),
    [invoice, setInvoice] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const ids = JSON.parse(
          localStorage.getItem(`eureka:notifications:${space}:${actor}`) ||
            "[]",
        );
        setReadIds(ids);
      } catch {}
    });
    return () => {
      active = false;
    };
  }, [space, actor]);
  const w = M.get(controller.state!, space),
    team = w.type === "team",
    s = rewardState(w),
    packs = M.CREDIT_PACKS,
    selected = packs.find((p) => p.id === sku)!,
    order = w.creditOrders?.find((o) => o.id === orderId),
    month = new Date().toLocaleDateString("sv-SE").slice(0, 7),
    sharedMeeting =
      M.visible(w, actor).find((f) => f.owner !== actor) ||
      M.visible(w, actor)[0];
  const titles: Record<string, string> = {
    credits: "Credits",
    tasks: "做任务赚 Credits",
    recharge: "充值 Credits",
    notifications: "所有通知",
    compare: "各版本功能对比",
    faq: "常见问题",
    orders: "我的订单",
    rules: "Credits 使用规则",
    feedback: "用户反馈",
    download: "下载 App",
  };
  function perform(fn: () => void) {
    try {
      setNotice("操作成功");
      fn();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function reward(kind: Parameters<typeof claimReward>[2]) {
    perform(() =>
      controller.change((st) =>
        claimReward(M.get(st, space), actor, kind, feedback),
      ),
    );
  }
  function mark(id?: string) {
    const ids = id
      ? [...new Set([...readIds, id])]
      : ["expiry", "share", "release"];
    localStorage.setItem(
      `eureka:notifications:${space}:${actor}`,
      JSON.stringify(ids),
    );
    setReadIds(ids);
  }
  function pay(outcome: "success" | "failure") {
    perform(() => {
      controller.change((st) =>
        M.payCreditOrder(M.get(st, space), orderId, outcome, actor),
      );
      setNotice(
        outcome === "success"
          ? "支付成功，Credits 已到账"
          : "支付未完成，请重试；不会重复入账",
      );
    });
  }
  if (!page) return null;
  if (team && ["tasks", "feedback", "download"].includes(page)) return null;
  const orders = [...(w.creditOrders || []), ...(w.personalOrders || [])];
  const signins = s.entries.filter((e) => e.id.startsWith("signin:" + month));
  return (
    <ReferenceDialog
      className={
        "ex-dialog" + (page === "notifications" ? " ex-notifications" : "")
      }
      label={titles[page]}
      onClose={onClose}
    >
      <header className="ex-head">
        <h2>{titles[page]}</h2>
        {page === "notifications" && (
          <button className="ex-link" onClick={() => mark()}>
            全部已读
          </button>
        )}
        <button className="ex-close" aria-label="关闭" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="ex-body">
        {page === "credits" && (
          <>
            <div className="ex-summary">
              <span>{w.name} · 可用余额</span>
              <br />
              <strong>{format(M.creditBalance(w))}</strong> Credits
            </div>
            <div className="ex-footer">
              {!team && (
                <button onClick={() => setPage("tasks")}>
                  做任务赚 Credits
                </button>
              )}
              <button className="primary" onClick={() => setPage("recharge")}>
                充值 Credits
              </button>
            </div>
            <button
              className="ex-link"
              onClick={() =>
                location.assign(appUrl("settings", "credits", space, actor))
              }
            >
              查看 Credits 明细 →
            </button>
          </>
        )}
        {page === "tasks" && (
          <>
            <nav className="ex-tabs" role="tablist">
              {["新手成长", "活跃互动", "会员升级"].map((t) => (
                <button
                  role="tab"
                  aria-selected={tab === t}
                  key={t}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </nav>
            {tab === "新手成长" ? (
              [
                {
                  id: "register" as const,
                  title: "新用户注册",
                  amount: 1000,
                  desc: "在 PC 端或 App 端完成注册，同一账号仅奖励一次。",
                },
                {
                  id: "profile" as const,
                  title: "完善个人信息",
                  amount: 500,
                  desc: "补充头像、昵称及职业等基本信息。",
                },
                {
                  id: "app" as const,
                  title: "下载 App",
                  amount: 200,
                  desc: "首次下载 EurekaMind App 并完成登录。",
                },
              ].map((t) => (
                <div className="ex-task" key={t.id}>
                  <div>
                    <h3>{t.title}</h3>
                    <p>{t.desc}</p>
                  </div>
                  <b>+{format(t.amount)}</b>
                  <button
                    disabled={s.entries.some((e) => e.id === t.id)}
                    onClick={() =>
                      t.id === "profile" && !s.profileComplete
                        ? location.assign(
                            appUrl("settings", "profile", space, actor),
                          )
                        : t.id === "app" && !s.appInstalled
                          ? setPage("download")
                          : reward(t.id)
                    }
                  >
                    {s.entries.some((e) => e.id === t.id)
                      ? "已领取"
                      : t.id === "register"
                        ? "领取奖励"
                        : "去完成"}
                  </button>
                </div>
              ))
            ) : tab === "活跃互动" ? (
              <>
                <div className="ex-task">
                  <div>
                    <h3>
                      用户反馈（
                      {
                        s.entries.filter((e) =>
                          e.id.startsWith("feedback:" + month),
                        ).length
                      }
                      /10 次）
                    </h3>
                    <p>
                      评价任务或录音总结、提交使用反馈，每月最多获得 5,000
                      Credits。
                    </p>
                  </div>
                  <b>+500</b>
                  <button onClick={() => setPage("feedback")}>去反馈</button>
                </div>
                <div className="ex-task">
                  <div>
                    <h3>每日签到（{signins.length}/15 次）</h3>
                    <p>每月最多获得 15,000 Credits；每天限领取一次。</p>
                  </div>
                  <b>+1,000</b>
                  <button
                    disabled={signins.some((e) =>
                      e.id.endsWith(new Date().toLocaleDateString("sv-SE")),
                    )}
                    onClick={() => reward("signin")}
                  >
                    {signins.some((e) =>
                      e.id.endsWith(new Date().toLocaleDateString("sv-SE")),
                    )
                      ? "今日已签到"
                      : "立即签到"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="ex-grid">
                  {[
                    ["标准版", "3,000"],
                    ["专业版", "5,000"],
                    ["卓越版", "10,000"],
                  ].map(([n, v]) => (
                    <div className="ex-summary" key={n}>
                      <h3>{n}</h3>
                      <strong>+{v}</strong>
                      <p>Credits / 月</p>
                    </div>
                  ))}
                </div>
                <p className="ex-muted">
                  会员成长奖励档位展示，按会员周期发放。当前 EurekaMind
                  可购买套餐与实际权益以个人订阅页为准。
                </p>
                <button
                  className="primary"
                  onClick={() =>
                    location.assign(appUrl("subscription", "", space, actor))
                  }
                >
                  查看个人订阅
                </button>
              </>
            )}
            <p className="ex-muted" style={{ marginTop: 20 }}>
              新手奖励仅领取一次；活跃任务按自然月重新计算。
            </p>
          </>
        )}
        {page === "feedback" && (
          <>
            <p>你对录音总结或 Agent 任务的使用体验如何？</p>
            <label>
              满意度
              <select>
                <option>满意</option>
                <option>一般</option>
                <option>不满意</option>
              </select>
            </label>
            <textarea
              aria-label="反馈内容"
              placeholder="告诉我们遇到的问题或建议"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="ex-footer">
              <button onClick={() => setPage("tasks")}>返回</button>
              <button className="primary" onClick={() => reward("feedback")}>
                提交反馈并领取 500 Credits
              </button>
            </div>
          </>
        )}
        {page === "download" && (
          <>
            <p>下载 App 后登录同一账号，便可在手机上记录、同步与整理。</p>
            <a
              href="https://apps.apple.com/us/app/eurekamind-ai-note-taker/id6742087483"
              target="_blank"
              rel="noreferrer"
            >
              在 App Store 查看 EurekaMind ↗
            </a>
            <div className="ex-rule">
              当前为交互演示。以下按钮仅模拟首次 App 登录。
            </div>
            <button
              onClick={() =>
                perform(() => {
                  controller.change((st) => {
                    const ws = M.get(st, space);
                    (ws.rewards ||= { entries: [] }).appInstalled = true;
                    claimReward(ws, actor, "app");
                  });
                  setPage("tasks");
                })
              }
            >
              模拟首次登录并领取
            </button>
          </>
        )}
        {page === "recharge" && (
          <>
            <p className="ex-muted">充值至 {w.name} · USD</p>
            {!order || order.status === "cancelled" ? (
              <>
                <div className="ex-grid">
                  {packs.map((p, i) => (
                    <button
                      className="ex-sku"
                      aria-pressed={sku === p.id}
                      key={p.id}
                      onClick={() => setSku(p.id)}
                    >
                      <span>{i === 2 ? "最划算" : "Credits 充值包"}</span>
                      <strong>
                        {format(p.credits)}{" "}
                        <small style={{ fontSize: 12 }}>Credits</small>
                      </strong>
                      <b>
                        ${p.amount} <del>${originals[i]}</del>
                      </b>
                      <small>
                        $1 ≈ {Math.round(p.credits / p.amount)} Credits
                      </small>
                    </button>
                  ))}
                </div>
                <div className="ex-summary">
                  应付 <strong>${selected.amount}</strong>{" "}
                  <del>${originals[packs.indexOf(selected)]}</del> · 已优惠 $
                  {originals[packs.indexOf(selected)] - selected.amount}
                </div>
                <p className="ex-muted">
                  购买后有效期 1 年。当前为 USD
                  演示价格，不代表汇率换算或正式售价。
                </p>
                <div className="ex-footer">
                  <button onClick={() => setPage("rules")}>充值规则</button>
                  <button
                    className="primary"
                    disabled={team && !M.admin(w, actor)}
                    onClick={() =>
                      perform(() => {
                        const o = controller.change((st) =>
                          M.createCreditOrder(M.get(st, space), sku, actor),
                        );
                        setOrderId(o.id);
                      })
                    }
                  >
                    {team && !M.admin(w, actor)
                      ? "请联系管理员充值"
                      : "确认充值"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="ex-summary">
                  <strong>
                    {order.status === "paid"
                      ? "充值成功"
                      : `${format(order.credits || 0)} Credits`}
                  </strong>
                  <p>订单 {order.id}</p>
                  <p>
                    金额 ${order.amount} USD · {w.name}
                  </p>
                </div>
                {order.status === "paid" ? (
                  <>
                    <p>Credits 已入账。重复确认不会再次扣费或入账。</p>
                    <button onClick={() => setPage("orders")}>查看订单</button>
                  </>
                ) : (
                  <>
                    <div className="ex-tabs">
                      {["Card", "PayPal"].map((c) => (
                        <button
                          role="tab"
                          aria-selected={channel === c}
                          key={c}
                          onClick={() => setChannel(c)}
                        >
                          {c === "Card" ? "Visa / Mastercard" : c}
                        </button>
                      ))}
                    </div>
                    <p className="ex-rule">
                      演示结账 · 不收集支付信息，不产生真实扣款。
                    </p>
                    <div className="ex-footer">
                      <button
                        onClick={() =>
                          perform(() => {
                            controller.change((st) =>
                              M.cancelCreditOrder(
                                M.get(st, space),
                                orderId,
                                actor,
                              ),
                            );
                            setOrderId("");
                          })
                        }
                      >
                        取消订单
                      </button>
                      <button onClick={() => pay("failure")}>
                        模拟支付失败
                      </button>
                      <button
                        className="primary"
                        onClick={() => pay("success")}
                      >
                        {order.status === "failed"
                          ? "重试模拟支付"
                          : "模拟支付成功"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
        {page === "rules" && (
          <>
            <p>
              Credits 可用于 Agent 任务与指定 AI 功能，按任务所属工作区扣除。
            </p>
            <p>
              充值 Credits 有效期为购买后 1
              年；虚拟服务购买后不支持退款。需要发票时可从“我的订单”提交申请。
            </p>
            <p>
              个人奖励归个人工作区，团队充值归团队工作区，余额不会随切换合并。
            </p>
            <button onClick={() => setPage("recharge")}>返回充值</button>
          </>
        )}
        {page === "notifications" &&
          [
            {
              id: "expiry",
              icon: "!",
              title: "您的 Credits 即将过期",
              text: "演示提醒：2,000 Credits 将在本月底到期，请及时查看明细。",
              time: "今天 09:00",
              link: "查看明细",
            },
            {
              id: "share",
              icon: "♧",
              title: "收到一条内容共享",
              text: sharedMeeting
                ? `演示通知：「${sharedMeeting.title}」已可查看，打开会议回顾纪要与行动。`
                : "暂无可访问的会议内容。",
              time: "昨天 14:30",
              link: "打开会议",
            },
            {
              id: "release",
              icon: "✦",
              title: "EurekaMind 功能更新",
              text: "模板社区、连接器与团队洞察已加入工作台。",
              time: "10 月 10 日",
              link: "查看更新",
            },
          ].map((n) => (
            <article className="ex-notice" key={n.id}>
              <span className="ex-notice-icon">{n.icon}</span>
              <div>
                <h3>
                  {n.title}
                  {!readIds.includes(n.id) && <i className="ex-dot" />}
                </h3>
                <time>{n.time}</time>
                <p className="ex-muted">{n.text}</p>
                <button
                  className="ex-link"
                  onClick={() => {
                    mark(n.id);
                    location.assign(
                      appUrl(
                        n.id === "release"
                          ? "updates"
                          : n.id === "expiry"
                            ? "settings"
                            : sharedMeeting
                              ? "meeting"
                              : "home",
                        n.id === "expiry"
                          ? "credits"
                          : n.id === "share"
                            ? sharedMeeting?.id || ""
                            : "",
                        space,
                        actor,
                      ),
                    );
                  }}
                >
                  {n.link} →
                </button>
              </div>
            </article>
          ))}
        {page === "compare" && (
          <>
            <label>
              <input
                type="checkbox"
                checked={onlyDiff}
                onChange={(e) => setOnlyDiff(e.target.checked)}
              />{" "}
              仅查看差异项
            </label>
            <table className="ex-table">
              <thead>
                <tr>
                  <th>权益项</th>
                  <th>标准版</th>
                  <th>Pro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["每月转写时长", "400 分钟", "不限时长"],
                  ["每月 Credits", "0", "5,000"],
                  ["AI 专业总结", "✓", "✓"],
                  ["AI 个人助理", "✓", "✓"],
                  ["多语言转写翻译", "✓", "✓"],
                  ["区分发言人", "✓", "✓"],
                  ["专业模板库", "✓", "✓"],
                  ["高级 AI 分析", "—", "✓"],
                ]
                  .filter((row) => !onlyDiff || row[1] !== row[2])
                  .map((row) => (
                    <tr key={row[0]}>
                      {row.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        )}
        {page === "faq" && (
          <>
            {[
              [
                "有哪些会员类型？",
                "当前 EurekaMind 保留标准版与 Pro。转写时长、Credits 和高级 AI 能力按个人订阅方案提供，团队订阅独立计费。",
              ],
              [
                "会员权益里的功能具体指什么？",
                "转写时长用于将录音转换为文本；AI 总结提炼重点与结论；Agent 基于会议理解、跨文件检索进行分析；区分发言人还原对话；模板库与自定义模板指定总结结构；跨端协同同步音频和总结。",
              ],
              [
                "会员到期时间如何计算？",
                "以本次订单所示的起止日期为准。可在个人订阅页面查看当前周期、续费和到期时间。",
              ],
              [
                "转写时长和加时包有什么区别？",
                "会员转写额度随周期刷新，加时包为一次性额度。EurekaMind 当前原型仅演示已上架的订阅与 Credits 套餐。",
              ],
              [
                "升级后何时生效？",
                "支付成功后在订单所属工作区生效；同一订单重试不会重复开通。已有个人与团队权益分别维护。",
              ],
              [
                "购买会员是否支持发票？",
                "可在“我的订单 → 开发票”选择已支付订单并填写抬头。原型仅保存申请，不发送真实发票。",
              ],
            ].map(([q, a]) => (
              <details className="ex-rule" key={q}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  {q}
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </>
        )}
        {page === "orders" && (
          <>
            <div className="ex-tabs">
              {["全部", "已支付", "已取消"].map((t) => (
                <button
                  role="tab"
                  aria-selected={orderFilter === t}
                  key={t}
                  onClick={() => setOrderFilter(t)}
                >
                  {t}
                </button>
              ))}
              <button
                style={{ marginLeft: "auto" }}
                onClick={() => setInvoice(!invoice)}
              >
                开发票
              </button>
            </div>
            {invoice && (
              <form
                className="ex-summary"
                onSubmit={(e) => {
                  e.preventDefault();
                  setNotice("演示发票申请已保存");
                  localStorage.setItem(
                    `eureka:invoice-request:${space}`,
                    JSON.stringify(
                      Object.fromEntries(new FormData(e.currentTarget)),
                    ),
                  );
                  setInvoice(false);
                }}
              >
                <label>
                  选择已支付订单
                  <select name="order" required>
                    {orders
                      .filter((o) => o.status === "paid")
                      .map((o) => (
                        <option key={o.id}>{o.id}</option>
                      ))}
                  </select>
                </label>
                <label>
                  发票抬头
                  <input name="title" required />
                </label>
                <label>
                  接收邮箱
                  <input name="email" type="email" required />
                </label>
                <button
                  className="primary"
                  disabled={!orders.some((o) => o.status === "paid")}
                >
                  保存申请
                </button>
              </form>
            )}
            {orders
              .filter(
                (o) =>
                  orderFilter === "全部" ||
                  o.status ===
                    (orderFilter === "已支付" ? "paid" : "cancelled"),
              )
              .map((o) => (
                <article className="ex-order" key={o.id}>
                  <header>
                    <strong>
                      {"credits" in o
                        ? `${format(o.credits || 0)} Credits`
                        : "Pro 个人订阅"}
                    </strong>
                    <span>
                      {
                        {
                          paid: "已支付",
                          cancelled: "已取消",
                          pending: "待支付",
                          failed: "支付失败",
                        }[o.status]
                      }
                    </span>
                  </header>
                  <p className="ex-muted">
                    订单编号：{o.id}
                    <br />
                    订单时间：{o.created}
                    <br />
                    支付金额：${o.amount} USD
                  </p>
                  {"credits" in o &&
                    ["pending", "failed"].includes(o.status) && (
                      <button
                        className="ex-link"
                        onClick={() => {
                          setOrderId(o.id);
                          setPage("recharge");
                        }}
                      >
                        继续支付
                      </button>
                    )}
                </article>
              ))}
            {orders.length === 0 && (
              <p className="ex-muted">
                暂无订单。完成演示充值后，可在这里查看订单和申请发票。
              </p>
            )}
          </>
        )}
        {notice && (
          <p role="status" className="ex-rule">
            {notice}
          </p>
        )}
      </div>
    </ReferenceDialog>
  );
}
