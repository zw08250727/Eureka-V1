"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { productLogo } from "@/features/markets/brand";
import { marketUrl } from "@/features/markets/config";
import { marketStorage, scopedKey } from "@/features/markets/storage";
import { findEnterprise, readEnterpriseIdentity, signOutEnterprise, enterpriseTasksKey, type EnterpriseIdentity, type EnterpriseTask } from "./model";
import "./workbench.css";
export function EnterpriseWorkbench() {
  const [identity, setIdentity] = useState<EnterpriseIdentity | null>(null);
  const [view, setView] = useState("tasks");
  const [tasks, setTasks] = useState<EnterpriseTask[]>([]);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    function load() {
      const session = readEnterpriseIdentity();
      if (!session) { location.replace(marketUrl("cn", "enterprise/login/")); return; }
      setIdentity(session);
      try {
        const data = JSON.parse(marketStorage.getItem(enterpriseTasksKey(session)) || "[]");
        if (!Array.isArray(data) || data.some(task => typeof task.id !== "string" || typeof task.title !== "string" || typeof task.done !== "boolean")) throw new Error();
        setTasks(data);
      } catch { setStatus("待办读取失败，请检查浏览器存储后刷新。"); }
    }
    load();
    const update = (event: StorageEvent) => { if (!event.key || event.key.startsWith(scopedKey("enterprise:"))) load(); };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  function save(update: (current: EnterpriseTask[]) => EnterpriseTask[]) {
    if (!identity || readEnterpriseIdentity()?.identity !== identity.identity) { location.replace(marketUrl("cn", "enterprise/login/")); return false; }
    try {
      const current = JSON.parse(marketStorage.getItem(enterpriseTasksKey(identity)) || "[]") as EnterpriseTask[];
      if (!Array.isArray(current) || current.some(task => typeof task.id !== "string" || typeof task.title !== "string" || typeof task.done !== "boolean")) throw new Error();
      const next = update(current);
      marketStorage.setItem(enterpriseTasksKey(identity), JSON.stringify(next)); setTasks(next); setStatus(""); return true;
    } catch { setStatus("保存失败，请检查浏览器存储后重试。"); return false; }
  }
  if (!identity) return <main className="enterprise-loading" role="status">正在加载…</main>;
  const enterprise = findEnterprise(identity.code)!;
  return <main className="enterprise-workbench">
    <aside><div className="enterprise-brand"><Image src={productLogo("cn")} alt="" width={28} height={36} unoptimized /><strong>百智</strong><span>企业版</span></div><h2>{enterprise.name}</h2><nav aria-label="企业导航">{[['tasks','我的待办'],['members','企业成员']].map(([id,label]) => <button key={id} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}>{label}</button>)}</nav><div className="enterprise-profile"><strong>{identity.name}</strong><span>{identity.identity}</span><button onClick={() => { try { signOutEnterprise(); location.assign(marketUrl("cn", "enterprise/login/")); } catch { setStatus("退出失败，请重试。"); } }}>退出登录</button></div></aside>
    <section className="enterprise-content"><header><span>{enterprise.name}</span><h1>{view === "tasks" ? "我的待办" : "企业成员"}</h1></header>
      {view === "tasks" ? <><form onSubmit={event => { event.preventDefault(); if (!title.trim()) { setStatus("请输入待办内容"); return; } if (save(current => [...current, {id: crypto.randomUUID(), title: title.trim(), done: false}])) setTitle(""); }}><label htmlFor="enterprise-task">新待办</label><div className="enterprise-task-form"><input id="enterprise-task" placeholder="添加一项待办" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /><button type="submit">添加待办</button></div></form><ul className="enterprise-tasks">{tasks.map(task => <li key={task.id}><label><input type="checkbox" checked={task.done} onChange={() => save(current => current.map(item => item.id === task.id ? {...item, done: !item.done} : item))} /><span className={task.done ? "done" : ""}>{task.title}</span></label><button aria-label={`删除 ${task.title}`} onClick={() => { if (window.confirm(`删除“${task.title}”？`)) save(current => current.filter(item => item.id !== task.id)); }}>删除</button></li>)}</ul>{!tasks.length && <p className="enterprise-empty">暂无待办，添加一项开始安排工作。</p>}</> : <div className="enterprise-member"><strong>{identity.name}</strong><span>{identity.identity}</span><span>企业成员</span></div>}
      <p role="status" aria-live="polite">{status}</p>
    </section>
  </main>;
}
