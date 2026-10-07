"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { DateFilter } from "@/components/ui/date-filter";
import { DataTable, type Column } from "@/components/ui/data-table";
import { legacyUrl } from "@/lib/routes";
import { filterMeetings } from "../model/selectors";
import type { Meeting } from "../model/types";
export function MeetingTable({
  meetings,
  recycled,
  setUploadDeleted,
  purgeUpload,
}: {
  meetings: Meeting[];
  recycled: Meeting[];
  setUploadDeleted: (id: string, deleted: boolean) => Promise<void>;
  purgeUpload: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState(""),
    [source, setSource] = useState("all"),
    [date, setDate] = useState(""),
    [limit, setLimit] = useState(10);
  const [recycle, setRecycle] = useState(false),
    [removed, setRemoved] = useState<Meeting[]>([]),
    [edit, setEdit] = useState<Meeting | null>(null),
    [deleting, setDeleting] = useState<Meeting | null>(null),
    [tag, setTag] = useState(""),
    [tags, setTags] = useState<Record<string, string>>({});
  const [permanent, setPermanent] = useState<Meeting | null>(null),
    [recycleQuery, setRecycleQuery] = useState(""),
    [recycleDate, setRecycleDate] = useState("");
  const [saveError, setSaveError] = useState(""),
    [busy, setBusy] = useState(false),
    [firstId, setFirstId] = useState(meetings[0]?.id);
  if (firstId !== meetings[0]?.id) {
    setFirstId(meetings[0]?.id);
    setQuery("");
    setDate("");
    setSource("all");
    setLimit(10);
  }
  async function remove(m: Meeting) {
    setBusy(true);
    try {
      await setUploadDeleted(m.id, true);
      if (!m.id.startsWith("upload-"))
        setRemoved((items) => [
          ...items,
          { ...m, deletedAt: new Date().toISOString() },
        ]);
      setDeleting(null);
      setSaveError("");
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function restore(m: Meeting) {
    try {
      await setUploadDeleted(m.id, false);
      setRemoved((items) => items.filter((r) => r.id !== m.id));
      setSaveError("");
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }
  async function purge(m: Meeting) {
    setBusy(true);
    try {
      await purgeUpload(m.id);
      setRemoved((items) => items.filter((r) => r.id !== m.id));
      setPermanent(null);
      setSaveError("");
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const active = meetings
    .filter((m) => !removed.some((r) => r.id === m.id))
    .map((m) => ({ ...m, tag: tags[m.id] ?? m.tag }));
  const rows = recycle
      ? filterMeetings(
          [...recycled, ...removed],
          recycleQuery,
          "all",
          recycleDate,
        )
      : filterMeetings(active, query, source, date),
    visible = rows.slice(0, limit);
  const updateFilter = (fn: () => void) => {
    fn();
    setLimit(10);
  };
  const columns: Column<Meeting>[] = [
    {
      key: "title",
      title: "文件名",
      render: (m) => (
        <a className="meeting-title" href={legacyUrl("meeting", m.id)}>
          <i>
            <Icon name="mic" />
          </i>
          <strong>{m.title}</strong>
        </a>
      ),
    },
    { key: "size", title: "文件大小", render: (m) => m.size },
    { key: "creator", title: "创建人", render: (m) => m.creator },
    { key: "source", title: "文件来源", render: (m) => m.source },
    {
      key: "tag",
      title: "标签",
      render: (m) => <span className="meeting-tag">{m.tag}</span>,
    },
    { key: "duration", title: "录音时长", render: (m) => m.duration },
    {
      key: "status",
      title: "文件状态",
      render: (m) => (
        <span
          className={
            m.status === "已总结" ? "status-success" : "status-pending"
          }
        >
          {m.status}
        </span>
      ),
    },
    { key: "created", title: "录音时间", render: (m) => m.created },
    { key: "updated", title: "更新时间", render: (m) => m.updated },
    {
      key: "actions",
      title: "操作",
      render: (m) =>
        recycle ? (
          <Button onClick={() => void restore(m)}>恢复</Button>
        ) : (
          <div className="meeting-actions">
            <Button
              variant="ghost"
              aria-label={`编辑${m.title}标签`}
              onClick={() => {
                setEdit(m);
                setTag(m.tag);
              }}
            >
              <Icon name="edit" />
            </Button>
            <Button
              variant="ghost"
              aria-label={`删除${m.title}`}
              onClick={() => setDeleting(m)}
            >
              <Icon name="trash" />
            </Button>
          </div>
        ),
    },
  ];
  const recycleColumns: Column<Meeting>[] = [
    { ...columns[0], render: (m) => <strong>{m.title}</strong> },
    columns[1],
    columns[3],
    { key: "recorded", title: "录音时间", render: (m) => m.created },
    {
      key: "deleted",
      title: "删除时间",
      render: (m) =>
        m.deletedAt
          ? new Date(m.deletedAt).toLocaleString("sv-SE").slice(0, 16)
          : "—",
    },
    {
      key: "recycle-actions",
      title: "操作",
      render: (m) => (
        <div className="meeting-actions">
          <Button variant="ghost" onClick={() => void restore(m)}>
            恢复
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSaveError("");
              setPermanent(m);
            }}
          >
            彻底删除
          </Button>
        </div>
      ),
    },
  ];
  return (
    <section
      className="meeting-card"
      aria-label={recycle ? "录音回收站" : "我的会议"}
    >
      <header className="meeting-head">
        <div>
          <h2>{recycle ? "录音回收站" : "我的会议"}</h2>
          <p>
            {recycle
              ? `共 ${rows.length} 项，30 天后自动删除`
              : `共 ${rows.length} 个会议笔记`}
          </p>
        </div>
        <div className="meeting-filters">
          {recycle ? (
            <>
              <label className="meeting-search">
                <Icon name="search" />
                <input
                  aria-label="搜索回收站录音"
                  placeholder="搜索录音"
                  value={recycleQuery}
                  onChange={(e) =>
                    updateFilter(() => setRecycleQuery(e.target.value))
                  }
                />
              </label>
              <label className="recycle-date">
                录音时间{" "}
                <input
                  type="date"
                  aria-label="筛选回收站录音日期"
                  value={recycleDate}
                  onChange={(e) =>
                    updateFilter(() => setRecycleDate(e.target.value))
                  }
                />
              </label>
              <Button
                onClick={() => {
                  setRecycle(false);
                  setLimit(10);
                }}
              >
                返回我的会议
              </Button>
            </>
          ) : (
            <>
              <label className="meeting-search">
                <Icon name="search" />
                <input
                  aria-label="搜索会议"
                  placeholder="搜索会议"
                  value={query}
                  onChange={(e) => updateFilter(() => setQuery(e.target.value))}
                />
              </label>
              <div className="source-filter">
                <select
                  aria-label="选择会议来源"
                  value={source}
                  onChange={(e) =>
                    updateFilter(() => setSource(e.target.value))
                  }
                >
                  <option value="all">全部来源</option>
                  {[...new Set(meetings.map((m) => m.source))].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                {source !== "all" ? (
                  <button
                    className="filter-clear"
                    aria-label="清除来源筛选"
                    onClick={() => updateFilter(() => setSource("all"))}
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <DateFilter
                value={date}
                onChange={(v) => updateFilter(() => setDate(v))}
                initialDate={meetings[0]?.date || "2026-09-02"}
              />
              <Button
                onClick={() => {
                  setRecycle(true);
                  setLimit(10);
                  setRecycleQuery("");
                  setRecycleDate("");
                }}
              >
                <Icon name="trash" />
                录音回收站
              </Button>
            </>
          )}
        </div>
      </header>
      {saveError ? (
        <p role="alert" className="form-error px-6">
          {saveError}
        </p>
      ) : null}
      <div className={recycle ? "recycle-table" : undefined}>
        <DataTable
          key={`${query}/${source}/${date}/${recycle}/${recycleQuery}/${recycleDate}`}
          columns={recycle ? recycleColumns : columns}
          rows={visible}
          label={recycle ? "录音回收站列表" : "会议列表"}
          onScroll={(e) => {
            const t = e.currentTarget;
            if (t.scrollTop + t.clientHeight >= t.scrollHeight - 20)
              setLimit((n) => Math.min(n + 10, rows.length));
          }}
          footer={
            <div className="meeting-load-status" aria-live="polite">
              {limit < rows.length ? (
                <Button onClick={() => setLimit(limit + 10)}>加载更多</Button>
              ) : (
                `已显示全部 ${rows.length} 条会议笔记`
              )}
            </div>
          }
        />
      </div>
      {edit ? (
        <Modal
          title="编辑标签"
          onClose={() => setEdit(null)}
          footer={
            <>
              <Button onClick={() => setEdit(null)}>取消</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setTags({ ...tags, [edit.id]: tag.trim() });
                  setEdit(null);
                }}
              >
                保存
              </Button>
            </>
          }
        >
          <Field
            label="标签"
            value={tag}
            maxLength={40}
            onChange={(e) => setTag(e.target.value)}
          />
        </Modal>
      ) : null}
      {deleting ? (
        <Modal
          title="删除会议"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button onClick={() => setDeleting(null)}>取消</Button>
              <Button
                variant="primary"
                disabled={busy}
                onClick={() => void remove(deleting)}
              >
                确认删除
              </Button>
            </>
          }
        >
          {saveError ? (
            <p role="alert" className="form-error">
              {saveError}
            </p>
          ) : null}
          <p>将「{deleting.title}」移至录音回收站？</p>
          <p className="muted">可以在录音回收站恢复。原型演示保留 30 天。</p>
        </Modal>
      ) : null}
      {permanent ? (
        <Modal
          title="彻底删除录音"
          onClose={() => setPermanent(null)}
          footer={
            <>
              <Button onClick={() => setPermanent(null)}>取消</Button>
              <Button
                variant="primary"
                disabled={busy}
                onClick={() => void purge(permanent)}
              >
                确认彻底删除
              </Button>
            </>
          }
        >
          {saveError ? (
            <p role="alert" className="form-error">
              {saveError}
            </p>
          ) : null}
          <p>确定彻底删除「{permanent.title}」？此操作无法恢复。</p>
        </Modal>
      ) : null}
    </section>
  );
}
