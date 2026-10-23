"use client";

import { marketStorage } from "@/features/markets/storage";

import {AssetSharing,assetOwner,canEditAsset} from "./asset-sharing";
import { M } from "@/features/spaces/model/store";
import { actionOnDay, assetActive } from "./asset-rules";
import { usePageTitle } from "@/features/reference/page-title";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { marketConfig } from "@/features/markets/config";
import { calendarRange, day, shiftDay, reminders } from "./store";
import type { ActionRecord } from "@/features/workbench/model/types";
import { appUrl, requestRecording } from "@/lib/routes";
import { CaptureAudio } from "./capture-audio";
import { useWorkbench } from "@/features/workbench/hooks/use-workbench";
import { RefIcon } from "@/features/reference/symbols";
import {
  ActionEditor,
  PaButton,
  PaModal,
  PersonalToast,
  actionSource,
  localDate,
  useLivePersonal,
} from "./calendar-dialogs";
import { CalendarAgent } from "./calendar-agent";
import { schedulePhase, scheduleAssistCopy, type ScheduleContext } from "./schedule-context";
import { readScheduleContext } from "./schedule-context-repository";
import { ScheduleAssistEntry } from "./schedule-assist";
import type { ActionSaveOptions } from "./calendar-participants";
export { ActionEditor } from "./calendar-dialogs";
export function newAction(
  type: "todo" | "schedule",
  date = day(),
): ActionRecord {
  return {
    id: "",
    type,
    title: "",
    start: type === "schedule" ? date + "T09:00" : "",
    end: type === "schedule" ? date + "T09:30" : "",
    done: false,
    source: "manual",
    notes: "",
    reminder: "none",
    location: "",
    participants: "",
    created: "",
    updated: "",
    links: [],
  };
}
export { actionOnDay } from "./asset-rules";
const dayLabel = (d: string) =>
  `${Number(d.slice(5, 7))} 月 ${Number(d.slice(8, 10))} 日`;
