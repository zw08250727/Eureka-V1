"use client";

import { useContext, useEffect, useMemo, useRef, useState, type ContextType } from "react";
import { ReferenceDialog } from "@/features/reference/dialog";
import { RefIcon } from "@/features/reference/symbols";
import { marketStorage } from "@/features/markets/storage";
import { M } from "@/features/spaces/model/store";
import { createActions, createContacts, createThoughts } from "@/features/personal/store";
import { AgentScope } from "./scope";
import "./material-picker.css";

export type AgentMaterial = {
  id: string;
  sourceId: string;
  category: "meetings" | "contacts" | "thoughts" | "calendar";
  title: string;
  meta: string;
  sourceLabel?: string;
  typeLabel?: string;
  size?: string;
  children?: { id: string; title: string; type: string; meta?: string }[];
};

const tabs = [
  ["meetings", "我的会议", "mic"],
  ["contacts", "通讯录", "user"],
  ["thoughts", "我的闪念", "spark"],
  ["calendar", "日程与待办", "list"],
] as const;
const sourceOptions = (category: AgentMaterial["category"]) => category === "meetings"
  ? ["all", "网页录音", "合并录音", "三方会议", "M1", "W1", "W2", "W-PEN"]
  : category === "contacts"
    ? ["all", "手动创建", "CRM 系统导入", "手机通讯录导入"]
    : ["all"];
const materialIcon = (category: AgentMaterial["category"]) => category === "meetings" ? "mic" : category === "contacts" ? "user" : category === "thoughts" ? "spark" : "list";

export function readMaterials(scope: NonNullable<ContextType<typeof AgentScope>>) {
  const workspace = M.get(scope.controller.state!, scope.space);
  const meetingSource = (source: string, origin?: string) => {
    const key = `${source} ${origin || ""}`.toLocaleLowerCase();
    if (key.includes("merge") || key.includes("合并")) return "合并录音";
    if (key.includes("third") || key.includes("三方")) return "三方会议";
    if (key.includes("m1")) return "M1";
    if (key.includes("w-pen") || key.includes("wpen")) return "W-PEN";
    if (key.includes("w2")) return "W2";
    if (key.includes("w1")) return "W1";
    return "网页录音";
  };
  const meetings: AgentMaterial[] = M.visible(workspace, scope.actor).map(item => {
    const sourceLabel = meetingSource(item.source, item.origin);
    return { id: `meetings:${item.id}`, sourceId: item.id, category: "meetings", title: item.title, meta: `文件大小：${item.size || "3.2 MB"}`, sourceLabel, size: item.size || "3.2 MB", children: [{ id: `meetings:${item.id}:transcript`, title: `${item.title}-转译文本.txt`, type: "文本" }, { id: `meetings:${item.id}:summary`, title: `${item.title}-总结.md`, type: "Markdown" }] };
  });
  const contacts: AgentMaterial[] = createContacts(marketStorage, scope.actor, scope.space).readVisible().personal.contacts.map(item => {
    const source = item.sources?.at(-1)?.channel || "manual";
    const sourceLabel = source === "crm" ? "CRM 系统导入" : source === "phone" ? "手机通讯录导入" : "手动创建";
    return { id: `contacts:${item.id}`, sourceId: item.id, category: "contacts", title: item.name, meta: [item.company, item.role].filter(Boolean).join(" · ") || "联系人", typeLabel: item.subjectType === "enterprise" ? "企业" : "自然人", sourceLabel };
  });
  const thoughts: AgentMaterial[] = createThoughts(marketStorage, () => new Date(), scope.actor, scope.space).read().records.filter(item => !item.deleted).map(item => ({ id: `thoughts:${item.id}`, sourceId: item.id, category: "thoughts", title: item.title, meta: `${item.type === "inspiration" ? "灵感" : item.type === "ledger" ? "记账" : "闪念"} · ${item.date}` }));
  const calendar: AgentMaterial[] = createActions(marketStorage, () => new Date(), scope.actor, scope.space).read().records.filter(item => !item.deleted).map(item => ({ id: `calendar:${item.id}`, sourceId: item.id, category: "calendar", title: item.title, meta: `${item.type === "schedule" ? "日程" : "待办"} · ${item.start.slice(0, 10)}` }));
  return [...meetings, ...contacts, ...thoughts, ...calendar];
}

