"use client";
import "./contacts-controls.css";
import { useCustomerMeetings } from "./contact-insights";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { customerFields, channelNames, customerSourceFilters, editCustomer, ingestCustomer, type CustomerSource } from "./contact-identity";
import { contactStats } from "./contact-rules";
import { useSceneAgent } from "@/features/agent/session";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ActionEditor, localDate } from "./calendar-dialogs";
import { newAction } from "./calendar";
import type { ActionRecord } from "@/features/workbench/model/types";
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
  disabled = false,
}: {
  children: ReactNode;
  action: string;
  value?: string;
  primary?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`contacts-button${primary ? " primary" : ""}`}
      data-contact-action={action}
      data-value={value}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function ContactsPage({ id, actor = "zhang", space = "personal", controller }: { id: string; actor?: string; space?: string; controller?: SpacesController }) {
  const { data, error, repo, refresh } = usePersonal(actor, space, true);
  const [selected, setSelected] = useState(id || "john");
  const agent = useSceneAgent("contacts", selected);
  const [detail, setDetail] = useState(Boolean(id));
  const [tab, setTab] = useState("概览");
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [answerContext, setAnswerContext] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [dateOrder, setDateOrder] = useState("desc");
  const [schedule, setSchedule] = useState<ActionRecord | null>(null);
  const modalSnapshot = useRef<string | null>(null);
  const [modalPerson, setModalPerson] = useState<import("./store").Contact>();
  const [noteIndex, setNoteIndex] = useState<number | null>(null);
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
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);
  function toggleAgent() {
    setExpanded(!expanded);
    requestAnimationFrame(() =>
      (expanded ? entryRef.current : inputRef.current)?.focus({
        preventScroll: true,
      }),
    );
  }
  const team = space !== "personal", workspace = controller?.state?.spaces.find(w => w.id === space);
  const workspaceReadonly = team && workspace?.status !== "active";
  const pageTitle = team ? "团队客户" : "我的客户";
  const customerKey = (c: import("./store").Contact) => team ? `${c.ownerId}:${c.id}` : c.id;
  const ownerName = (owner?: string) => workspace?.members.find(m => m.id === owner)?.name || owner || "本人";
  const state = data?.contacts;
  const person = state?.contacts.find((c) => customerKey(c) === selected || (c.id === selected && c.ownerId === actor));
  const readonly = workspaceReadonly || !!(detail && person && person.ownerId !== actor);
  const readableMeetings = useCustomerMeetings(person, actor, space);
  const agentPerson = person ? { ...person, interactions: readableMeetings } : undefined;
  const contextKey = JSON.stringify([space, actor, selected, agentPerson]);
  const people = (state?.contacts.filter((c) =>
      [c.name, c.company, c.role, c.summary, c.region, ...(c.themes || [])].join(" ").toLowerCase().includes(query.trim().toLowerCase()) &&
      (!subjectFilter || (c.subjectType || "person") === subjectFilter) &&
      (!sourceFilter || c.sources?.some((source) => sourceFilter === "agent" ? ["agent", "meeting", "thought"].includes(source.channel) : source.channel === sourceFilter)) &&
      (!ownerFilter || c.ownerId === ownerFilter) &&
      (!createdFrom || !!c.createdAt && c.createdAt.slice(0, 10) >= createdFrom) &&
      (!createdTo || !!c.createdAt && c.createdAt.slice(0, 10) <= createdTo)
    ) || []).sort((a, b) => dateOrder === "desc" ? (b.createdAt || "").localeCompare(a.createdAt || "") : (a.createdAt || "").localeCompare(b.createdAt || ""));
  const notes = person ? state?.notes[customerKey(person)] || [] : [];
  const schedules = person ? data?.actions.records.filter((r) => r.contactId === person.id && !r.deleted) || [] : [];
  const stats = person ? contactStats({ ...person, interactions: readableMeetings }) : null;
  function askCustomer(question: string) {
    try {
      const latest = repo.current!.contacts.readVisible().personal.contacts;
      if (person && !latest.some(c => customerKey(c) === customerKey(person))) throw Error("客户共享已关闭或访问权限已变更");
      if (detail && !person) throw Error("客户不存在或已停止共享");
      setAnswerContext(contextKey);
      resetContentScroll();
      setAnswer(agent.run(question, () => contactAnswer(question, agentPerson)));
    } catch (e) { setAnswer(""); setToast((e as Error).message); refresh(); }
  }
  function openFollowup() {
    if (person) setSchedule({ ...newAction("schedule"), title: `跟进 ${person.name}`, participants: person.name, contactId: person.id });
  }
  function openModal(kind: ContactDialogKind, index: number | null = null) {
    modalSnapshot.current = localStorage.getItem("baizhi-v14-contacts");
    setModalPerson(person ? structuredClone(person) : undefined);
    setNoteIndex(index);
    setModal(kind);
  }
  function save(values: FormData) {
    if (localStorage.getItem("baizhi-v14-contacts") !== modalSnapshot.current)
      throw Error("另一页面已更新，请保留输入并重新打开后编辑");
    const kind = modal;
    if (kind !== "add" && modalPerson?.ownerId !== actor) throw Error("仅所属成员可以维护客户资料");
    const contactId = String(values.get("person") || "");
    const createdId = repo.current!.contacts.change((all) => {
      const s = all.personal;
      if (kind === "add" || kind === "edit") {
        const name = String(values.get("name") || "").trim();
        if (!name) throw Error("请填写客户名称");
        const existing =
          kind === "edit"
            ? s.contacts.find((p) => p.id === contactId)
            : undefined;
        if (kind === "edit" && !existing) throw Error("联系人不存在或已删除");
        const record = {
          id: existing?.id || crypto.randomUUID(),
          initials: name.slice(0, 2),
          name,
          subjectType: (values.get("subjectType") === "enterprise" ? "enterprise" : "person") as "enterprise" | "person",
          createdAt: existing?.createdAt || new Date().toISOString(),
          company: values.get("subjectType") === "enterprise" ? name : String(values.get("company") || "").trim(),
          role: String(values.get("role") || "待补充").trim(),
          summary: String(values.get("summary") || "").trim(),
          tag: String(values.get("tag") || "待补充").trim(),
          count: 0,
          recent: "暂无已核实互动",
          region: String(values.get("region") || "").trim(),
          email: String(values.get("email") || "").trim(),
          themes: [],
          memories: [],
          inferences: [],
        };
        const fields = Object.fromEntries(customerFields.map((key) => [key, record[key]]));
        if (existing) {
          editCustomer(existing, fields, actor);
          return existing.id;
        }
        const channel = String(values.get("channel") || "manual") as CustomerSource["channel"];
        if (!["manual", "crm"].includes(channel)) throw Error("来源渠道无效");
        const source: CustomerSource = {
          id: String(values.get("sourceId") || "").trim(), channel, fields,
          verifiedEmail: values.get("verifiedEmail") ? record.email : undefined,
          crmSystem: channel === "crm" ? String(values.get("crmSystem") || "").trim() : undefined,
          crmId: channel === "crm" ? String(values.get("crmId") || "").trim() : undefined,
          updatedAt: new Date().toISOString(),
        };
        const result = ingestCustomer(s, { ...record, ownerId: actor, confirmedFields: [...customerFields] }, source, actor,
          values.get("crmState") === "unavailable" ? "unavailable" : "ready");
        return result.id;
      }
      if (!s.contacts.some((p) => p.id === contactId))
        throw Error("联系人已更新，请重新打开后编辑。");
      if (kind === "note") {
        const text = String(values.get("text") || "").trim();
        if (!text) throw Error("备注内容不能为空");
        if (text.length > 2000) throw Error("备注最多 2000 字");
        const note = { text, time: new Date().toLocaleString("zh-CN") };
        if (noteIndex !== null) {
          if (!s.notes[contactId]?.[noteIndex])
            throw Error("备注已删除，请重新打开");
          s.notes[contactId][noteIndex] = note;
        } else (s.notes[contactId] ??= []).unshift(note);
      }
    });
    refresh();
    setModal(null);
    setAnswer("");
    if (kind === "add") {
      setSelected(team ? `${actor}:${createdId!}` : createdId!);
      setDetail(false);
    }
    if (kind === "note") {
      setDetail(true);
      setTab("记忆");
    }
    setToast("客户信息已保存");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }
  return (
    <section
      ref={viewRef}
      className="contacts-workspace"
      data-main-view="contacts"
      aria-hidden="false"
      aria-label="我的客户"
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
            {error || "正在读取客户…"}
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
                        onClick={() => location.assign(appUrl("home", "", space, actor))}
                      >
                        首页
                      </button>
                      <span>/</span>
                      <span>{pageTitle}</span>
                    </div>
                    <h1>{detail && person ? "客户详情" : pageTitle}</h1>
                    <p>
                      {detail && person
                        ? "会议跟进、双方待办与客户画像，都可以回到来源会议。"
                        : team ? "查看我的客户及其他成员已共享的客户，按所属成员分别保留。" : "管理当前工作区的客户资料，默认仅自己可见。"}
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
                          ← 返回{pageTitle}
                        </ContactButton>
                        <ContactButton
                          action="edit" disabled={readonly}
                          onClick={() => openModal("edit")}
                        >
                          编辑资料
                        </ContactButton>
                        <ContactButton
                          action="note" disabled={readonly}
                          value={person.id}
                          onClick={() => openModal("note")}
                        >
                          ＋ 添加备注
                        </ContactButton>
                        {space === "personal" && <ContactButton
                          action="followup" disabled={readonly}
                          value={person.id}
                          primary
                          onClick={openFollowup}
                        >
                          创建跟进
                        </ContactButton>}
                      </>
                    ) : !detail ? (
                      <ContactButton
                        action="add" disabled={workspaceReadonly}
                        primary
                        onClick={() => openModal("add")}
                      >
                        ＋ 添加客户
                      </ContactButton>
                    ) : null}
                    {(!detail || person) && (
                      <ContactAgentEntry
                        expanded={expanded}
                        onToggle={toggleAgent}
                        buttonRef={entryRef}
                      />
                    )}
                  </div>
                </header>
                {detail && !person ? (
                  <div className="contacts-empty" role="alert">
                    客户不存在、已删除或所属成员已关闭共享。
                    <button
                      type="button"
                      className="contacts-button"
                      onClick={() => setDetail(false)}
                    >
                      返回{pageTitle}列表
                    </button>
                  </div>
                ) : detail && person ? (
                  <>
                    <div className="contacts-profile">
                      <span className="contacts-avatar large">
                        {person.initials}
                      </span>
                      <div>
                        <h1>
                          {person.name} <ContactTag>{person.tag}</ContactTag>{team && <span className="customer-owner-tag">所属成员：{ownerName(person.ownerId)}</span>}
                        </h1>
                        <p>{`${person.role} · ${person.company}`}</p>
                        <p>{`最近互动：${stats?.recent ? localDate(stats.recent) : "暂无已核实互动"}`}</p>
                      </div>
                    </div>
                    <div
                      className="contacts-tabs detail"
                      role="tablist"
                      aria-label="客户详情"
                    >
                      {["概览", "时间线", "承诺", "记忆"].map(
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
                      space={space}
                      actor={actor}
                      readonly={readonly}
                      onEditNote={(index) => openModal("note", index)}
                      onDeleteNote={(index) => {
                        if (!window.confirm("删除这条备注？")) return;
                        try {
                          repo.current!.contacts.change((s) => {
                            s.personal.notes[person.id]?.splice(index, 1);
                          });
                          refresh();
                        } catch (e) {
                          setToast((e as Error).message);
                        }
                      }}
                    />
                    {schedules.length > 0 && <ContactCard title="已安排的跟进日程">{schedules.map((r) => <ContactLine key={r.id} title={<a className="customer-source" href={appUrl("calendar", r.id, space, actor)}>{r.title} ↗</a>}>{localDate(r.start)} — {localDate(r.end)}<br />{r.notes}</ContactLine>)}</ContactCard>}
                  </>
                ) : (
                  <>
                    <div className="contacts-toolbar">
                      <label className="contacts-search">
                        <RefIcon name="search" />
                        <input
                          id="contacts-search"
                          type="search"
                          aria-label="搜索客户"
                          placeholder="搜索姓名、公司、角色、主题…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <span className="contacts-toolbar-hint">
                        共 {people.length} 个客户
                      </span>
                    </div>
                    <div className="customer-filters" aria-label="客户筛选">
                      <label>主体类型<select aria-label="筛选主体类型" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}><option value="">全部类型</option><option value="enterprise">企业</option><option value="person">自然人</option></select></label>
                      <label>客户来源<select aria-label="筛选客户来源" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}><option value="">全部来源</option>{Object.entries(customerSourceFilters).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      {team && <label>所属成员<select aria-label="筛选所属成员" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}><option value="">全部成员</option>{workspace?.members.filter(m => m.status === "active").map(m => <option key={m.id} value={m.id}>{m.name}{m.id === actor ? "（我）" : ""}</option>)}</select></label>}
                      <label>创建开始日期<input type="date" aria-label="创建开始日期" value={createdFrom} max={createdTo || undefined} onChange={(e) => setCreatedFrom(e.target.value)} /></label>
                      <label>创建结束日期<input type="date" aria-label="创建结束日期" value={createdTo} min={createdFrom || undefined} onChange={(e) => setCreatedTo(e.target.value)} /></label>
                      <label>排序<select aria-label="按创建时间排序" value={dateOrder} onChange={(e) => setDateOrder(e.target.value)}><option value="desc">创建时间：由新到旧</option><option value="asc">创建时间：由旧到新</option></select></label>
                      <button className="contacts-button" type="button" onClick={() => { setSubjectFilter(""); setSourceFilter(""); setOwnerFilter(""); setCreatedFrom(""); setCreatedTo(""); setQuery(""); setDateOrder("desc"); }}>重置</button>
                    </div>
                    {createdFrom && createdTo && createdFrom > createdTo && <p role="alert">开始日期不能晚于结束日期</p>}
                    <div className="contacts-grid">
                      {people.map((p) => (
                        <button
                          key={customerKey(p)}
                          type="button"
                          className="contacts-person-card"
                          data-contact-action="person"
                          data-value={customerKey(p)}
                          onClick={() => {
                            setSelected(customerKey(p));
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
                          <div className="customer-card-meta">{team && <span className="customer-owner-tag">所属成员：{ownerName(p.ownerId)}</span>}<ContactTag>{p.subjectType === "enterprise" ? "企业" : "自然人"}</ContactTag><span>{[...new Set((p.sources || []).map((source) => channelNames[source.channel]))].join(" · ") || "来源未记录"}</span></div>
                          <p>{p.summary}</p>
                          <span className="contacts-person-foot">
                            <ContactTag>{p.tag}</ContactTag>
                            <span>创建于 {p.createdAt?.slice(0, 10) || "时间未记录"}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    {people.length ? null : (
                      <div className="contacts-empty">未找到客户，请调整筛选条件或添加客户。</div>
                    )}
                  </>
                )}
              </div>
            </div>
            <ContactAgent
              person={agentPerson}
              expanded={expanded}
              answer={answerContext === contextKey && (!detail || person) ? answer : ""}
              draft={draft}
              onDraft={setDraft}
              onToggle={toggleAgent}
              inputRef={inputRef}
              onAsk={askCustomer}
              onSend={() => { if (draft.trim()) { askCustomer(draft.trim()); setDraft(""); } }}
              onNewTask={() => {
                agent.reset();
                resetContentScroll();
                setAnswer("");
                setDraft("");
                inputRef.current?.focus({ preventScroll: true });
              }}
            />
          </div>
        )}
        {schedule && <ActionEditor record={schedule} variant="create" onClose={() => setSchedule(null)} onSave={(r) => {
          repo.current!.actions.save(r);
          refresh();
          setToast("跟进日程已创建，默认仅自己可见");
        }} />}
        {modal ? (
          <ContactDialog
            kind={modal}
            person={modalPerson}
            noteText={
              noteIndex !== null && modalPerson
                ? state?.notes[customerKey(modalPerson)]?.[noteIndex]?.text
                : ""
            }
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
