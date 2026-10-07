"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon";
import { Button } from "./button";
import { localDay } from "@/features/workbench/model/selectors";
export function DateFilter({
  value,
  onChange,
  initialDate,
}: {
  value: string;
  onChange: (v: string) => void;
  initialDate: string;
}) {
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(
      () => new Date((value || initialDate) + "T12:00:00"),
    );
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const y = month.getFullYear(),
    m = month.getMonth(),
    first = new Date(y, m, 1),
    start = new Date(y, m, 1 - first.getDay());
  const days = Array.from(
    { length: 42 },
    (_, i) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
  return (
    <div className="date-filter" ref={root}>
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        <Icon name="calendar" />
        {value || "录音日期"}
      </Button>
      {value ? (
        <button
          className="filter-clear"
          onClick={() => onChange("")}
          aria-label="清除录音日期"
        >
          ×
        </button>
      ) : null}
      {open ? (
        <div
          role="dialog"
          aria-label="选择录音日期"
          className="calendar-popup"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setOpen(false);
            }
          }}
        >
          <header>
            <Button
              aria-label="上个月"
              onClick={() => setMonth(new Date(y, m - 1, 1))}
            >
              ‹
            </Button>
            <strong>
              {y}年{m + 1}月
            </strong>
            <Button
              aria-label="下个月"
              onClick={() => setMonth(new Date(y, m + 1, 1))}
            >
              ›
            </Button>
          </header>
          <div className="calendar-grid">
            {"日一二三四五六".split("").map((x) => (
              <span key={x}>{x}</span>
            ))}
            {days.map((d, i) => (
              <button
                key={i}
                data-outside={d.getMonth() !== m}
                aria-pressed={localDay(d) === value}
                aria-label={`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`}
                onKeyDown={(e) => {
                  const delta = {
                    ArrowLeft: -1,
                    ArrowRight: 1,
                    ArrowUp: -7,
                    ArrowDown: 7,
                  }[e.key];
                  if (delta) {
                    e.preventDefault();
                    const buttons =
                      e.currentTarget.parentElement?.querySelectorAll("button");
                    buttons?.[Math.max(0, Math.min(41, i + delta))]?.focus();
                  }
                }}
                onClick={() => {
                  onChange(localDay(d));
                  setOpen(false);
                }}
              >
                {d.getDate()}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            清除日期
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            关闭
          </Button>
        </div>
      ) : null}
    </div>
  );
}
