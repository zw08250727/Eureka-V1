"use client";
import { useState } from "react";
import { M } from "./model/store";
import type { AutomaticTask } from "./model/types";
import type { SpacesController } from "./use-spaces";
import { TeamHome } from "./home";
import { Workbench } from "@/features/workbench/workbench";
import { appUrl } from "@/lib/routes";
import {
  ManagementRoot,
  ManagementButton as Button,
  ManagementIcon as Icon,
  ManagementDialog as Dialog,
  ManagementToast,
  managementDate,
} from "./management-ui";
import { PersonalHistoryAgent, TeamHistoryAgent } from "./management-history";
export { PersonalHistoryAgent, TeamHistoryAgent } from "./management-history";
export function AutomaticTaskDialog({
  controller,
  space,
  actor,
  id = "",
  onClose,
  onHistory,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  id?: string;
  onClose: () => void;
  onHistory?: (id: string) => void;
}) {
  const w = M.get(controller.state!, space),
    task = M.scheduledTasks(w, actor).find((t) => t.id === id) as
      (AutomaticTask & { lastRun?: string }) | undefined;
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  function history(id: string) {
    if (onHistory) onHistory(id);
    else location.assign(appUrl("history", id, space, actor));
  }
  function owned(target: typeof w) {
    if (!M.member(target, actor)) throw Error("无权访问当前工作空间");
    const t = M.scheduledTasks(target, actor).find((t) => t.id === id);
    if (!t) throw Error("自动任务不存在或无权访问");
    return t;
  }
  if (id && !task)
    return (
      <Dialog
        title="自动任务"
        onClose={onClose}
        error="自动任务不存在或无权访问"
      >
        {null}
      </Dialog>
    );
  return (
    <>
      <Dialog
        key={revision}
        title={task ? "自动任务" : "新建自动任务"}
        form="auto-task"
        onClose={onClose}
        error={error}
        onSubmit={(f) => {
          controller.change((s) => {
            const target = M.get(s, space);
            if (id) owned(target);
            return M.saveTask(
              target,
              {
                id: id || undefined,
                title: String(f.get("title")),
                prompt: String(f.get("prompt")),
                frequency: String(f.get("frequency")) as "daily" | "weekly",
                time: String(f.get("time")),
              },
              actor,
            );
          });
          onClose();
        }}
        footer={
          <>
            <Button action="close-dialog" onClick={onClose}>
              取消
            </Button>
            <button className="ws-btn primary" type="submit">
              保存任务
            </button>
          </>
        }
      >
        <input type="hidden" name="id" value={id} />
        <label className="ws-field">
          任务名称
          <input
            name="title"
            type="text"
            defaultValue={task?.title || ""}
            required
            maxLength={80}
          />
        </label>
        <label className="ws-field">
          任务要求
          <textarea
            name="prompt"
            required
            maxLength={2000}
            defaultValue={task?.prompt || ""}
          />
        </label>
        <div className="ws-two-fields">
          <label className="ws-field">
            重复频率
            <select name="frequency" defaultValue={task?.frequency || "weekly"}>
              <option value="daily">每天</option>
              <option value="weekly">每周五</option>
            </select>
          </label>
          <label className="ws-field">
            执行时间（GMT+8）
            <input
              name="time"
              type="time"
              defaultValue={task?.time || "09:00"}
              required
            />
          </label>
        </div>
        <p className="ws-muted">
          仅本人可见。基于当前团队可访问的会议；本地模拟不在后台定时执行，可点击“模拟运行”预览结果，按实际输入与输出
          Token 用量模拟扣减 Credits。
        </p>
        {task ? (
          <>
            <p className="ws-muted">
              状态：{task.enabled ? "已启用" : "已暂停"} · 最近运行：
              {task.lastRun || "尚未运行"}
            </p>
            <div className="ws-actions">
              <Button
                action="auto-toggle"
                value={id}
                onClick={() => {
                  try {
                    controller.change((s) => {
                      const target = M.get(s, space);
                      M.writable(target);
                      const t = owned(target);
                      t.enabled = !t.enabled;
                    });
                    setError("");
                    setRevision((r) => r + 1);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {task.enabled ? "暂停任务" : "启用任务"}
              </Button>
              <Button
                action="auto-run"
                value={id}
                disabled={!task.enabled}
                onClick={() => {
                  try {
                    const result = controller.change((s) =>
                      M.runTask(M.get(s, space), id, actor),
                    ) as { threadId?: string; answer: string };
                    if (result.threadId) history(result.threadId);
                    else setNotice(result.answer);
                    setError("");
                  } catch (e) {
                    setNotice((e as Error).message);
                  }
                }}
              >
                模拟运行
              </Button>
            </div>
            {(task.runs || []).slice(0, 3).map((r, i) => (
              <p key={`${r.time}-${i}`}>
                {r.time}{" "}
                {M.history(w, actor).some((h) => h.id === r.threadId) ? (
                  <Button
                    action="history"
                    value={r.threadId}
                    className="link"
                    onClick={() => history(r.threadId!)}
                  >
                    查看结果
                  </Button>
                ) : (
                  <span className="ws-muted">会话已删除或不可访问</span>
                )}
              </p>
            ))}
          </>
        ) : null}
      </Dialog>
      <ManagementToast message={notice} />
    </>
  );
}
export function TeamTaskList({
  controller,
  space,
  actor,
  activeId = "",
  onHistory,
  onTask,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  activeId?: string;
  onHistory?: (id: string) => void;
  onTask?: (id: string) => void;
}) {
  const [tab, setTab] = useState("all"),
    [deleting, setDeleting] = useState<{ id: string; type: string } | null>(
      null,
    ),
    [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const w = M.get(controller.state!, space),
    threads = M.history(w, actor),
    parents = new Set(threads.map((t) => t.parentThreadId).filter(Boolean));
  const history = threads
    .filter((t) => !parents.has(t.id))
    .map((t) => ({
      id: t.id,
      title: t.title || t.prompt,
      time: managementDate(t.time).slice(5),
      type: "history",
    }));
  const tasks = M.scheduledTasks(w, actor).map((t) => ({
    id: t.id,
    title: t.title,
    time: t.enabled ? t.time : "已暂停",
    type: "auto-task",
  }));
  const rows = tab === "all" ? [...history, ...tasks] : tasks;
  function openHistory(id: string) {
    if (onHistory) onHistory(id);
    else location.assign(appUrl("history", id, space, actor));
  }
  function openTask(id: string) {
    if (onTask) onTask(id);
    else setEditing(id);
  }
  return (
    <div id="ws-history">
      <div className="ws-nav-label">历史会话</div>
      <div className="history-tabs" role="tablist" aria-label="团队任务分类">
        {[
          ["all", "全部任务"],
          ["scheduled", "自动任务"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={`history-tab ${tab === id ? "active" : ""}`}
            data-ws-action="history-tab"
            data-value={id}
            role="tab"
            aria-selected={tab === id}
            aria-controls="ws-task-list"
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id="ws-task-list"
        role="tabpanel"
        aria-label={tab === "all" ? "全部任务" : "自动任务"}
      >
        {rows.map((t) => (
          <div className="ws-history-row" key={t.id}>
            <Button
              action={t.type}
              value={t.id}
              className={activeId === t.id ? "active" : ""}
              title={t.title}
              aria-current={activeId === t.id ? "true" : undefined}
              onClick={() =>
                t.type === "history" ? openHistory(t.id) : openTask(t.id)
              }
            >
              <Icon name={t.type === "history" ? "chat" : "clock"} />
              <span className="ws-history-title">{t.title}</span>
              <time>{t.time}</time>
            </Button>
            <Button
              action={t.type === "history" ? "history-delete" : "auto-delete"}
              value={t.id}
              className="ws-history-delete"
              aria-label={`删除${t.type === "history" ? "会话" : "自动任务"}：${t.title}`}
              onClick={() => {
                setError("");
                setDeleting(t);
              }}
            >
              <Icon name="trash" />
            </Button>
          </div>
        ))}
        {!rows.length ? <p className="ws-muted">暂无会话或自动任务</p> : null}
      </div>
      {tab === "scheduled" ? (
        <Button
          action="auto-new"
          className="ws-auto-new"
          onClick={() => openTask("")}
        >
          <Icon name="plus" />
          新建自动任务
        </Button>
      ) : null}
      {editing !== null ? (
        <AutomaticTaskDialog
          controller={controller}
          space={space}
          actor={actor}
          id={editing}
          onClose={() => {
            setEditing(null);
          }}
          onHistory={(id) => {
            setEditing(null);
            openHistory(id);
          }}
        />
      ) : null}
      {deleting ? (
        <Dialog
          title={deleting.type === "history" ? "删除会话？" : "删除自动任务？"}
          onClose={() => setDeleting(null)}
          error={error}
          footer={
            <>
              <Button action="close-dialog" onClick={() => setDeleting(null)}>
                取消
              </Button>
              <Button
                action="confirm"
                className="primary"
                onClick={() => {
                  try {
                    controller.change((s) => {
                      const target = M.get(s, space);
                      if (deleting.type === "history")
                        M.deleteConversation(target, deleting.id, actor);
                      else {
                        if (
                          !M.member(target, actor) ||
                          !M.scheduledTasks(target, actor).some(
                            (t) => t.id === deleting.id,
                          )
                        )
                          throw Error("自动任务不存在或无权访问");
                        target.automaticTasks = target.automaticTasks.filter(
                          (t) => t.id !== deleting.id,
                        );
                      }
                    });
                    setNotice(
                      deleting.type === "history"
                        ? "会话已删除"
                        : "自动任务已删除",
                    );
                    setDeleting(null);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                确认
              </Button>
            </>
          }
        >
          <p>
            {deleting.type === "history"
              ? "此会话及其续聊记录将一并删除，原始会议录音不受影响。"
              : "停止该自动任务，已生成的历史会话仍保留。"}
          </p>
        </Dialog>
      ) : null}
      <ManagementToast message={notice} />
    </div>
  );
}
export function HistoryPage({
  controller,
  space,
  actor,
  id,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  id: string;
}) {
  const w = M.get(controller.state!, space),
    close = () => location.assign(appUrl("home", "", space, actor));
  return w.type === "team" ? (
    <ManagementRoot
      w={w}
      actor={actor}
      rail={
        <TeamHistoryAgent
          key={id}
          controller={controller}
          space={space}
          actor={actor}
          id={id}
          onClose={close}
        />
      }
    />
  ) : (
    <div className="main-inner" data-main-view="home">
      <div className="meeting-agent-grid agent-open" id="meeting-agent-grid">
        <PersonalHistoryAgent key={id} id={id} onClose={close} />
      </div>
    </div>
  );
}
export function TasksPage({
  controller,
  space,
  actor,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
}) {
  const w = M.get(controller.state!, space);
  const id =
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(location.search).get("id") || "";
  return (
    <>
      {w.type === "team" ? (
        <TeamHome controller={controller} space={space} actor={actor} />
      ) : (
        <Workbench />
      )}
      <AutomaticTaskDialog
        controller={controller}
        space={space}
        actor={actor}
        id={id}
        onClose={() => location.assign(appUrl("home", "", space, actor))}
      />
    </>
  );
}
