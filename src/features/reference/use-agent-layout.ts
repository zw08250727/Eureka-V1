/* eslint-disable react-hooks/immutability -- Imperative DOM-ref geometry mirrors the prototype; no React state or props are mutated. */
"use client";
import { useLayoutEffect, type RefObject } from "react";
/** The prototype positions its composer below the sticky top bar, including mobile. */
export function useAgentLayout(
  rail: RefObject<HTMLElement | null>,
  open: boolean,
  history = false,
) {
  useLayoutEffect(() => {
    const element = rail.current,
      topbar = document.querySelector(".topbar");
    if (!element || !topbar) return;
    const fit = () => {
      const top = topbar.getBoundingClientRect().height + 12;
      element.style.setProperty("--agent-top", `${top}px`);
      element.style.scrollMarginTop = `${top + (history ? 4 : 0)}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(topbar);
    const frame = requestAnimationFrame(() => {
      if (open && history) {
        const main = element.closest<HTMLElement>(".main");
        const translateY = new DOMMatrixReadOnly(
          getComputedStyle(element).transform,
        ).m42;
        if (main)
          main.scrollTop +=
            element.getBoundingClientRect().top -
            translateY -
            parseFloat(element.style.scrollMarginTop);
      } else if (open)
        element.scrollIntoView({ block: "nearest", behavior: "instant" });
      if (history)
        element
          .querySelector<HTMLElement>("#agent-history-title")
          ?.focus({ preventScroll: true });
    });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [rail, open, history]);
}
