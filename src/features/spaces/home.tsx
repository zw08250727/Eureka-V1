"use client";
import "./team-home.css";
import { RecipientDialog } from "./sharing-settings";
import { TeamOverview } from "./team-overview";
import { ManagementDialog } from "./management-ui";
import { Fragment, useState } from "react";
import { M } from "./model/store";
import type { SpacesController } from "./use-spaces";
import type { WorkspaceFile } from "./model/types";
import { UploadDialog } from "@/features/workbench/components/upload-dialog";
import { RefIcon } from "@/features/reference/symbols";
import { validateUpload } from "@/features/workbench/model/local-repository";
import { appUrl } from "@/lib/routes";
import {
  Badge,
  date,
  WsButton as Button,
  WsDialog,
  WsRoot,
  WsToast,
} from "./billing-ui";
import { HomeFilter } from "./home-filters";
import { TeamHomeAgent } from "./home-agent";
export function TeamHome({
  controller,
  space,
  actor,
  trash = false,
  historyId,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  trash?: boolean;
  historyId?: string;
}) {
  const [query, setQuery] = useState(""),
    [source, setSource] = useState("all"),
    [dateFilter, setDate] = useState(""),
    [status, setStatus] = useState("all"),
    [memberFilter, setMemberFilter] = useState("all"),
    [page, setPage] = useState(1),
    [sortKey, setSortKey] = useState<"created" | "updated">("created"),
    [sortAsc, setSortAsc] = useState(false),
    [recycle, setRecycle] = useState(trash),
    [upload, setUpload] = useState(false),
    [note, setNote] = useState(false),
    [sharingId, setSharingId] = useState<string | null>(null),
    [deleting, setDeleting] = useState<WorkspaceFile | null>(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [agent, setAgent] = useState<{ insight?: string; key: number; prompt?: string } | null>(
      historyId ? { key: 0 } : null,
    );
  const w = M.get(controller.state!, space),
    report = w.status === "active" ? M.insights(w, actor) : { items: [] },
    now = new Date(),
    readonly = w.status !== "active";
  const files = recycle
    ? w.files.filter(
        (f) =>
          (f.owner === actor || M.admin(w, actor)) &&
          f.deleted &&
          (!f.deletedAt ||
            now.getTime() - new Date(f.deletedAt).getTime() < 30 * 86400000),
      )
    : M.visible(w, actor);
  const list = files
    .filter(
      (f) =>
        [f.title, f.summary, f.transcript].join(" ").toLowerCase().includes(query.toLowerCase()) &&
        (source === "all" || f.source === source) &&
        (memberFilter === "all" || f.owner === memberFilter) &&
        (!dateFilter || f.created.slice(0, 10) === dateFilter) &&
        (status === "all" || (f.status || "已总结") === status),
    )
    .sort(
      (a, b) =>
        String(a[sortKey] || "").localeCompare(
          String(b[sortKey] || ""),
          "zh-CN",
        ) * (sortAsc ? 1 : -1),
    );
  const pages = Math.max(1, Math.ceil(list.length / 10)),
    currentPage = Math.min(page, pages),
    rows = list.slice((currentPage - 1) * 10, currentPage * 10),
    columns = recycle
      ? ["文件名", "文件大小", "文件来源", "录音时间", "删除时间", "操作"]
      : [
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
        ];
  const sharingFile = w.files.find(f => f.id === sharingId && !f.deleted);
  const userName = (id: string) => w.members.find(m => m.id === id)?.name || "已移除成员";
  function guard(fn: () => void) {
    try {
      setError("");
      fn();
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      if (!deleting) setToast(msg);
    }
  }
  const icon = (name: string) => <RefIcon name={name} className="ws-icon" />;
  return (
    <>
      {sharingFile && <RecipientDialog key={sharingFile.id} w={w} actor={actor} owner={sharingFile.owner} initial={sharingFile.shared}
        title={`团队共享 · ${sharingFile.title}`} onClose={() => setSharingId(null)} onSave={users => {
          controller.change(s => M.share(M.get(s, space), sharingFile.id, users, actor, []));
          setSharingId(null);
          setToast("团队共享权限已保存");
        }} />}
      <WsRoot
        w={w}
        actor={actor}
        view={recycle ? "trash" : "home"}
        agent={
          agent ? (
            <TeamHomeAgent
              key={agent.key}
              controller={controller}
              space={space}
              actor={actor}
              insightId={agent.insight}
              initialPrompt={agent.prompt}
              initialHistoryId={historyId}
              onClose={() => setAgent(null)}
            />
          ) : undefined
        }
      >
        {!recycle && <TeamOverview now={now} workspace={w} actor={actor} insights={report.items} readOnly={readonly} agentOpen={!!agent}
          onAsk={() => { if (!readonly) setAgent(agent ? null : { key: Date.now() }); }}
          onInsight={id => setAgent({ insight: id, key: Date.now() })}
          onUpload={() => guard(() => { M.writable(w); setUpload(true); })}
          onNote={() => setNote(true)} />}
        <section className="ws-surface ws-recordings">
          <header className="ws-recording-head">
            <div>
              <h2>{recycle ? "录音回收站" : "团队会议"}</h2>
              <p>
                {recycle
                  ? "删除的录音可恢复，30 天后过期清理"
                  : "录音、转录与笔记 · 按当前身份权限展示"}
              </p>
            </div>
            <div className="ws-meeting-tools">
              <label className="ws-search">
                {icon("search")}
                <input
                  id="ws-file-search"
                  type="search"
                  placeholder="搜索录音、转录和笔记"
                  aria-label="搜索团队会议"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <HomeFilter
                kind="source"
                value={source}
                options={[
                  ...new Set([
                    "all",
                    "网页录音",
                    "合并录音",
                    "M1",
                    "W1",
                    "W2",
                    "W-PEN",
                    "文件上传",
                    "手动导入",
                    ...w.files.map((f) => f.source),
                  ]),
                ]}
                onChange={(v) => {
                  setSource(v);
                  setPage(1);
                }}
              />
              <HomeFilter
                kind="date"
                value={dateFilter}
                onChange={(v) => {
                  setDate(v);
                  setPage(1);
                }}
              />
              <select id="ws-meeting-member" aria-label="团队成员" value={memberFilter} onChange={e => { setMemberFilter(e.target.value); setPage(1); }}>
                <option value="all">全部团队成员</option>
                {w.members.filter(m => m.status === "active").map(m => <option key={m.id} value={m.id}>{m.name}{m.id === actor ? "（我）" : ""}</option>)}
              </select>
              <select
                id="ws-meeting-status"
                aria-label="会议状态"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                {["all", "已总结", "处理中", "待处理", "原始音频 · 待处理"].map((v) => (
                  <option key={v} value={v}>
                    {v === "all" ? "全部状态" : v}
                  </option>
                ))}
              </select>
              <Button
                action="recycle"
                onClick={() => {
                  setRecycle(!recycle);
                  setPage(1);
                  setQuery("");
                }}
              >
                {recycle ? "返回会议" : <>{icon("trash")}录音回收站</>}
              </Button>
            </div>
          </header>
          <div
            key={agent ? "agent-open" : "agent-closed"}
            className="ws-table-scroll ws-recording-scroll"
            role="region"
            aria-label="团队会议录音列表"
            tabIndex={0}
          >
            <table className="ws-table ws-recording-table">
              <thead>
                <tr>
                  {columns.map((t) => (
                    <th key={t}>
                      {["录音时间", "更新时间"].includes(t) ? (
                        <Button
                          action="sort"
                          value={t === "录音时间" ? "created" : "updated"}
                          className="link"
                          onClick={() => {
                            const next =
                              t === "录音时间" ? "created" : "updated";
                            setSortAsc(sortKey === next ? !sortAsc : false);
                            setSortKey(next);
                          }}
                        >
                          {t}
                          {sortKey ===
                          (t === "录音时间" ? "created" : "updated")
                            ? sortAsc
                              ? " ↑"
                              : " ↓"
                            : ""}
                        </Button>
                      ) : (
                        t
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {recycle ? (
                        f.title
                      ) : (
                        <button
                          className="ws-file-link"
                          data-ws-action="file"
                          data-value={f.id}
                          onClick={() =>
                            location.assign(
                              appUrl("meeting", f.id, space, actor),
                            )
                          }
                        >
                          {icon("mic")}
                          <strong>{f.title}</strong>
                        </button>
                      )}
                    </td>
                    <td>{f.size || "—"}</td>
                    {recycle ? (
                      <>
                        <td>{f.source}<small style={{ display: "block" }}>{f.owner !== actor ? (M.canEdit(w, f, actor) ? "管理员 · 可管理" : "共享给我 · 仅查看") : f.shared.length ? "已邀请成员" : "本人及管理员可见"}</small></td>
                        <td>{date(f.created)}</td>
                        <td>{date(f.deletedAt)}</td>
                        <td>
                          <div className="ws-actions">
                            <Button
                              action="restore"
                              disabled={readonly}
                              value={f.id}
                              className="link"
                              onClick={() =>
                                guard(() =>
                                  controller.change((s) =>
                                    M.trash(M.get(s, space), f.id, true, actor),
                                  ),
                                )
                              }
                            >
                              恢复
                            </Button>
                            <Button
                              action="purge"
                              disabled={readonly}
                              value={f.id}
                              className="link danger"
                              onClick={() => {
                                setError("");
                                setDeleting(f);
                              }}
                            >
                              永久删除
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{f.creator || userName(f.owner)}</td>
                        <td>{f.source}<small style={{ display: "block" }}>{f.owner !== actor ? (M.canEdit(w, f, actor) ? "管理员 · 可管理" : "共享给我 · 仅查看") : f.shared.length ? "已邀请成员" : "本人及管理员可见"}</small></td>
                        <td>
                          {(f.tags || []).map((t, i) => (
                            <Fragment key={`${t}-${i}`}>
                              {i ? " " : null}
                              <Badge>{t}</Badge>
                            </Fragment>
                          ))}
                        </td>
                        <td>
                          {f.origin === "upload" && !f.duration
                            ? "待识别"
                            : f.duration + " 分钟"}
                        </td>
                        <td>
                          <Badge
                            kind={
                              !f.status || f.status === "已总结"
                                ? "green"
                                : "amber"
                            }
                          >
                            {f.status || "已总结"}
                          </Badge>
                        </td>
                        <td>{date(f.created)}</td>
                        <td>{date(f.updated || f.created)}</td>
                        <td>
                          <div className="ws-actions">
                            {f.owner === actor && <Button action="team-share" value={f.id} className="link" disabled={readonly} onClick={() => setSharingId(f.id)}>共享</Button>}
                            {(f.owner === actor || M.admin(w, actor)) && !readonly ? (
                              <Button
                                action="delete"
                                value={f.id}
                                className="link danger"
                                onClick={() => {
                                  setError("");
                                  setDeleting(f);
                                }}
                              >
                                删除
                              </Button>
                            ) : (
                              <Badge>{M.canEdit(w, f, actor) ? "可编辑" : "只读"}</Badge>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!list.length ? (
            <div className="ws-empty">
              {icon("folder")}
              <h3>{recycle ? "回收站暂无内容" : "没有符合条件的会议"}</h3>
              <p>调整筛选，或开始一场新的录音。</p>
            </div>
          ) : null}
          <div className="ws-table-foot ws-pagination">
            <span>
              共 {list.length} 个会议笔记 · {currentPage} / {pages} 页
            </span>
            <div className="ws-actions">
              <Button
                action="list-prev"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                上一页
              </Button>
              <Button
                action="list-next"
                disabled={currentPage >= pages}
                onClick={() => setPage(currentPage + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </section>
      </WsRoot>
      <WsToast message={toast} onClear={() => setToast("")} />
      {note && <ManagementDialog title="新建笔记" form="note" onClose={() => setNote(false)} onSubmit={data => { const file = controller.change(s => M.addFile(M.get(s, space), { title: String(data.get("title")), source: "笔记", transcript: "", summary: String(data.get("body")), duration: 0 }, actor)); setNote(false); location.assign(appUrl("meeting", file.id, space, actor)); }} footer={<button className="ws-btn primary" type="submit">保存笔记</button>}><label className="ws-field">标题<input name="title" required maxLength={200} /></label><label className="ws-field">内容<textarea name="body" rows={6} maxLength={10000} /></label><p>默认本人及团队管理员可见，可在详情中逐条授权其他成员只读访问。</p></ManagementDialog>}
      {upload ? (
        <UploadDialog
          target={w.name}
          team
          onClose={() => setUpload(false)}
          onUpload={async (file) => {
            validateUpload(file);
            controller.change((s) => {
              const f = M.addFile(
                M.get(s, space),
                {
                  title: file.name.replace(/\.[^.]+$/, ""),
                  source: "文件上传",
                  duration: 0,
                  summary:
                    "音频已加入会议列表，等待转写处理。本地演示仅保存文件信息，未上传原音频，也未生成真实转写或总结。",
                  transcript:
                    "音频已加入会议列表，等待转写处理。本地演示仅保存文件信息，未上传原音频，也未生成真实转写或总结。",
                },
                actor,
              );
              f.origin = "upload";
              f.size =
                file.size < 1024
                  ? file.size + " B"
                  : file.size < 1048576
                    ? (file.size / 1024).toFixed(1) + " KB"
                    : (file.size / 1048576).toFixed(1) + " MB";
              f.status = "待处理";
              f.recordedWorkspaceId = space;
              Object.assign(f, { fileName: file.name });
              const current = M.get(s, space);
              if (current.audit[0])
                current.audit[0].action = "上传录音";
            });
            setRecycle(false);
            setQuery("");
            setSource("all");
            setDate("");
            setStatus("all");
            setPage(1);
          }}
        />
      ) : null}
      {deleting ? (
        <WsDialog
          title={recycle ? "永久删除录音？" : "移入回收站？"}
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
                onClick={() =>
                  guard(() => {
                    controller.change((s) =>
                      recycle
                        ? M.purge(M.get(s, space), deleting.id, actor)
                        : M.trash(M.get(s, space), deleting.id, false, actor),
                    );
                    setDeleting(null);
                  })
                }
              >
                确认
              </Button>
            </>
          }
        >
          <p>
            {recycle
              ? "永久删除后无法恢复，其他成员的访问也将失效。"
              : "此录音将从列表中移除，伙伴的访问权限也会暂时失效。30 天内可在录音回收站恢复。"}
          </p>
        </WsDialog>
      ) : null}
    </>
  );
}
