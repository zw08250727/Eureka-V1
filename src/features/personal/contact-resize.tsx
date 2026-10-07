import { useEffect, useRef, useState, type PointerEvent } from "react";

const key = "eureka:agent-panel-width:v1";
export function ContactResizeHandle() {
  const ref = useRef<HTMLDivElement>(null);
  const preferred = useRef(390);
  const drag = useRef<{ x: number; width: number; latest: number } | null>(
    null,
  );
  const [range, setRange] = useState({ min: 300, max: 760, width: 390 });
  function apply(value: number) {
    const host = ref.current?.closest<HTMLElement>(".contacts-shell");
    const available = host?.getBoundingClientRect().width;
    if (!host || !available) return;
    const max = Math.max(
      1,
      Math.min(760, available - (innerWidth > 900 ? 300 : 0)),
    );
    const min = Math.min(300, max);
    const width = Math.round(Math.max(min, Math.min(max, value)));
    host.style.setProperty("--agent-panel-width", `${width}px`);
    setRange((previous) =>
      previous.min === min && previous.max === max && previous.width === width
        ? previous
        : { min, max, width },
    );
    return width;
  }
  function save(value: number) {
    preferred.current = value;
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* Session sizing remains available without storage. */
    }
  }
  useEffect(() => {
    try {
      preferred.current = Number(localStorage.getItem(key)) || 390;
    } catch {
      /* Use the original default width. */
    }
    const resize = () => apply(preferred.current);
    const observer = new ResizeObserver(resize);
    const host = ref.current!.closest(".contacts-shell");
    if (host) observer.observe(host);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.body.classList.remove("agent-resizing");
    };
  }, []);
  function finish(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const width = apply(drag.current.latest);
    if (width) save(width);
    drag.current = null;
    document.body.classList.remove("agent-resizing");
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <div
      ref={ref}
      className="agent-resize-handle"
      tabIndex={0}
      role="separator"
      aria-orientation="vertical"
      aria-label="调整 Agent 窗口宽度"
      title="左右拖动调整宽度，或使用左右方向键"
      aria-valuemin={range.min}
      aria-valuemax={range.max}
      aria-valuenow={range.width}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const width =
          event.currentTarget.parentElement!.getBoundingClientRect().width;
        drag.current = { x: event.clientX, width, latest: width };
        document.body.classList.add("agent-resizing");
      }}
      onPointerMove={(event) => {
        if (drag.current) {
          drag.current.latest =
            drag.current.width + drag.current.x - event.clientX;
          apply(drag.current.latest);
        }
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const current =
          event.currentTarget.parentElement!.getBoundingClientRect().width;
        const width = apply(
          event.key === "Home"
            ? range.min
            : event.key === "End"
              ? range.max
              : current + (event.key === "ArrowLeft" ? 24 : -24),
        );
        if (width) save(width);
      }}
    />
  );
}
