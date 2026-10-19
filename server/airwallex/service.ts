import { createServer, type IncomingMessage } from "node:http";

export const SANDBOX_API = "https://api.sandbox.airwallex.com/api/v1";
export class CheckoutError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const origins = (env.AIRWALLEX_ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000").split(",").map(s => s.trim()).filter(Boolean);
  const hosts = ["localhost", "127.0.0.1", ...(env.AIRWALLEX_ALLOWED_HOSTS || "").split(","), env.RENDER_EXTERNAL_HOSTNAME || ""].map(s => s.trim().toLowerCase()).filter(Boolean);
  return {
    clientId: env.AIRWALLEX_CLIENT_ID || "-SKsRMNmQMmVW92h7Du0Ow",
    apiKey: env.AIRWALLEX_API_KEY || "",
    legalEntityId: env.AIRWALLEX_LEGAL_ENTITY_ID || "le_KD4_aWnoPxOWAoHDucwRGg",
    prices: {
      month: env.AIRWALLEX_PRICE_MONTH || "pri_sgpv4vrlshncesbtjk6",
      year: env.AIRWALLEX_PRICE_YEAR || "pri_sgpvxj9q6hncetv8e7k",
    },
    personalPrices: {
      month: env.AIRWALLEX_PRICE_PERSONAL_MONTH || "pri_sgpvxj9q6hnckc9rw29",
      year: env.AIRWALLEX_PRICE_PERSONAL_YEAR || "pri_sgpvxj9q6hnckca0ule",
    },
    creditsPrice: env.AIRWALLEX_PRICE_CREDITS || "pri_sgpv4vrlshncgozq53w",
    paymentAccountId: env.AIRWALLEX_LINKED_PAYMENT_ACCOUNT_ID || "",
    successUrl: env.AIRWALLEX_SUCCESS_URL || "",
    backUrl: env.AIRWALLEX_BACK_URL || "",
    origins: [...new Set(origins)],
    hosts: [...new Set(hosts)],
  };
}
type Config = ReturnType<typeof readConfig>;
type Input = { kind?: "seat" | "credits" | "personal" | "team"; requestId: string; market: "global"; workspaceId: string; actor: string; cycle: "month" | "year"; quantity: number };
type Checkout = { id: string; url: string; status: string; expiresAt: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateInput(value: unknown): Input {
  if (!value || typeof value !== "object") throw new CheckoutError(400, "请求必须为 JSON 对象");
  const p = value as Record<string, unknown>;
  const keys = ["requestId", "market", "workspaceId", "actor", "cycle", "quantity", "kind"];
  if (Object.keys(p).some(k => !keys.includes(k))) throw new CheckoutError(400, "请求包含不支持的字段");
  if ((p.kind !== undefined && !["seat", "credits", "personal", "team"].includes(String(p.kind))) || (p.kind === "team" && Number(p.quantity) < 2) || (p.kind === "credits" && ![5, 10, 15].includes(Number(p.quantity))) || p.market !== "global" || !["month", "year"].includes(String(p.cycle)) ||
      typeof p.requestId !== "string" || !uuid.test(p.requestId) ||
      typeof p.workspaceId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.workspaceId) || (p.workspaceId === "personal" && !["credits", "personal"].includes(String(p.kind))) || (p.kind === "personal" && (p.workspaceId !== "personal" || p.quantity !== 1)) ||
      typeof p.actor !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.actor) ||
      !Number.isInteger(p.quantity) || Number(p.quantity) < 1 || Number(p.quantity) > 50) {
    throw new CheckoutError(400, "仅支持海外；席位数量为 1–50，Credits 份数为 5/10/15；周期为 month/year，requestId 须为 UUID");
  }
  return { ...(p.kind ? { kind: p.kind as Input["kind"] } : {}), requestId: p.requestId, market: "global", workspaceId: p.workspaceId, actor: p.actor, cycle: p.cycle as Input["cycle"], quantity: Number(p.quantity) };
}
export function missingConfig(config: Config) {
  return [!config.apiKey && "AIRWALLEX_API_KEY", !config.successUrl && "AIRWALLEX_SUCCESS_URL", !config.backUrl && "AIRWALLEX_BACK_URL"].filter(Boolean);
}
function checkReturnUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost" ||
        url.hostname.endsWith(".localhost") || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || url.hostname.includes(":")) throw Error();
  } catch { throw new CheckoutError(503, "success_url / back_url 必须配置为公开可访问的 HTTPS 页面地址"); }
}
export function createCheckoutService(config: Config, transport: typeof fetch = fetch) {
  const entries = new Map<string, { fingerprint: string; promise?: Promise<Checkout>; expires: number; checkout?: Checkout }>();
  const knownIds = new Set<string>();
  async function api(path: string, options: RequestInit) {
    let response: Response;
    try {
      response = await transport(`${SANDBOX_API}${path}`, { ...options, redirect: "error", signal: AbortSignal.timeout(20000) });
    } catch { throw new CheckoutError(502, "无法连接 Airwallex 沙盒，请检查网络后使用同一 requestId 重试"); }
    if (!response.ok) {
      // Only expose the structured error code/message; never reflect HTML or credentials.
      const failure = await response.json().catch(() => ({})) as Record<string, unknown>;
      let detail = [failure.code, failure.message].filter(v => typeof v === "string").join(": ");
      const authorization = new Headers(options.headers).get("Authorization")?.replace(/^Bearer /, "");
      for (const secret of [config.apiKey, authorization]) if (secret) detail = detail.split(secret).join("[redacted]");
      throw new CheckoutError(502, `Airwallex 沙盒请求失败（HTTP ${response.status}，${path.startsWith("/authentication") ? "认证" : "结账"}）${detail ? `：${detail.slice(0, 400)}` : "；请检查网络、沙盒凭证和 Billing Checkouts 权限"}`);
    }
    try { return await response.json() as Record<string, unknown>; }
    catch { throw new CheckoutError(502, "Airwallex 返回了无法解析的响应"); }
  }
  async function auth() {
    if (!config.apiKey) throw new CheckoutError(503, "请配置 AIRWALLEX_API_KEY");
    const result = await api("/authentication/login", { method: "POST", headers: { "Content-Type": "application/json", "x-client-id": config.clientId, "x-api-key": config.apiKey } });
    if (typeof result.token !== "string" || !result.token) throw new CheckoutError(502, "Airwallex 未返回 access token");
    return result.token;
  }
  async function create(input: Input): Promise<Checkout> {
    const missing = missingConfig(config);
    if (missing.length) throw new CheckoutError(503, `结账服务缺少配置：${missing.join(", ")}`);
    checkReturnUrl(config.successUrl); checkReturnUrl(config.backUrl);
    for (const [key, entry] of entries) if (entry.expires <= Date.now()) { if (entry.checkout) knownIds.delete(entry.checkout.id); entries.delete(key); }
    const fingerprint = JSON.stringify(input);
    const prior = entries.get(input.requestId);
    if (prior && prior.fingerprint !== fingerprint) throw new CheckoutError(409, "同一 requestId 不可更换工作区、周期或数量");
    if (prior?.promise) return prior.promise;
    if (!prior && entries.size >= 200) throw new CheckoutError(429, "本地结账会话过多，请稍后重试");
    const entry = prior || { fingerprint, expires: Date.now() + 3600000, promise: undefined, checkout: undefined };
    entries.set(input.requestId, entry);
    entry.promise = (async () => {
      const token = await auth();
      const result = await api("/billing/billing_checkouts/create", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          request_id: input.requestId, ui_mode: "HOSTED",
          ...(input.kind === "credits" ? { mode: "PAYMENT", invoice_data: {} } : { mode: "SUBSCRIPTION", subscription_data: {} }),
          legal_entity_id: config.legalEntityId,
          ...(config.paymentAccountId ? { linked_payment_account_id: config.paymentAccountId } : {}),
          success_url: config.successUrl, back_url: config.backUrl,
          line_items: [{ price_id: input.kind === "credits" ? config.creditsPrice : input.kind === "personal" ? config.personalPrices[input.cycle] : config.prices[input.cycle], quantity: input.kind === "credits" ? input.quantity * 1000 : input.quantity }],
          metadata: { market: input.market, workspace_id: input.workspaceId, actor: input.actor, local_request_id: input.requestId, purpose: input.kind === "credits" ? "sandbox-credits-checkout" : input.kind === "personal" ? "sandbox-personal-checkout" : "sandbox-seat-checkout" },
        }),
      });
      let url: URL;
      try { url = new URL(String(result.url)); } catch { throw new CheckoutError(502, "Airwallex 未返回可用 Checkout URL"); }
      if (url.protocol !== "https:" || !url.hostname.endsWith(".airwallex.com") || url.username || url.password || typeof result.id !== "string") {
        throw new CheckoutError(502, "Airwallex 返回的结账地址或 ID 无效");
      }
      const checkout = { id: result.id, url: url.href, status: String(result.status || "OPEN"), expiresAt: String(result.expires_at || new Date(entry.expires).toISOString()) };
      const expires = Date.parse(checkout.expiresAt);
      if (!Number.isFinite(expires) || expires <= Date.now()) throw new CheckoutError(409, "Checkout 已过期，请使用新的 requestId 创建");
      entry.expires = Math.min(entry.expires, expires);
      entry.checkout = checkout;
      knownIds.add(checkout.id);
      return checkout;
    })();
    try { return await entry.promise; }
    catch (error) { entry.promise = undefined; throw error; }
  }
  async function retrieve(id: string) {
    if (!knownIds.has(id)) throw new CheckoutError(404, "仅可查询本次服务进程创建的 Checkout；服务重启后请在 Airwallex 后台查询");
    const token = await auth();
    const result = await api(`/billing/billing_checkouts/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
    return { id, status: result.status, subscriptionId: result.subscription_id || null, completedAt: result.completed_at || null, expiresAt: result.expires_at || null };
  }
  async function invoices(workspaceId: string, requestId?: string) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(workspaceId) || (workspaceId === "personal" && !requestId)) throw new CheckoutError(400, "INV-SCOPE");
    const token = await auth();
    async function list(path: string) {
      const rows: Record<string, unknown>[] = [];
      let page = "";
      for (let n = 0; n < 20; n++) {
        const data = await api(`${path}?page_size=100${page ? `&page=${encodeURIComponent(page)}` : ""}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!Array.isArray(data.items)) throw new CheckoutError(502, "INV-RESPONSE");
        rows.push(...data.items as Record<string, unknown>[]);
        if (!data.page_after) return rows;
        page = String(data.page_after);
      }
      throw new CheckoutError(502, "INV-PAGE-LIMIT");
    }
    const checkouts = await list("/billing/billing_checkouts");
    const orderCheckout = requestId ? checkouts.find(c => {
      const metadata = c.metadata as Record<string, unknown> | undefined;
      return c.legal_entity_id === config.legalEntityId && metadata?.market === "global" && metadata.workspace_id === workspaceId && ["sandbox-credits-checkout", "sandbox-personal-checkout"].includes(String(metadata.purpose)) && metadata.local_request_id === requestId;
    }) : undefined;
    const orderDetail = orderCheckout && !orderCheckout.invoice_id && !orderCheckout.subscription_id
      ? await api(`/billing/billing_checkouts/${encodeURIComponent(String(orderCheckout.id))}`, { headers: { Authorization: `Bearer ${token}` } })
      : orderCheckout;
    const subscriptions = new Set(checkouts.filter(c => {
      const metadata = c.metadata as Record<string, unknown> | undefined;
      return c.legal_entity_id === config.legalEntityId && metadata?.market === "global" && metadata.workspace_id === workspaceId && c.subscription_id;
    }).map(c => c.subscription_id));
    if (!subscriptions.size && !orderCheckout) return { items: [] };
    const rows = await list("/billing/invoices");
    const safeUrl = (value: unknown) => {
      try { const u = new URL(String(value)); return u.protocol === "https:" && u.hostname.endsWith(".airwallex.com") && !u.username && !u.password ? u.href : null; } catch { return null; }
    };
    return { items: rows.filter(i => i.legal_entity_id === config.legalEntityId && (requestId
      ? orderCheckout && (i.id === orderDetail?.invoice_id || i.billing_checkout_id === orderCheckout.id || (!!orderDetail?.subscription_id && i.subscription_id === orderDetail.subscription_id))
      : subscriptions.has(i.subscription_id))).map(i => ({
      id: String(i.id), number: String(i.number || i.id), date: String(i.created_at || ""),
      amount: typeof i.total_amount === "number" ? i.total_amount : null, currency: String(i.currency || ""),
      status: String(i.status || ""), paymentStatus: String(i.payment_status || ""), pdfUrl: safeUrl(i.pdf_url),
    })) };
  }
  return { create, retrieve, invoices };
}
async function readBody(req: IncomingMessage) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 4096) throw new CheckoutError(413, "请求体超过限制");
  }
  try { return JSON.parse(body) as unknown; } catch { throw new CheckoutError(400, "JSON 格式错误"); }
}
export function createAirwallexServer(config: Config, transport: typeof fetch = fetch) {
  const service = createCheckoutService(config, transport);
  return createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    const send = (status: number, data: unknown) => { res.writeHead(status); res.end(JSON.stringify(data)); };
    try {
      const host = (req.headers.host || "").replace(/:\d+$/, "").toLowerCase();
      if (!config.hosts.includes(host)) throw new CheckoutError(403, "不允许此主机访问结账服务");
      const origin = req.headers.origin;
      if (origin && !config.origins.includes(origin)) throw new CheckoutError(403, "不允许此来源访问结账服务");
      if (origin) { res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Vary", "Origin"); }
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Eureka-Checkout");
        res.writeHead(204); res.end(); return;
      }
      const path = (req.url || "").split("?")[0];
      if (req.method === "GET" && path === "/health") { send(200, { service: "airwallex-sandbox", ready: missingConfig(config).length === 0, missing: missingConfig(config) }); return; }
      if (req.headers["x-eureka-checkout"] !== "1") throw new CheckoutError(403, "缺少 X-Eureka-Checkout 请求头");
      if (req.method === "GET" && path === "/api/airwallex/invoices") {
        const query = new URL(req.url!, "http://localhost").searchParams;
        if (query.get("market") !== "global") throw new CheckoutError(400, "INV-SCOPE");
        const requestId = query.get("requestId") || undefined;
        if (requestId && !uuid.test(requestId)) throw new CheckoutError(400, "INV-REQUEST");
        send(200, await service.invoices(query.get("workspaceId") || "", requestId)); return;
      }
      if (req.method === "POST" && path === "/api/airwallex/checkouts") {
        if (!req.headers["content-type"]?.startsWith("application/json")) throw new CheckoutError(415, "需要 application/json");
        send(200, await service.create(validateInput(await readBody(req)))); return;
      }
      if (req.method === "GET" && /^\/api\/airwallex\/checkouts\/[a-zA-Z0-9_-]+$/.test(path)) {
        send(200, await service.retrieve(path.split("/").at(-1)!)); return;
      }
      throw new CheckoutError(404, "接口不存在");
    } catch (error) { send(error instanceof CheckoutError ? error.status : 500, { error: error instanceof CheckoutError ? error.message : "结账服务发生错误" }); }
  });
}
