"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePersonal } from "./use-personal";
import { appUrl } from "@/lib/routes";
import { RefIcon } from "@/features/reference/symbols";
import {
  ContactCard,
  ContactDetail,
  ContactLine,
  ContactTag,
} from "./contact-detail";
import {
  ContactAgent,
  ContactAgentEntry,
  contactAnswer,
} from "./contact-agent";
import { ContactDialog, type ContactDialogKind } from "./contact-dialog";

function ContactButton({
  children,
  action,
  value = "",
  primary = false,
  onClick,
}: {
  children: ReactNode;
  action: string;
  value?: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`contacts-button${primary ? " primary" : ""}`}
      data-contact-action={action}
      data-value={value}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function ContactsPage({ id }: { id: string }) {
  const { data, error, repo, refresh } = usePersonal();
  const [selected, setSelected] = useState(id || "john");
  const [detail, setDetail] = useState(Boolean(id));
  const [tab, setTab] = useState("概览");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ContactDialogKind | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [answer, setAnswer] = useState("");
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState("");
  const viewRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const entryRef = useRef<HTMLButtonElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function resetContentScroll() {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }
  // The reference replaces its content scroller on each page/tab render.
  // Retain that visible behavior while keeping the React element stable.
  useLayoutEffect(resetContentScroll, [
    selected,
    detail,
    tab,
    query,
    answer,
    data?.contacts,
  ]);
  useEffect(() => {
    const view = viewRef.current!;
    const main = view.closest(".main");
    const fit = () => {
      const value = `${view.getBoundingClientRect().top + (main?.scrollTop || 0)}px`;
      if (view.style.getPropertyValue("--contacts-top") !== value)
        view.style.setProperty("--contacts-top", value);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(view);
    const topbar = main?.querySelector(".topbar");
    if (topbar) observer.observe(topbar);
    window.addEventListener("resize", fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  function toggleAgent() {
    setExpanded(!expanded);
    requestAnimationFrame(() =>
      (expanded ? entryRef.current : inputRef.current)?.focus({
        preventScroll: true,
      }),
    );
  }
  const state = data?.contacts;
  const person =
    state?.contacts.find((c) => c.id === selected) || state?.contacts[0];
  const people =
    state?.contacts.filter((c) =>
      [c.name, c.company, c.role, c.summary, c.region, ...(c.themes || [])]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    ) || [];
  const notes = person ? state?.notes[person.id] || [] : [];
  const tasks = person
    ? state?.tasks.filter(
        (t) => t.contactId === person.id || t.contactId === person.name,
      ) || []
    : [];
  function save(values: FormData) {
    const kind = modal;
    const contactId = String(values.get("person") || "");
    const createdId = repo.current!.contacts.change((all) => {
      const s = all.personal;
      if (kind === "add") {
        const name = String(values.get("name") || "").trim();
        if (!name) throw Error("请填写联系人姓名");
        if (s.contacts.some((p) => p.name === name))
          throw Error("联系人已存在");
        const record = {
          id: `contact-${Date.now()}`,
          initials: name.slice(0, 2),
          name,
          company: String(values.get("company") || "待补充").trim(),
          role: String(values.get("role") || "待补充").trim(),
          summary: String(values.get("summary") || "").trim(),
          tag: "最近",
          count: 0,
          recent: "刚刚",
          region: "待补充",
          email: "待补充",
          themes: [],
          memories: [],
          inferences: [],
        };
        s.contacts.push(record);
        return record.id;
      }
      if (!s.contacts.some((p) => p.id === contactId))
        throw Error("联系人已更新，请重新打开后编辑。");
      if (kind === "note") {
        const text = String(values.get("text") || "").trim();
        if (!text) throw Error("备注内容不能为空");
        (s.notes[contactId] ??= []).unshift({
          text,
          time: new Date().toLocaleString("zh-CN"),
        });
      } else if (kind === "followup") {
        const title = String(values.get("title") || "").trim();
        if (!title) throw Error("请填写任务标题");
        s.tasks.unshift({
          id: `contact-task-${Date.now()}`,
          contactId,
          title,
          description: String(values.get("description") || ""),
          owner: String(values.get("owner") || ""),
          createdAt: new Date().toLocaleString("zh-CN"),
        });
      }
    });
    refresh();
    setModal(null);
    setAnswer("");
    if (kind === "add") {
      setSelected(createdId!);
      setDetail(false);
    }
    if (kind === "note") {
      setDetail(true);
      setTab("记忆");
    }
    setToast(kind === "followup" ? "跟进任务已创建" : "联系人信息已保存");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }
  return (
    <section
      ref={viewRef}
      className="contacts-workspace"
      data-main-view="contacts"
      aria-hidden="false"
      aria-label="联系人"
      onKeyDown={(e) => {
        if (e.key === "Escape" && expanded && !modal) {
          e.preventDefault();
          toggleAgent();
        }
      }}
    >
      <div id="contacts-root">
        {!state ? (
          <div className="contacts-empty" role={error ? "alert" : "status"}>
            {error || "正在读取联系人…"}
          </div>
        ) : (
          <div className="contacts-shell">
            <div ref={contentRef} className="contacts-content">
              <div className="contacts-main">
                <header className="contacts-head">
                  <div>
                    <div className="contacts-breadcrumb">
                      <button
                        type="button"
                        data-contact-action="back-library"
                        onClick={() => location.assign(appUrl("home"))}
                      >
                        首页
                      </button>
                      <span>/</span>
                      <span>联系人</span>
                    </div>
                    <h1>{detail && person ? "联系人详情" : "联系人"}</h1>
                    <p>
                      {detail && person
                        ? "保留关系上下文，方便继续跟进与交给 Agent 处理。"
                        : "管理联系人关系、互动记录与待跟进事项。"}
                    </p>
                  </div>
                  <div className="contacts-actions">
                    {detail && person ? (
                      <>
                        <ContactButton
                          action="list"
                          onClick={() => {
                            setDetail(false);
                            setAnswer("");
                          }}
                        >
                          ← 返回联系人
                        </ContactButton>
                        <ContactButton
                          action="note"
                          value={person.id}
                          onClick={() => setModal("note")}
                        >
                          ＋ 添加备注
                        </ContactButton>
                        <ContactButton
                          action="followup"
                          value={person.id}
                          primary
                          onClick={() => setModal("followup")}
                        >
                          创建跟进
                        </ContactButton>
                      </>
                    ) : (
                      <ContactButton
                        action="add"
                        primary
                        onClick={() => setModal("add")}
                      >
                        ＋ 添加联系人
                      </ContactButton>
                    )}
                    <ContactAgentEntry
                      expanded={expanded}
                      onToggle={toggleAgent}
                      buttonRef={entryRef}
                    />
                  </div>
                </header>
                {detail && person ? (
                  <>
                    <div className="contacts-profile">
                      <span className="contacts-avatar large">
                        {person.initials}
                      </span>
                      <div>
                        <h1>
                          {person.name} <ContactTag>{person.tag}</ContactTag>
                        </h1>
                        <p>
                          {`${person.role} · ${person.company}${person.id === "john" ? " · 德国业务" : ""}`}
                        </p>
                        <p>
                          {`最近互动：${person.recent}${person.id === "john" ? " · 首次认识：2026/06/12" : ""}`}
                        </p>
                      </div>
                    </div>
                    <div className="contacts-metrics">
                      {[
                        [person.count, "互动"],
                        [notes.length, "备注"],
                        [(person.commitments || []).length, "开放承诺"],
                        [(person.themes || []).length, "活跃主题"],
                      ].map(([value, label]) => (
                        <div key={label}>
                          <strong>{value}</strong>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                    <div
                      className="contacts-tabs detail"
                      role="tablist"
                      aria-label="联系人详情"
                    >
                      {["概览", "时间线", "承诺", "主题", "记忆"].map(
                        (item) => (
                          <button
                            key={item}
                            type="button"
                            role="tab"
                            aria-selected={tab === item}
                            data-contact-action="tab"
                            data-value={item}
                            onClick={() => {
                              resetContentScroll();
                              setTab(item);
                            }}
                          >
                            {item}
                          </button>
                        ),
                      )}
                    </div>
                    <ContactDetail
                      person={person}
                      notes={notes}
                      tab={tab}
                      onFollowup={() => setModal("followup")}
                    />
                    {tasks.length ? (
                      <ContactCard title="跟进任务">
                        {tasks.map((task) => (
                          <ContactLine key={task.id} title={task.title}>
                            {task.owner} · {task.createdAt}
                            <br />
                            {task.description || ""}
                          </ContactLine>
                        ))}
                      </ContactCard>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="contacts-toolbar">
                      <label className="contacts-search">
                        <RefIcon name="search" />
                        <input
                          id="contacts-search"
                          type="search"
                          aria-label="搜索联系人"
                          placeholder="搜索姓名、公司、角色、主题…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <span className="contacts-toolbar-hint">
                        共 {people.length} 位联系人
                      </span>
                    </div>
                    <div className="contacts-grid">
                      {people.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="contacts-person-card"
                          data-contact-action="person"
                          data-value={p.id}
                          onClick={() => {
                            setSelected(p.id);
                            setDetail(true);
                            setTab("概览");
                            setAnswer("");
                            setDraft("");
                          }}
                        >
                          <span className="contacts-person">
                            <span className="contacts-avatar">
                              {p.initials}
                            </span>
                            <span>
                              <strong>{p.name}</strong>
                              <small>{`${p.role} · ${p.company}`}</small>
                            </span>
                          </span>
                          <p>{p.summary}</p>
                          <span className="contacts-person-foot">
                            <ContactTag>{p.tag}</ContactTag>
                            <span>{`${p.count} 次互动 · ${p.recent}`}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    {people.length ? null : (
                      <div className="contacts-empty">未找到联系人</div>
                    )}
                  </>
                )}
              </div>
            </div>
            <ContactAgent
              person={person}
              expanded={expanded}
              answer={answer}
              draft={draft}
              onDraft={setDraft}
              onToggle={toggleAgent}
              inputRef={inputRef}
              onAsk={(question) => {
                resetContentScroll();
                setAnswer(contactAnswer(question, person));
              }}
              onSend={() => {
                if (draft.trim()) {
                  resetContentScroll();
                  setAnswer(contactAnswer(draft.trim(), person));
                  setDraft("");
                }
              }}
              onNewTask={() => {
                resetContentScroll();
                setAnswer("");
                setDraft("");
                inputRef.current?.focus({ preventScroll: true });
              }}
            />
          </div>
        )}
        {modal ? (
          <ContactDialog
            kind={modal}
            person={person}
            onClose={() => setModal(null)}
            onSave={save}
          />
        ) : null}
        {toast ? (
          <div className="contacts-toast show" role="status">
            {toast}
          </div>
        ) : null}
      </div>
    </section>
  );
}
