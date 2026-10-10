"use client";
import { useEffect, useRef, useState } from "react";
import { usePersonal } from "./use-personal";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { M } from "@/features/spaces/model/store";
import PS from "@/features/spaces/model/subscription";
import { RefIcon } from "@/features/reference/symbols";
import { appUrl } from "@/lib/routes";
import { AccountSettings } from "@/features/account/settings";
import { SettingsLogoutDialog } from "./settings-dialog";

export function SettingsPage({
  controller,
  space,
  actor,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
}) {
  const { data, error, repo, refresh } = usePersonal(actor,space);
  const [tab,setTab]=useState(()=>typeof window!=="undefined"&&new URLSearchParams(location.search).get("id")==="credits"?"Credits 明细":"个人信息");
  const [toast, setToast] = useState("");
  const [logout, setLogout] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [legacy, setLegacy] = useState<Record<string, string>>({});
  useEffect(() => {
    const values: Record<string, string> = {};
    try {
      for (const key of ["asr", "notes"]) {
        const value = localStorage.getItem(`eurekamind:settings:${key}`);
        if (value !== null) values[key] = value;
      }
    } catch {
      /* Preferences still work when legacy browser storage cannot be read. */
    }
    Promise.resolve().then(() => setLegacy(values));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  function notify(message: string) {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2500);
  }
  function update(patch: Record<string, unknown>, message = "偏好已保存") {
    try {
      repo.current!.actions.change((s) => Object.assign(s.settings, patch));
      refresh();
      notify(message);
    } catch (cause) {
      notify((cause as Error).message);
    }
  }
  if (!data || !controller.state)
    return (
      <section
        id="personal-settings"
        data-main-view="personal-settings"
        className="main-inner pa-settings"
      >
        <p role={error ? "alert" : "status"}>{error || "正在读取设置…"}</p>
      </section>
    );
  const w = M.get(controller.state, space);
  const member = M.member(w, actor);
  const preferences = data.actions.settings;
  const sub = w.type === "personal" ? PS.current(w) : null;
  const active = w.type === "team" && w.status === "active" && Boolean(member);
  const summary = preferences.autoSummary !== false;
  return (
    <section
      id="personal-settings"
      data-main-view="personal-settings"
      className="main-inner pa-settings"
      aria-hidden="false"
    >
      <div className="settings-float">
        <header className="settings-float-toolbar">
          <div className="settings-float-toolbar-copy">
            <strong>个人设置</strong>
            <span>账户、语言与录音偏好</span>
          </div>
          <button
            className="settings-popover-close"
            type="button"
            data-settings-close
            aria-label="返回当前空间首页"
            onClick={() => location.assign(appUrl("home", "", space, actor))}
          >
            <RefIcon name="x" />
          </button>
        </header>
        <nav className="ex-settings-tabs" role="tablist">{["个人信息","Credits 明细","录音设置","录音转写时长"].map(t=><button role="tab" aria-selected={tab===t} key={t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
        <AccountSettings {...{controller,space,actor,tab}}/>
        <div hidden={tab!=="录音设置"}>
        <section className="settings-float-section">
          <div className="settings-float-head">
            <h4>账户</h4>
            <p>账号与套餐信息</p>
          </div>
          <div className="settings-profile">
            <span className="settings-avatar">Z</span>
            <span>
              <strong>{controller.state.account.email}</strong>
              <small>
                {sub
                  ? `${sub.plan} · ${w.name}`
                  : `Team Unlimited · ${w.name} · ${member && member.role === "admin" ? "管理员" : "成员"}`}
              </small>
            </span>
            <button
              className="settings-logout"
              type="button"
              data-settings-action="logout"
              onClick={() => setLogout(true)}
            >
              退出登录
            </button>
          </div>
          <div className="settings-usage">
            {sub ? (
              <>
                <div className="settings-usage-top">
                  <strong>每月转写时长</strong>
                  <b>{sub.minutes.toLocaleString()} 分钟</b>
                </div>
                <div className="settings-usage-meta">
                  <span>{`已使用 ${w.transcriptionUsage?.used || 0} 分钟`}</span>
                  <span>剩余 {Math.max(0, sub.minutes - (w.transcriptionUsage?.used || 0)).toLocaleString()} 分钟</span>
                </div>
              </>
            ) : (
              <>
                <div className="settings-usage-top">
                  <strong>工作区转写权益</strong>
                  <b>{active ? "Unlimited · 不限时长" : "转写权益已暂停"}</b>
                </div>
                <div className="settings-usage-meta">
                  <span>
                    {active
                      ? `随团队订阅统一到期 · ${w.cycle === "year" ? "年付" : "月付"}`
                      : w.status !== "active"
                        ? "团队订阅已到期"
                        : "当前账号未分配有效席位"}
                  </span>
                  <span>{w.nextDate ? `当前周期截止：${w.nextDate}` : ""}</span>
                </div>
              </>
            )}
          </div>
        </section>
        <section className="settings-float-section">
          <div className="settings-float-head">
            <h4>AI 摘要语言</h4>
            <p>设置语音识别与摘要输出语言</p>
          </div>
          <div className="settings-float-row">
            <div className="settings-row-copy">
              <strong>语音识别</strong>
              <span>默认语音识别语言</span>
            </div>
            <div className="settings-language-control">
              <span className="settings-language-count">18</span>
              <select
                className="settings-language-select"
                data-settings-language="asr"
                aria-label="语音识别"
                value={String(preferences.asr ?? legacy.asr ?? "en")}
                onChange={(e) => update({ asr: e.target.value })}
              >
                <option value="en">英语</option>
                <option value="zh-Hans">简体中文</option>
                <option value="zh-Hant">繁体中文</option>
              </select>
            </div>
          </div>
          <div className="settings-float-row">
            <div className="settings-row-copy">
              <strong>纪要与翻译</strong>
              <span>纪要输出与翻译目标语言</span>
            </div>
            <div className="settings-language-control">
              <span className="settings-language-count">156</span>
              <select
                className="settings-language-select"
                data-settings-language="notes"
                aria-label="纪要与翻译"
                value={String(preferences.notes ?? legacy.notes ?? "detected")}
                onChange={(e) => update({ notes: e.target.value })}
              >
                <option value="detected">检测语言</option>
                <option value="en">英语</option>
                <option value="zh-Hans">简体中文</option>
              </select>
            </div>
          </div>
        </section>
        <section className="settings-float-section">
          <div className="settings-float-head">
            <h4>自动摘要</h4>
            <p>录音与上传文件的默认摘要设置</p>
          </div>
          <div className="settings-float-row">
            <div className="settings-row-copy">
              <strong>自动生成摘要</strong>
              <span data-settings-summary-hint>
                开启后自动生成录音与上传文件的摘要
              </span>
              <span
                className="settings-summary-chip"
                data-settings-summary-copy
              >
                {summary ? "已开启自动摘要" : "已关闭自动摘要"}
              </span>
            </div>
            <div className="settings-language-control">
              <button
                className="settings-switch"
                type="button"
                role="switch"
                aria-checked={summary}
                aria-label="自动生成摘要"
                data-settings-action="toggle-summary"
                onClick={() =>
                  update(
                    { autoSummary: !summary },
                    summary ? "自动摘要已关闭" : "自动摘要已开启",
                  )
                }
              >
                <i />
              </button>
            </div>
          </div>
        </section>
        <section className="settings-float-section">
          <div className="settings-float-head">
            <h4>通用设置</h4>
            <p>查看服务条款与隐私政策</p>
          </div>
          <div className="settings-float-row">
            <div className="settings-row-copy">
              <strong>服务条款</strong>
              <span>EurekaMind 账户服务条款</span>
            </div>
            <a
              className="settings-link"
              href="https://docs.google.com/document/d/1vvfqgZQDRrdP6dsCJcZFnVmJzjCiojQPqEkJ1gpDXn8/edit?usp=sharing"
              target="_blank"
              rel="noreferrer"
            >
              查看
            </a>
          </div>
          <div className="settings-float-row">
            <div className="settings-row-copy">
              <strong>隐私政策</strong>
              <span>EurekaMind 如何处理用户数据</span>
            </div>
            <a
              className="settings-link"
              href="https://docs.google.com/document/d/19zLgiDFfT-ZbY5CSBKqVq6R2zZXUCmNke-k_96XjlKo/edit?usp=sharing"
              target="_blank"
              rel="noreferrer"
            >
              查看
            </a>
          </div>
        </section>
        <section className="settings-float-section"><div className="settings-float-row"><div className="settings-row-copy"><strong>获取地理位置</strong><span>为新录音附上位置信息</span></div><button className="settings-switch" role="switch" aria-label="获取地理位置" aria-checked={!!preferences.location} onClick={()=>update({location:!preferences.location})}><i/></button></div><div className="settings-float-row"><div className="settings-row-copy"><strong>声纹识别</strong><span>在 App 录入声纹后，用于识别录音中的发言人。</span></div><button className="settings-switch" role="switch" aria-label="声纹识别" aria-checked={!!preferences.voiceprint} onClick={()=>update({voiceprint:!preferences.voiceprint})}><i/></button></div><div className="settings-float-row"><div className="settings-row-copy"><strong>行业术语</strong><span>请在 App 内维护行业术语，提升识别准确率。</span></div></div><button className="ex-button" onClick={()=>window.dispatchEvent(new CustomEvent("eureka:templates"))}>总结模板、语言及详细程度</button></section>
        </div>
      </div>
      {toast ? (
        <div id="toast" className="toast show" role="status">
          {toast}
        </div>
      ) : null}
      {logout ? (
        <SettingsLogoutDialog onClose={() => setLogout(false)} />
      ) : null}
    </section>
  );
}
