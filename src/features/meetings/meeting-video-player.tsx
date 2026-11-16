"use client";

import type { RefCallback, VideoHTMLAttributes } from "react";
import { MediaSkipIcon } from "./media-skip-icon";
import { Select } from "@/components/ui/select";
import { basePath } from "@/lib/routes";
import styles from "./meeting-video-player.module.css";

export function MeetingVideoPlayer({ mediaRef, events, available, error, speed, onSpeedChange, onSeek, onRetry }: {
  mediaRef: RefCallback<HTMLVideoElement>;
  events: VideoHTMLAttributes<HTMLVideoElement>;
  available: boolean;
  error: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onSeek: (delta: number) => void;
  onRetry: () => void;
}) {
  return <section className={styles.player} aria-label="会议视频回放">
    <video ref={mediaRef} className={styles.video} controls playsInline preload="metadata" poster={`${basePath}/assets/meeting-capture/preview.png`} aria-label="录制的会议视频" {...events} />
    {(!available || error) && <p className={styles.error} role="status">{available ? "视频加载失败，请重试" : "暂无可播放的视频"}{available && <button onClick={onRetry}>重新加载</button>}</p>}
    <div className={styles.tools}><span>会议视频</span><button disabled={!available || error} onClick={() => onSeek(-15)} aria-label="视频后退15秒"><MediaSkipIcon /></button><button disabled={!available || error} onClick={() => onSeek(15)} aria-label="视频前进15秒"><MediaSkipIcon forward /></button><Select aria-label="视频播放速度" value={speed} onChange={e => onSpeedChange(Number(e.target.value))}>{[.5, 1, 1.25, 1.5, 2].map(n => <option key={n} value={n}>{n}x</option>)}</Select></div>
  </section>;
}
