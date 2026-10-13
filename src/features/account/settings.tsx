"use client";
import { creditText, routeMarket } from "@/features/markets/config";

import { marketStorage } from "@/features/markets/storage";

import { creditSummary, creditGrants } from "@/features/spaces/model/credit-ledger";
import { Select } from "@/components/ui/select";
import { useEffect, useState } from "react";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { M } from "@/features/spaces/model/store";
import { timeBalance } from "@/features/spaces/model/time-packs";
import PS from "@/features/spaces/model/subscription";
import { openAccount } from "./experience";
import { AvatarUpload } from "./avatar-upload";
import { AccountTabs, AccountStatus } from "./ui";
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
    [creditFilter, setCreditFilter] = useState("全部"),
    [timeFilter, setTimeFilter] = useState("全部"),
    [savedProfile, setSavedProfile] = useState<Profile | null>(null),
    [statusError, setStatusError] = useState(false),
    [status, setStatus] = useState("");
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const value = JSON.parse(
          marketStorage.getItem(`eureka:profile:${actor}`) || "null",
        );
        if (value) { setProfile(value); setSavedProfile(value); }
      } catch {}
    });
    return () => {
      active = false;
    };
  }, [actor]);
  const cn = routeMarket() === "cn", summary = creditSummary(w);
  const entries = [
    ...(cn && w.credits.grants ? creditGrants(w).filter(g => g.category === "membership" || (g.category === "gift" && g.id !== "opening")).map(g => ({ id: g.id, label: g.label, amount: g.amount, time: g.time })) : []),
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
        label: creditText("充值 Credits"),
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
      creditFilter === "全部" || (creditFilter === "获得" ? e.amount > 0 : e.amount < 0),
  );
  if (tab === "个人信息")
    return (
      <div className="ex-settings-body">
        <div className="ex-section-intro"><h2>让大家更好地认识你</h2><p>完善头像与基本资料，让协作从认识彼此开始。</p></div>
        <form
          className="ex-form"
          onSubmit={(e) => {
            e.preventDefault();
            const next = { ...profile, name: profile.name.trim(), occupation: profile.occupation.trim() };
            if (!next.name || !next.occupation) { setStatusError(true); setStatus("请填写昵称和职业类型"); return; }
            try {
              const key = `eureka:profile:${actor}`;
              const previous = marketStorage.getItem(key);
              marketStorage.setItem(key, JSON.stringify(next));
              try { controller.change((st) => {
                if (actor === st.account.id) st.account.name = next.name;
                const personal = st.spaces.find((w) => w.type === "personal");
                if (personal) (personal.rewards ||= { entries: [] }).profileComplete = !!(next.avatar && next.name && next.occupation);
              }); } catch (error) {
                if (previous === null) marketStorage.removeItem(key); else marketStorage.setItem(key, previous);
                throw error;
              }
              setProfile(next); setSavedProfile(next); setStatusError(false); setStatus("个人信息已保存");
            } catch { setStatusError(true); setStatus("保存失败，请检查浏览器存储空间后重试。填写的内容已保留。"); }

          }}
        >
          <AvatarUpload value={profile.avatar} name={profile.name} onChange={avatar=>setProfile(current=>({...current,avatar}))} onError={message=>{setStatusError(!!message);setStatus(message)}}/>
          <label>
            我的昵称 *
            <input
              required
              maxLength={50}
              autoComplete="nickname"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </label>
          <label>
            手机号
            <input disabled value="未绑定" />
          </label>
          <label>
            邮箱
            <input disabled value={controller.state!.account.email} />
          </label>
          <label>
            社会身份 *
            <Select
              value={profile.identity}
              onChange={(e) =>
                setProfile({ ...profile, identity: e.target.value })
              }
            >
              {["职工", "学生", "自由职业者", "其他"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
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
            <Select
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
            </Select>
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
          <footer className="wide ex-footer ex-save-bar">
            <span className="ex-muted">{savedProfile && JSON.stringify(savedProfile) === JSON.stringify(profile) ? "所有更改已保存" : "更改后记得保存"}</span>
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
        <AccountStatus message={status} error={statusError}/>
      </div>
    );
  if (tab === creditText("Credits 明细"))
    return (
      <div className="ex-settings-body ex-credit-settings">
        <div className="ex-summary">
          <span>{w.name} · 当前可用</span>
          <br />
          <strong>{M.creditBalance(w).toLocaleString()}</strong>{creditText(" Credits")}{" "}
          <button
            className="ex-button credit-recharge-cta"
            disabled={w.type === "team" && !M.admin(w, actor)}
            style={{ float: "right" }}
            onClick={() => openAccount("recharge")}
          >
            充值
          </button>
        </div>
        <div className="ex-grid">
          {(cn ? [
            ["会员积分", summary.categories.membership],
            ["任务积分", summary.categories.task],
            ["充值积分", summary.categories.recharge],
            ["赠送积分", summary.categories.gift],
            ...(summary.categories.legacy ? [["原有积分余额", summary.categories.legacy]] : []),
          ] : [
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
          ]).map(([label, n]) => (
            <div className="ex-rule" key={label}>
              {label}
              <br />
              <strong>{Number(n).toLocaleString()}{creditText(" Credits")}</strong>
            </div>
          ))}
        </div>
        {cn && <p className="ex-muted">本月将过期积分 {summary.expiring.toLocaleString()} · 已过期 {summary.expired.toLocaleString()} · 累计消耗 {w.credits.used.toLocaleString()}</p>}
        <AccountTabs label={creditText("Credits 筛选")} items={["全部", "获得", "消费"]} value={creditFilter} onChange={setCreditFilter} panelId="credits-history"/>
        <div className="ex-table-scroll" id="credits-history" role="tabpanel" aria-labelledby={`credits-history-tab-${["全部", "获得", "消费"].indexOf(creditFilter)}`} tabIndex={0}>
        <table className="ex-table">
          <thead>
            <tr>
              <th>明细</th>
              <th>{creditText("Credits 变动")}</th>
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
        {!visible.length && <div className="ex-empty">暂无此类明细<span>{creditText("获得或使用 Credits 后，记录会显示在这里。")}</span></div>}
        </div>
      </div>
    );
  if (tab === "录音转写时长") {
    const balance = cn && sub ? timeBalance(w) : null;
    const available = balance ? balance.quota + balance.packs : sub ? Math.max(0, sub.minutes - (w.transcriptionUsage?.used || 0)) : Infinity;
    const additions = cn && ["全部", "获得"].includes(timeFilter) ? (w.timeOrders || []).filter(o => o.status === "paid") : [];
    return (
      <div className="ex-settings-body">
        <div className="ex-summary">
          <p>当前工作区剩余转写时长</p>
          <strong>
            {!sub
              ? w.status === "active" && Boolean(M.member(w, actor)) ? "Unlimited" : "转写权益已暂停"
              : (Number.isFinite(available) ? `${available.toLocaleString()} 分钟` : "无限录音转写时长")}
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
        <AccountTabs label="转写时长筛选" items={["全部", "消费", "获得", "过期"]} value={timeFilter} onChange={setTimeFilter} panelId="transcription-history"/>
        <div className="ex-table-scroll" id="transcription-history" role="tabpanel" aria-labelledby={`transcription-history-tab-${["全部", "消费", "获得", "过期"].indexOf(timeFilter)}`} tabIndex={0}>
        <table className="ex-table">
          <thead>
            <tr>
              <th>明细</th>
              <th>时长变动</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {additions.map(o => <tr key={o.id}><td>{o.minutes} 分钟加时包</td><td>+{o.minutes} 分钟</td><td>{o.paidAt?.slice(0, 10)} · 有效期至 {o.validUntil?.slice(0, 10)}</td></tr>)}
            {(timeFilter === "全部" || timeFilter === "消费") &&
              (w.transcriptionUsage?.logs || []).map((l) => (
                <tr key={l.id}>
                  <td>录音转写</td>
                  <td>−{l.minutes} 分钟</td>
                  <td>{l.time}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {(!["全部", "消费"].includes(timeFilter) || !w.transcriptionUsage?.logs?.length) && !additions.length && <div className="ex-empty">暂无此类记录<span>转写时长的变动将在这里保留。</span></div>}
        </div>
        <p className="ex-muted">使用任务所属工作区的额度，工作区之间不合并。</p>
      </div>
    );
  }
  return null;
}
