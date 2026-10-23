"use client";
/* eslint-disable @next/next/no-img-element -- Display original device assets and deterministic QR codes. */
import { RefIcon } from "@/features/reference/symbols";
import { marketConfig } from "@/features/markets/config";
import { RefDialog } from "./calendar-dialogs";
import { thoughtGuide } from "./thought-guide";
import styles from "./thought-device-guide.module.css";

export function ThoughtDeviceGuide({ onClose }: { onClose: () => void }) {
  const market = marketConfig().id as "cn" | "global";
  const guide = thoughtGuide(market);
  return <RefDialog id="ws-dialog" className={`ws-dialog ${styles.dialog}`} label="绑定设备，开始记录闪念" onClose={onClose}>
    <header className={styles.header}>
      <div><h2>绑定设备，开始记录闪念</h2><p>{guide.brand} · 随手捕获，随时回顾</p></div>
      <button type="button" className="ws-btn ws-icon-button" data-ws-action="close-dialog" aria-label="关闭" onClick={onClose}><RefIcon name="x" /></button>
    </header>
    <div className={styles.content}>
      <div className={styles.cards}>
        <section className={styles.card}>
          <h3>已经有设备？</h3>
          <p>下载 {guide.brand} App，登录后绑定设备。</p>
          <div className={styles.art}><img className={styles.qr} src={guide.qr} alt={`扫码下载 ${guide.brand} App`} width={184} height={184} data-qr-url={guide.download} /></div>
          <a className="ws-btn" href={guide.download} target="_blank" rel="noopener noreferrer"><RefIcon name="phone" />下载 App<RefIcon name="expand" /></a>
          <small>iOS / Android · 手机扫码下载</small>
        </section>
        <section className={styles.card}>
          <h3>还没有设备？</h3>
          <p>了解 {guide.brand} 录音设备，记录每个重要想法。</p>
          <div className={styles.art}><img className={styles.device} src={guide.device} alt={`${guide.brand} 录音设备`} width={280} height={184} /></div>
          <a className="ws-btn primary" href={guide.shop} target="_blank" rel="noopener noreferrer">购买设备<RefIcon name="expand" /></a>
          <small>前往 {guide.brand} 官方网站</small>
        </section>
      </div>
      <p className={styles.note}>在 App 中登录同一账号，选择「个人工作空间」完成设备绑定。录音将同步到设备所属的工作空间。</p>
    </div>
  </RefDialog>;
}
