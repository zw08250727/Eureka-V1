/* eslint-disable @next/next/no-img-element -- Local third-party brand assets preserve their native proportions. */
import { basePath } from "@/lib/routes";
import type { Connector } from "./model";
const logos: Record<string, string> = {
  "google-workspace": "google-workspace.png",
  "google-calendar": "google-calendar.svg",
  "microsoft-365": "microsoft-365.png",
  slack: "slack.png",
  notion: "notion.png",
};
export function ConnectorLogo({ connector, large = false }: { connector: Connector; large?: boolean }) {
  const logo = !connector.custom && logos[connector.id];
  return <span className={`connector-mark${large ? " large" : ""}${logo ? " connector-brand" : ""}`} aria-hidden="true">
    {logo ? <img src={`${basePath}/connector-logos/${logo}`} alt="" width={32} height={32} /> : connector.name.slice(0, 1)}
  </span>;
}
