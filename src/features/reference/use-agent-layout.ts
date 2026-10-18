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
    let focusHistory = history;
    const align = () => {
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
      if (focusHistory) {
        focusHistory = false;
        element
          .querySelector<HTMLElement>("#agent-history-title")
          ?.focus({ preventScroll: true });
      }
    };
    let frame = requestAnimationFrame(align);
    // At the mobile breakpoint the rail moves below the main content. Keep an
    // already-open conversation visible after resizing, just as when opened.
    const resize = () => {
      fit();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(align);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(topbar);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
    };
  }, [rail, open, history]);
}
