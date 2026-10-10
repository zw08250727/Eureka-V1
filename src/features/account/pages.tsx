/* eslint-disable @next/next/no-img-element -- Reuse the captured product changelog assets. */
"use client";
import { useState } from "react";
import { basePath, appUrl } from "@/lib/routes";
import { ReferenceDialog } from "@/features/reference/dialog";
import type { SpacesController } from "@/features/spaces/use-spaces";
import updates from "./updates.json";
export function CompanionPage({
  view,
  space,
  actor,
  controller,
}: {
  view: string;
  space: string;
  actor: string;
  controller: SpacesController;
}) {
  const [product, setProduct] = useState("pc"),
    [version, setVersion] = useState("全部版本"),
    [gallery, setGallery] = useState<string[]>([]),
    [index, setIndex] = useState(0);
  const w = controller.state!.spaces.find((s) => s.id === space)!;
  if (view === "connectors")
    return (
      <section className="main-inner">
        <header style={{ padding: "12px 0 18px" }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>连接器</h1>
          <p className="ex-muted">
            连接常用工具，让 Agent 在你的工作流中完成任务。
          </p>
        </header>
        <iframe
          title="连接器"
          src={`${basePath}/integrations/connectors.html?${new URLSearchParams({ space, actor, readonly: String(w.type === "team" && w.status !== "active") })}`}
          style={{
            width: "100%",
            height: "calc(100vh - 220px)",
            minHeight: 560,
            border: "1px solid #dce6f2",
            borderRadius: 16,
            background: "white",
          }}
          sandbox="allow-scripts allow-same-origin"
        />
      </section>
    );
  if (view === "product")
    return (
      <section className="ex-product">
        <span className="ex-owner">EurekaMind · Record. Understand. Act.</span>
        <h1>让每一次记录，成为下一步行动。</h1>
        <p>
          从随身录音、会议纪要到个人闪念和团队洞察，把零散信息整理为可以追溯、可以协作的工作资产。
        </p>
        <div className="ex-product-grid">
          <article>
            <h2>个人空间 · 整理自己的每一天</h2>
            <p>
              设备与软件录音自动整理为笔记；随手记下日程、待办、灵感和收支。通讯录串联客户互动，Agent
              帮你找到信息、提炼重点与跟进行动。
            </p>
            <a href={appUrl("home", "", "personal", actor)}>进入个人工作台 →</a>
          </article>
          <article>
            <h2>团队空间 · 让进展对齐</h2>
            <p>
              会议、联系人和安排按需共享。团队洞察追踪重点客户、交付风险与产品反馈；管理员管理本区内容、成员与订阅，成员仅查看获得授权的同事内容。
            </p>
            <p>共享由内容本人发起；日程与待办支持逐条只读授权。</p>
          </article>
          <article>
            <h2>硬件与工作区</h2>
            <p>
              设备绑定决定录音和闪念的归属。切换工作台视图不改变设备目标；历史内容留在原工作区。
            </p>
          </article>
          <article>
            <h2>从连接到行动</h2>
            <p>
              通过连接器接入日历、文档、待办与业务系统。每一次处理都使用内容所属工作区的权限与
              Credits。
            </p>
            <a href={appUrl("connectors", "", space, actor)}>探索连接器 →</a>
          </article>
        </div>
      </section>
    );
  const list = updates.filter((x) => x.product === product);
  const visible = list.filter(
    (x) => version === "全部版本" || x.version === version,
  );
  return (
    <section className="ex-log">
      <header className="ex-head">
        <h2>更新日志</h2>
        <select
          className="ex-button"
          aria-label="筛选版本"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
        >
          <option>全部版本</option>
          {list.map((v) => (
            <option key={v.version}>{v.version}</option>
          ))}
        </select>
      </header>
      <nav className="ex-tabs" style={{ marginTop: 20 }}>
        {[
          ["pc", "EurekaMind 工作台"],
          ["app", "EurekaMind App"],
        ].map(([v, n]) => (
          <button
            role="tab"
            className="ex-button"
            key={v}
            aria-selected={product === v}
            onClick={() => {
              setProduct(v);
              setVersion("全部版本");
            }}
          >
            {n}
          </button>
        ))}
      </nav>
      {!list.length && <p className="ex-muted">暂无该产品更新记录</p>}
      {visible.map((v) => (
        <article key={v.version}>
          <div>
            <time>{v.date}</time>
            <small>{v.version}</small>
          </div>
          <div>
            {v.items.map((c, i) => (
              <section className="ex-log-card" key={c.title}>
                <div>
                  <h3>
                    <span className="ex-owner">{i + 1}</span> {c.title}
                  </h3>
                  <p>
                    {c.description
                      .replaceAll("Wisenote", "EurekaMind")
                      .replaceAll("WiseNote", "EurekaMind")
                      .replaceAll("百智", "EurekaMind")}
                  </p>
                </div>
                <div className="ex-log-images">
                  {c.images.map((src, j) => (
                    <button
                      style={{ border: 0, background: "none", padding: 0 }}
                      key={src}
                      onClick={() => {
                        setGallery(c.images);
                        setIndex(j);
                      }}
                    >
                      <img
                        alt={`${c.title} 界面示意 ${j + 1}`}
                        src={basePath + src}
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      ))}
      <button
        className="ex-button"
        onClick={() =>
          document
            .querySelector(".main")
            ?.scrollTo({ top: 0, behavior: "smooth" })
        }
      >
        返回顶部 ↑
      </button>
      {gallery.length > 0 && (
        <ReferenceDialog
          className="ex-dialog"
          label="更新图片预览"
          onClose={() => setGallery([])}
        >
          <header className="ex-head">
            <span>
              界面示意 {index + 1}/{gallery.length}
            </span>
            <button
              className="ex-close"
              aria-label="关闭"
              onClick={() => setGallery([])}
            >
              ×
            </button>
          </header>
          <div className="ex-body">
            <img
              style={{
                maxWidth: "100%",
                maxHeight: "60vh",
                display: "block",
                margin: "auto",
              }}
              src={basePath + gallery[index]}
              alt="更新界面示意"
            />
            <footer className="ex-footer">
              <button
                disabled={index === 0}
                onClick={() => setIndex(index - 1)}
              >
                上一张
              </button>
              <button
                disabled={index === gallery.length - 1}
                onClick={() => setIndex(index + 1)}
              >
                下一张
              </button>
            </footer>
          </div>
        </ReferenceDialog>
      )}
    </section>
  );
}
