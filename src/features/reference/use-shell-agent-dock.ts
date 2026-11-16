"use client";

import { useLayoutEffect, type RefObject } from "react";

const rails = "#xiaozhi-rail, #pa-agent, #contacts-xiaozhi-rail, .ws-agent, #recording-assistant-panel";

/** Adapt the existing scene-owned panels to the shared shell without moving
 * their React trees, conversation state, or resize controls. */
export function useShellAgentDock(mainRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    let active: HTMLElement | undefined;
    let frame = 0;
    const measure = () => {
      if (!active) return;
      main.style.setProperty("--shell-agent-width", `${active.getBoundingClientRect().width}px`);
    };
    const size = new ResizeObserver(measure);
    const sync = () => {
      const next = Array.from(main.querySelectorAll<HTMLElement>(rails)).find(
        rail => !rail.closest('[hidden], [aria-hidden="true"]') &&
          getComputedStyle(rail).display !== "none" &&
          getComputedStyle(rail).visibility !== "hidden",
      );
      if (next !== active) {
        if (active) {
          size.unobserve(active);
          delete active.dataset.shellAgent;
        }
        active = next;
        if (active) {
          active.dataset.shellAgent = "true";
          size.observe(active);
        }
      }
      if (active) main.dataset.agentDocked = "true";
      else {
        delete main.dataset.agentDocked;
        main.style.removeProperty("--shell-agent-width");
      }
      measure();
    };
    // Only structure and visibility changes matter; streamed text and pointer
    // movement do not trigger a shell render or a subtree-wide style observer.
    const changes = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    });
    changes.observe(main, { subtree: true, childList: true, attributes: true,
      attributeFilter: ["class", "hidden", "aria-hidden"] });
    sync();
    return () => {
      cancelAnimationFrame(frame);
      changes.disconnect();
      size.disconnect();
      if (active) delete active.dataset.shellAgent;
      delete main.dataset.agentDocked;
      main.style.removeProperty("--shell-agent-width");
    };
  }, [mainRef]);
}
