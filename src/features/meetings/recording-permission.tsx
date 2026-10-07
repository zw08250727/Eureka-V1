"use client";
import { useEffect, useRef, useState } from "react";
import { DeleteOverlay } from "./reference-ui";
import { RefIcon as Icon } from "@/features/reference/symbols";
/** The prototype's simulated permissions; this never requests microphone access. */
export function RecordingPermission({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (skip: boolean) => void;
}) {
  const [step, setStep] = useState(0),
    [skip, setSkip] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function authorize() {
    if (step) return;
    setStep(1);
    timers.current = [
      setTimeout(() => setStep(2), 420),
      setTimeout(() => setStep(3), 860),
      setTimeout(() => onStart(skip), 1220),
    ];
  }
  return (
    <DeleteOverlay
      onClose={onClose}
      id="record-permission-modal"
      modalClass="record-permission-modal"
      labelledBy="permission-title"
    >
      <div className="modal-head">
        <span />
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="关闭录音权限说明"
        >
          <Icon name="x" />
        </button>
      </div>
      <div className="modal-body">
        <div className="permission-hero">
          <span className="permission-shield">
            <Icon name="shield" />
          </span>
          <h3 id="permission-title">录音权限说明</h3>
          <p>
            为保证会议与沟通内容完整，本次录音默认同时采集麦克风声音和电脑内部声音。
          </p>
        </div>
        <div className="permission-note">
          <strong>需要授权两项权限：</strong>
          麦克风用于实时转写；系统音频用于捕捉会议软件、视频通话等电脑内部声音。原型仅演示授权流程，不会真正访问设备。
        </div>
        <div className="permission-list">
          {[
            {
              id: "microphone",
              icon: "mic",
              label: "麦克风",
              text: "采集您的声音，用于实时转写与翻译",
              grant: 2,
            },
            {
              id: "system-audio",
              icon: "desktop",
              label: "系统音频",
              text: "捕捉会议软件、视频通话等电脑内部声音",
              grant: 3,
            },
          ].map((x) => (
            <div
              key={x.id}
              className={`permission-item${step >= x.grant ? " granted" : ""}`}
              id={`permission-${x.id}`}
            >
              <span className="permission-item-icon">
                <Icon name={x.icon} />
              </span>
              <span className="permission-item-copy">
                <strong>{x.label}</strong>
                <span>{x.text}</span>
              </span>
              <span className="permission-state">
                {step >= x.grant
                  ? "已授权"
                  : step === x.grant - 1
                    ? "授权中"
                    : "待授权"}
              </span>
            </div>
          ))}
        </div>
        <div className="permission-options">
          <label className="permission-checkbox">
            <input
              type="checkbox"
              id="permission-no-remind"
              checked={skip}
              onChange={(e) => setSkip(e.target.checked)}
            />
            下次不再提醒我
          </label>
          <span className="permission-privacy">
            音频仅用于转写、总结、知识入库及 Agent 智能处理
          </span>
        </div>
      </div>
      <div className="modal-foot">
        <button
          className="secondary-btn"
          id="permission-skip"
          onClick={onClose}
        >
          暂不录音
        </button>
        <button
          className={`primary-btn permission-authorize${step ? " busy" : ""}`}
          id="permission-authorize"
          onClick={authorize}
        >
          {step === 3 ? "授权完成" : step ? "正在授权…" : "开始授权"}
        </button>
      </div>
    </DeleteOverlay>
  );
}
