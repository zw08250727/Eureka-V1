"use client";
/* eslint-disable @next/next/no-img-element -- Agent brand assets retain their original proportions. */

import { useEffect, useState } from "react";
import { basePath } from "@/lib/routes";
import { marketStorage } from "@/features/markets/storage";
import "./skills-landing.css";

const command = "npx --yes skills@1.7.2 add hunterleememo-spec/EurekaMind-skill -g -y";
const agents = [
  { name: "Codex", logo: "openai.svg" },
  { name: "Claude Code", logo: "claude.svg" },
  { name: "Muse", logo: "muse.jpg" },
  { name: "Grok", logo: "grok.svg" },
];
const features = [
  { icon: "◉", title: "Recordings", description: "Find your recordings, original audio, and recording details." },
  { icon: "▤", title: "Notes", description: "Review notes, meeting summaries, and action items." },
  { icon: "≡", title: "Transcripts", description: "Read transcripts with speakers and timestamps." },
  { icon: "✦", title: "Eureka", description: "Search and read the ideas you’ve saved in Eureka." },
  { icon: "♧", title: "Reminders", description: "Read your reminders and review upcoming tasks and follow-ups." },
  { icon: "▧", title: "Other Assets", description: "Access images, attachments, and other files linked to your content." },
];

export function SkillsLandingPage({ actor }: { actor: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const [keyCopyState, setKeyCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const [demoKey, setDemoKey] = useState("");
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      const storageKey = `eureka:agent-demo-key:v1:${actor}`;
      const saved = marketStorage.getItem(storageKey);
      if (saved) { setDemoKey(saved); return; }
      const created = `demo_${crypto.randomUUID().replaceAll("-", "")}`;
      marketStorage.setItem(storageKey, created);
      setDemoKey(created);
    });
    return () => { active = false; };
  }, [actor]);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopyState("copied");
    } catch {
      setCopyState("manual");
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(demoKey);
      setKeyCopyState("copied");
    } catch {
      setKeyCopyState("manual");
    }
  }

  function resetKey() {
    const created = `demo_${crypto.randomUUID().replaceAll("-", "")}`;
    marketStorage.setItem(`eureka:agent-demo-key:v1:${actor}`, created);
    setDemoKey(created);
    setKeyCopyState("idle");
  }

  return <div className="skills-landing">
    <section className="skills-hero">
      <div className="skills-inner">
        <h1>Connect EurekaMind<br />to your <span>personal AI agents</span></h1>
        <p className="skills-intro">Let Codex, Claude Code, Muse, Grok bot, and other AI agents securely search and read the knowledge saved in your EurekaMind account.</p>
        <p className="skills-label">WORKS WITH YOUR FAVORITE AGENTS</p>
        <div className="skills-agents" aria-label="Supported AI agents">
          {agents.map(agent => <span className="skills-agent" key={agent.name} aria-label={agent.name}>
            <img src={`${basePath}/agent-logos/${agent.logo}`} alt={agent.name === "Grok" ? "Grok" : ""} aria-hidden={agent.name !== "Grok"} />
            {agent.name !== "Grok" && <span>{agent.name}</span>}
          </span>)}
        </div>
        <a className="skills-primary skills-hero-action" href="#skills-setup">Quick setup</a>
        <div className="skills-features">
          {features.map(feature => <article key={feature.title}>
            <span className="skills-feature-icon" aria-hidden="true">{feature.icon}</span>
            <div><h2>{feature.title}</h2><p>{feature.description}</p></div>
          </article>)}
        </div>
      </div>
    </section>

    <section id="skills-setup" className="skills-setup skills-inner">
      <h2>Quick setup</h2>
      <p className="skills-setup-intro">Install the Skill to access your personal EurekaMind data with an API Key.</p>
      <div className="skills-steps">
        <article className="skills-step">
          <span className="skills-number">1</span>
          <h3>Copy the Skill installation command</h3>
          <p>Send the following to your AI assistant to install the Skill automatically.</p>
          <code className="skills-command" tabIndex={0}>{command}</code>
          <button type="button" className="skills-primary" onClick={copyCommand}>{copyState === "copied" ? "Copied" : "Copy command"}</button>
          {copyState === "manual" && <p role="status">Select the command above and copy it manually.</p>}
        </article>
        <article className="skills-step">
          <span className="skills-number">2</span>
          <h3>Get your API Key</h3>
          <p>Your API Key connects to your EurekaMind account. Only you can view your data.</p>
          <div className="skills-key-note" aria-label="Demo API Key"><code>{demoKey || "Loading demo key…"}</code></div>
          <div className="skills-key-actions">
            <button type="button" className="skills-primary" disabled={!demoKey} onClick={copyKey}>{keyCopyState === "copied" ? "Copied" : "Copy Key"}</button>
            <button type="button" className="skills-secondary" disabled={!demoKey} onClick={resetKey}>Reset</button>
          </div>
          {keyCopyState === "manual" && <p role="status">Select the demo Key above and copy it manually.</p>}
          <small>Demo Key for this prototype only · Not valid for live agents</small>
        </article>
      </div>
      <div className="skills-ask"><span className="skills-number">3</span><div>
        <h3>Ask your agent</h3>
        <p>“Find my notes about product direction and summarize the decisions.”</p>
        <p>“Read this quick idea and help me explore related thoughts.”</p>
        <small>Save the Key when your assistant asks for it. Keep it out of chat. You can reset or revoke access at any time.</small>
      </div></div>
    </section>
  </div>;
}
