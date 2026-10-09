import { Fragment, type ReactNode } from "react";
import "./today-overview.css";
import {
  actionTime,
  ledgerCurrency,
  money,
  overdue,
  scheduleTime,
} from "@/features/personal/asset-rules";
import { RefIcon as Icon } from "@/features/reference/symbols";
import { navigateLegacy } from "@/lib/routes";
import { todayRecords } from "../model/selectors";
import type { AgentContext, WorkbenchSnapshot } from "../model/types";
export function dailyContext(data: WorkbenchSnapshot, now: Date): AgentContext {
  const r = todayRecords(data.actions, data.thoughts, now);
  const records = [...r.ideas, ...r.todos, ...r.ledger, ...r.schedules].map(
    (x) => ({
      title: x.title,
      time: "start" in x ? x.start.slice(11, 16) : x.time,
      detail: x.detail || ("notes" in x ? x.notes : "") || "",
      done: "done" in x ? x.done : undefined,
    }),
  );
  return {
    kind: "daily",
    widget: "brief",
    title: "今日工作简报",
    records,
    lines: records.map(
      (x) => `${x.time}${x.done ? " · 已完成" : ""} ${x.title}\n${x.detail}`,
    ),
  };
}
export function TodayOverview({
  data,
  now,
  title,
  onHomeAgent,
  onUpload,
  onToggle,
  agentOpen,
  readOnly = false,
  headerActions,
}: {
  data: WorkbenchSnapshot;
  now: Date;
  title: string;
  onHomeAgent: (context?: AgentContext) => void;
  onUpload: () => void;
  onToggle: (id: string) => void;
  agentOpen: boolean;
  readOnly?: boolean;
  headerActions?: ReactNode;
}) {
  const r = todayRecords(data.actions, data.thoughts, now),
    pending = r.todos.filter((t) => !t.done);
  return (
    <div className="today-workbench" id="today-workbench">
      <header className="today-workbench-head">
        <div>
          <span className="today-workbench-eyebrow">
            <i />
            <span id="today-date-label">{`${now.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })} · ${now.toLocaleDateString("zh-CN", { weekday: "long" })}`}</span>
          </span>
          <h1 id="today-workbench-title">{title}</h1>
        </div>
        <div className="today-workbench-head-side">
          <div className="recording-command-actions">
            <button
              className="recording-primary"
              disabled={readOnly}
              id="module-start-recording"
              type="button"
              onClick={() => navigateLegacy("recording")}
            >
              <Icon name="mic" />
              <span>
                <strong>开始录音</strong>
                <small>使用电脑麦克风</small>
              </span>
            </button>
            <button
              type="button"
              disabled={readOnly}
              className="audio-upload-entry"
              onClick={onUpload}
            >
              <Icon name="upload" />
              上传
            </button>
            <button
              disabled={readOnly}
              className="xiaozhi-entry"
              id="xiaozhi-entry"
              aria-label="Ask Agent"
              aria-controls="xiaozhi-rail"
              aria-expanded={agentOpen}
              type="button"
              onClick={() => onHomeAgent()}
            >
              <span className="xiaozhi-entry-mark">
                <Icon name="spark" />
              </span>
              <span>
                <strong id="xiaozhi-entry-label">
                  {agentOpen ? "收起 Ask Agent" : "Ask Agent"}
                </strong>
                <small>使用会议与知识</small>
              </span>
              <Icon name="expand" className="icon xiaozhi-expand-icon" />
            </button>
            {headerActions}
          </div>
        </div>
      </header>
      <section className="today-workbench-content" aria-label="今日闪念概览">
        <div
          className="today-assets-grid"
          id="today-assets-grid"
          role="region"
          aria-label="今日简报与日程，窄屏可横向滚动"
          tabIndex={0}
        >
          <div className="daily-focus">
            <article className="daily-brief" aria-label="今日工作安排">
              <p className="daily-brief-narrative">
                {r.schedules.length ? (
                  <>
                    今天 <strong>{r.schedules.length} 场日程</strong>，
                    {r.upcoming ? (
                      <>
                        {actionTime(r.upcoming.start) <= +now
                          ? "当前安排是"
                          : "先准备"}{" "}
                        <button
                          className="brief-inline-link"
                          onClick={() =>
                            navigateLegacy("calendar", r.upcoming!.id)
                          }
                        >
                          {`${scheduleTime(r.upcoming)} 的${r.upcoming.title}`}
                        </button>
                      </>
                    ) : (
                      "今日安排已结束"
                    )}
                  </>
                ) : (
                  <>今天没有日程，可以留出一段专注时间</>
                )}
                {pending.length ? (
                  <>
                    ，
                    {pending.slice(0, 2).map((t, i) => (
                      <Fragment key={t.id}>
                        {i ? "，并" : ""}
                        {overdue(t, now) ? (
                          <>{t.title}已逾期，仍待跟进</>
                        ) : (
                          <>
                            在<strong>{`${t.start.slice(11, 16)} 前`}</strong>
                            {t.title}
                          </>
                        )}
                      </Fragment>
                    ))}
                  </>
                ) : (
                  <>{r.todos.length ? "，待办已全部完成" : "，暂无待办"}</>
                )}
                。
              </p>
              <div className="brief-todo-line">
                {r.todos.map((t) => (
                  <button
                    className={`brief-task ${t.done ? "is-done" : ""}`}
                    key={t.id}
                    aria-pressed={t.done}
                    disabled={readOnly}
                    data-today-toggle={t.id}
                    onClick={() => onToggle(t.id)}
                    title={t.title}
                  >
                    <span className="brief-task-check">
                      {t.done ? "✓" : ""}
                    </span>
                    <span>
                      {t.title}
                      {overdue(t, now) ? " · 逾期" : ""}
                    </span>
                  </button>
                ))}
              </div>
              <div className="daily-brief-actions">
                <button
                  disabled={readOnly}
                  className="brief-primary"
                  onClick={() => onHomeAgent(dailyContext(data, now))}
                >
                  <Icon name="spark" />
                  帮我安排
                </button>
                <button
                  type="button"
                  className="brief-archive"
                  onClick={() => navigateLegacy("thoughts", "schedule")}
                >
                  全部闪念
                </button>
              </div>
            </article>
            <aside className="daily-rhythm" aria-label="今天的日程">
              <header>
                <h2>今日日程</h2>
                <button
                  type="button"
                  onClick={() => navigateLegacy("calendar")}
                  aria-label="查看日程与待办"
                >
                  {r.schedules.length} 场 ↗
                </button>
              </header>
              <div className="daily-rhythm-events">
                {r.schedules.map((s) => (
                  <button
                    key={s.id}
                    className="rhythm-event"
                    onClick={() => navigateLegacy("calendar", s.id)}
                  >
                    <time>{scheduleTime(s)}</time>
                    <span>
                      <strong>{s.title}</strong>
                      <em>
                        {[s.location, s.participants]
                          .filter(Boolean)
                          .join(" · ")}
                      </em>
                    </span>
                    <span className="rhythm-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                ))}
                {!r.schedules.length ? (
                  <p>今天没有日程，给自己留一段专注时间。</p>
                ) : null}
              </div>
            </aside>
          </div>
          <div className="daily-records">
            <section className="daily-inspiration" aria-label="今日灵感">
              <header>
                <h2>灵感</h2>
                <button
                  type="button"
                  onClick={() => navigateLegacy("thoughts", "inspiration")}
                >
                  {r.ideas.length} 条 ↗
                </button>
              </header>
              <div>
                {!r.ideas.length && <p>今天暂无灵感</p>}
                {r.ideas.slice(-2).reverse().map((i) => (
                  <button
                    type="button"
                    className="daily-idea"
                    key={i.id}
                    onClick={() => navigateLegacy("thoughts", i.id)}
                  >
                    <span>{i.title}</span>
                    <time>{i.time}</time>
                  </button>
                ))}
              </div>
            </section>
            <section className="daily-ledger" aria-label="今日记账">
              <header>
                <h2>今日记账</h2>
                <button
                  type="button"
                  onClick={() => navigateLegacy("thoughts", "ledger")}
                  aria-label="查看全部记账"
                >
                  ↗
                </button>
              </header>
              <div className="daily-ledger-total">
                {r.expenses.length ? (
                  r.expenses.map((t) => (
                    <div key={t.currency}>
                      <strong>{money(t.amount, t.currency)}</strong>
                      <span>今日支出</span>
                    </div>
                  ))
                ) : (
                  <span>今日暂无支出</span>
                )}
                {r.income.map((t) => (
                  <div key={t.currency}>
                    <strong>{money(t.amount, t.currency)}</strong>
                    <span>今日收入</span>
                  </div>
                ))}
              </div>
              <div className="daily-ledger-items">
                {r.ledger.map((x) => (
                  <button
                    type="button"
                    key={x.id}
                    onClick={() => navigateLegacy("thoughts", x.id)}
                  >
                    {x.title.replace("客户拜访", "").replace("客户工作", "") +
                      " "}
                    <span>{`${x.direction === "income" ? "收入 " : ""}${money(x.amount!, ledgerCurrency(x))}`}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
