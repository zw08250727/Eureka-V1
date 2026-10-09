"use client";
import { useEffect, useRef, useState } from "react";
import { M } from "./model/store";
import type { Cycle, Workspace } from "./model/types";
import type { SpacesController } from "./use-spaces";
import { appUrl } from "@/lib/routes";
import { CREATION_DEMO_DRAFT } from "./creation-demo";
import { useAppRoute } from "@/features/application/route";
import {
  ManagementDialog as Dialog,
  ManagementButton as Button,
  ManagementIcon as Icon,
  ManagementEmpty,
  ManagementToast,
} from "./management-ui";
import { dollars as money } from "./billing-ui";
import "./team-pricing.css";
import { Workbench } from "@/features/workbench/workbench";
import { TeamHome } from "./home";
import { InviteMembersDialog } from "./management-dialogs";
interface Setup {
  step: number;
  name: string;
  country: string;
  cycle: Cycle;
  seats: number;
  orderId: string;
  accountId: string;
}
export function CreateTeamDialog({
  controller,
  onClose,
}: {
  controller: SpacesController;
  onClose: () => void;
}) {
  const { creationDemo } = useAppRoute();
  const key = creationDemo ? CREATION_DEMO_DRAFT : "eureka:team-setup:v1";
  const accountId = controller.state!.account.id;
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Workspace | null>(null);
  const [invite, setInvite] = useState(false);
  const snapshot = useRef<string | null>(null);
  const orders = useRef(controller.state!.orders);
  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      try {
        snapshot.current = localStorage.getItem(key);
        let value: Setup | null = snapshot.current
          ? JSON.parse(snapshot.current)
          : null;
        if (
          value &&
          (value.accountId !== accountId ||
            typeof value.orderId !== "string" ||
            typeof value.name !== "string" ||
            !value.name.trim() ||
            value.name.length > 40 ||
            !["year", "month"].includes(value.cycle) ||
            !Number.isInteger(value.seats) ||
            value.seats < 2 ||
            value.seats > 50 ||
            typeof value.country !== "string" ||
            !value.country)
        )
          throw Error("开通草稿无效或不属于当前账号，请保留数据后重试。");
        if (value && orders.current.some((o) => o.id === value!.orderId)) {
          localStorage.removeItem(key);
          snapshot.current = null;
          value = null;
        }
        if (alive)
          setSetup(
            value
              ? { ...value, step: 2 }
              : {
                  step: 0,
                  name: "",
                  country: "中国",
                  cycle: "year",
                  seats: 3,
                  orderId: M.id("order"),
                  accountId,
                },
          );
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    });
    return () => {
      alive = false;
    };
  }, [accountId, key]);
  function fresh() {
    if (localStorage.getItem(key) !== snapshot.current)
      throw Error("团队开通信息已在其他页面更新，请重新打开后继续。");
  }
  function save(next: Setup) {
    M.assertCanJoinTeam(controller.state!);
    fresh();
    const raw = JSON.stringify(next);
    try {
      localStorage.setItem(key, raw);
    } catch {
      throw Error("开通信息保存失败，请保留输入并重试。");
    }
    snapshot.current = raw;
    setSetup(next);
    setError("");
  }
  function clear() {
    fresh();
    localStorage.removeItem(key);
    snapshot.current = null;
  }
  function act(fn: () => void) {
    try {
      fn();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const enter = () => {
    if (created) location.assign(appUrl("home", "", created.id, M.SELF));
    else onClose();
  };
  if (created)
    return invite ? (
      <InviteMembersDialog
        controller={controller}
        space={created.id}
        actor={M.SELF}
        onClose={enter}
        onSaved={() =>
          location.assign(appUrl("members", "", created.id, M.SELF))
        }
      />
    ) : (
      <Dialog
        title="团队已准备好"
        onClose={enter}
        footer={
          <>
            <Button action="close-dialog" onClick={enter}>
              进入团队
            </Button>
            <Button
              action="invite"
              className="primary"
              onClick={() => setInvite(true)}
            >
              邀请伙伴
            </Button>
          </>
        }
      >
        <div className="ws-success">
          <Icon name="users" />
          <h3>{created.name}</h3>
          <p>
            {created.seats}{" "}
            个席位已开通。可以邀请伙伴，也可以直接进入团队开始工作。
          </p>
        </div>
      </Dialog>
    );
  if (!setup)
    return (
      <Dialog title="EurekaMind Team" onClose={onClose} error={error}>
        {error ? null : <p>正在读取开通信息…</p>}
      </Dialog>
    );
  const draft = setup;
  if (draft.step === 0)
    return (
      <Dialog
        key="plan"
        title="EurekaMind Team"
        wide
        onClose={onClose}
        error={error}
      >
        <div className="ws-plan-intro">
          <div>
            <span className="ws-eyebrow">一个账号，无缝协作</span>
            <h1>
              让团队的每次讨论
              <br />
              都有下一步。
            </h1>
            <p>从独立记录到授权协作，在一个清晰可控的工作空间完成。</p>
            <ul>
              {[
                [
                  "folder",
                  "独立的团队会议录音",
                  "录音归属当前空间，授权后成员可见",
                ],
                [
                  "users",
                  "成员与席位统一管理",
                  "每个席位都享有完整 Unlimited 权益",
                ],
                ["phone", "设备绑定到空间", "录音同步位置清晰，切换时不混淆"],
                [
                  "spark",
                  "团队 Credits 共享池",
                  "按 Token 用量使用，独立于转写权益",
                ],
              ].map(([icon, title, copy]) => (
                <li key={icon}>
                  <Icon name={icon} />
                  <div>
                    <strong>{title}</strong>
                    <span>{copy}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <section className="ws-pricing">
            <span className="ws-eyebrow">TEAM UNLIMITED</span>
            <div className="ws-cycle">
              <Button
                action="plan-cycle"
                value="month"
                className={draft.cycle === "month" ? "active" : ""}
                onClick={() => setSetup({ ...draft, cycle: "month" })}
              >
                月付
              </Button>
              <Button
                action="plan-cycle"
                value="year"
                className={draft.cycle === "year" ? "active" : ""}
                onClick={() => setSetup({ ...draft, cycle: "year" })}
              >
                年付
              </Button>
            </div>
            <div className="ws-price">
              {money(M.teamPricing[draft.cycle].monthly)}
              <s>{money(M.teamPricing[draft.cycle].originalMonthly)}</s>
              <small>/ 席位 / 月</small>
            </div>
            <p>
              {draft.cycle === "year"
                ? "按年计费，每席位 $240.00 · 税费另计"
                : "按月计费 · 税费另计"}
            </p>
            <p className="ws-price-offer">首次订阅 8 折{draft.cycle === "year" && <span>年付比月付节省 29%</span>}</p>
            <p className="ws-muted">首期后按 {money(M.price(draft.cycle))} / 席位 / {draft.cycle === "year" ? "年" : "月"}续费</p>
            <Button
              action="setup"
              className="primary"
              onClick={() => setSetup({ ...draft, step: 1 })}
            >
              创建团队
            </Button>
            <ul>
              <li>✓ 工作区统一 Unlimited 转写权益</li>
              <li>✓ 50,000 团队 Credits</li>
              <li>✓ 成员、设备与账单管理</li>
              <li>✓ 2–50 席位，可随时扩容</li>
            </ul>
            <small>本版本演示定价，不会发起真实支付。</small>
          </section>
        </div>
      </Dialog>
    );
  if (draft.step === 1)
    return (
      <Dialog
        key="setup"
        title="创建团队工作空间"
        form="setup"
        onClose={onClose}
        error={error}
        onSubmit={(f) => {
          const next: Setup = {
            ...draft,
            step: 2,
            name: String(f.get("name") || "").trim(),
            country: String(f.get("country")),
            seats: Number(f.get("seats")),
            cycle: String(f.get("cycle")) as Cycle,
          };
          if (
            !next.name ||
            next.name.length > 40 ||
            !Number.isInteger(next.seats) ||
            next.seats < 2 ||
            next.seats > 50 ||
            !["year", "month"].includes(next.cycle)
          )
            throw Error("请填写有效的空间名称、周期和 2–50 个席位");
          save(next);
        }}
        footer={
          <>
            <Button action="close-dialog" onClick={onClose}>
              取消
            </Button>
            <button className="ws-btn primary" type="submit">
              确认订单
            </button>
          </>
        }
      >
        <div className="ws-steps">
          <b>1 空间信息</b>
          <span>2 确认订单</span>
          <span>3 开通</span>
        </div>
        <label className="ws-field">
          工作空间名称
          <input
            name="name"
            type="text"
            defaultValue={draft.name}
            required
            maxLength={40}
            placeholder="例如：EurekaMind 产品团队"
          />
        </label>
        <label className="ws-field">
          公司所在地区
          <select name="country" defaultValue={draft.country}>
            {["中国", "新加坡", "美国", "其他"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="ws-two-fields">
          <label className="ws-field">
            席位数量
            <input
              name="seats"
              type="number"
              defaultValue={draft.seats}
              required
              min={2}
              max={50}
              step={1}
            />
          </label>
          <label className="ws-field">
            计费周期
            <select name="cycle" defaultValue={draft.cycle}>
              <option value="year">年付 · $20 / 席位 / 月（首年 $240）</option>
              <option value="month">月付 · $28 / 席位 / 月（首月优惠）</option>
            </select>
          </label>
        </div>
        <p className="ws-muted">
          至少 2 席位。你作为管理员占用 1 席位。本工作区独立计费，加入后个人权益冻结、内容保留。
        </p>
      </Dialog>
    );
  return (
    <Dialog
      key="checkout"
      title="确认团队订单"
      onClose={onClose}
      error={error}
      footer={
        <>
          <Button
            action="cancel-setup"
            onClick={() =>
              act(() => {
                clear();
                onClose();
              })
            }
          >
            取消订单
          </Button>
          <Button
            action="setup"
            onClick={() => {
              setError("");
              setSetup({ ...draft, step: 1 });
            }}
          >
            上一步
          </Button>
          <Button
            action="payment-fail"
            onClick={() => setError("模拟支付失败，未创建空间或扣款。请重试。")}
          >
            模拟支付失败
          </Button>
          <Button
            action="payment"
            className="primary"
            onClick={() =>
              act(() => {
                fresh();
                const team = controller.change((s) => M.create(s, draft));
                try {
                  clear();
                } catch {
                  /* Fulfilled order id prevents duplicate creation on recovery. */
                }
                setCreated(team);
              })
            }
          >
            模拟支付并开通
          </Button>
        </>
      }
    >
      <div className="ws-steps">
        <span>1 空间信息</span>
        <b>2 确认订单</b>
        <span>3 开通</span>
      </div>
      <div className="ws-order">
        <h3>{draft.name}</h3>
        <p>
          {draft.country} · Team Unlimited ·{" "}
          {draft.cycle === "year" ? "年付" : "月付"}
        </p>
        <div>
          <span>货币</span><strong>USD</strong>
        </div>
        <div>
          <span>
            {draft.seats} 席位 × {money(M.price(draft.cycle))} / {draft.cycle === "year" ? "年" : "月"}
          </span>
          <strong>{money(draft.seats * M.price(draft.cycle))}</strong>
        </div>
        <div className="ws-price-discount">
          <span>首次优惠 · 每席位享 8 折</span>
          <strong>−{money(draft.seats * (M.price(draft.cycle) - M.teamPricing[draft.cycle].firstAmount))}</strong>
        </div>
        <div>
          <span>本次模拟支付</span>
          <strong>{money(draft.seats * M.teamPricing[draft.cycle].firstAmount)}</strong>
        </div>
      </div>
      <p className="ws-muted">税费另计。首次优惠仅用于开通首期；之后按 {money(draft.seats * M.price(draft.cycle))} / {draft.cycle === "year" ? "年" : "月"}续费。</p>
      <div className="ws-info">
        演示订单：无需银行卡，不会真实扣款或发送邮件。信息已保存在此浏览器；关闭后可从“创建团队工作空间”继续。
      </div>
    </Dialog>
  );
}
export function CreateTeamPage({
  controller,
}: {
  controller: SpacesController;
}) {
  return (
    <>
      {M.get(controller.state!).type === "team" ? (
        <TeamHome
          controller={controller}
          space={controller.state!.activeId}
          actor={M.SELF}
        />
      ) : (
        <Workbench />
      )}
      <CreateTeamDialog
        controller={controller}
        onClose={() =>
          location.assign(
            appUrl("home", "", controller.state!.activeId, M.SELF),
          )
        }
      />
    </>
  );
}
export function InvitationsDialog({
  controller,
  onClose,
}: {
  controller: SpacesController;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const invitations = controller.state!.invitations.filter(
    (i) => i.status === "pending",
  );
  return (
    <Dialog title="工作空间邀请" onClose={onClose} error={error}>
      <ManagementToast message={error} />
      {invitations.map((i) => (
        <div className="ws-invitation" key={i.id}>
          <h3>{i.teamName}</h3>
          <p>
            {`${(i as typeof i & { admin?: string }).admin} 邀请你以成员身份加入。使用该工作区统一权益，加入后个人权益冻结；其他工作区独立维护。`}
          </p>
          <Button
            action="decline-invite"
            value={i.id}
            onClick={() => {
              try {
                controller.change((s) => {
                  const target = s.invitations.find((x) => x.id === i.id);
                  if (target) target.status = "declined";
                });
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            婉拒
          </Button>
          <Button
            action="join"
            value={i.id}
            className="primary"
            onClick={() => {
              try {
                const team = controller.change((s) => M.acceptInvite(s, i.id));
                location.assign(appUrl("home", "", team.id, M.SELF));
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            接受并进入
          </Button>
        </div>
      ))}
      {!invitations.length ? (
        <ManagementEmpty title="没有待处理的邀请">
          新的工作空间邀请会显示在这里。
        </ManagementEmpty>
      ) : null}
    </Dialog>
  );
}
export function InvitationsPage({
  controller,
}: {
  controller: SpacesController;
}) {
  return (
    <>
      {M.get(controller.state!).type === "team" ? (
        <TeamHome
          controller={controller}
          space={controller.state!.activeId}
          actor={M.SELF}
        />
      ) : (
        <Workbench />
      )}
      <InvitationsDialog
        controller={controller}
        onClose={() =>
          location.assign(
            appUrl("home", "", controller.state!.activeId, M.SELF),
          )
        }
      />
    </>
  );
}
