"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import teamScreen from "./assets/team-workspace.png";
import enterpriseScreen from "./assets/enterprise-workspace.png";
import "./domestic-showcase.css";

const scenes = [
  {
    id: "team", label: "团队协作", eyebrow: "百智 · 团队版",
    title: <>把每一次讨论，<br />变成团队的共同进展。</>,
    description: "让会议有共识，让行动有着落。与团队在同一个工作空间里，记录、理解、推进。",
    image: teamScreen, alt: "百智团队工作台：团队洞察、团队日常与共享会议列表",
    caption: "从团队洞察，到每一场会议。",
    benefits: [["沉淀共识", "会议与结论，集中留存"], ["协同推进", "日程与待办，衔接行动"], ["按权限协作", "个人与团队，各有空间"]],
  },
  {
    id: "enterprise", label: "企业工作台", eyebrow: "百智 · 企业版",
    title: <>在企业的工作空间，<br />让每一项工作有序推进。</>,
    description: "以企业身份进入专属工作台，找到组织成员，梳理工作待办，让计划落实到日常。",
    image: enterpriseScreen, alt: "百智企业工作台：企业身份、企业成员入口与工作待办清单",
    caption: "面向企业成员，承接日常工作。",
    benefits: [["企业身份", "企业代码定位所属组织"], ["成员入口", "在企业内查看成员信息"], ["工作待办", "记录、完成、持续跟进"]],
  },
] as const;

export function DomesticShowcase({ edition }: { edition: string }) {
  const [active, setActive] = useState(edition === "enterprise" ? 1 : 0);
  const [expanded, setExpanded] = useState(false);
  const scene = scenes[active];
  return <section className="auth-visual domestic-showcase" aria-label="团队与企业工作空间介绍">
    <div className="baizhi-showcase-content">
      <div className="baizhi-showcase-tabs" role="group" aria-label="工作空间展示">
        {scenes.map((item, index) => <button key={item.id} type="button" aria-pressed={active === index} aria-controls="baizhi-showcase-panel" onClick={() => setActive(index)}>{item.label}</button>)}
      </div>
      <div id="baizhi-showcase-panel" className="baizhi-showcase-panel">
        <div className="baizhi-showcase-copy">
          <p className="baizhi-showcase-eyebrow">{scene.eyebrow}</p>
          <h2>{scene.title}</h2>
          <p className="baizhi-showcase-description">{scene.description}</p>
        </div>
        <figure className="baizhi-product-figure">
          <button type="button" className="baizhi-product-screen" aria-label={`放大查看${scene.label}界面`} onClick={() => setExpanded(true)}>
            <Image src={scene.image} alt={scene.alt} unoptimized loading="eager" sizes="(max-width: 960px) 0px, 52vw" />
          </button>
          <figcaption><span>{scene.caption}</span><button type="button" onClick={() => setExpanded(true)}>查看完整界面 <span aria-hidden="true">↗</span></button></figcaption>
        </figure>
        <dl className="baizhi-showcase-benefits">{scene.benefits.map(([title, text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}</dl>
      </div>
    </div>
    {expanded && <Modal title={`${scene.eyebrow} · ${scene.label}`} onClose={() => setExpanded(false)}>
      <Image className="baizhi-screen-enlarged" src={scene.image} alt={scene.alt} unoptimized />
    </Modal>}
  </section>;
}
