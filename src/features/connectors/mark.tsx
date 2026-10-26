import Image from "next/image";
import { basePath } from "@/lib/routes";
import type { Connector } from "./model";
import "./mark.css";

const logos: Record<string, string> = {
  feishu: "feishu.svg",
  dingtalk: "dingtalk.svg",
  "tencent-meeting": "tencent-meeting.svg",
};
const globalLogos: Record<string, string> = {
  "google-workspace": "connector-logos/google-workspace.png",
  "google-calendar": "connector-logos/google-calendar.svg",
  "microsoft-365": "connector-logos/microsoft-365.png",
  slack: "connector-logos/slack.png",
  notion: "connector-logos/notion.png",
};

export function ConnectorMark({ connector, large = false }: { connector: Connector; large?: boolean }) {
  const logo = logos[connector.id]
    ? `assets/connectors/${logos[connector.id]}`
    : !connector.custom && globalLogos[connector.id];
  return <span className={`connector-mark connector-mark-${connector.id} ${large ? "large" : ""}`} aria-hidden="true">
    {logo ? <Image src={`${basePath}/${logo}`} alt="" width={large ? 64 : 48} height={large ? 64 : 48} unoptimized /> : connector.name.slice(0, 1)}
  </span>;
}
