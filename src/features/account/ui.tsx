"use client";

import { useId } from "react";
import { AiRewardArtwork } from "@/components/ui/ai-icon";
import { routeMarket } from "@/features/markets/config";

/** Shared tabs use automatic keyboard activation and one associated panel. */
export function AccountTabs({ items, value, onChange, label, panelId, className = "ex-tabs" }: {
  items: string[]; value: string; onChange: (value: string) => void;
  label: string; panelId?: string; className?: string;
}) {
  const id = useId();
  return <nav className={className} role="tablist" aria-label={label}>
    {items.map((item, index) => <button key={item} type="button" role="tab"
      id={`${panelId || id}-tab-${index}`} aria-controls={panelId}
      aria-selected={value === item} tabIndex={value === item ? 0 : -1}
      onClick={() => onChange(item)} onKeyDown={event => {
        const next = event.key === "ArrowRight" ? (index + 1) % items.length
          : event.key === "ArrowLeft" ? (index + items.length - 1) % items.length
          : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault(); onChange(items[next]);
        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
      }}>{item}</button>)}
  </nav>;
}
export function AccountStatus({ message, error = false }: { message: string; error?: boolean }) {
  return message ? <div className={`ex-status ${error ? "is-error" : "is-success"}`} role={error ? "alert" : "status"}>
    <span aria-hidden="true">{error ? "!" : "✓"}</span><span>{message}</span>
  </div> : null;
}
export function CreditsHero({ eyebrow, title, description }: {
  eyebrow: string; title: string; description: string;
}) {
  return <section className="ex-hero">
    <div className="ex-hero-copy"><span className="ex-eyebrow">{eyebrow}</span><h3>{title}</h3><p>{description}</p>
    </div>{routeMarket() === "cn" ? <AiRewardArtwork/> : <div className="ex-credit-art" aria-hidden="true"><span>✦</span><i>+</i><b>✧</b></div>}
  </section>;
}
