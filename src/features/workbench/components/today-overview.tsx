import { Fragment } from "react";
import { RefIcon as Icon } from "@/features/reference/symbols";
import { navigateLegacy } from "@/lib/routes";
import { todayRecords } from "../model/selectors";
import type { AgentContext, WorkbenchSnapshot } from "../model/types";
export function dailyContext(data: WorkbenchSnapshot, now: Date): AgentContext {
  const r = todayRecords(data.actions, data.thoughts, now);
  const records = [
    ...r.ideas,
    ...r.todos,
    ...r.ledger,
    ...data.actions.filter(
      (x) =>
        x.type === "schedule" &&
        x.start.slice(0, 10) === now.toLocaleDateString("en-CA"),
    ),
  ].map((x) => ({
    title: x.title,
    time: "start" in x ? x.start.slice(11, 16) : x.time,
    detail: x.detail || ("notes" in x ? x.notes : "") || "",
    done: "done" in x ? x.done : undefined,
  }));
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
}: {
  data: WorkbenchSnapshot;
  now: Date;
  title: string;
  onHomeAgent: (context?: AgentContext) => void;
  onUpload: () => void;
  onToggle: (id: string) => void;
  agentOpen: boolean;
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
              className="audio-upload-entry"
              onClick={onUpload}
            >
              <Icon name="upload" />
              上传
            </button>
            <button
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
                    {r.upcoming
                      ? r.upcoming.start.slice(11, 16) <= r.clock
                        ? "当前安排是"
                        : "先准备"
                      : "可以回顾"}{" "}
                    <button
                      className="brief-inline-link"
                      onClick={() => navigateLegacy("calendar", r.next!.id)}
                    >
                      {`${r.next!.start.slice(11, 16)} 的${r.next!.title}`}
                    </button>
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
                        {t.start.slice(11, 16) < r.clock ? (
                          <>{t.title}仍待跟进</>
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
                  <>，待办已全部完成</>
                )}
                。
              </p>
              <div className="brief-todo-line">
                {r.todos.map((t) => (
                  <button
                    className={`brief-task ${t.done ? "is-done" : ""}`}
                    key={t.id}
                    aria-pressed={t.done}
                    data-today-toggle={t.id}
                    onClick={() => onToggle(t.id)}
                    title={t.title}
                  >
                    <span className="brief-task-check">
                      {t.done ? "✓" : ""}
                    </span>
                    <span>{t.title}</span>
                  </button>
                ))}
              </div>
              <div className="daily-brief-actions">
                <button
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
                    <time>
                      {`${s.start.slice(11, 16)}–${s.end.slice(11, 16)}`}
                    </time>
                    <span>
                      <strong>{s.title}</strong>
                      <em>{`${s.location} · ${s.participants}`}</em>
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
                {r.ideas.map((i) => (
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
                <strong>{`¥${r.amount.toFixed(2)}`}</strong>
                <span>今日支出</span>
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
                    <span>{`${x.direction === "income" ? "收入 " : ""}¥${x.amount?.toFixed(2)}`}</span>
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
