/* eslint-disable @next/next/no-img-element -- Icons extracted from the authorized reference component. */
"use client";
import { useState, useEffect } from "react";
import { createActions } from "@/features/personal/store";
import { templates } from "./templates";
import { basePath } from "@/lib/routes";
import { ReferenceDialog } from "@/features/reference/dialog";
type Config = { template: string; language: string; detail: string };
type Custom = {
  name: string;
  description: string;
  prompt: string;
  category: string;
};
const community = [
  {
    name: "客户访谈 · 需求洞察",
    description: "提炼客户目标、关键痛点、购买约束与下一步行动。",
    category: "销售管理",
    prompt: "按业务背景、目标、问题、预算、行动项输出，每一项引用会议原话。",
  },
  {
    name: "产品研发 · 风险复盘",
    description: "整理正负反馈、交付风险、负责人和待验证假设。",
    category: "白领办公",
    prompt: "区分事实与推断，列出风险及对应负责人。",
  },
  {
    name: "学习笔记 · 知识地图",
    description: "梳理概念关系、知识点和复习建议。",
    category: "知识教育",
    prompt: "按主题列出知识点、解释、例子及待解决问题。",
  },
];
export function TemplateContent({
  value,
  onChange,
}: {
  value: Config;
  onChange: (v: Partial<Config>) => void;
}) {
  const [category, setCategory] = useState("通用"),
    [communityOpen, setCommunityOpen] = useState(false),
    [query, setQuery] = useState(""),
    [communityTab, setCommunityTab] = useState("推荐"),
    [favorites, setFavorites] = useState<string[]>([]),
    [custom, setCustom] = useState<Custom[]>([]),
    [preview, setPreview] = useState<Custom | null>(null),
    [editing, setEditing] = useState<Custom | null>(null),
    [error, setError] = useState(""),
    [defaultName, setDefaultName] = useState("");
  const scope =
    typeof window === "undefined"
      ? "personal:zhang"
      : `${new URLSearchParams(location.search).get("space") || "personal"}:${new URLSearchParams(location.search).get("actor") || "zhang"}`;
  const key = `eureka:templates:${scope}`;
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const s = JSON.parse(localStorage.getItem(key) || "{}");
        setFavorites(s.favorites || []);
        setCustom(s.custom || []);
        setDefaultName(s.defaultName || "");
      } catch {}
    });
    return () => {
      active = false;
    };
  }, [key]);
  function persist(next: {
    favorites?: string[];
    custom?: Custom[];
    defaultName?: string;
  }) {
    const n = { favorites, custom, defaultName, ...next };
    localStorage.setItem(key, JSON.stringify(n));
    setFavorites(n.favorites);
    setCustom(n.custom);
    setDefaultName(n.defaultName);
  }
  const names =
    category === "我的模版"
      ? [...new Set([...custom.map((c) => c.name), ...favorites])]
      : templates[category] || [];
  const content = (name: string): Custom =>
    custom.find((c) => c.name === name) ||
    community.find((c) => c.name === name) || {
      name,
      category,
      description:
        name === "智能匹配"
          ? "根据会议内容自动匹配适合的总结结构。"
          : `适用于${category}场景，提炼重点信息、核心结论与行动项。`,
      prompt:
        "会议概览\n关键议题与结论\n行动项：事项、负责人、时间\n风险与待确认",
    };
  return (
    <div className="ex-template-layout">
      <nav className="ex-template-nav" aria-label="模板分类">
        {Object.keys(templates).map((t) => (
          <button
            key={t}
            aria-pressed={category === t}
            onClick={() => setCategory(t)}
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => {
            setCommunityOpen(true);
            setQuery("");
          }}
        >
          模板社区 ↗
        </button>
      </nav>
      <div>
        <div className="ex-template-community">
          <strong>选择总结模板</strong>
          <button className="ex-link" onClick={() => setCommunityOpen(true)}>
            探索模板社区 ↗
          </button>
        </div>
        <div className="ex-template-grid">
          {names.map((name) => (
            <div key={name} className="ex-template-wrapper">
              <button
                className="ex-template-card"
                aria-pressed={value.template === name}
                onClick={() => onChange({ template: name })}
              >
                <img
                  width={24}
                  height={24}
                  src={`${basePath}/integrations/icons/GenerateExampleSparkleIcon.svg`}
                  alt=""
                />
                <strong>{name}</strong>
                {defaultName === name && <small>默认模板</small>}
              </button>
              <div className="ex-template-card-actions">
                <button
                  className="ex-link"
                  aria-label={`查看模板说明：${name}`}
                  onClick={() => setPreview(content(name))}
                >
                  ⓘ
                </button>
                <button
                  className="ex-link"
                  onClick={() => persist({ defaultName: name })}
                >
                  {defaultName === name ? "已默认" : "设为默认"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {category === "我的模版" && (
          <button
            style={{ marginTop: 12 }}
            onClick={() =>
              setEditing({
                name: "",
                description: "",
                prompt: "",
                category: "我的模版",
              })
            }
          >
            ＋ 创建自定义模板
          </button>
        )}
        <h3 style={{ fontSize: 15, marginTop: 24 }}>全局设置</h3>
        <div className="ex-form">
          <label>
            总结语言
            <select
              value={value.language}
              onChange={(e) => onChange({ language: e.target.value })}
            >
              {[
                "中文（中国）",
                "English",
                "日本語",
                "한국어",
                "Deutsch",
                "Français",
                "Español",
              ].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            详细程度
            <select
              value={value.detail}
              onChange={(e) => onChange({ detail: e.target.value })}
            >
              {["精简", "标准", "详细"].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="ex-muted" style={{ marginTop: 16 }}>
          当前为本地总结演示，按所选模板重排示例内容。
        </p>
      </div>
      {communityOpen && (
        <ReferenceDialog
          className="ex-dialog"
          label="模板社区"
          onClose={() => setCommunityOpen(false)}
        >
          <header className="ex-head">
            <h2>模板社区</h2>
            <button
              className="ex-close"
              aria-label="关闭模板社区"
              onClick={() => setCommunityOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="ex-body">
            <div className="ex-tabs">
              {["推荐", "我的收藏", "我的模板"].map((t) => (
                <button
                  role="tab"
                  key={t}
                  aria-selected={communityTab === t}
                  onClick={() => setCommunityTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="search"
              aria-label="搜索社区模板"
              placeholder="搜索模板名称或场景"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="ex-template-grid" style={{ marginTop: 18 }}>
              {(communityTab === "我的模板"
                ? custom
                : communityTab === "我的收藏"
                  ? community.filter((t) => favorites.includes(t.name))
                  : community
              )
                .filter((t) => (t.name + t.description).includes(query))
                .map((t) => (
                  <article className="ex-order" key={t.name}>
                    <span className="ex-owner">{t.category}</span>
                    <h3>{t.name}</h3>
                    <p className="ex-muted">{t.description}</p>
                    <div className="ex-footer">
                      <button className="ex-link" onClick={() => setPreview(t)}>
                        预览
                      </button>
                      <button
                        className="ex-link"
                        onClick={() =>
                          persist({
                            favorites: favorites.includes(t.name)
                              ? favorites.filter((n) => n !== t.name)
                              : [...favorites, t.name],
                          })
                        }
                      >
                        {favorites.includes(t.name) ? "★ 已收藏" : "☆ 收藏"}
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        onChange({ template: t.name });
                        setCommunityOpen(false);
                        setCategory("我的模版");
                        if (!favorites.includes(t.name))
                          persist({ favorites: [...favorites, t.name] });
                      }}
                    >
                      使用模板
                    </button>
                  </article>
                ))}
            </div>
            {communityTab === "我的模板" && (
              <button
                onClick={() =>
                  setEditing({
                    name: "",
                    description: "",
                    prompt: "",
                    category: "我的模版",
                  })
                }
              >
                ＋ 创建模板
              </button>
            )}
            <p className="ex-muted">
              社区模板为演示数据；收藏、创建和默认设置保存在当前工作区。
            </p>
          </div>
        </ReferenceDialog>
      )}
      {preview && (
        <ReferenceDialog
          className="ex-dialog"
          label="模板说明"
          onClose={() => setPreview(null)}
        >
          <header className="ex-head">
            <h2>{preview.name}</h2>
            <button
              className="ex-close"
              aria-label="关闭模板说明"
              onClick={() => setPreview(null)}
            >
              ×
            </button>
          </header>
          <div className="ex-body">
            <p>{preview.description}</p>
            <pre style={{ whiteSpace: "pre-wrap" }}>{preview.prompt}</pre>
            <button
              className="primary"
              onClick={() => {
                onChange({ template: preview.name });
                setPreview(null);
                setCommunityOpen(false);
              }}
            >
              使用此模板
            </button>
            {custom.some((c) => c.name === preview.name) && (
              <button
                onClick={() => {
                  setEditing(preview);
                  setPreview(null);
                }}
              >
                编辑模板
              </button>
            )}
          </div>
        </ReferenceDialog>
      )}
      {editing && (
        <ReferenceDialog
          className="ex-dialog"
          label="自定义模板"
          onClose={() => setEditing(null)}
        >
          <header className="ex-head">
            <h2>自定义模板</h2>
            <button
              className="ex-close"
              aria-label="关闭自定义模板"
              onClick={() => setEditing(null)}
            >
              ×
            </button>
          </header>
          <form
            className="ex-body"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editing.name.trim() || !editing.prompt.trim()) {
                setError("请填写名称和总结要求");
                return;
              }
              persist({
                custom: [
                  ...custom.filter((c) => c.name !== editing.name),
                  editing,
                ],
              });
              setEditing(null);
              setCategory("我的模版");
            }}
          >
            <label>
              模板名称
              <input
                required
                maxLength={40}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label>
              简短描述
              <input
                maxLength={120}
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </label>
            <label>
              总结要求
              <textarea
                required
                value={editing.prompt}
                onChange={(e) =>
                  setEditing({ ...editing, prompt: e.target.value })
                }
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="primary">保存模板</button>
          </form>
        </ReferenceDialog>
      )}
    </div>
  );
}
export function TemplatePreferences({ onClose }: { onClose: () => void }) {
  const scope = new URLSearchParams(
    typeof location === "undefined" ? "" : location.search,
  );
  const actor = scope.get("actor") || "zhang",
    space = scope.get("space") || "personal";
  const [error, setError] = useState("");
  const [value, setValue] = useState<Config>(() => {
    const defaults = {
      template: "智能匹配",
      language: "中文（中国）",
      detail: "标准",
    };
    if (typeof localStorage === "undefined") return defaults;
    try {
      return {
        ...defaults,
        ...(createActions(localStorage, () => new Date(), actor, space).read()
          .settings.recordingTemplate as Partial<Config>),
      };
    } catch {
      return defaults;
    }
  });
  return (
    <ReferenceDialog
      className="ex-dialog"
      label="录音总结设置"
      onClose={onClose}
    >
      <header className="ex-head">
        <h2>录音总结设置</h2>
        <button className="ex-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>
      <div className="ex-body">
        <TemplateContent
          value={value}
          onChange={(p) => setValue({ ...value, ...p })}
        />
        <p role="status">{error}</p>
        <footer className="ex-footer">
          <button
            className="primary"
            onClick={() => {
              try {
                createActions(
                  localStorage,
                  () => new Date(),
                  actor,
                  space,
                ).change((s) => {
                  s.settings.recordingTemplate = value;
                });
                onClose();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            保存设置
          </button>
        </footer>
      </div>
    </ReferenceDialog>
  );
}
