"use client";

import { useRef, useState } from "react";
import { captureAudioSource } from "./capture-audio-source";
import styles from "./capture-audio.module.css";

export function CaptureAudio({ record }: { record: { id: string; title: string; source?: string; captureAudioUrl?: string; deleted?: boolean } }) {
  const source = captureAudioSource(record);
  const audio = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);
  if (!source) return <p className={styles.hint}>暂无可用的原始录音</p>;
  return <div className={styles.player}>
    <audio ref={audio} controls preload="metadata" src={source} aria-label="原始捕获音频" onError={() => setFailed(true)} />
    {failed && <p role="alert" className={styles.hint}>原始录音加载失败，请重新打开详情后重试。</p>}
  </div>;
}
