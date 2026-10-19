import Image from "next/image";
import { basePath } from "@/lib/routes";
import type { Connector } from "./model";
import "./mark.css";

const logos: Record<string, string> = {
  feishu: "feishu.svg",
  dingtalk: "dingtalk.svg",
  "tencent-meeting": "tencent-meeting.svg",
};

export function ConnectorMark({ connector, large = false }: { connector: Connector; large?: boolean }) {
  const logo = logos[connector.id];
  return <span className={`connector-mark connector-mark-${connector.id} ${large ? "large" : ""}`} aria-hidden="true">
    {logo ? <Image src={`${basePath}/assets/connectors/${logo}`} alt="" width={large ? 64 : 48} height={large ? 64 : 48} unoptimized /> : connector.name.slice(0, 1)}
  </span>;
}
