"use client";

import { useId } from "react";
import styles from "./ai-icon.module.css";

type AiIconProps = {
  variant?: "spark" | "upgrade" | "tasks";
  size?: 16 | 20 | 24;
  tone?: "brand" | "inherit";
};

/** Decorative glyphs: the containing control provides the accessible name. */
export function AiIcon({ variant = "spark", size = 20, tone = "brand" }: AiIconProps) {
  const id = useId();
  return <svg className={styles.icon} data-ai-icon={variant} data-tone={tone}
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <defs><linearGradient id={id} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop className={styles.start}/><stop offset="1" className={styles.end}/>
    </linearGradient></defs>
    <g className={styles.core} stroke={tone === "inherit" ? "currentColor" : `url(#${id})`}>
      {variant === "spark" && <>
        <path d="M10 3c1.2 4.6 2.4 5.8 7 7-4.6 1.2-5.8 2.4-7 7-1.2-4.6-2.4-5.8-7-7 4.6-1.2 5.8-2.4 7-7Z"/>
        <path className={styles.facet} d="M10 6v8l-4-4Z" fill={tone === "inherit" ? "currentColor" : `url(#${id})`} stroke="none"/>
        <path className={styles.satellite} d="M19 14v6m-3-3h6M19 3v4m-2-2h4"/>
      </>}
      {variant === "upgrade" && <>
        <path d="m13 3-8 11h6l-1 7 9-12h-6l1-6Z"/>
        <path className={styles.satellite} d="M4 4v3m-1.5-1.5h3M20 17v3"/>
      </>}
      {variant === "tasks" && <>
        <path d="m12 3 9 9-9 9-9-9 9-9Z"/>
        <path d="m8 12 3 3 5-6"/>
        <path className={styles.satellite} d="M19 3v3m-1.5-1.5h3"/>
      </>}
    </g>
  </svg>;
}

/** The same AI motif at illustration scale, without a second business model. */
export function AiRewardArtwork() {
  return <div className={styles.artwork} data-ai-artwork="reward" aria-hidden="true">
    <svg className={styles.orbits} viewBox="0 0 96 96" fill="none" strokeWidth="1.2" focusable="false">
      <circle className={styles.track} cx="48" cy="48" r="42" strokeDasharray="2 6"/>
      <g className={styles.orbit}>
        <path d="M10 48a38 38 0 0 1 59-32M86 48a38 38 0 0 1-59 32"/>
        <circle cx="10" cy="48" r="3"/><circle cx="86" cy="48" r="3"/>
      </g>
      <rect className={styles.tile} x="22" y="22" width="52" height="52" rx="16" transform="rotate(-12 48 48)"/>
      <path className={styles.circuit} d="M23 57h7m36-18h7M39 23v7m18 36v7"/>
    </svg>
    <AiIcon size={24}/>
  </div>;
}
