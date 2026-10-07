"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { RefIcon } from "./symbols";
const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function MeetingFilter({
  kind,
  value,
  onChange,
  options = [
    "全部来源",
    "网页录音",
    "合并录音",
    "M1",
    "W1",
    "W2",
    "W-PEN",
    "文件上传",
  ],
  id,
}: {
  kind: "date" | "source";
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  id: string;
}) {
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(() => new Date()),
    [focus, setFocus] = useState(""),
    [pos, setPos] = useState<CSSProperties>({});
  const trigger = useRef<HTMLButtonElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const selected = kind === "source" ? value !== "all" : !!value;
  const label =
    kind === "source"
      ? value === "all"
        ? "全部来源"
        : value
      : value
        ? value.replaceAll("-", " / ")
        : "录音日期";
  useLayoutEffect(() => {
    if (!open || !trigger.current || !popup.current) return;
    const p = popup.current,
      t = trigger.current;
    const position = () => {
      const r = t.getBoundingClientRect(),
        width = Math.min(kind === "date" ? 304 : 184, innerWidth - 24),
        natural = Math.min(p.scrollHeight + 2, innerHeight - 24),
        belowSpace = innerHeight - r.bottom - 20,
        aboveSpace = r.top - 20,
        below = natural <= belowSpace || belowSpace >= aboveSpace,
        height = Math.min(
          natural,
          Math.max(80, below ? belowSpace : aboveSpace),
        );
      setPos({
        width,
        maxHeight: Math.max(80, below ? belowSpace : aboveSpace),
        left: Math.max(12, Math.min(r.right - width, innerWidth - width - 12)),
        top: below ? r.bottom + 8 : Math.max(12, r.top - height - 8),
      });
    };
    if (!p.matches(":popover-open")) p.showPopover();
    position();
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "closed") setOpen(false);
    };
    p.addEventListener("toggle", onToggle);
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    return () => {
      p.removeEventListener("toggle", onToggle);
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
    };
  }, [open, kind, month]);
  useEffect(() => {
    if (open)
      popup.current
        ?.querySelector<HTMLElement>(
          kind === "source"
            ? '[aria-selected="true"]'
            : `[data-date="${focus}"]`,
        )
        ?.focus({ preventScroll: true });
  }, [open, focus, kind]);
  const apply = (v: string) => {
    onChange(v);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  const toggle = () => {
    if (!open) {
      const d = new Date(
        (kind === "date" && value ? value : key(new Date())) + "T12:00:00",
      );
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12));
      setFocus(key(d));
    }
    setOpen(!open);
  };
  const y = month.getFullYear(),
    m = month.getMonth(),
    first = new Date(y, m, 1, 12),
    start = new Date(y, m, 1 - ((first.getDay() + 6) % 7), 12),
    weeks = Math.ceil(
      (((first.getDay() + 6) % 7) + new Date(y, m + 1, 0).getDate()) / 7,
    );
  return (
    <>
      <div
        className={`meeting-source-filter ${kind === "source" ? "meeting-origin-filter" : "meeting-date-filter"} mf-control ${selected ? "mf-selected" : ""}`}
      >
        <span className="sr-only">
          {kind === "source" ? "筛选来源" : "筛选录音时间"}
        </span>
        {kind === "source" ? (
          <select
            id={id}
            aria-label="筛选内容来源"
            hidden
            tabIndex={-1}
            value={value}
            onChange={(e) => apply(e.target.value)}
          >
            {options.map((o) => (
              <option key={o} value={o === "全部来源" ? "all" : o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            type="date"
            aria-label="选择录音日期"
            hidden
            tabIndex={-1}
            value={value}
            onChange={(e) => apply(e.target.value)}
          />
        )}
        <button
          ref={trigger}
          type="button"
          id={id + "-trigger"}
          className="mf-trigger"
          aria-haspopup={kind === "source" ? "listbox" : "dialog"}
          role={kind === "source" ? "combobox" : undefined}
          aria-expanded={open}
          aria-controls={id + "-popover"}
          aria-label={
            (kind === "source" ? "筛选会议来源：" : "筛选录音日期：") + label
          }
          onClick={toggle}
          onKeyDown={(e) => {
            if (["ArrowDown", "ArrowUp"].includes(e.key)) {
              e.preventDefault();
              if (!open) toggle();
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
          <span>{label}</span>
          {kind === "source" ? <RefIcon name="chevron" /> : null}
        </button>
        <button
          type="button"
          className="mf-clear"
          aria-label={kind === "source" ? "清除来源筛选" : "清除录音日期"}
          hidden={!selected}
          onClick={() => apply(kind === "source" ? "all" : "")}
        >
          <RefIcon name="x" />
        </button>
      </div>
      {open
        ? createPortal(
            <div
              id={id + "-popover"}
              ref={popup}
              className={"mf-popover mf-" + kind + "-popover"}
              popover="auto"
              role={kind === "source" ? "listbox" : "dialog"}
              aria-label={kind === "source" ? "选择会议来源" : "选择录音日期"}
              style={pos}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                  trigger.current?.focus();
                }
                if (
                  kind === "date" &&
                  ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    e.key,
                  )
                ) {
                  e.preventDefault();
                  const d = new Date(focus + "T12:00:00");
                  d.setDate(
                    d.getDate() +
                      ({
                        ArrowLeft: -1,
                        ArrowRight: 1,
                        ArrowUp: -7,
                        ArrowDown: 7,
                      }[e.key] || 0),
                  );
                  setFocus(key(d));
                  setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12));
                }
                if (
                  kind === "source" &&
                  ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)
                ) {
                  e.preventDefault();
                  const buttons = [
                      ...(popup.current?.querySelectorAll<HTMLButtonElement>(
                        "button",
                      ) || []),
                    ],
                    i = buttons.indexOf(
                      document.activeElement as HTMLButtonElement,
                    );
                  buttons[
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? buttons.length - 1
                        : (i +
                            (e.key === "ArrowDown" ? 1 : -1) +
                            buttons.length) %
                          buttons.length
                  ]?.focus();
                }
              }}
            >
              {kind === "source" ? (
                options.map((o) => (
                  <button
                    className="mf-option"
                    type="button"
                    key={o}
                    role="option"
                    aria-selected={(o === "全部来源" ? "all" : o) === value}
                    tabIndex={(o === "全部来源" ? "all" : o) === value ? 0 : -1}
                    onClick={() => apply(o === "全部来源" ? "all" : o)}
                  >
                    <span>{o}</span>
                    {(o === "全部来源" ? "all" : o) === value ? (
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
                      aria-label="上个月"
                      onClick={() => setMonth(new Date(y, m - 1, 1, 12))}
                    >
                      ‹
                    </button>
                    <strong aria-live="polite">{`${y}年 ${m + 1}月`}</strong>
                    <button
                      type="button"
                      aria-label="下个月"
                      onClick={() => setMonth(new Date(y, m + 1, 1, 12))}
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
                                className={
                                  "mf-day" +
                                  (d.getMonth() !== m
                                    ? " mf-other-month"
                                    : "") +
                                  (k === key(new Date()) ? " mf-today" : "") +
                                  (k === value ? " mf-day-selected" : "")
                                }
                                aria-label={`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`}
                                aria-current={
                                  k === key(new Date()) ? "date" : undefined
                                }
                                tabIndex={k === focus ? 0 : -1}
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
                      onClick={() => apply(key(new Date()))}
                    >
                      今天
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        apply(key(d));
                      }}
                    >
                      昨天
                    </button>
                    <button type="button" onClick={() => apply("")}>
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
