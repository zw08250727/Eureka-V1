"use client";
import { useRef, useState } from "react";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { ConnectorsPage } from "./page";
import { SkillsLandingPage } from "./skills-landing";
import "./connections-page.css";

const tabs = [
  { id: "agents", label: "连接到 AI 助手" },
  { id: "services", label: "接入其他应用" },
] as const;

export function ConnectionsPage({ space, actor, controller }: {
  space: string; actor: string; controller: SpacesController;
}) {
  const [selected, setSelected] = useState<"agents" | "services">("agents");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className="connections-layout">
    <div className="connections-nav" role="tablist" aria-label="AI Connections 分类" aria-orientation="vertical">
      {tabs.map((tab, index) => <button key={tab.id} ref={node => { buttons.current[index] = node; }}
        id={`connections-tab-${tab.id}`} role="tab" type="button"
        aria-selected={selected === tab.id} aria-controls={`connections-panel-${tab.id}`}
        tabIndex={selected === tab.id ? 0 : -1}
        onClick={() => setSelected(tab.id)}
        onKeyDown={event => {
          if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + 1) % tabs.length;
          setSelected(tabs[next].id); buttons.current[next]?.focus();
        }}>
        <strong>{tab.label}</strong>
      </button>)}
    </div>
    <section className="connections-content" role="tabpanel" id={`connections-panel-${selected}`} aria-labelledby={`connections-tab-${selected}`} tabIndex={0}>
      {selected === "agents" ? <SkillsLandingPage actor={actor} /> : <>
        <header className="connections-heading"><h1>连接外部服务</h1><p>将日历、知识库与协作服务连接到 EurekaMind，在当前工作区管理授权。</p></header>
        <ConnectorsPage key={`${space}:${actor}`} space={space} actor={actor} controller={controller} />
      </>}
    </section>
  </div>;
}