export function AgentMaterialSummary({ selected, onRemove, compact, compactLabel }: { selected: AgentMaterial[]; onRemove: (id: string) => void; compact?: boolean; compactLabel?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => track.current?.scrollBy({ left: direction * 180, behavior: "smooth" });
  return <div className="agent-material-summary" aria-label="当前引用素材">
    {selected.length > 1 && <button type="button" className="agent-material-scroll agent-material-scroll-left" aria-label="向左查看更多素材" title="向左查看更多素材" onClick={() => scroll(-1)}><RefIcon name="chevron" /></button>}
    <div className="agent-material-summary-track" ref={track}>
      {compact && selected.length > 0 ? <button type="button" className="agent-material-compact" aria-label={`移除全部${compactLabel || "素材"}`} title="移除全部素材" onClick={() => selected.forEach(item => onRemove(item.id))}><RefIcon name={materialIcon(selected[0].category)} /><span>{compactLabel || `已选择 ${selected.length} 项素材`}</span><b aria-hidden="true">×</b></button> : selected.map(item => <button type="button" key={item.id} aria-label={`移除素材 ${item.title}`} title="移除此素材" onClick={() => onRemove(item.id)}><RefIcon name={materialIcon(item.category)} /><span>{item.title}</span><b aria-hidden="true">×</b></button>)}
    </div>
    {selected.length > 1 && <button type="button" className="agent-material-scroll agent-material-scroll-right" aria-label="向右查看更多素材" title="向右查看更多素材" onClick={() => scroll(1)}><RefIcon name="chevron" /></button>}
  </div>;
}

export function AgentMaterialPicker({ selected, onChange, triggerClassName = "agent-material-trigger", autoSelectCategory }: { selected: AgentMaterial[]; onChange: (items: AgentMaterial[]) => void; triggerClassName?: string; autoSelectCategory?: AgentMaterial["category"] }) {
  const scope = useContext(AgentScope);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<AgentMaterial["category"]>("meetings");
  const [query, setQuery] = useState("");
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [sourceFilters, setSourceFilters] = useState<Record<string, string>>({});
  const autoSelected = useRef(false);
  const result = useMemo<{ materials: AgentMaterial[]; error: string }>(() => {
    if (!scope) return { materials: [], error: "当前页面没有可引用的工作区。" };
    try { return { materials: readMaterials(scope), error: "" }; }
    catch (cause) { return { materials: [], error: (cause as Error).message }; }
  }, [scope]);
  const { materials, error } = result;
  useEffect(() => {
    if (autoSelectCategory && !autoSelected.current && materials.length && !selected.length) {
      autoSelected.current = true;
      onChange(materials.filter(item => item.category === autoSelectCategory));
    }
  }, [autoSelectCategory, materials, onChange, selected.length]);
  const currentSourceFilter = sourceFilters[active] || "all";
  const visible = materials.filter(item => item.category === active && (currentSourceFilter === "all" || item.sourceLabel === currentSourceFilter) && item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const getSourceFilter = (category: AgentMaterial["category"]) => sourceFilters[category] || "all";
  function setSource(category: AgentMaterial["category"], value: string) {
    setSourceFilters(current => ({ ...current, [category]: value }));
  }
  function show() {
    setDraftIds(selected.map(item => item.id));
    setOpen(true);
  }
  function toggle(id: string) {
    setDraftIds(current => current.includes(id) ? current.filter(item => item !== id) : current.length >= 100 ? current : [...current, id]);
  }
  function toggleMeeting(item: AgentMaterial) {
    const ids = [item.id, ...(item.children || []).map(child => child.id)];
    setDraftIds(current => ids.every(id => current.includes(id)) ? current.filter(id => !ids.includes(id)) : [...new Set([...current, ...ids])].slice(0, 100));
  }
  function toggleChild(item: AgentMaterial, childId: string) {
    setDraftIds(current => {
      const withoutParent = current.filter(id => id !== item.id);
      return withoutParent.includes(childId) ? withoutParent.filter(id => id !== childId) : [...withoutParent, childId].slice(0, 100);
    });
  }
  function isMeetingSelected(item: AgentMaterial) {
    const ids = [item.id, ...(item.children || []).map(child => child.id)];
    return ids.every(id => draftIds.includes(id));
  }
  function save() {
    onChange(materials.flatMap(item => {
      if (draftIds.includes(item.id)) return [item];
      return (item.children || []).filter(child => draftIds.includes(child.id)).map(child => ({ ...item, id: child.id, sourceId: child.id, title: child.title, meta: child.meta || child.type, children: undefined }));
    }));
    setOpen(false);
  }
  return <>
    <button type="button" className={triggerClassName} aria-label="添加素材文件" title="添加素材文件" onClick={show}><RefIcon name="attachment" /></button>
    {open && <ReferenceDialog className="agent-material-dialog" label="选择知识库文件" onClose={() => setOpen(false)}>
      <header><div><h2>选择知识库文件</h2><p>最多选择 100 个文件</p></div><button type="button" aria-label="关闭素材选择" onClick={() => setOpen(false)}>×</button></header>
      <div className="agent-material-layout">
        <nav aria-label="素材分类">{tabs.map(([id, label, icon]) => <button type="button" key={id} className={active === id ? "active" : ""} aria-current={active === id ? "page" : undefined} onClick={() => setActive(id)}><RefIcon name={icon} /><span>{label}</span><b>{materials.filter(item => item.category === id).length}</b></button>)}</nav>
        <section className="agent-material-content">
          <div className="agent-material-filters"><label><RefIcon name="search" /><input aria-label="搜索素材文件" placeholder="搜索文件" value={query} onChange={event => setQuery(event.target.value)} /></label><span>来源</span><select aria-label="素材来源" value={getSourceFilter(active)} onChange={event => setSource(active, event.target.value)}>{sourceOptions(active).map(option => <option key={option} value={option}>{option === "all" ? "全部来源" : option}</option>)}</select></div>
          <div className="agent-material-list-heading"><h3>文件列表</h3><span>共 {visible.length} 个文件</span></div>
          {error ? <p role="alert" className="agent-material-error">{error}</p> : visible.length ? <div className={`agent-material-list agent-material-list-${active}`}>{visible.map(item => active === "meetings" ? <article className="agent-material-meeting-card" key={item.id}><label><input type="checkbox" checked={isMeetingSelected(item)} onChange={() => toggleMeeting(item)} /><span><strong>{item.title}</strong><small>{item.meta}</small></span><em>{item.sourceLabel}</em></label>{item.children?.map(child => <label className="agent-material-child" key={child.id}><input type="checkbox" checked={draftIds.includes(child.id)} onChange={() => toggleChild(item, child.id)} /><RefIcon name="file" /><span>{child.title}</span><small>{child.type}</small></label>)}</article> : active === "contacts" ? <label className="agent-material-contact-row" key={item.id}><input type="checkbox" checked={draftIds.includes(item.id)} onChange={() => toggle(item.id)} /><span><strong>{item.title}</strong><small>{item.meta}</small></span><span className="agent-material-contact-tags"><i>{item.typeLabel}</i><i>{item.sourceLabel}</i></span></label> : <label key={item.id}><input type="checkbox" checked={draftIds.includes(item.id)} onChange={() => toggle(item.id)} /><span><strong>{item.title}</strong><small>{item.meta}</small></span><RefIcon name="file" /></label>)}</div> : <div className="agent-material-empty"><RefIcon name="file" /><p>{query ? "没有找到匹配的文件" : "当前分类暂无可引用文件"}</p></div>}
        </section>
      </div>
      <footer><span>已选择 {draftIds.length} / 100</span><button type="button" onClick={() => setOpen(false)}>取消</button><button type="button" className="primary" disabled={!draftIds.length} onClick={save}>添加</button></footer>
    </ReferenceDialog>}
  </>;
}
