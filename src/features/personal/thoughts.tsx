"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { CalendarPage } from "./calendar";
import {
  ActionEditor,
  ActionPreview,
  PersonalToast,
  localDate,
  useLivePersonal,
} from "./calendar-dialogs";
import { day, shiftDay } from "./store";
import {
  ThButton,
  ThoughtDialog,
  ThoughtDeviceGuide,
  thoughtNames,
  thoughtMoney,
} from "./thoughts-dialogs";
import { RefIcon } from "@/features/reference/symbols";
import { AgentPanel } from "@/features/workbench/components/agent-panel";
import type {
  ActionRecord,
  ThoughtRecord,
} from "@/features/workbench/model/types";
import { appUrl } from "@/lib/routes";
const icons = {
  inspiration: "spark",
  ledger: "book",
  other: "file",
  todo: "task",
  schedule: "clock",
};
type ThoughtRow =
  | ThoughtRecord
  | (ActionRecord & {
      date: string;
      time: string;
      detail: string;
      action: true;
    });
export function ThoughtsPage({ id }: { id: string }) {
  const { data, error, repo, refresh } = useLivePersonal();
  const [type, setType] = useState(id in thoughtNames ? id : "schedule"),
    [query, setQuery] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [order, setOrder] = useState("desc"),
    [limit, setLimit] = useState(40);
  const [selected, setSelected] = useState(id in thoughtNames ? "" : id),
    [editing, setEditing] = useState(false),
    [detail, setDetail] = useState("");
  const [guide, setGuide] = useState(false),
    [agent, setAgent] = useState(false),
    [sequence, setSequence] = useState(0),
    [notice, setNotice] = useState("");
  const host = useRef<HTMLDivElement>(null),
    scroll = useRef(0);
  useLayoutEffect(() => {
    const main = document.querySelector(".main");
    if (!detail && main) main.scrollTop = scroll.current;
  }, [detail]);
  if (!data)
    return (
      <div className="main-inner" data-main-view="home">
        <p role="status">{error || "正在读取闪念…"}</p>
      </div>
    );
  const all: ThoughtRow[] = [
    ...data.thoughts,
    ...data.actions.records.map((r) => {
      const stamp = localDate(
        r.created && r.created !== "seed" ? r.created : r.start,
      );
      return {
        ...r,
        date: stamp.slice(0, 10),
        time: stamp.slice(11, 16),
        detail: [r.notes, r.capture, r.location, r.participants]
          .filter(
            (v, i, a) =>
              v && !a.slice(0, i).some((prior) => prior?.includes(v)),
          )
          .join(" · "),
        action: true as const,
      };
    }),
  ];
  const rows = all
    .filter(
      (r) =>
        r.type === type &&
        (!from || r.date >= from) &&
        (!to || r.date <= to) &&
        `${r.title} ${r.detail} ${thoughtNames[r.type]} ${r.type === "ledger" ? thoughtMoney(r as ThoughtRecord) : ""} ${"start" in r ? r.start + " " + r.end : ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        (order === "desc" ? -1 : 1) *
        (a.date + a.time).localeCompare(b.date + b.time),
    );
  const groups = new Map<string, ThoughtRow[]>();
  for (const r of rows.slice(0, limit))
    groups.set(r.date, [...(groups.get(r.date) || []), r]);
  const valid = !from || !to || from <= to,
    today = day(),
    yesterday = shiftDay(today, -1);
  const record = data.thoughts.find((r) => r.id === selected),
    action = data.actions.records.find((r) => r.id === selected);
  const clear = () => {
    setQuery("");
    setFrom("");
    setTo("");
    setLimit(40);
  };
  const open = (id: string, edit = false) => {
    setSelected(id);
    setEditing(edit);
  };
  const openDetails = (id: string) => {
    scroll.current = document.querySelector(".main")?.scrollTop || 0;
    setSelected("");
    setAgent(false);
    setDetail(id);
  };
  const toggle = (r: ActionRecord) => {
    repo.current!.actions.save({ ...r, done: !r.done });
    refresh();
  };
  if (detail)
    return (
      <CalendarPage
        key={detail}
        id={detail}
        onBack={() => {
          refresh();
          setDetail("");
        }}
      />
    );
  return (
    <div className="main-inner" data-main-view="home">
      <div
        ref={host}
        className={`meeting-agent-grid${agent ? " agent-open" : ""}`}
        id="meeting-agent-grid"
      >
        <div className="home-content-stack">
          <div className="pa-archive-wrap">
            <section
              className="home-meeting-library"
              id="recording-card"
              aria-labelledby="recent-meeting-title"
            >
              <div className="home-meeting-head">
                <div className="meeting-library-copy">
                  <h2 id="recent-meeting-title">全部闪念</h2>
                  <p id="meeting-view-description">
                    把随手记下的想法、收支和安排，放在一起回顾。
                  </p>
                </div>
                <div className="home-meeting-toolbar" id="thought-toolbar">
                  <label className="meeting-search">
                    <RefIcon name="search" />
                    <input
                      id="thought-file-search"
                      type="search"
                      placeholder="搜索标题、内容或金额"
                      aria-label="搜索闪念"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setLimit(40);
                      }}
                    />
                  </label>
                  <label
                    className="meeting-source-filter meeting-date-filter"
                    hidden
                  >
                    <span className="sr-only">筛选归档月份</span>
                    <RefIcon name="clock" className="icon date-icon" />
                    <select
                      id="thought-month-select"
                      aria-label="筛选归档月份"
                      defaultValue="all"
                    >
                      <option value="all">全部月份</option>
                    </select>
                    <RefIcon name="chevron" />
                  </label>
                  <ThButton
                    action="calendar"
                    onClick={() => location.assign(appUrl("calendar"))}
                  >
                    <RefIcon name="clock" />
                    日程与待办
                  </ThButton>
                  <ThButton
                    action="new"
                    className="primary"
                    onClick={() => setGuide(true)}
                  >
                    ＋ 记录闪念
                  </ThButton>
                  <ThButton
                    action="ask"
                    className="th-ask"
                    onClick={() => {
                      if (!rows.length) {
                        setNotice("当前没有可引用的记录");
                        return;
                      }
                      setAgent(true);
                      setSequence((s) => s + 1);
                    }}
                  >
                    <span className="ws-agent-mark">
                      <RefIcon name="spark" />
                    </span>
                    Ask Agent
                  </ThButton>
                </div>
              </div>
              <div className="thought-workspace" id="thought-workspace">
                <aside className="thought-category-rail" aria-label="闪念分类">
                  <strong>闪念分类</strong>
                  {Object.entries(thoughtNames).map(([v, name]) => (
                    <button
                      key={v}
                      className={`thought-category-button${type === v ? " active" : ""}`}
                      type="button"
                      data-thought-category={v}
                      aria-current={type === v ? "true" : undefined}
                      onClick={() => {
                        setType(v);
                        setQuery("");
                        setLimit(40);
                      }}
                    >
                      <RefIcon
                        name={
                          v === "other"
                            ? "more"
                            : icons[v as keyof typeof icons]
                        }
                      />
                      <span>{name}</span>
                      <em>{all.filter((r) => r.type === v).length}</em>
                    </button>
                  ))}
                </aside>
                <div className="th-filters">
                  <label>
                    记录日期
                    <input
                      id="th-from"
                      type="date"
                      aria-label="记录开始日期"
                      value={from}
                      onChange={(e) => {
                        setFrom(e.target.value);
                        setLimit(40);
                      }}
                    />
                  </label>
                  <span>至</span>
                  <label>
                    <span className="sr-only">结束日期</span>
                    <input
                      id="th-to"
                      type="date"
                      aria-label="记录结束日期"
                      value={to}
                      onChange={(e) => {
                        setTo(e.target.value);
                        setLimit(40);
                      }}
                    />
                  </label>
                  <select
                    id="th-order"
                    aria-label="排序方式"
                    value={order}
                    onChange={(e) => {
                      setOrder(e.target.value);
                      setLimit(40);
                    }}
                  >
                    <option value="desc">最新记录优先</option>
                    <option value="asc">最早记录优先</option>
                  </select>
                  <ThButton action="clear" className="plain" onClick={clear}>
                    重置
                  </ThButton>
                </div>
                <section
                  className="thought-file-pane"
                  aria-labelledby="thought-category-heading"
                >
                  <header className="thought-file-pane-head">
                    <div>
                      <strong id="thought-category-heading">
                        {thoughtNames[type as keyof typeof thoughtNames]}
                      </strong>
                      <span id="thought-category-description">
                        {rows.length} 条记录 · 按记录时间
                        {order === "desc" ? "倒序" : "正序"}排列
                      </span>
                    </div>
                  </header>
                  <div className="thought-file-table-scroll">
                    <div className="thought-file-table-head" hidden>
                      <span>文件名</span>
                      <span>记录数量</span>
                      <span>更新时间</span>
                      <span>操作</span>
                    </div>
                    <div id="thought-file-list">
                      {!valid ? (
                        <p className="th-empty" role="alert">
                          开始日期不能晚于结束日期，请调整日期范围。
                        </p>
                      ) : !rows.length ? (
                        <div className="th-empty">
                          <h3>没有匹配的记录</h3>
                          <p>换个关键词或日期范围试试。</p>
                          <ThButton action="clear" onClick={clear}>
                            清除筛选
                          </ThButton>
                        </div>
                      ) : (
                        <>
                          {[...groups].map(([date, entries]) => (
                            <section className="th-day" key={date}>
                              <h3>
                                {date === today
                                  ? "今天"
                                  : date === yesterday
                                    ? "昨天"
                                    : date}
                                <span>
                                  {date === today || date === yesterday
                                    ? date + " · "
                                    : ""}
                                  {entries.length} 条
                                </span>
                              </h3>
                              {entries.map((r) => (
                                <article
                                  key={r.id}
                                  className={`th-row ${r.type} ${"done" in r && r.done ? "is-done" : ""}`}
                                >
                                  {r.type === "todo" && (
                                    <button
                                      type="button"
                                      className="th-complete"
                                      data-th="toggle"
                                      data-id={r.id}
                                      role="checkbox"
                                      aria-checked={r.done}
                                      aria-label={`${r.done ? "重新打开" : "完成"} ${r.title}`}
                                      onClick={() => {
                                        try {
                                          toggle(r);
                                        } catch (e) {
                                          setNotice((e as Error).message);
                                        }
                                      }}
                                    >
                                      {r.done ? "✓" : ""}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="th-open"
                                    data-thought-record={r.id}
                                    onClick={() => open(r.id)}
                                  >
                                    <span className="th-mark">
                                      <RefIcon name={icons[r.type]} />
                                    </span>
                                    <span className="th-copy">
                                      <span className="th-line">
                                        <strong>{r.title}</strong>
                                        <span className="th-type">
                                          {thoughtNames[r.type]}
                                        </span>
                                        {r.type === "ledger" ? (
                                          <b
                                            className={`th-money ${r.direction === "income" ? "income" : ""}`}
                                          >
                                            {thoughtMoney(r)}
                                          </b>
                                        ) : r.type === "todo" ? (
                                          <span className="th-status">
                                            {r.done ? "已完成" : "待完成"}
                                          </span>
                                        ) : null}
                                      </span>
                                      <span className="th-summary">
                                        {r.detail || "暂无补充内容"}
                                      </span>
                                      <span className="th-meta">
                                        {r.time} ·{" "}
                                        {r.source === "manual"
                                          ? "手动创建"
                                          : r.source === "agent"
                                            ? "Agent 创建"
                                            : "闪念提取"}
                                        {"action" in r && (
                                          <span>{`${r.type === "todo" ? "截止" : "日程"} ${r.start.replace("T", " ")}${r.type === "schedule" ? " — " + r.end.replace("T", " ") : ""}`}</span>
                                        )}
                                      </span>
                                    </span>
                                    <span className="th-row-arrow">
                                      <RefIcon name="chevron" />
                                    </span>
                                  </button>
                                  <span className="th-row-actions">
                                    <ThButton
                                      action="edit"
                                      id={r.id}
                                      className="th-row-edit"
                                      onClick={() => open(r.id, true)}
                                    >
                                      编辑
                                    </ThButton>
                                    {"action" in r && (
                                      <ThButton
                                        action="details"
                                        id={r.id}
                                        className="th-row-edit"
                                        onClick={() => openDetails(r.id)}
                                      >
                                        详情
                                      </ThButton>
                                    )}
                                  </span>
                                </article>
                              ))}
                            </section>
                          ))}
                          {rows.length > limit && (
                            <div className="th-more">
                              <ThButton
                                action="more"
                                onClick={() => setLimit((l) => l + 40)}
                              >
                                加载更多（还有 {rows.length - limit} 条）
                              </ThButton>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </section>
              </div>
              <div id="thought-preview" hidden />
            </section>
          </div>
        </div>
        <AgentPanel
          open={agent}
          onClose={() => setAgent(false)}
          host={host}
          files={rows.map((r) => ({ id: r.id, title: r.title }))}
          draft={{
            context: {
              kind: "page",
              widget: "thoughts",
              records: rows.map((r) => ({
                title: r.title,
                time: r.time,
                date: r.date,
                detail:
                  "action" in r
                    ? `${r.detail} · ${r.type === "todo" ? "截止" : "日程"} ${r.start}`
                    : r.type === "ledger"
                      ? `${thoughtMoney(r)} · ${r.detail}`
                      : r.detail || "",
              })),
              title: `${rows.length} 条闪念`,
              lines: rows.map(
                (r) =>
                  `${r.date} ${r.title} ${r.type === "ledger" ? thoughtMoney(r) : ""} ${r.detail}${"action" in r ? " · " + (r.type === "todo" ? "截止" : "日程") + " " + r.start : ""}`,
              ),
            },
            text: "请回顾当前筛选的闪念，提炼主题、关联线索和需要跟进的事项。",
            sequence,
          }}
        />
      </div>
      <PersonalToast message={notice} onDone={() => setNotice("")} />
      {action &&
        (editing ? (
          <ActionEditor
            key={action.id}
            record={action}
            onClose={() => setSelected("")}
            onSave={(r) => {
              repo.current!.actions.save(r);
              refresh();
              setNotice("已保存");
            }}
          />
        ) : (
          <ActionPreview
            record={action}
            onClose={() => setSelected("")}
            onEdit={() => setEditing(true)}
            onDetails={() => openDetails(action.id)}
            onToggle={() => toggle(action)}
          />
        ))}
      {record && (
        <ThoughtDialog
          key={record.id + (editing ? "-edit" : "-preview")}
          record={record}
          editing={editing}
          onEdit={() => setEditing(true)}
          onClose={() => setSelected("")}
          onSave={(r) => {
            repo.current!.thoughts.save(r);
            refresh();
            setEditing(false);
            setNotice("闪念已保存");
          }}
        />
      )}
      {guide && <ThoughtDeviceGuide onClose={() => setGuide(false)} />}
    </div>
  );
}
