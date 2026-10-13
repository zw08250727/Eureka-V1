"use client";

import { useId } from "react";
import { Select } from "@/components/ui/select";
import { MdButton as B, MdIcon as I } from "./reference-ui";
import type { MeetingDetail } from "./types";
import "./domestic-audio-player.css";

export type DomesticAudioStatus = "loading" | "ready" | "buffering" | "error";

export interface DomesticAudioPlayerProps {
  /** All times are seconds, matching HTMLMediaElement.currentTime. */
  time: number;
  duration: number;
  speed: number;
  playing: boolean;
  marks?: MeetingDetail["marks"];
  status?: DomesticAudioStatus;
  /** End of the buffered range containing the playhead, in seconds. */
  buffered?: number;
  error?: string;
  disabled?: boolean;
  onTogglePlay: () => void;
  /** Timeline / +/-15s pass false; mark clicks pass true. */
  onSeek: (seconds: number, autoplay: boolean) => void;
  onSpeedChange: (speed: number) => void;
  onRetry?: () => void;
}

export function formatDomesticAudioTime(seconds: number) {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainder = whole % 60;
  return [...(hours ? [hours] : []), minutes, remainder]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function DomesticAudioPlayer({
  time,
  duration,
  speed,
  playing,
  marks = [],
  status = "ready",
  buffered = 0,
  error = "",
  disabled = false,
  onTogglePlay,
  onSeek,
  onSpeedChange,
  onRetry,
}: DomesticAudioPlayerProps) {
  const messageId = useId();
  const total = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const elapsed = Number.isFinite(time)
    ? Math.max(0, Math.min(time, total))
    : 0;
  const failed = status === "error" || Boolean(error);
  const loading = !failed && (status === "loading" || !total);
  const buffering = !failed && !loading && status === "buffering";
  const unavailable = disabled || failed || loading;
  // A buffering player must still be pausable; disable only a new play attempt.
  const playDisabled = unavailable || (buffering && !playing);
  const progress = total ? (elapsed / total) * 100 : 0;
  const cached =
    total && Number.isFinite(buffered)
      ? Math.max(progress, Math.min(100, (buffered / total) * 100))
      : progress;
  const validMarks = [...new Set(marks)]
    .filter(
      (second) =>
        Number.isFinite(second) && second >= 0 && second <= total && total > 0,
    )
    .sort((a, b) => a - b);
  const message = failed
    ? error || "音频加载失败，暂无法播放"
    : loading
      ? "音频加载中..."
      : buffering
        ? "音频缓冲中..."
        : "";

  function seek(seconds: number, autoplay = false) {
    if (!unavailable) onSeek(Math.max(0, Math.min(seconds, total)), autoplay);
  }

  return (
    <div
      className={`md-player cn-audio-player${failed ? " is-error" : ""}`}
      role="region"
      aria-label="录音播放器"
      aria-describedby={message ? messageId : undefined}
      tabIndex={0}
      onKeyDown={(event) => {
        // Scope shortcuts to the focused player, never to editors or page content.
        if (
          event.target !== event.currentTarget ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        if (event.key === " ") {
          event.preventDefault();
          if (!playDisabled) onTogglePlay();
        } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          seek(elapsed + (event.key === "ArrowLeft" ? -15 : 15));
        }
      }}
    >
      <B
        action="play"
        className="md-play"
        disabled={playDisabled}
        aria-label={`${playing ? "暂停" : "播放"}录音`}
        title={message || (playing ? "暂停" : "播放")}
        onClick={onTogglePlay}
      >
        {(loading || buffering) && !playing ? (
          <span className="cn-audio-spinner" aria-hidden="true" />
        ) : (
          <I name={playing ? "pause" : "play"} />
        )}
      </B>
      <B
        action="rewind"
        className="md-icon-btn cn-audio-skip"
        disabled={unavailable || elapsed <= 0}
        aria-label="后退15秒"
        title="后退15秒"
        onClick={() => seek(elapsed - 15)}
      >
        ↶15
      </B>
      <div className="cn-audio-timeline">
        <div className="cn-audio-track" aria-hidden="true">
          <span className="cn-audio-buffered" style={{ width: `${cached}%` }} />
          <span
            className="cn-audio-progress"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          id="md-seek"
          className="cn-audio-range"
          type="range"
          min={0}
          max={total || 1}
          step={0.1}
          value={elapsed}
          disabled={unavailable}
          aria-label="录音播放进度"
          aria-valuetext={`${formatDomesticAudioTime(elapsed)}，共 ${formatDomesticAudioTime(total)}`}
          title={`${formatDomesticAudioTime(elapsed)} / ${formatDomesticAudioTime(total)}`}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <div className="cn-audio-marks" aria-label="重点标记">
          {validMarks.map((second) => {
            const percent = (second / total) * 100;
            return (
              <button
                type="button"
                key={second}
                className={`cn-audio-mark${percent <= 18 ? " is-near-start" : percent >= 78 ? " is-near-end" : ""}`}
                style={{ left: `${percent}%` }}
                disabled={unavailable}
                aria-label={`播放重点标记 ${formatDomesticAudioTime(second)}`}
                onClick={() => seek(second, true)}
              >
                <span className="cn-audio-mark-dot" aria-hidden="true" />
                <span className="cn-audio-mark-tip" aria-hidden="true">
                  {formatDomesticAudioTime(second)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <B
        action="forward"
        className="md-icon-btn cn-audio-skip"
        disabled={unavailable || elapsed >= total}
        aria-label="前进15秒"
        title="快进15秒"
        onClick={() => seek(elapsed + 15)}
      >
        15↷
      </B>
      <span className="cn-audio-times">
      <time id="md-elapsed" className="cn-audio-time">
        {formatDomesticAudioTime(elapsed)}
      </time>
        <span aria-hidden="true"> / </span>
      <time id="md-duration" className="cn-audio-time">
        {formatDomesticAudioTime(total)}
      </time>
      </span>
      <Select
        id="md-speed"
        aria-label="播放倍速"
        value={rates.includes(speed) ? speed : 1}
        disabled={unavailable}
        onChange={(event) => onSpeedChange(Number(event.target.value))}
      >
        {rates.map((rate) => (
          <option value={rate} key={rate}>
            {rate}x
          </option>
        ))}
      </Select>
      {message && (
        <div
          id={messageId}
          className="cn-audio-status"
          role={failed ? "alert" : "status"}
        >
          {(loading || buffering) && (
            <span className="cn-audio-spinner" aria-hidden="true" />
          )}
          <span>{message}</span>
          {failed && onRetry && (
            <button
              type="button"
              disabled={disabled}
              className="cn-audio-retry"
              onClick={onRetry}
            >
              重试
            </button>
          )}
        </div>
      )}
    </div>
  );
}
