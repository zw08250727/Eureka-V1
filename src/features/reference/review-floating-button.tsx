"use client";
import { useEffect, useRef, useState } from "react";
import { marketStorage } from "@/features/markets/storage";
import { RefIcon } from "./symbols";
type Point = { x: number; y: number };
const key = "eureka:review-button-position:v1";
export function ReviewFloatingButton({ expanded, onOpen }: { expanded: boolean; onOpen: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ pointer: number; origin: Point; start: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [position, setPosition] = useState<Point | null>(null);
  function clamp(point: Point) {
    const rect = button.current?.getBoundingClientRect();
    return { x: Math.max(8, Math.min(point.x, innerWidth - (rect?.width || 120) - 8)), y: Math.max(8, Math.min(point.y, innerHeight - (rect?.height || 44) - 8)) };
  }
  function save(point: Point) {
    const next = clamp(point); setPosition(next);
    try { marketStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep the position for this session. */ }
  }
  useEffect(() => {
    const frame = requestAnimationFrame(() => { try { const stored = JSON.parse(marketStorage.getItem(key) || "null"); if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) setPosition(clamp(stored)); } catch { /* Use default position. */ } });
    const resize = () => setPosition(previous => previous ? clamp(previous) : previous);
    window.addEventListener("resize", resize); return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, []);
  return <button ref={button} type="button" className="review-floating-entry" aria-haspopup="dialog" aria-expanded={expanded}
    title="点击打开评审工具；拖动调整位置，也可用方向键移动"
    style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}
    onPointerDown={event => {
      if (event.button !== 0) return;
      const rect = event.currentTarget.getBoundingClientRect(); suppressClick.current = false;
      drag.current = { pointer: event.pointerId, origin: { x: rect.x, y: rect.y }, start: { x: event.clientX, y: event.clientY }, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      const state = drag.current; if (!state || state.pointer !== event.pointerId) return;
      const dx = event.clientX - state.start.x, dy = event.clientY - state.start.y;
      if (Math.hypot(dx, dy) > 5) state.moved = true;
      if (state.moved) setPosition(clamp({ x: state.origin.x + dx, y: state.origin.y + dy }));
    }}
    onPointerUp={event => {
      const state = drag.current; if (!state) return;
      suppressClick.current = state.moved;
      if (state.moved) save({ x: state.origin.x + event.clientX - state.start.x, y: state.origin.y + event.clientY - state.start.y });
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { suppressClick.current = true; drag.current = null; }}
    onLostPointerCapture={() => { drag.current = null; }}
    onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(), step = event.shiftKey ? 40 : 10;
      save({ x: rect.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), y: rect.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) });
    }}
    onClick={event => { if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return; } onOpen(); }}
  ><RefIcon name="grid"/><span>评审工具</span></button>;
}
