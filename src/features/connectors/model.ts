import { marketConfig } from "@/features/markets/config";
export type Connector = {
  id: string;
  name: string;
  description: string;
  tools: number;
  connected: boolean;
  custom: boolean;
  url?: string;
  config?: string;
};
export type ConnectorState = { version: 1; items: Connector[] };
export function connectorSeed(): ConnectorState {
  return {
    version: 1,
    items: marketConfig().connectors.map((c) => ({
      ...c,
      connected: false,
      custom: false,
    })),
  };
}
export function readConnectors(storage: Storage, key: string): ConnectorState {
  const raw = storage.getItem(key);
  if (!raw) return connectorSeed();
  const state = JSON.parse(raw);
  if (
    state.version !== 1 ||
    !Array.isArray(state.items) ||
    state.items.some(
      (c: Connector) =>
        !c ||
        typeof c.id !== "string" ||
        typeof c.name !== "string" ||
        typeof c.connected !== "boolean" ||
        typeof c.custom !== "boolean" ||
        typeof c.tools !== "number" ||
        typeof c.description !== "string",
    )
  )
    throw Error("连接器数据无法读取，请保留数据并联系模块负责人。");
  const allowed = new Set(marketConfig().connectors.map((c) => c.id));
  return {
    version: 1,
    items: [
      ...state.items.filter((c: Connector) => c.custom || allowed.has(c.id)),
      ...connectorSeed().items.filter(c => !state.items.some((saved: Connector) => saved.id === c.id)),
    ],
  };
}
export function validateConnector(
  name: string,
  value: string,
  mode: "url" | "json",
  items: Connector[],
  editing?: string,
) {
  name = name.trim();
  if (!name || name.length > 60) throw Error("请填写 1–60 字的连接器名称。");
  if (
    items.some(
      (c) =>
        c.id !== editing &&
        c.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  )
    throw Error("名称已存在，请修改。");
  const validUrl = (text: string) => {
    let url: URL;
    try {
      url = new URL(text);
    } catch {
      throw Error("请填写完整的 HTTP 或 HTTPS 地址。");
    }
    if (
      !["https:", "http:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    )
      throw Error("请填写不含账号密码的 HTTP 或 HTTPS 地址。");
    return url.href;
  };
  if (mode === "url")
    return { name, url: validUrl(value.trim()), config: undefined };
  let parsed: {
    mcpServers?: Record<string, { url?: string; command?: string }>;
  };
  try {
    parsed = JSON.parse(value);
  } catch {
    throw Error("JSON 格式无效，请检查后重试。");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw Error("请提供 MCP 配置对象。");
  const servers = parsed.mcpServers || parsed;
  const entries = Object.values(servers);
  if (
    !entries.length ||
    entries.some(
      (server) =>
        !server ||
        typeof server !== "object" ||
        (!server.url &&
          (typeof server.command !== "string" || !server.command.trim())),
    )
  )
    throw Error("每个 MCP 服务需要 url 或 command。");
  for (const server of entries) if (server.url) validUrl(server.url);
  return { name, url: entries[0].url || "", config: value };
}
