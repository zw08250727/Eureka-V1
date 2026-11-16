"use client";
/* eslint-disable @next/next/no-img-element -- Local prototype capture thumbnails preserve source aspect ratio. */

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { basePath } from "@/lib/routes";
import { RecordingPermission } from "./recording-permission";
import type { MeetingCapture } from "./capture";
import { RecordingSourceGlyph } from "./recording-mode-icon";
import styles from "./recording-launcher.module.css";

// Match radio/tab keyboard navigation while keeping ordinary button activation.
function moveChoice(event: KeyboardEvent<HTMLDivElement>, role: "radio" | "tab") {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
  const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(`button[role="${role}"]`)];
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
  items[next]?.focus(); items[next]?.click();
}

export function RecordingLauncher({ onClose, onStart, skipPermission }: {
  onClose: () => void;
  onStart: (skip: boolean, capture?: MeetingCapture) => void;
  skipPermission: boolean;
}) {
  const [step, setStep] = useState<"mode" | "meeting" | "source" | "permission">("mode");
  const [kind, setKind] = useState<MeetingCapture["kind"]>("meeting-video");
  const [microphone, setMicrophone] = useState(true);
  const [microphoneName, setMicrophoneName] = useState("默认麦克风");
  const [surface, setSurface] = useState<"screen" | "window">("window");
  const [selected, setSelected] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const capture = (): MeetingCapture => ({ kind, microphone, microphoneName, language: "中文（普通话）",
    ...(kind === "meeting-video" ? { surface, surfaceName: selected } : {}) });
  if (step === "permission") return <RecordingPermission onClose={onClose} onStart={skip => onStart(skip)} />;
  const title = step === "mode" ? "选择录制模式" : step === "source" ? "选择要录制的内容" : "录制会议";
  return <ReferenceDialog label={title} onClose={onClose} className={styles.dialog}>
    <header className={styles.header}><div><h2 ref={heading} tabIndex={-1}>{title}</h2><p>{step === "mode" ? "选择适合当前场景的录制方式" : step === "source" ? "只录制你选择的范围，确认后开始录制与转写" : "录制电脑声音，可同时收录麦克风和屏幕画面"}</p></div>
      <button className={styles.iconButton} aria-label="关闭录制设置" onClick={onClose}><Icon name="close" /></button></header>
    <div className={styles.body}>
      {step === "mode" ? <div className={styles.modes}>
        <button className={styles.mode} onClick={() => skipPermission ? onStart(true) : setStep("permission")}><span className={styles.mark}><CaptureIcon video={false} /></span><strong>开始录音</strong><p>录制声音，实时转写并生成 AI 总结</p><span className={styles.link}>开始录音 <span aria-hidden="true">→</span></span></button>
        <button className={styles.mode} onClick={() => setStep("meeting")}><span className={styles.mark}><CaptureIcon video /></span><strong>录制会议</strong><p>录制屏幕和音频，或仅录制会议声音</p><span className={styles.link}>设置会议录制 <span aria-hidden="true">→</span></span></button>
      </div> : step === "meeting" ? <>
        <h3>录制内容</h3><div className={styles.options} role="radiogroup" aria-label="录制内容" onKeyDown={e => moveChoice(e, "radio")}>
          {(["meeting-video", "meeting-audio"] as const).map(value => <button key={value} role="radio" aria-checked={kind === value} className={styles.option} onClick={() => setKind(value)}><CaptureIcon video={value === "meeting-video"} /><span><strong>{value === "meeting-video" ? "屏幕和音频" : "仅音频"}</strong><small>{value === "meeting-video" ? "录制选定的屏幕或应用窗口，并带有音频" : "仅录制声音，不保存屏幕画面"}</small></span><span className={styles.radio} /></button>)}
        </div>
        <p className={styles.note}><Icon name="globe" />{kind === "meeting-video" ? "适用于线上会议、产品演示与屏幕讲解。" : "录制电脑播放的声音，适用于只需保留音频的会议。"}</p>
        <div className={styles.fieldRow}><label htmlFor="capture-microphone">录制麦克风音频</label><button id="capture-microphone" role="switch" aria-checked={microphone} aria-label="录制麦克风音频" className={styles.toggle} onClick={() => setMicrophone(!microphone)}><span /></button></div>
        {microphone ? <label className={styles.field}>选择麦克风<Select aria-label="选择麦克风" value={microphoneName} onChange={e => setMicrophoneName(e.target.value)}><option>默认麦克风</option><option>内置麦克风</option><option>耳机麦克风</option></Select></label> : <p className={styles.note}>仅收录电脑声音，不收录你的麦克风声音。</p>}
      </> : <>
        <div className={styles.tabs} role="tablist" aria-label="录制范围" onKeyDown={e => moveChoice(e, "tab")}>{(["screen", "window"] as const).map(value => <button key={value} role="tab" aria-selected={surface === value} onClick={() => { setSurface(value); setSelected(""); }}>{value === "screen" ? "全屏" : "应用窗口"}</button>)}</div>
        <div className={styles.sources} role="radiogroup" aria-label="可录制的内容" onKeyDown={e => moveChoice(e, "radio")}>{(surface === "screen" ? ["整个屏幕"] : ["会议窗口", "演示文稿", "浏览器窗口"]).map((label, i) => <button key={label} className={styles.source} role="radio" aria-label={label} aria-checked={selected === label} onClick={() => setSelected(label)}><div className={styles.preview}><img src={`${basePath}/assets/meeting-capture/preview.png`} alt={`${label}预览`} />{surface === "window" && i > 0 ? <span>{label}</span> : null}</div><strong><CaptureIcon video />{label}{selected === label && <span aria-hidden="true">✓</span>}</strong></button>)}</div>
        <p className={styles.note}>录制范围：{selected || "请选择一个屏幕或应用窗口"}。{microphone ? "同时收录麦克风和电脑声音。" : "仅收录电脑声音。"}</p>
      </>}
    </div>
    {step !== "mode" && <footer className={styles.footer}><button className={styles.secondary} onClick={() => setStep(step === "source" ? "meeting" : "mode")}>返回</button><button className={styles.primary} disabled={step === "source" && !selected} onClick={() => { if (step === "meeting" && kind === "meeting-video") setStep("source"); else onStart(false, capture()); }}>{step === "meeting" && kind === "meeting-video" ? "选择录制内容" : "开始录制并转写"}</button></footer>}
  </ReferenceDialog>;
}

export function CaptureIcon({ video }: { video: boolean }) {
  return <RecordingSourceGlyph kind={video ? "video" : "audio"} />;
}
