import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { legacyUrl, navigateLegacy } from "@/lib/routes";
import { todayRecords } from "../model/selectors";
import type { AgentContext, WorkbenchSnapshot } from "../model/types";
export function dailyContext(data: WorkbenchSnapshot, now: Date): AgentContext {
  const r = todayRecords(data.actions, data.thoughts, now);
  return {
    kind: "daily",
    title: "今日简报",
    lines: [...r.schedules, ...r.todos, ...r.ideas, ...r.ledger].map(
      (x) =>
        `${"start" in x ? x.start.slice(11, 16) : x.time} ${x.title} ${"done" in x && x.done ? "· 已完成" : ""} ${x.detail || ""}`,
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
    <section className="today-workbench" aria-label="今日工作台">
      <div className="today-workbench-head">
        <div>
          <p className="today-workbench-eyebrow">
            <i />
            {now.toLocaleDateString("zh-CN", {
              month: "long",
              day: "numeric",
            })}{" "}
            · {now.toLocaleDateString("zh-CN", { weekday: "long" })}
          </p>
          <h2>{title}</h2>
        </div>
        <div className="today-commands">
          <a
            className="ui-button ui-button-primary"
            href={legacyUrl("recording")}
          >
            <Icon name="mic" />
            开始录音
          </a>
          <Button onClick={onUpload}>
            <Icon name="upload" />
            上传
          </Button>
          <Button aria-expanded={agentOpen} onClick={() => onHomeAgent()}>
            <span className="agent-mark small">
              <Icon name="spark" />
            </span>
            {agentOpen ? "收起 Ask Agent" : "Ask Agent"}
          </Button>
        </div>
      </div>
      <div className="today-assets-grid">
        <div className="daily-focus">
          <article className="daily-brief">
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
                    {r.next!.start.slice(11, 16)} 的{r.next!.title}
                  </button>
                </>
              ) : (
                <>今天没有日程，可以留出一段专注时间</>
              )}
              {pending.length ? (
                <>
                  ，
                  {pending.slice(0, 2).map((t, i) => (
                    <span key={t.id}>
                      {i ? "，并" : ""}
                      {t.start.slice(11, 16) < r.clock ? (
                        <>{t.title}仍待跟进</>
                      ) : (
                        <>
                          在<strong>{t.start.slice(11, 16)} 前</strong>
                          {t.title}
                        </>
                      )}
                    </span>
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
                  <span className="brief-task-check">{t.done ? "✓" : ""}</span>
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
              <a
                className="brief-archive"
                href={legacyUrl("thoughts", "schedule")}
              >
                全部闪念
              </a>
            </div>
          </article>
          <aside className="daily-rhythm">
            <header>
              <h3>今日日程</h3>
              <a href={legacyUrl("calendar")}>{r.schedules.length} 场 ↗</a>
            </header>
            <div className="daily-rhythm-events">
              {r.schedules.map((s) => (
                <button
                  key={s.id}
                  className="rhythm-event"
                  onClick={() => navigateLegacy("calendar", s.id)}
                >
                  <time>
                    {s.start.slice(11, 16)}–{s.end.slice(11, 16)}
                  </time>
                  <span>
                    <strong>{s.title}</strong>
                    <em>
                      {s.location} · {s.participants}
                    </em>
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
          <section className="daily-inspiration">
            <header>
              <h3>灵感</h3>
              <a href={legacyUrl("thoughts", "inspiration")}>
                {r.ideas.length} 条 ↗
              </a>
            </header>
            {r.ideas.map((i) => (
              <a
                className="daily-idea"
                key={i.id}
                href={legacyUrl("thoughts", i.id)}
              >
                <span>{i.title}</span>
                <time>{i.time}</time>
              </a>
            ))}
          </section>
          <section className="daily-ledger">
            <header>
              <h3>今日记账</h3>
              <a
                href={legacyUrl("thoughts", "ledger")}
                aria-label="查看全部记账"
              >
                ↗
              </a>
            </header>
            <div className="daily-ledger-total">
              <strong>¥{r.amount.toFixed(2)}</strong>
              <span>今日支出</span>
            </div>
            <div className="daily-ledger-items">
              {r.ledger
                .filter((x) => x.direction !== "income")
                .map((x) => (
                  <a key={x.id} href={legacyUrl("thoughts", x.id)}>
                    {x.title.replace("客户拜访", "").replace("客户工作", "")} ¥
                    {x.amount?.toFixed(2)}
                  </a>
                ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
