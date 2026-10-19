import { marketConfig } from "@/features/markets/config";
import { domesticPresetTools } from "./catalog";
export type Connector = {
  id: string;
  name: string;
  description: string;
  tools: number;
  connected: boolean;
  demoDisconnected?: boolean;
  connectedAt?: string;
  enabled?: boolean;
  custom: boolean;
  demo?: boolean;
  catalog?: boolean;
  url?: string;
  config?: string;
  provider?: string;
  authorizedScopes?: string[];
  toolDefinitions?: { name: string; description: string }[];
};
export type ConnectorState = { version: 1; items: Connector[]; dismissedDemoIds?: string[]; catalogEnabled?: Record<string, boolean> };
export const connectorStorageKey = (space: string, actor: string) => `eureka:connectors:native:v1:${space}:${actor}`;
export function connectorToolCount(connector: Connector) {
  return Array.isArray(connector.toolDefinitions)
    ? connector.toolDefinitions.filter(tool => tool && typeof tool.name === "string" && typeof tool.description === "string").length
    : 0;
}
export const hasUsableTools = (connector: Connector) => connector.connected && connectorToolCount(connector) > 0;
function demoConnectors(catalogEnabled: Record<string, boolean> = {}): Connector[] {
  if (!marketConfig().connectors.some(item => item.id === "dingtalk")) return [];
  return [
    { id: "demo-contacts", name: "通讯录", description: "连接钉钉通讯录，查看组织、成员与角色相关工具。", tools: domesticPresetTools.通讯录.tools.length, connected: true, connectedAt: "2026-10-16T10:30:00+08:00", enabled: catalogEnabled["demo-contacts"] ?? true, custom: true, demo: true, catalog: true, provider: "钉钉", url: "https://example.com/mcp/contacts", toolDefinitions: domesticPresetTools.通讯录.tools },
    { id: "demo-docs", name: "文档", description: "连接工作文档，按授权范围查找、读取与整理内容。", tools: domesticPresetTools.文档.tools.length, connected: true, connectedAt: "2026-10-16T11:20:00+08:00", enabled: catalogEnabled["demo-docs"] ?? true, custom: true, demo: true, catalog: true, provider: "钉钉", url: "https://example.com/mcp/docs", toolDefinitions: domesticPresetTools.文档.tools },
    { id: "demo-todo", name: "待办", description: "整理钉钉待办，查看详情并跟进完成状态。", tools: domesticPresetTools.待办.tools.length, connected: true, connectedAt: "2026-10-16T14:00:00+08:00", enabled: catalogEnabled["demo-todo"] ?? false, custom: true, demo: true, catalog: true, provider: "钉钉", url: "https://example.com/mcp/todo", toolDefinitions: domesticPresetTools.待办.tools },
  ];
}
function withCatalog(state: ConnectorState): ConnectorState {
  const existing = new Set(state.items.map(item => item.id));
  const existingCustomNames = new Set(state.items.filter(item => item.custom).map(item => item.name.toLocaleLowerCase()));
  const missingSystems = marketConfig().connectors
    .filter(item => !existing.has(item.id))
    .map(item => ({ ...item, connected: false, custom: false, catalog: true }));
  const demos = demoConnectors(state.catalogEnabled).filter(item =>
    !existing.has(item.id) &&
    !state.dismissedDemoIds?.includes(item.id) &&
    !existingCustomNames.has(item.name.toLocaleLowerCase()),
  );
  return { ...state, items: [...state.items, ...missingSystems, ...demos] };
}
export function persistedConnectorState(state: ConnectorState): ConnectorState {
  return {
    version: 1,
    items: state.items.filter(item => !item.catalog).map(item => {
      const persisted = { ...item };
      delete persisted.catalog;
      return persisted;
    }),
    ...(state.dismissedDemoIds?.length ? { dismissedDemoIds: state.dismissedDemoIds } : {}),
    ...(state.catalogEnabled && Object.keys(state.catalogEnabled).length ? { catalogEnabled: state.catalogEnabled } : {}),
  };
}
export function connectorSeed(): ConnectorState {
  return withCatalog({
    version: 1,
    items: marketConfig().connectors.map((c) => ({
      ...c,
      connected: c.id === "dingtalk",
      custom: false,
    })),
  });
}
export function readConnectors(storage: Storage, key: string): ConnectorState {
  const raw = storage.getItem(key);
  if (!raw) return connectorSeed();
  const state = JSON.parse(raw) as ConnectorState;
  if (
    state.version !== 1 ||
    !Array.isArray(state.items) ||
    (state.dismissedDemoIds !== undefined && (!Array.isArray(state.dismissedDemoIds) || state.dismissedDemoIds.some((id: unknown) => typeof id !== "string"))) ||
    (state.catalogEnabled !== undefined && (!state.catalogEnabled || typeof state.catalogEnabled !== "object" || Array.isArray(state.catalogEnabled) || Object.values(state.catalogEnabled).some(value => typeof value !== "boolean"))) ||
    state.items.some(
      (c: Connector) =>
        !c ||
        typeof c.id !== "string" ||
        typeof c.name !== "string" ||
        typeof c.connected !== "boolean" ||
        typeof c.custom !== "boolean" ||
        typeof c.tools !== "number" ||
        typeof c.description !== "string" ||
        (c.authorizedScopes !== undefined && (!Array.isArray(c.authorizedScopes) || c.authorizedScopes.some(scope => typeof scope !== "string"))),
    )
  )
    throw Error("连接器数据无法读取，请保留数据并联系模块负责人。");
  return withCatalog(state);
}
export function setConnectorEnabled(storage: Storage, key: string, id: string, enabled: boolean): ConnectorState {
  const current = readConnectors(storage, key);
  const target = current.items.find(item => item.id === id);
  if (!target?.connected || (target.custom && !hasUsableTools(target))) throw Error("连接器状态已变化，请刷新后重试。");
  const next = target.catalog && target.demo
    ? { ...current, catalogEnabled: { ...current.catalogEnabled, [id]: enabled }, items: current.items.map(item => item.id === id ? { ...item, enabled } : item) }
    : { ...current, items: current.items.map(item => item.id === id ? { ...item, enabled } : item) };
  storage.setItem(key, JSON.stringify(persistedConnectorState(next)));
  return next;
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
