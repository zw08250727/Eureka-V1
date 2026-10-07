"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

const scenes = [
  {
    label: "个人灵感",
    space: "Personal",
    title: "留住灵感，让想法生长。",
    description: "记录会议、捕捉闪念，让每一次思考都有迹可循。",
    heading: "我的灵感工作台",
    meeting: "一次交流，新的可能",
    detail: "会议记录 · 重点摘要 · 灵感收藏",
    result: "值得继续探索的想法",
    lines: ["整理今天的讨论要点", "把灵感留给下一次创作"],
    nav: ["我的会议", "全部闪念", "日程与待办"],
    icon: "book",
  },
  {
    label: "团队共识",
    space: "Team",
    title: "汇聚交流，让团队同频。",
    description: "在团队空间沉淀会议与共识，让协作从同一份理解开始。",
    heading: "团队协作空间",
    meeting: "产品共创 · 团队讨论",
    detail: "团队会议 · 共享共识 · 持续协作",
    result: "把讨论沉淀为共同理解",
    lines: ["对齐本次讨论的关键结论", "在授权范围内查看会议"],
    nav: ["团队会议", "团队成员", "空间管理"],
    icon: "chat",
  },
  {
    label: "Agent 助力",
    space: "Personal & Team",
    title: "连接知识，让下一步清晰。",
    description: "围绕有权访问的会议提问，让 Agent 帮你梳理线索与下一步。",
    heading: "Ask Agent",
    meeting: "这些讨论，有什么共同线索？",
    detail: "引用会议 · 梳理信息 · 继续追问",
    result: "从交流到清晰的下一步",
    lines: ["结合会议来源整理线索", "带着上下文继续深入思考"],
    nav: ["当前空间", "会议来源", "Ask Agent"],
    icon: "spark",
  },
] as const;

// Keep the timer off for hidden tabs, narrow screens and reduced-motion users.
function canAnimate() {
  return (
    !document.hidden &&
    window.matchMedia(
      "(min-width: 961px) and (prefers-reduced-motion: no-preference)",
    ).matches
  );
}
function subscribeAnimation(callback: () => void) {
  const media = window.matchMedia(
    "(min-width: 961px) and (prefers-reduced-motion: no-preference)",
  );
  media.addEventListener("change", callback);
  document.addEventListener("visibilitychange", callback);
  return () => {
    media.removeEventListener("change", callback);
    document.removeEventListener("visibilitychange", callback);
  };
}

export function AuthShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const motionAllowed = useSyncExternalStore(
    subscribeAnimation,
    canAnimate,
    () => false,
  );
  const playing = motionAllowed && !paused && !hovered && !focused;
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setActive((current) => (current + 1) % scenes.length),
      6000,
    );
    return () => clearInterval(timer);
  }, [playing]);
  const scene = scenes[active];

  return (
    <section
      className="auth-visual"
      aria-label="个人与团队工作空间介绍"
      aria-roledescription="轮播"
      data-playing={playing}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="visual-inner">
        <span className="visual-kicker">
          <i /> 为个人灵感，也为团队共识
        </span>
        <div
          className="showcase-stage"
          id="auth-showcase-scene"
          aria-live={playing ? "off" : "polite"}
          aria-atomic="true"
        >
          <div
            className="showcase-scene"
            key={scene.space}
            role="group"
            aria-roledescription="幻灯片"
            aria-label={`${active + 1} / 3 · ${scene.label}`}
          >
            <div className="workspace-preview">
              <div className="preview-top">
                <span className="preview-app-mark">
                  <Icon name="spark" />
                </span>
                <strong>EurekaMind</strong>
                <span className="preview-space">{scene.space}</span>
              </div>
              <div className="preview-grid">
                <div className="preview-side">
                  <span className="preview-side-caption">工作空间</span>
                  {scene.nav.map((item, index) => (
                    <div
                      key={item}
                      className={`preview-nav ${index === 0 ? "active" : ""}`}
                    >
                      <Icon
                        name={
                          index === 0 ? "home" : index === 1 ? "book" : "task"
                        }
                      />
                      {item}
                    </div>
                  ))}
                  <div className="preview-members" aria-hidden="true">
                    <span>我</span>
                    {active === 1 ? (
                      <>
                        <span>林</span>
                        <span>陈</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="preview-main">
                  <div className="preview-heading">
                    {scene.heading}
                    <span>场景示意</span>
                  </div>
                  <div className="preview-card">
                    <div className="preview-recording">
                      <Icon name={scene.icon} />
                      <strong>{scene.meeting}</strong>
                    </div>
                    <span>{scene.detail}</span>
                    <div className="preview-wave" aria-hidden="true">
                      {Array.from({ length: 28 }, (_, index) => (
                        <i
                          key={index}
                          style={{
                            height: `${10 + ((index * 13) % 29)}px`,
                            animationDelay: `${index * -0.09}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="preview-summary">
                    <span className="summary-icon">
                      <Icon name="spark" />
                    </span>
                    <div>
                      <strong>{scene.result}</strong>
                      {scene.lines.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="preview-floating">
              <Icon name={scene.icon} />
              <div>
                <strong>
                  {active === 0
                    ? "灵感，随时留存"
                    : active === 1
                      ? "让共识，有处可寻"
                      : "带着上下文，继续探索"}
                </strong>
                <span>
                  {active === 0
                    ? "属于你的 Personal 空间"
                    : active === 1
                      ? "属于你们的 Team 空间"
                      : "你的个人与团队 AI 助手"}
                </span>
              </div>
            </div>
            <div className="showcase-copy">
              <h2>{scene.title}</h2>
              <p>{scene.description}</p>
            </div>
          </div>
        </div>
        <div
          className="showcase-controls"
          role="group"
          aria-label="展示场景控制"
        >
          {scenes.map((item, index) => (
            <Button
              key={item.space}
              className="showcase-step"
              aria-label={`查看${item.label}`}
              aria-pressed={active === index}
              aria-controls="auth-showcase-scene"
              onClick={() => {
                setActive(index);
                setPaused(true);
              }}
            >
              <span />
              {item.label}
            </Button>
          ))}
          <Button
            className="showcase-pause"
            aria-label={paused ? "播放场景轮播" : "暂停场景轮播"}
            aria-pressed={paused}
            disabled={!motionAllowed}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "播放" : "暂停"}
          </Button>
        </div>
      </div>
      <p className="visual-footer">一个 EurekaMind 账号 · 个人与团队工作空间</p>
    </section>
  );
}
