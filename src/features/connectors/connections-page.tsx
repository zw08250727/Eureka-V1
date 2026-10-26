"use client";
import type { SpacesController } from "@/features/spaces/use-spaces";
import { ConnectorsPage } from "./page";
import "./connections-page.css";

export function ConnectionsPage({ space, actor, controller }: {
  space: string; actor: string; controller: SpacesController;
}) {
  return <div className="connections-layout">
    <section className="connections-content" aria-labelledby="connections-title">
      <header className="connections-heading">
        <h1 id="connections-title">接入其他应用</h1>
        <p>将日历、知识库与协作服务连接到 EurekaMind，在当前工作区管理授权。</p>
      </header>
      <ConnectorsPage key={`${space}:${actor}`} space={space} actor={actor} controller={controller} />
    </section>
  </div>;
}
