/* eslint-disable @next/next/no-img-element -- Local avatar upload preview. */
"use client";
import { useEffect, useState } from "react";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { M } from "@/features/spaces/model/store";
import PS from "@/features/spaces/model/subscription";
import { openAccount } from "./experience";
import { appUrl } from "@/lib/routes";
type Profile = {
  name: string;
  avatar: string;
  identity: string;
  occupation: string;
  industry: string;
  company: string;
  signature: string;
};
export function AccountSettings({
  controller,
  space,
  actor,
  tab,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  tab: string;
}) {
  const w = M.get(controller.state!, space),
    sub = w.type === "personal" ? PS.current(w) : null;
  const [profile, setProfile] = useState<Profile>({
      name: controller.state!.account.name,
      avatar: "",
      identity: "职工",
      occupation: "产品 / 运营",
      industry: "白领办公",
      company: "",
      signature: "",
    }),
    [filter, setFilter] = useState("全部"),
    [status, setStatus] = useState("");
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const value = JSON.parse(
          localStorage.getItem(`eureka:profile:${actor}`) || "null",
        );
        if (value) setProfile(value);
      } catch {}
    });
    return () => {
      active = false;
    };
  }, [actor]);
  const entries = [
    ...(w.rewards?.entries || []).map((e) => ({
      id: e.id,
      label: e.label,
      amount: e.amount,
      time: e.time,
    })),
    ...(w.creditOrders || [])
      .filter((o) => o.status === "paid")
      .map((o) => ({
        id: o.id,
        label: "充值 Credits",
        amount: o.credits || 0,
        time: o.created,
      })),
    ...w.credits.logs.map((l) => ({
      id: l.id,
      label: l.task,
      amount: -l.amount,
      time: l.time,
    })),
  ].sort((a, b) => b.time.localeCompare(a.time));
  const visible = entries.filter(
    (e) =>
      filter === "全部" || (filter === "获得" ? e.amount > 0 : e.amount < 0),
  );
  if (tab === "个人信息")
    return (
      <div className="ex-settings-body">
        <form
          className="ex-form"
          onSubmit={(e) => {
            e.preventDefault();
            localStorage.setItem(
              `eureka:profile:${actor}`,
              JSON.stringify(profile),
            );
            controller.change((st) => {
              if (actor === st.account.id) st.account.name = profile.name;
              const personal = st.spaces.find((w) => w.type === "personal");
              if (personal)
                (personal.rewards ||= { entries: [] }).profileComplete = !!(
                  profile.avatar &&
                  profile.name &&
                  profile.occupation
                );
            });
            setStatus("个人信息已保存");
          }}
        >
          <label className="wide">
            <span className="ex-profile-avatar">
              {profile.avatar ? (
                <img src={profile.avatar} alt="头像" />
              ) : (
                profile.name[0]
              )}
            </span>
            上传头像
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!f.type.startsWith("image/") || f.size > 2e6) {
                  setStatus("请选择小于 2 MB 的图片");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () =>
                  setProfile({ ...profile, avatar: String(reader.result) });
                reader.readAsDataURL(f);
              }}
            />
          </label>
          <label>
            我的昵称 *
            <input
              required
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </label>
          <label>
            手机号
            <input disabled value="演示账号未绑定" />
          </label>
          <label>
            邮箱
            <input disabled value={controller.state!.account.email} />
          </label>
          <label>
            社会身份 *
            <select
              value={profile.identity}
              onChange={(e) =>
                setProfile({ ...profile, identity: e.target.value })
              }
            >
              {["职工", "学生", "自由职业者", "其他"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            职业类型 *
            <input
              required
              value={profile.occupation}
              onChange={(e) =>
                setProfile({ ...profile, occupation: e.target.value })
              }
            />
          </label>
          <label>
            所在领域 *
            <select
              value={profile.industry}
              onChange={(e) =>
                setProfile({ ...profile, industry: e.target.value })
              }
            >
              {[
                "白领办公",
                "知识教育",
                "销售管理",
                "法律",
                "金融",
                "媒体",
                "其他",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="wide">
            所属公司
            <input
              value={profile.company}
              onChange={(e) =>
                setProfile({ ...profile, company: e.target.value })
              }
            />
          </label>
          <label className="wide">
            个性签名（{profile.signature.length}/100）
            <textarea
              maxLength={100}
              value={profile.signature}
              onChange={(e) =>
                setProfile({ ...profile, signature: e.target.value })
              }
            />
          </label>
          <footer className="wide ex-footer">
            <button
              type="button"
              className="ex-button"
              onClick={() => location.assign(appUrl("home", "", space, actor))}
            >
              取消
            </button>
            <button className="ex-button primary">保存</button>
          </footer>
        </form>
        {status && <p role="status">{status}</p>}
      </div>
    );
  if (tab === "Credits 明细")
    return (
      <div className="ex-settings-body">
        <div className="ex-summary">
          <span>{w.name} · 当前可用</span>
          <br />
          <strong>{M.creditBalance(w).toLocaleString()}</strong> Credits{" "}
          <button
            className="ex-button"
            style={{ float: "right" }}
            onClick={() => openAccount("recharge")}
          >
            充值
          </button>
        </div>
        <div className="ex-grid">
          {[
            [
              "任务奖励",
              (w.rewards?.entries || []).reduce((n, e) => n + e.amount, 0),
            ],
            [
              "充值到账",
              (w.creditOrders || [])
                .filter((o) => o.status === "paid")
                .reduce((n, o) => n + (o.credits || 0), 0),
            ],
            ["累计消耗", w.credits.used],
          ].map(([label, n]) => (
            <div className="ex-rule" key={label}>
              {label}
              <br />
              <strong>{Number(n).toLocaleString()} Credits</strong>
            </div>
          ))}
        </div>
        <div className="ex-tabs">
          {["全部", "获得", "消费"].map((t) => (
            <button
              role="tab"
              className="ex-button"
              aria-selected={filter === t}
              key={t}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <table className="ex-table">
          <thead>
            <tr>
              <th>明细</th>
              <th>Credits 变动</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => (
              <tr key={e.id}>
                <td>{e.label}</td>
                <td>
                  {e.amount > 0 ? "+" : ""}
                  {e.amount.toLocaleString()}
                </td>
                <td>{e.time.replace("T", " ").slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <p className="ex-muted">暂无此类明细</p>}
      </div>
    );
  if (tab === "录音转写时长")
    return (
      <div className="ex-settings-body">
        <div className="ex-summary">
          <p>当前工作区剩余转写时长</p>
          <strong>
            {!sub
              ? "Unlimited"
              : sub.minutes >= 99999
                ? "不限时长"
                : `${Math.max(0, sub.minutes - (w.transcriptionUsage?.used || 0))} 分钟`}
          </strong>
          <p>
            {w.name} · {sub?.plan || "Team"} ·{" "}
            {sub?.endsAt || w.nextDate || "按月刷新"}
          </p>
          <button
            className="ex-button"
            onClick={() =>
              location.assign(appUrl("subscription", "", space, actor))
            }
          >
            查看订阅
          </button>
        </div>
        <div className="ex-tabs">
          {["全部", "消费", "获得", "过期"].map((t) => (
            <button
              role="tab"
              className="ex-button"
              key={t}
              aria-selected={filter === t}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <table className="ex-table">
          <thead>
            <tr>
              <th>明细</th>
              <th>时长变动</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {(filter === "全部" || filter === "消费") &&
              (w.transcriptionUsage?.logs || []).map((l) => (
                <tr key={l.id}>
                  <td>录音转写</td>
                  <td>−{l.minutes} 分钟</td>
                  <td>{l.time}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="ex-muted">使用任务所属工作区的额度，工作区之间不合并。</p>
      </div>
    );
  return null;
}
