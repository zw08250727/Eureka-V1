"use client";

import { useState, type Ref } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RefIcon, Symbols } from "@/features/reference/symbols";
import { productLogo } from "@/features/markets/brand";
import { assetUrl } from "@/lib/routes";
import styles from "./guest-home.module.css";

// Public shell only: enterprise authentication owns access to all private actions.
export function EnterpriseGuestHome({ onLogin, loginRef }: { onLogin: () => void; loginRef: Ref<HTMLButtonElement> }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [source, setSource] = useState("all");
  const [time, setTime] = useState("all");
  return <div className={styles.shell} data-enterprise-guest data-collapsed={collapsed} data-nav-open={mobileNav}>
    <Symbols />
    <aside className={styles.sidebar} id="enterprise-guest-navigation" aria-label="企业工作台导航">
      <div className={styles.brandRow}>
        <button className={styles.brand} onClick={onLogin} aria-label="登录后查看">
          <Image src={productLogo("cn")} width={28} height={34} alt="百智" unoptimized />
          <strong className={styles.expanded}>登录后查看</strong>
        </button>
        <button className={styles.collapse} aria-label={collapsed ? "展开导航" : "收起导航"} onClick={() => { setCollapsed(!collapsed); setMobileNav(false); }}><RefIcon name="collapse" /></button>
      </div>
      <nav className={styles.navigation} aria-label="企业主要功能">
        <button aria-current="page" title="首页" onClick={() => setMobileNav(false)}><RefIcon name="home" /><span className={styles.expanded}>首页</span></button>
        <button aria-label="开始录音" title="开始录音" onClick={onLogin}><RefIcon name="mic" /><span className={styles.expanded}>开始录音</span></button>
        <button aria-label="知识库" title="知识库" onClick={onLogin}><RefIcon name="folder" /><span className={styles.expanded}>知识库</span></button>
        <button aria-label="AI 专家·技能·连接器" title="AI 专家·技能·连接器" onClick={onLogin}><RefIcon name="agent" /><span className={styles.expanded}>AI 专家·技能·连接器</span></button>
      </nav>
      <section className={`${styles.history} ${styles.expanded}`} aria-label="历史任务">
        <h2>历史任务</h2>
        <div className={styles.segments} aria-label="任务筛选" role="group">
          <button aria-pressed={!scheduled} onClick={() => setScheduled(false)}>全部</button>
          <button aria-pressed={scheduled} onClick={() => setScheduled(true)}>已定时</button>
        </div>
        <p aria-live="polite">{scheduled ? "暂无定时任务" : "暂无任务"}</p>
      </section>
      <button className={styles.account} aria-label="企业登录" onClick={onLogin}>
        <span className={styles.avatar}><RefIcon name="user" /></span><span className={styles.expanded}>未登录</span>
      </button>
    </aside>
    {mobileNav && <button className={styles.scrim} aria-label="关闭导航" onClick={() => setMobileNav(false)} />}
    <main className={styles.main}>
      <header className={styles.topbar}>
        <button className={styles.mobileToggle} aria-label="打开导航" aria-expanded={mobileNav} aria-controls="enterprise-guest-navigation" onClick={() => { setCollapsed(false); setMobileNav(true); }}><RefIcon name="collapse" /></button>
        <h1>个人AI工作台</h1>
        <div className={styles.topActions}>
          <Button className={styles.hardware} onClick={onLogin}><Image src={assetUrl("hardware-entry.png")} width={18} height={24} alt="" unoptimized /><span>百智录音卡</span><small>随身记录、自动同步</small></Button>
          <Button onClick={onLogin}><RefIcon name="phone" /><span>下载APP</span></Button>
        </div>
      </header>
      <section className={styles.content} aria-label="工作台内容">
        <div className={styles.actions}>
          <Button className={styles.record} onClick={onLogin}><RefIcon name="mic" />开始录音</Button>
          <Button onClick={onLogin}><RefIcon name="agent" />问问小智</Button>
        </div>
        <div className={styles.filters}>
          <Select aria-label="内容来源" value={source} onChange={e => setSource(e.target.value)}><option value="all">全部来源</option><option value="recording">录音</option><option value="upload">上传</option></Select>
          <Select aria-label="内容时间" value={time} onChange={e => setTime(e.target.value)}><option value="all">全部时间</option><option value="week">最近一周</option><option value="month">最近一月</option></Select>
        </div>
        <div className={styles.empty}>
          <RefIcon name="folder" />
          <p>登录后查看工作台内容</p>
          <button ref={loginRef} onClick={onLogin}>企业登录</button>
        </div>
      </section>
    </main>
  </div>;
}
