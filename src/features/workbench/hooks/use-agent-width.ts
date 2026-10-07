"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
const KEY = "eureka:agent-panel-width:v1";
export function useAgentWidth(host: RefObject<HTMLDivElement | null>) {
  const [preferred, setPreferred] = useState(390),
    [max, setMax] = useState(760);
  const drag = useRef<{ x: number; width: number } | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let initial = true;
    const observer = new ResizeObserver(() => {
      const available = el.getBoundingClientRect().width;
      setMax(
        Math.max(1, Math.min(760, available - (innerWidth > 760 ? 320 : 0))),
      );
      if (initial) {
        initial = false;
        try {
          setPreferred(Number(localStorage.getItem(KEY)) || 390);
        } catch {
          /* Window sizing remains available without persistence. */
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [host]);
  const min = Math.min(300, max),
    width = Math.min(max, Math.max(min, preferred));
  const save = (value: number) => {
    const next = Math.min(max, Math.max(min, value));
    setPreferred(next);
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      /* Preference only: keep session sizing. */
    }
  };
  return {
    width,
    min,
    max,
    save,
    startDrag: (x: number) => {
      drag.current = { x, width };
    },
    moveDrag: (x: number) => {
      if (drag.current)
        setPreferred(
          Math.max(min, Math.min(max, drag.current.width + drag.current.x - x)),
        );
    },
    endDrag: () => {
      if (drag.current) {
        save(width);
        drag.current = null;
      }
    },
    cancelDrag: () => {
      drag.current = null;
    },
  };
}
