"use client";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { RefIcon } from "@/features/reference/symbols";
const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => new Date(s + "T12:00:00");
const label = (d: Date) =>
  `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
export function HomeFilter({
  kind,
  value,
  onChange,
  options = [],
}: {
  kind: "source" | "date";
  value: string;
  onChange: (value: string) => void;
  options?: string[];
}) {
  const [open, setOpen] = useState(false),
    [focus, setFocus] = useState(() => new Date()),
    [month, setMonth] = useState(() => new Date());
  const trigger = useRef<HTMLButtonElement>(null),
    popup = useRef<HTMLDivElement>(null),
    monthNavigation = useRef<number | null>(null);
  const id = `ws-meeting-${kind}`,
    selected = kind === "source" ? value !== "all" : Boolean(value),
    text =
      kind === "source"
        ? value === "all"
          ? "全部来源"
          : value
        : value
          ? value.replaceAll("-", " / ")
          : "录音日期";
  useLayoutEffect(() => {
    if (!open || !popup.current) return;
    const el = popup.current;
    el.showPopover();
    const position = () => {
      const r = trigger.current!.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > innerHeight) {
        setOpen(false);
        return;
      }
      el.style.maxHeight = `${innerHeight - 24}px`;
      const belowSpace = innerHeight - r.bottom - 20,
        aboveSpace = r.top - 20;
      const below = el.offsetHeight <= belowSpace || belowSpace >= aboveSpace;
      el.style.maxHeight = `${Math.max(80, below ? belowSpace : aboveSpace)}px`;
      el.style.left = `${Math.max(12, Math.min(r.right - el.offsetWidth, innerWidth - el.offsetWidth - 12))}px`;
      el.style.top = `${below ? r.bottom + 8 : Math.max(12, r.top - el.offsetHeight - 8)}px`;
    };
    position();
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    const toggle = () => {
      if (!el.matches(":popover-open")) setOpen(false);
    };
    el.addEventListener("toggle", toggle);
    return () => {
      el.removeEventListener("toggle", toggle);
      el.hidePopover();
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
    };
  }, [open, month]);
  useLayoutEffect(() => {
    if (open) {
      popup.current
        ?.querySelector<HTMLElement>(
          monthNavigation.current !== null
            ? `[data-month="${monthNavigation.current}"]`
            : kind === "date"
              ? `[data-date="${key(focus)}"]`
              : '[aria-selected="true"]',
        )
        ?.focus({ preventScroll: true });
      monthNavigation.current = null;
    }
  }, [open, focus, kind]);
  function show() {
    const d = kind === "date" && value ? parse(value) : new Date();
    setFocus(d);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12));
    setOpen(true);
  }
  function apply(next: string) {
    onChange(next);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  function keyboard(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (
      kind === "source" &&
      ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)
    ) {
      e.preventDefault();
      const buttons = Array.from(
        popup.current!.querySelectorAll<HTMLButtonElement>('[role="option"]'),
      );
      const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        ),
        next =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? buttons.length - 1
              : (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                buttons.length;
      buttons.forEach((b, i) => (b.tabIndex = i === next ? 0 : -1));
      buttons[next]?.focus();
    }
    if (
      kind !== "date" ||
      !(e.target instanceof HTMLElement) ||
      !e.target.dataset.date
    )
      return;
    const d = parse(e.target.dataset.date),
      delta: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
      };
    if (e.key in delta) d.setDate(d.getDate() + delta[e.key]);
    else if (e.key === "Home") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    else if (e.key === "End")
      d.setDate(d.getDate() + 6 - ((d.getDay() + 6) % 7));
    else if (e.key === "PageUp" || e.key === "PageDown") {
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + (e.key === "PageUp" ? -1 : 1));
      d.setDate(
        Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()),
      );
    } else return;
    e.preventDefault();
    setFocus(d);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12));
  }
  const y = month.getFullYear(),
    m = month.getMonth(),
    first = new Date(y, m, 1, 12),
    start = new Date(y, m, 1 - ((first.getDay() + 6) % 7), 12),
    weeks = Math.ceil(
      (((first.getDay() + 6) % 7) + new Date(y, m + 1, 0).getDate()) / 7,
    ),
    today = key(new Date());
  return (
    <>
      <div
        className={`ws-filter-${kind} mf-control${selected ? " mf-selected" : ""}`}
      >
        {kind === "source" ? (
          <select
            id={id}
            aria-label="会议来源"
            hidden
            tabIndex={-1}
            value={value}
            onChange={(e) => apply(e.target.value)}
          >
            {options.map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "全部来源" : v}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            type="date"
            value={value}
            hidden
            tabIndex={-1}
            aria-label="录音日期"
            onChange={(e) => apply(e.target.value)}
          />
        )}
        <button
          ref={trigger}
          type="button"
          id={`${id}-trigger`}
          className="mf-trigger"
          aria-haspopup={kind === "source" ? "listbox" : "dialog"}
          role={kind === "source" ? "combobox" : undefined}
          aria-expanded={open}
          aria-controls={`${id}-popover`}
          aria-label={`${kind === "source" ? "筛选会议来源" : "筛选录音日期"}：${text}`}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={(e) => {
            if (["ArrowDown", "ArrowUp"].includes(e.key)) {
              e.preventDefault();
              if (!open) show();
            }
          }}
        >
          {kind === "date" ? (
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <rect x="4" y="5" width="16" height="16" rx="3" />
              <path d="M8 3v4m8-4v4M4 11h16" />
            </svg>
          ) : null}
          <span>{text}</span>
          {kind === "source" ? (
            <RefIcon name="chevron" className="icon" />
          ) : null}
        </button>
        <button
          type="button"
          className="mf-clear"
          hidden={!selected}
          aria-label={kind === "date" ? "清除录音日期" : "清除来源筛选"}
          onClick={() => apply(kind === "date" ? "" : "all")}
        >
          <RefIcon name="x" className="icon" />
        </button>
      </div>
      {open
        ? createPortal(
            <div
              ref={popup}
              id={`${id}-popover`}
              className={`mf-popover mf-${kind}-popover`}
              popover="auto"
              role={kind === "source" ? "listbox" : "dialog"}
              aria-label={kind === "source" ? "选择会议来源" : "选择录音日期"}
              onKeyDown={keyboard}
            >
              {kind === "source" ? (
                options.map((v) => (
                  <button
                    type="button"
                    key={v}
                    className="mf-option"
                    data-value={v}
                    role="option"
                    aria-selected={value === v}
                    tabIndex={value === v ? 0 : -1}
                    onClick={() => apply(v)}
                  >
                    <span>{v === "all" ? "全部来源" : v}</span>
                    {value === v ? (
                      <span className="mf-check" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </button>
                ))
              ) : (
                <>
                  <header className="mf-calendar-head">
                    <button
                      type="button"
                      data-month="-1"
                      aria-label="上个月"
                      onClick={() => {
                        monthNavigation.current = -1;
                        setFocus(new Date(y, m - 1, 1, 12));
                        setMonth(new Date(y, m - 1, 1, 12));
                      }}
                    >
                      ‹
                    </button>
                    <strong aria-live="polite">
                      {y}年 {m + 1}月
                    </strong>
                    <button
                      type="button"
                      data-month="1"
                      aria-label="下个月"
                      onClick={() => {
                        monthNavigation.current = 1;
                        setFocus(new Date(y, m + 1, 1, 12));
                        setMonth(new Date(y, m + 1, 1, 12));
                      }}
                    >
                      ›
                    </button>
                  </header>
                  <div
                    className="mf-calendar-grid"
                    role="grid"
                    aria-label={`${y}年${m + 1}月`}
                  >
                    <div className="mf-weekdays" role="row">
                      {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
                        <span role="columnheader" key={d}>
                          {d}
                        </span>
                      ))}
                    </div>
                    {Array.from({ length: weeks }, (_, week) => (
                      <div className="mf-calendar-week" role="row" key={week}>
                        {Array.from({ length: 7 }, (_, day) => {
                          const d = new Date(
                              start.getFullYear(),
                              start.getMonth(),
                              start.getDate() + week * 7 + day,
                              12,
                            ),
                            k = key(d);
                          return (
                            <div
                              role="gridcell"
                              aria-selected={k === value}
                              key={k}
                            >
                              <button
                                type="button"
                                data-date={k}
                                className={`mf-day${d.getMonth() !== m ? " mf-other-month" : ""}${k === today ? " mf-today" : ""}${k === value ? " mf-day-selected" : ""}`}
                                aria-label={label(d)}
                                aria-current={k === today ? "date" : undefined}
                                tabIndex={k === key(focus) ? 0 : -1}
                                onClick={() => apply(k)}
                              >
                                {d.getDate()}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <footer className="mf-calendar-footer">
                    <button
                      type="button"
                      data-shortcut="today"
                      onClick={() => apply(today)}
                    >
                      今天
                    </button>
                    <button
                      type="button"
                      data-shortcut="yesterday"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        apply(key(d));
                      }}
                    >
                      昨天
                    </button>
                    <button
                      type="button"
                      data-shortcut="clear"
                      onClick={() => apply("")}
                    >
                      不限日期
                    </button>
                  </footer>
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