export function CalendarPage({
  id,
  onBack,
  actor = "zhang", space = "personal", controller,
}: {
  id: string;
  actor?: string; space?: string; controller?: import("@/features/spaces/use-spaces").SpacesController;
  onBack?: () => void;
}) {
  const { data, error, repo, refresh } = useLivePersonal(actor, space),
    meetings = useWorkbench();
  const [date, setDate] = useState(day),
    [mode, setMode] = useState("day"),
    [selected, setSelected] = useState(id);
  const [edit, setEdit] = useState<{
    record: ActionRecord;
    variant: "quick" | "create" | "page";
  } | null>(null);
  const [modalRecord, setModalRecord] = useState<ActionRecord | null>(null);
  const [modal, setModal] = useState<"notes" | "notes-guard" | "links" | null>(
      null,
    ),
    [note, setNote] = useState("");
  const [agent, setAgent] = useState(false),
    [agentSession, setAgentSession] = useState(""),
    [notice, setNotice] = useState("");
  const [assist, setAssist] = useState<ScheduleContext | undefined>();
  const [assistBusy, setAssistBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const assistSequence = useRef(0);
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- This is a request counter, not a DOM ref; invalidate the latest pending work on unmount.
      assistSequence.current++;
    };
  }, [space, actor]);
  const host = useRef<HTMLDivElement>(null),
    navigationGuardRef = useRef<((next: () => void) => void) | null>(null);
  useLayoutEffect(() => {
    if (!agent) return;
    const fit = () => {
      const root = host.current,
        main = root?.closest(".main");
      if (root && main)
        root.style.setProperty(
          "--pa-workspace-height",
          Math.max(
            280,
            Math.min(innerHeight, main.getBoundingClientRect().bottom) -
              root.getBoundingClientRect().top -
              main.scrollTop,
          ) + "px",
        );
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [agent]);
  const crumbRecord = data?.actions.records.find((r) => r.id === selected);
  usePageTitle(
    edit?.variant === "page"
      ? `编辑${edit.record.type === "schedule" ? "日程" : "待办"}`
      : crumbRecord
        ? `${crumbRecord.type === "schedule" ? "日程" : "待办"}详情`
        : "日程与待办",
  );
  if (!data)
    return (
      <section
        id="personal-actions"
        className="main-inner pa-workspace"
        data-main-view="personal-actions"
      >
        <div className="pa-content">
          <p role="status">{error || "正在读取日程…"}</p>
        </div>
      </section>
    );
  const readonly = space !== "personal" && !!controller?.state && M.get(controller.state, space).status !== "active";
  const records = data.actions.records,
    record = records.find((r) => r.id === selected);
  const recordReadonly=readonly||!!record&&!canEditAsset(space,actor,record);
  const phase = record ? schedulePhase(record, now) : "unscheduled";
  const unscheduled = records.filter(
    (r) => r.type === "todo" && !r.start && assetActive(r),
  );
  const days = calendarRange(
    date,
    { day: "日", week: "周", month: "月" }[mode] || "日",
  );
  const visibleDays =
    mode === "month"
      ? days.filter((d) => d.slice(0, 7) === date.slice(0, 7))
      : days;
  const visible = records.filter((r) =>
    visibleDays.some((d) => actionOnDay(r, d)),
  );
  const title =
    mode === "day"
      ? `${date === day() ? "今天 · " : ""}${dayLabel(date)}`
      : mode === "week"
        ? `${dayLabel(days[0])} — ${dayLabel(days[6])}`
        : `${date.slice(0, 4)} 年 ${Number(date.slice(5, 7))} 月`;
  const rows = (d: string) =>
    records
      .filter((r) => actionOnDay(r, d))
      .sort((a, b) => a.start.localeCompare(b.start));
  const save = (r: ActionRecord, options?: ActionSaveOptions) => {
    const saved = repo.current!.actions.save(r, options);
    refresh();
    return saved;
  };
  const remove = (r: ActionRecord) => {
    repo.current!.actions.remove(r);
    setEdit(null);
    setSelected("");
    refresh();
    setNotice("已删除");
  };
  const toggle = (r: ActionRecord) => {
    try {
      save({ ...r, done: !r.done });
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  const transition = (next: () => void) =>
    navigationGuardRef.current ? navigationGuardRef.current(next) : next();
  const openDirect = (r: ActionRecord) => {
    assistSequence.current++;
    setAssistBusy(false);
    setAssist(undefined);
    setSelected(r.id);
    if (r.start) setDate(r.start.slice(0, 10));
    setAgent(false);
    setEdit(null);
  };
  const open = (r: ActionRecord) => transition(() => openDirect(r));
  const ask = (session = "") => {
    if (!session && agent) {
      document
        .querySelector<HTMLTextAreaElement>("#pa-prompt")
        ?.focus({ preventScroll: true });
      return;
    }
    transition(() => {
      setAssist(undefined);
      setAgentSession(session);
      setAgent(true);
    });
  };
  const prepareSchedule = (r: ActionRecord) => transition(() => {
    const sequence = ++assistSequence.current;
    setAssistBusy(true);
    readScheduleContext(marketStorage, marketConfig().id as "cn" | "global", space, actor, r.id).then(context => {
      if (sequence !== assistSequence.current) return;
      setAssist(context);
      setAgentSession(`schedule-assist:${r.id}:${sequence}`);
      setAgent(true);
    }).catch(error => { if (sequence === assistSequence.current) setNotice((error as Error).message); })
      .finally(() => { if (sequence === assistSequence.current) setAssistBusy(false); });
  });
  const askButton = (
    <PaButton action="agent" disabled={readonly} className="pa-ask-agent" onClick={() => ask()}>
      <span className="ws-agent-mark" aria-hidden="true">
        <RefIcon name="spark" />
      </span>
      <span>Ask Agent</span>
    </PaButton>
  );
  const startEdit = (r: ActionRecord) =>
    transition(() => {
      setEdit({ record: r, variant: "page" });
      setAgent(false);
    });
  const move = (n: number) => {
    if (mode === "month") {
      const d = new Date(date.slice(0, 7) + "-01T12:00:00Z");
      d.setUTCMonth(d.getUTCMonth() + n);
      setDate(d.toISOString().slice(0, 10));
    } else setDate(shiftDay(date, n * (mode === "week" ? 7 : 1)));
  };
  const card = (r: ActionRecord, compact = false) => {
    const source = space !== "personal" && r.ownerId && r.ownerId !== actor && r.sharedWith?.includes(actor)
      ? assetOwner(space, r.ownerId)
      : actionSource(r);
    const start = r.start ? localDate(r.start) : "";
    const end = r.end ? localDate(r.end) : "";
    const time = !start ? "未安排" : r.type === "schedule" && end
      ? `${start.slice(11)}-${start.slice(0, 10) === end.slice(0, 10) ? "" : end.slice(5, 10) + " "}${end.slice(11)}`
      : compact || start.slice(0, 10) === date ? start.slice(11) : start;
    return (
    <div
      key={r.id}
      className={`pa-calendar-entry ${r.type} ${r.done ? "is-done" : ""}`}
      data-owner={r.ownerId || actor}
      data-source={r.source}
    >
      {r.type === "todo" && (
        <button
          type="button"
          className="pa-complete"
          aria-pressed={r.done}
          data-pa="toggle"
          disabled={readonly||!canEditAsset(space,actor,r)}
          data-id={r.id}
          aria-label={`${r.done ? "重新打开" : "完成"} ${r.title}`}
          onClick={() => toggle(r)}
        >
          <span className="ui-todo-mark" aria-hidden="true">{r.done ? "✓" : ""}</span>
        </button>
      )}
      <button
        type="button"
        className="pa-list-row"
        data-personal-open={r.id}
        onClick={() => open(r)}
      >
        {compact && r.type === "schedule" ? <>
          <span className="pa-card-heading">
            <strong title={r.title}>{r.title}</strong>
            <span className="pa-card-origin" title={source}>{source}</span>
          </span>
          <time title={`${start}${end ? " — " + end : ""}`}>{time}</time>
        </> : <>
        <time>{time}</time>
        <span>
          <span className={!compact ? "pa-record-heading" : undefined}>
            <strong>{r.title}</strong>
            <span className="pa-record-meta"><span>{actionSource(r)}</span>{space!=="personal"&&<span>{assetOwner(space,r.ownerId)}{r.ownerId!==actor && r.sharedWith?.includes(actor) ? " · 共享给我" : ""}</span>}</span>
          </span>
          {!compact && (
            <small>{`${r.notes || r.location || r.capture || ""}${r.participants ? " · " + r.participants : ""}`}</small>
          )}
        </span>
        {!compact && (
          <span className="pa-source">
            {r.type === "schedule" ? "日程" : r.done ? "已完成" : "待办"}
          </span>
        )}
        </>}
      </button>
      <div className="pa-calendar-entry-actions">
      <AssetSharing {...{space,actor}} record={r} onSaved={refresh}/>
      <button
        type="button"
        className="pa-calendar-edit"
        data-pa="quick-edit"
        disabled={readonly||!canEditAsset(space,actor,r)}
        data-id={r.id}
        aria-label={`编辑 ${r.title}`}
        title="编辑"
        onClick={() => setEdit({ record: r, variant: "quick" })}
      >
        <span>编辑</span>
      </button>
      </div>
    </div>
  );
  };
  const allMeetings = space !== "personal" ? (controller?.state ? M.visible(M.get(controller.state, space), actor).filter((m) => !m.deleted) : []) : actor === "zhang" ? meetings.data?.meetings.filter((m) => !m.deletedAt) || [] : [];
  return (
    <section
      ref={host}
      id="personal-actions"
      className={`main-inner pa-workspace${agent ? " pa-with-agent" : ""}`}
      data-main-view="personal-actions"
    >
      <div className="pa-content">
        {edit?.variant === "page" ? (
          <ActionEditor
            space={space} actor={actor}
            record={edit.record}
            readOnly={readonly || !canEditAsset(space, actor, edit.record)}
            onDelete={remove}
            variant="page"
            onSave={(r,options) => {
              save(r,options);
              if (r.start) setDate(r.start.slice(0, 10));
              setNotice("已保存");
            }}
            onClose={() => setEdit(null)}
          />
        ) : record ? (
          <>
            <header className="pa-page-head">
              <div>
                <PaButton
                  action="back"
                  className="plain"
                  onClick={() =>
                    transition(() => {
                      assistSequence.current++;
                      setAssistBusy(false);
                      setAssist(undefined);
                      setAgent(false);
                      if (onBack) onBack();
                      else setSelected("");
                    })
                  }
                >
                  ← {onBack ? "全部闪念" : "日程与待办"}
                </PaButton>
                <h1>{record.title}</h1><span className="ex-owner">{assetOwner(space,record.ownerId)}</span>
                <span className="pa-source">{actionSource(record)}</span>
                {record.type === "todo" && (
                  <span className={`pa-status ${record.done ? "done" : ""}`}>
                    {record.done ? "已完成" : "待完成"}
                  </span>
                )}
              </div>
              <div>
                <AssetSharing {...{space,actor}} record={record} variant="button" onSaved={refresh}/>
                <PaButton action="edit" disabled={readonly||!canEditAsset(space,actor,record)} onClick={() => startEdit(record)}>
                  编辑
                </PaButton>
                {record.type === "schedule" && phase === "during" ? <PaButton action="schedule-assist" className="primary" disabled={readonly || assistBusy} onClick={() => prepareSchedule(record)}>{assistBusy ? "正在整理资料…" : scheduleAssistCopy.during.button}</PaButton> : askButton}
              </div>
            </header>
            <div className="pa-detail-grid">
              <div className="pa-detail-main">
                <section className="pa-card">
                  <h2>{record.type === "todo" ? "待办安排" : "日程安排"}</h2>
                  <dl>
                    <div>
                      <dt>
                        {record.type === "todo" ? "截止时间" : "日程时间"}
                      </dt>
                      <dd>
                        {`${localDate(record.start)}${record.type === "schedule" ? " — " + localDate(record.end) : ""}`}
                        <small>当前设备时区</small>
                      </dd>
                    </div>
                    {record.type === "schedule" && (
                      <>
                        <div>
                          <dt>地点</dt>
                          <dd>{record.location || "未设置"}</dd>
                        </div>
                        <div>
                          <dt>参与人</dt>
                          <dd>
                            {record.participants
                              ? record.participants
                                  .split(/[、,，]/)
                                  .filter(Boolean)
                                  .map((n, i) => (
                                    <span key={i} className="pa-person">
                                      {n.trim()}
                                    </span>
                                  ))
                              : "未设置"}
                          </dd>
                        </div>
                      </>
                    )}
                    <div>
                      <dt>提醒时间</dt>
                      <dd>
                        <PaButton
                          action="edit-reminder" disabled={recordReadonly}
                          className="plain"
                          onClick={() => startEdit(record)}
                        >
                          {reminders.find(
                            ([v]) => v === record.reminder,
                          )?.[1] || "不提醒"}
                        </PaButton>
                      </dd>
                    </div>
                  </dl>

                </section>
                {record.type === "schedule" && (phase === "before" || phase === "unscheduled") && <ScheduleAssistEntry phase={phase} disabled={readonly} busy={assistBusy} onClick={() => prepareSchedule(record)} />}
                <section className="pa-card">
                  <div className="pa-section-head">
                    <h2>我的备注</h2>
                    <PaButton
                      action="notes" disabled={recordReadonly}
                      onClick={() => {
                        setModalRecord(record);
                        setNote(record.notes);
                        setModal("notes");
                      }}
                    >
                      {record.notes ? "编辑备注" : "添加备注"}
                    </PaButton>
                  </div>
                  <p className="pa-note">
                    {record.notes || "记下需要确认的问题，或补充这次安排。"}
                  </p>
                </section>
                {record.type === "schedule" && (
                  <section className="pa-card">
                    <div className="pa-section-head">
                      <h2>
                        关联会议 <small>{record.links.length} 场</small>
                      </h2>
                      <PaButton
                        action="links" disabled={recordReadonly}
                        onClick={() => {
                          setModalRecord(record);
                          setModal("links");
                        }}
                      >
                        管理
                      </PaButton>
                    </div>
                    {record.links.length ? (
                      record.links.map((id) => {
                        const m = allMeetings.find((m) => m.id === id);
                        return m ? (
                          <PaButton
                            key={id}
                            action="meeting"
                            id={id}
                            className="pa-linked"
                            onClick={() =>
                              location.assign(appUrl("meeting", id))
                            }
                          >
                            <strong>{m.title}</strong>
                            <small>
                              {`${m.id.startsWith("meeting-") ? m.created.slice(0, 10) : m.created} · ${m.duration || ""} · ${m.source}${space !== "personal" ? ` · 会议创建人：${m.creator || ("owner" in m ? assetOwner(space, m.createdBy || m.previousOwner || m.owner) : "") || "未知创建人"}` : ""}`}
                            </small>
                          </PaButton>
                        ) : (
                          <p key={id} className="pa-hint">
                            关联会议已删除或暂不可用
                          </p>
                        );
                      })
                    ) : (
                      <p className="pa-hint">
                        关联已有会议，方便回顾会议纪要。
                      </p>
                    )}
                  </section>
                )}
                {record.type === "schedule" && phase === "after" && <ScheduleAssistEntry phase={phase} disabled={readonly} busy={assistBusy} onClick={() => prepareSchedule(record)} />}
                <footer className="pa-detail-footer">
                  {record.type === "todo" ? (
                    <PaButton
                      action="toggle" disabled={recordReadonly}
                      id={record.id}
                      className="primary"
                      onClick={() => toggle(record)}
                    >
                      {record.done ? "重新打开待办" : "标记完成"}
                    </PaButton>
                  ) : (
                    <PaButton
                      action="record" disabled={recordReadonly}
                      className="primary"
                      onClick={() => requestRecording(space === "personal" ? record.id : "")}
                    >
                      ♩ 开始录音
                    </PaButton>
                  )}
                  <small>
                    {record.type === "schedule"
                      ? space === "personal" ? "会议开始了？录音完成后会自动关联到此日程。" : "录音保存在当前工作区，完成后可通过管理关联会议。"
                      : "状态会同步到首页与全部闪念。"}
                  </small>
                </footer>
              </div>
              <aside className="pa-card pa-origin">
                <p className="pa-eyebrow">记录从哪里来</p>
                <h2>{actionSource(record)}</h2>
                {record.source === "manual" ? (
                  <p className="pa-hint">此记录由你手动创建，没有原始录音。</p>
                ) : record.source === "agent" ? (
                  <>
                    <p>由 Ask Agent 创建</p>
                    <PaButton
                      action="source-session"
                      id={
                        data.actions.sessions.find(
                          (s) => s.recordId === record.id,
                        )?.id
                      }
                      onClick={() =>
                        ask(
                          data.actions.sessions.find(
                            (s) => s.recordId === record.id,
                          )?.id,
                        )
                      }
                    >
                      查看来源会话
                    </PaButton>
                  </>
                ) : record.source !== "capture" ? (
                  <p className="pa-hint">来自{actionSource(record)}的日程记录。{record.notes}</p>
                ) : (
                  <>
                    <details open>
                      <summary>原始捕获</summary>
                      <p>{record.capture || record.detail || record.title}</p>
                      <small>{`捕获于 ${localDate(record.created)} · 已处理`}</small>
                      <CaptureAudio key={record.id} record={record} />

                    </details>
                    {record.type === "todo" && <PaButton action="recall" disabled={readonly} onClick={() => ask()}>
                      ✧ 回顾当时的上下文
                    </PaButton>}
                  </>
                )}
                <p className="pa-hint">
                  创建于 {localDate(record.created)}
                  <br />
                  保存在当前工作区；团队管理员可编辑和管理
                </p>
              </aside>
            </div>
          </>
        ) : (
          <>
            <header className="pa-page-head">
              <div>
                <h1>日程与待办</h1>
                <p>把会议与待办，安排进同一个工作节奏。</p>
              </div>
              <div>
                <PaButton
                  action="new-todo" disabled={readonly}
                  onClick={() =>
                    transition(() =>
                      setEdit({
                        record: newAction("todo", date),
                        variant: "create",
                      }),
                    )
                  }
                >
                  ＋ 新建待办
                </PaButton>
                <PaButton
                  action="new-schedule" disabled={readonly}
                  className="primary"
                  onClick={() =>
                    transition(() =>
                      setEdit({
                        record: newAction("schedule", date),
                        variant: "create",
                      }),
                    )
                  }
                >
                  ＋ 新建日程
                </PaButton>
                {askButton}
              </div>
            </header>
            <div className="pa-calendar-toolbar">
              <nav className="pa-view-tabs" aria-label="日历视图">
                {[
                  ["day", "日"],
                  ["week", "周"],
                  ["month", "月"],
                ].map(([v, label]) => (
                  <PaButton
                    key={v}
                    action="calendar-mode"
                    id={v}
                    aria-pressed={mode === v}
                    className={mode === v ? "selected" : ""}
                    onClick={() => setMode(v)}
                  >
                    {label}
                  </PaButton>
                ))}
              </nav>
              <div className="pa-calendar-dates">
                <PaButton action="calendar-prev" onClick={() => move(-1)}>
                  ‹
                </PaButton>
                <PaButton
                  action="calendar-today"
                  onClick={() => setDate(day())}
                >
                  今天
                </PaButton>
                <label className="pa-field">
                  选择日期
                  <input
                    name="calendarDate"
                    type="date"
                    value={date}
                    id="pa-calendar-date"
                    onChange={(e) => {
                      if (e.target.value) setDate(e.target.value);
                    }}
                  />
                </label>
                <PaButton action="calendar-next" onClick={() => move(1)}>
                  ›
                </PaButton>
              </div>
            </div>
            {unscheduled.length > 0 && <section className="pa-card pa-day-section" aria-label="未安排待办">
              <h2>
                未安排 <small>{unscheduled.length} 项待办</small>
              </h2>
              {unscheduled.map((r) => card(r))}
            </section>}
            <section className="pa-card pa-calendar">
              <div id="pa-list">
                <div className="pa-calendar-heading">
                  <h2>{title}</h2>
                  <p>
                    {visible.filter((r) => r.type === "schedule").length} 场日程
                    · {visible.filter((r) => r.type === "todo").length} 项待办
                  </p>
                </div>
                {mode === "day" ? (
                  ["schedule", "todo"].map((type) => (
                    <section className="pa-day-section" key={type}>
                      <h3>{type === "schedule" ? "日程" : "待办"}</h3>
                      {rows(date).filter((r) => r.type === type).length ? (
                        rows(date)
                          .filter((r) => r.type === type)
                          .map((r) => card(r))
                      ) : (
                        <p className="pa-empty">
                          这一天暂无{type === "schedule" ? "日程" : "待办"}
                        </p>
                      )}
                    </section>
                  ))
                ) : (
                  <div className="pa-calendar-scroll">
                    <div className={`pa-calendar-grid ${mode}`}>
                      {[
                        "周一",
                        "周二",
                        "周三",
                        "周四",
                        "周五",
                        "周六",
                        "周日",
                      ].map((t) => (
                        <div className="pa-week-label" key={t}>
                          {t}
                        </div>
                      ))}
                      {days.map((d) => (
                        <section
                          key={d}
                          className={`pa-calendar-cell ${d === day() ? "today" : ""} ${d.slice(0, 7) !== date.slice(0, 7) ? "outside" : ""}`}
                        >
                          <button
                            type="button"
                            className={`pa-day-number ${d === date ? "selected" : ""}`}
                            data-pa="calendar-day"
                            data-id={d}
                            aria-label={`查看 ${d}`}
                            onClick={() => {
                              setDate(d);
                              setMode("day");
                            }}
                          >
                            {Number(d.slice(8))}
                          </button>
                          {rows(d)
                            .slice(0, mode === "month" ? 3 : 50)
                            .map((r) => card(r, true))}
                          {rows(d).length > (mode === "month" ? 3 : 50) && (
                            <PaButton
                              action="calendar-day"
                              id={d}
                              className="plain"
                              onClick={() => {
                                setDate(d);
                                setMode("day");
                              }}
                            >
                              另有{" "}
                              {rows(d).length - (mode === "month" ? 3 : 50)} 项
                            </PaButton>
                          )}
                        </section>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
        <PersonalToast message={notice} onDone={() => setNotice("")} />
      </div>
      {agent && (
        <CalendarAgent
          key={agentSession}
          host={host}
          records={records}
          scope={
            record
              ? [record]
              : records.filter((r) => days.some((d) => actionOnDay(r, d)))
          }
          selected={record}
          assist={assist}
          onLoadAssist={assist ? () => readScheduleContext(marketStorage, marketConfig().id as "cn" | "global", space, actor, assist.record.id) : undefined}
          session={data.actions.sessions.find((s) => s.id === agentSession)}
          repo={repo.current!.actions}
          onRefresh={refresh}
          onClose={() => setAgent(false)}
          onOpen={openDirect}
          navigationGuardRef={navigationGuardRef}
        />
      )}
      {edit && edit.variant !== "page" && (
        <ActionEditor
          space={space} actor={actor}
          record={edit.record}
          readOnly={readonly || !canEditAsset(space, actor, edit.record)}
          onDelete={edit.variant === "create" ? undefined : remove}
          variant={edit.variant}
          onClose={() => setEdit(null)}
          onSave={(r,options) => {
            save(r,options);
            if (edit.variant === "create" && r.start)
              setDate(r.start.slice(0, 10));
            setNotice("已保存");
          }}
        />
      )}
      {modal === "notes" && record && (
        <PaModal
          title="我的备注"
          onClose={() =>
            setModal(
              note !== (modalRecord || record).notes ? "notes-guard" : null,
            )
          }
          onSave={() => {
            save({ ...(modalRecord || record), notes: note });
            setModal(null);
          }}
        >
          <label className="pa-field">
            只有你可以编辑这条备注
            <textarea
              name="notes"
              rows={7}
              maxLength={2000}
              placeholder="添加需要记住的内容"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <small>最多 2000 字</small>
          </label>
        </PaModal>
      )}
      {modal === "notes-guard" && record && (
        <PaModal
          title="保留备注修改？"
          onClose={() => setModal(null)}
          onSave={() => {
            save({ ...(modalRecord || record), notes: note });
            setModal(null);
          }}
        >
          <p>你有尚未保存的备注。</p>
          <PaButton action="drop-notes" onClick={() => setModal(null)}>
            放弃修改
          </PaButton>
        </PaModal>
      )}
      {modal === "links" && record && (
        <PaModal
          title="关联会议"
          confirm="确认关联"
          onClose={() => setModal(null)}
          onSave={(f) => {
            save({
              ...(modalRecord || record),
              links: new FormData(f).getAll("linked").map(String),
            });
            setModal(null);
          }}
        >
          <p>选择当前工作区中有权查看的会议，可同时关联多场。</p>
          <div className="pa-meeting-choices">
            {allMeetings.length ? (
              allMeetings.map((m) => (
                <label className="pa-meeting-choice" key={m.id}>
                  <input
                    type="checkbox"
                    name="linked"
                    value={m.id}
                    defaultChecked={record.links.includes(m.id)}
                  />
                  <span>
                    <strong>{m.title}</strong>
                    <small>{`${m.created} · ${m.source}${space !== "personal" ? ` · 会议创建人：${m.creator || ("owner" in m ? assetOwner(space, m.createdBy || m.previousOwner || m.owner) : "") || "未知创建人"}` : ""}`}</small>
                  </span>
                </label>
              ))
            ) : (
              <p>暂无可关联会议</p>
            )}
          </div>
        </PaModal>
      )}
    </section>
  );
}
