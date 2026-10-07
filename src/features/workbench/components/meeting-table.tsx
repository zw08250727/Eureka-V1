"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RefIcon } from "@/features/reference/symbols";
import { MeetingFilter } from "@/features/reference/meeting-filter";
import { appUrl } from "@/lib/routes";
import { filterMeetings } from "../model/selectors";
import type { Meeting } from "../model/types";
export function MeetingTable({
  meetings,
  recycled,
  setUploadDeleted,
  purgeUpload,
  recycle = false,
}: {
  meetings: Meeting[];
  recycled: Meeting[];
  setUploadDeleted: (id: string, deleted: boolean) => Promise<void>;
  purgeUpload: (id: string) => Promise<void>;
  setMeetingTag: (id: string, tag: string) => Promise<void>;
  recycle?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [source, setSource] = useState("all"),
    [date, setDate] = useState(""),
    [limit, setLimit] = useState(10),
    [deleting, setDeleting] = useState<Meeting | null>(null),
    [permanent, setPermanent] = useState<Meeting | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const modal = useRef<HTMLElement>(null),
    trigger = useRef<Element | null>(null);
  const rows = filterMeetings(
    recycle ? recycled : meetings,
    query,
    source,
    date,
  );
  const pending = permanent || deleting;
  useEffect(() => {
    if (!pending) return;
    trigger.current = document.activeElement;
    modal.current?.querySelector<HTMLElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeleting(null);
        setPermanent(null);
      }
      if (e.key === "Tab") {
        const nodes = [
          ...(modal.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ) || []),
        ];
        if (!nodes.length) return;
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0].focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      if (trigger.current instanceof HTMLElement)
        trigger.current.focus({ preventScroll: true });
    };
  }, [pending]);
  async function confirm() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      if (permanent) await purgeUpload(pending.id);
      else await setUploadDeleted(pending.id, true);
      setDeleting(null);
      setPermanent(null);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const change = (fn: () => void) => {
    fn();
    setLimit(10);
  };
  const overlay = pending
    ? createPortal(
        <>
          <div
            className="modal-mask show"
            onClick={() => {
              if (!busy) {
                setDeleting(null);
                setPermanent(null);
              }
            }}
          />
          <section
            ref={modal}
            className="modal delete-confirm-modal show"
            id={permanent ? "permanent-delete-modal" : "delete-confirm-modal"}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
          >
            <div className="modal-head">
              <h3 id="delete-confirm-title">
                {permanent ? "确认彻底删除？" : "确认删除录音文件？"}
              </h3>
              <button
                className="close-btn"
                disabled={busy}
                aria-label="关闭删除确认"
                onClick={() => {
                  setDeleting(null);
                  setPermanent(null);
                }}
              >
                <RefIcon name="x" />
              </button>
            </div>
            <div className="modal-body">
              <p>
                {permanent
                  ? "彻底删除后将无法恢复，请确认是否继续。"
                  : "删除后文件移入回收站，30 天内可恢复，超期永久删除；相关转写和 AI 总结一并移除。"}
              </p>
              {error ? <p role="alert">{error}</p> : null}
            </div>
            <div className="modal-foot">
              <button
                className="secondary-btn"
                disabled={busy}
                onClick={() => {
                  setDeleting(null);
                  setPermanent(null);
                }}
              >
                取消
              </button>
              <button
                className="danger-btn"
                id={
                  permanent
                    ? "permanent-delete-submit"
                    : "delete-confirm-submit"
                }
                type="button"
                disabled={busy}
                onClick={() => void confirm()}
              >
                {permanent ? "彻底删除" : "确定"}
              </button>
            </div>
          </section>
        </>,
        document.body,
      )
    : null;
  if (recycle)
    return (
      <>
        <section
          className="recycle-workspace recording-recycle"
          data-main-view="recycle-bin"
          aria-label="回收站"
        >
          <header className="recycle-header">
            <div className="recycle-heading">
              <span className="recycle-heading-mark">
                <RefIcon name="trash" />
              </span>
              <div>
                <h1 id="recycle-title">录音回收站</h1>
                <p id="recycle-description">
                  删除的录音及其转写、AI 总结可在 30 天内恢复，30
                  天后将被永久删除。
                </p>
              </div>
            </div>
            <button
              className="recycle-back"
              id="recycle-back"
              type="button"
              onClick={() => location.assign(appUrl("home"))}
            >
              <RefIcon name="chevron" />
              <span id="recycle-back-label">返回录音列表</span>
            </button>
          </header>
          <div
            className="recording-recycle-toolbar"
            id="recording-recycle-toolbar"
          >
            <strong id="recording-recycle-summary">
              共 {rows.length} 项，30 天后自动删除
            </strong>
            <div className="recording-recycle-filters">
              <label>
                <span>录音时间</span>
                <input
                  id="recording-recycle-date"
                  type="date"
                  aria-label="筛选回收站录音日期"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="recording-recycle-search">
                <RefIcon name="search" />
                <input
                  id="recording-recycle-search"
                  type="search"
                  placeholder="搜索录音"
                  aria-label="搜索录音"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="recycle-table-head" id="recycle-table-head">
            {[
              "文件名",
              "文件大小",
              "文件来源",
              "录音时间",
              "删除时间",
              "操作",
            ].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div id="recycle-list">
            {rows.map((m) => (
              <div className="recycle-row" key={m.id} data-recycle-id={m.id}>
                <span className="recycle-file">
                  <span className="recycle-file-mark">
                    <RefIcon name="mic" />
                  </span>
                  <strong>{m.title}</strong>
                </span>
                <span>{m.size}</span>
                <span className="recycle-recording-source">{m.source}</span>
                <span>{m.created}</span>
                <span>
                  {m.deletedAt
                    ? new Intl.DateTimeFormat("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                        .format(new Date(m.deletedAt))
                        .replace("/", "-")
                    : "—"}
                </span>
                <span className="recycle-actions">
                  <button
                    type="button"
                    data-recycle-action="restore"
                    onClick={() =>
                      void setUploadDeleted(m.id, false).catch((e) =>
                        setError(e.message),
                      )
                    }
                  >
                    恢复
                  </button>
                  <button
                    type="button"
                    data-recycle-action="permanent"
                    onClick={() => setPermanent(m)}
                  >
                    彻底删除
                  </button>
                </span>
              </div>
            ))}
          </div>
          {!rows.length ? (
            <div className="recycle-empty" id="recycle-empty">
              回收站暂无内容
            </div>
          ) : null}
          {error && !pending ? <p role="alert">{error}</p> : null}
        </section>
        {overlay}
      </>
    );
  return (
    <>
      <section
        className="home-meeting-library"
        id="recording-card"
        aria-labelledby="recent-meeting-title"
      >
        <div className="home-meeting-head">
          <div className="meeting-library-copy">
            <h2 id="recent-meeting-title">我的会议</h2>
            <p id="meeting-view-description">共 {rows.length} 个会议笔记</p>
          </div>
          <div className="home-meeting-toolbar" id="meeting-toolbar">
            <label className="meeting-search">
              <RefIcon name="search" />
              <input
                id="meeting-search"
                type="search"
                placeholder="搜索会议"
                aria-label="搜索会议"
                value={query}
                onChange={(e) => change(() => setQuery(e.target.value))}
              />
            </label>
            <MeetingFilter
              id="meeting-source-filter"
              kind="source"
              value={source}
              onChange={(v) => change(() => setSource(v))}
            />
            <MeetingFilter
              id="meeting-date-filter"
              kind="date"
              value={date}
              onChange={(v) => change(() => setDate(v))}
            />
            <button
              className="recording-recycle-entry"
              id="recording-recycle-entry"
              type="button"
              onClick={() => location.assign(appUrl("trash"))}
            >
              <RefIcon name="trash" />
              <span>录音回收站</span>
            </button>
          </div>
        </div>
        <div
          className="meeting-table-scroll"
          id="meeting-table-scroll"
          role="region"
          aria-label="会议列表，可滚动查看更多"
          tabIndex={0}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20)
              setLimit((n) => Math.min(n + 10, rows.length));
          }}
        >
          <div className="home-meeting-table-head">
            {[
              "文件名",
              "文件大小",
              "创建人",
              "文件来源",
              "标签",
              "录音时长",
              "文件状态",
              "录音时间",
              "更新时间",
              "操作",
            ].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="home-meeting-table" id="meeting-list">
            {rows.slice(0, limit).map((m, i) => (
              <div
                className="meeting-row home-meeting-row"
                id={i === 0 ? "view-panorama" : undefined}
                key={m.id}
                role="button"
                tabIndex={0}
                data-meeting-id={m.id}
                data-meeting={m.title}
                data-source={m.source}
                data-view="my"
                data-recording-date={m.date}
                onClick={() => location.assign(appUrl("meeting", m.id))}
                onKeyDown={(e) => {
                  if (
                    (e.key === "Enter" || e.key === " ") &&
                    e.target === e.currentTarget
                  ) {
                    e.preventDefault();
                    location.assign(appUrl("meeting", m.id));
                  }
                }}
              >
                <span className="home-meeting-title">
                  <i>
                    <RefIcon name="mic" />
                  </i>
                  <span>
                    <strong>{m.title}</strong>
                    <small>会议记录</small>
                  </span>
                </span>
                <span className="home-meeting-size">{m.size}</span>
                <span className="meeting-creator">{m.creator}</span>
                <span>{m.source}</span>
                <span className="home-meeting-tag" title={m.tag}>
                  {m.tag}
                </span>
                <span>{m.duration}</span>
                <span
                  className={
                    "home-meeting-status " +
                    (m.status === "已总结"
                      ? "ready"
                      : m.status === "处理中"
                        ? "processing"
                        : "")
                  }
                >
                  <i />
                  {m.status}
                </span>
                <span className="home-meeting-time">{m.created}</span>
                <span className="home-meeting-updated">{m.updated}</span>
                <span className="meeting-row-actions">
                  <button
                    type="button"
                    data-meeting-action="tag"
                    onClick={(e) => {
                      e.stopPropagation();
                      location.assign(appUrl("meeting", m.id) + "&dialog=info");
                    }}
                  >
                    编辑标签
                  </button>
                  <button
                    className="meeting-delete"
                    type="button"
                    data-meeting-action="delete"
                    aria-label="删除会议"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(m);
                    }}
                  >
                    <RefIcon name="trash" />
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div
            className="meeting-filter-empty"
            id="meeting-filter-empty"
            hidden={rows.length > 0}
          >
            没有找到匹配的会议
          </div>
          <div className="meeting-load-footer">
            <span id="meeting-load-status" role="status" aria-live="polite">
              {rows.length === 0
                ? ""
                : limit < rows.length
                  ? `已显示 ${Math.min(limit, rows.length)} / ${rows.length} 条 · 向上滑动加载更多`
                  : `已显示全部 ${rows.length} 条会议笔记`}
            </span>
            <button
              id="meeting-load-more"
              type="button"
              hidden={limit >= rows.length}
              onClick={() => setLimit(limit + 10)}
            >
              加载更多
            </button>
          </div>
        </div>
      </section>
      {overlay}
    </>
  );
}
