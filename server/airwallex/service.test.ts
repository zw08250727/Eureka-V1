import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { request } from "node:http";
import { createAirwallexServer, createCheckoutService, readConfig, validateInput, SANDBOX_API } from "./service.ts";

const config = () => ({ ...readConfig({}), apiKey: "test-secret", successUrl: "https://example.com/success", backUrl: "https://example.com/back" });
const input = () => validateInput({ requestId: randomUUID(), market: "global", workspaceId: "team-eureka", actor: "zhang", cycle: "year", quantity: 1 });
function mockApi() {
  const calls: { url: string; options: RequestInit }[] = [];
  const transport: typeof fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/authentication/login")) return Response.json({ token: "test-token" });
    if (String(url).endsWith("/create")) return Response.json({ id: "bchk_test", url: "https://checkout.airwallex.com/pay?s=test", status: "OPEN", expires_at: new Date(Date.now() + 3600000).toISOString() });
    return Response.json({ status: "COMPLETED", subscription_id: "sub_test", completed_at: "2026-10-19T10:00:00Z", customer_data: { email: "private@example.com" } });
  };
  return { calls, transport };
}
test("authenticates server-side, selects recurring price, preserves scope and exposes only checkout fields", async () => {
  const mock = mockApi();
  const service = createCheckoutService(config(), mock.transport);
  const value = input();
  const result = await service.create(value);
  assert.equal(result.url, "https://checkout.airwallex.com/pay?s=test");
  assert.equal(mock.calls[0].url, `${SANDBOX_API}/authentication/login`);
  assert.equal((mock.calls[0].options.headers as Record<string, string>)["x-api-key"], "test-secret");
  const payload = JSON.parse(String(mock.calls[1].options.body));
  assert.equal(payload.mode, "SUBSCRIPTION"); assert.equal(payload.ui_mode, "HOSTED");
  assert.deepEqual(payload.subscription_data, {});
  assert.deepEqual(payload.line_items, [{ price_id: "pri_sgpvxj9q6hncetv8e7k", quantity: 1 }]);
  assert.equal(payload.metadata.workspace_id, value.workspaceId);
  assert.equal(payload.request_id, value.requestId);
  assert.equal(payload.success_url, config().successUrl);
  assert.ok(!JSON.stringify(result).includes("test-secret"));
  const status = await service.retrieve(result.id);
  assert.equal(status.status, "COMPLETED");
  assert.ok(!JSON.stringify(status).includes("private@example.com"));
  await service.create({ ...input(), cycle: "month", quantity: 3 });
  assert.equal(JSON.parse(String(mock.calls.at(-1)!.options.body)).line_items[0].price_id, "pri_sgpv4vrlshncesbtjk6");
});
test("coalesces double-clicks and rejects reuse across teams", async () => {
  const mock = mockApi(); const service = createCheckoutService(config(), mock.transport); const value = input();
  await Promise.all([service.create(value), service.create(value)]);
  assert.equal(mock.calls.length, 2);
  await assert.rejects(service.create({ ...value, workspaceId: "another-team" }), /同一 requestId/);
});
test("rejects invalid/cross-market input and browser price/return-url overrides", () => {
  for (const extra of [{ market: "cn" }, { quantity: 0 }, { quantity: 1.5 }, { quantity: 51 }, { price_id: "attacker" }, { success_url: "https://evil.example" }, { workspaceId: "personal" }, { requestId: "bad" }]) {
    assert.throws(() => validateInput({ ...input(), ...extra }));
  }
});
test("configuration failures do not call Airwallex", async () => {
  const mock = mockApi();
  await assert.rejects(createCheckoutService(readConfig({}), mock.transport).create(input()), /AIRWALLEX_API_KEY/);
  await assert.rejects(createCheckoutService({ ...config(), backUrl: "http://localhost:3000" }, mock.transport).create(input()), /HTTPS/);
  assert.equal(mock.calls.length, 0);
});
test("403 HTML and network errors produce safe actionable errors", async () => {
  const denied: typeof fetch = async () => new Response("<html>test-secret</html>", { status: 403 });
  await assert.rejects(createCheckoutService(config(), denied).create(input()), error => error instanceof Error && error.message.includes("403") && !error.message.includes("test-secret"));
  const offline: typeof fetch = async () => { throw Error("network-internal-secret"); };
  await assert.rejects(createCheckoutService(config(), offline).create(input()), /无法连接 Airwallex/);
});
test("rejects foreign checkout destinations and unknown status IDs", async () => {
  const fake: typeof fetch = async url => String(url).endsWith("/login") ? Response.json({ token: "test-token" }) : Response.json({ id: "bchk_test", url: "https://evil.example/pay" });
  const service = createCheckoutService(config(), fake);
  await assert.rejects(service.create(input()), /地址或 ID 无效/);
  await assert.rejects(service.retrieve("bchk_not_owned"), /仅可查询/);
});
test("failed requests retain scope while allowing a retry", async () => {
  const mock = mockApi(); let fail = true;
  const service = createCheckoutService(config(), async (...args) => { if (fail) { fail = false; throw Error("offline"); } return mock.transport(...args); });
  const value = input();
  await assert.rejects(service.create(value));
  await assert.rejects(service.create({ ...value, quantity: 2 }), /同一 requestId/);
  assert.ok((await service.create(value)).url);
});
test("HTTP health, CORS, host validation, content type and body size guards", async t => {
  const mock = mockApi(); const server = createAirwallexServer(config(), mock.transport);
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  assert.equal((await (await fetch(`${base}/health`)).json()).ready, true);
  assert.equal((await fetch(`${base}/health`, { headers: { Origin: "https://evil.example" } })).status, 403);
  const hostStatus = await new Promise<number | undefined>((resolve, reject) => {
    const req = request(`${base}/health`, { headers: { Host: "evil.example" } }, res => { res.resume(); resolve(res.statusCode); });
    req.on("error", reject); req.end();
  });
  assert.equal(hostStatus, 403);
  const options = await fetch(`${base}/api/airwallex/checkouts`, { method: "OPTIONS", headers: { Origin: "http://localhost:3000" } });
  assert.equal(options.status, 204); assert.equal(options.headers.get("access-control-allow-origin"), "http://localhost:3000");
  const post = (body: string, headers = {}) => fetch(`${base}/api/airwallex/checkouts`, { method: "POST", body, headers });
  assert.equal((await post("{}")).status, 403);
  assert.equal((await post("{}", { "X-Eureka-Checkout": "1" })).status, 415);
  const headers = { "X-Eureka-Checkout": "1", "Content-Type": "application/json" };
  assert.equal((await post("{", headers)).status, 400);
  assert.equal((await post(" ".repeat(5000), headers)).status, 413);
  const result = await post(JSON.stringify(input()), headers);
  assert.equal(result.status, 200); assert.equal((await result.json()).id, "bchk_test");
});

test("Render hostname and GitHub Pages origin are accepted only when configured", async t => {
  const hosted = readConfig({
    AIRWALLEX_API_KEY: "test-secret",
    AIRWALLEX_SUCCESS_URL: "https://zw08250727.github.io/Eureka-V1/global/workbench/",
    AIRWALLEX_BACK_URL: "https://zw08250727.github.io/Eureka-V1/global/workbench/",
    AIRWALLEX_ALLOWED_ORIGINS: "https://zw08250727.github.io",
    RENDER_EXTERNAL_HOSTNAME: "eureka-airwallex.onrender.com",
  });
  const server = createAirwallexServer(hosted, mockApi().transport);
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const status = await new Promise<number | undefined>((resolve, reject) => {
    const req = request(`http://127.0.0.1:${address.port}/api/airwallex/checkouts`, {
      method: "OPTIONS",
      headers: { Host: "eureka-airwallex.onrender.com", Origin: "https://zw08250727.github.io" },
    }, res => { res.resume(); resolve(res.statusCode); });
    req.on("error", reject); req.end();
  });
  assert.equal(status, 204);
});

test("personal and team Credits use PAYMENT and raw credit quantity for the 1000-credit lot", async () => {
  const mock = mockApi(); const service = createCheckoutService(config(), mock.transport);
  for (const workspaceId of ["personal", "team-eureka"]) for (const units of [5, 10, 15]) {
    await service.create(validateInput({ ...input(), kind: "credits", workspaceId, quantity: units }));
    const payload = JSON.parse(String(mock.calls.at(-1)!.options.body));
    assert.equal(payload.metadata.workspace_id, workspaceId);
    assert.equal(payload.mode, "PAYMENT");
    assert.equal(payload.subscription_data, undefined);
    assert.deepEqual(payload.invoice_data, {});
    assert.deepEqual(payload.line_items, [{ price_id: "pri_sgpv4vrlshncgozq53w", quantity: units * 1000 }]);
  }
  for (const extra of [{ quantity: 1 }, { quantity: 5000 }, { workspaceId: "" }, { kind: "invalid" }]) {
    assert.throws(() => validateInput({ ...input(), kind: "credits", workspaceId: "personal", quantity: 5, ...extra }));
  }
});

test("invoice history follows scoped checkout subscriptions across pages and exposes official fields only", async () => {
  const service = createCheckoutService(config(), async url => {
    const u = new URL(String(url));
    if (u.pathname.endsWith('/login')) return Response.json({ token: 'test' });
    if (u.pathname.endsWith('/billing_checkouts')) return Response.json({ items: [
      { legal_entity_id: config().legalEntityId, subscription_id: 'sub_owned', metadata: { market: 'global', workspace_id: 'team-eureka' } },
      { legal_entity_id: config().legalEntityId, subscription_id: 'sub_other', metadata: { market: 'global', workspace_id: 'other-team' } },
    ] });
    const row = { id: 'inv1', number: 'INV-1', legal_entity_id: config().legalEntityId, subscription_id: 'sub_owned', total_amount: 149.99, currency: 'USD', payment_status: 'PAID', status: 'FINALIZED', pdf_url: 'https://invoice.sandbox.airwallex.com/pdf?s=test', customer_email: 'private@example.com' };
    return Response.json(u.searchParams.has('page') ? { items: [{ ...row, id: 'inv2', pdf_url: 'https://evil.example/pdf' }] } : { items: [row, { ...row, id: 'foreign', subscription_id: 'sub_other' }], page_after: 'next' });
  });
  const data = await service.invoices('team-eureka');
  assert.deepEqual(data.items.map(i => i.id), ['inv1', 'inv2']);
  assert.equal(data.items[0].amount, 149.99);
  assert.equal(data.items[0].paymentStatus, 'PAID');
  assert.equal(data.items[1].pdfUrl, null);
  assert.ok(!JSON.stringify(data).includes('private@example.com'));
  assert.deepEqual(await service.invoices('unmapped'), { items: [] });
  await assert.rejects(service.invoices('personal'));
});

test("Credits invoice lookup uses the original checkout request and workspace", async () => {
  const requestId = randomUUID();
  const service = createCheckoutService(config(), async url => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith('/login')) return Response.json({ token: 'test' });
    if (path.endsWith('/billing_checkouts')) return Response.json({ items: [
      { id: 'bco_owned', invoice_id: 'inv_owned', legal_entity_id: config().legalEntityId, metadata: { market: 'global', workspace_id: 'team-eureka', purpose: 'sandbox-credits-checkout', local_request_id: requestId } },
      { id: 'bco_other', invoice_id: 'inv_other', legal_entity_id: config().legalEntityId, metadata: { market: 'global', workspace_id: 'other-team', purpose: 'sandbox-credits-checkout', local_request_id: requestId } },
    ] });
    return Response.json({ items: [
      { id: 'inv_owned', legal_entity_id: config().legalEntityId, pdf_url: 'https://invoice.sandbox.airwallex.com/owned' },
      { id: 'inv_other', legal_entity_id: config().legalEntityId, pdf_url: 'https://invoice.sandbox.airwallex.com/other' },
    ] });
  });
  assert.deepEqual((await service.invoices('team-eureka', requestId)).items.map(i => i.id), ['inv_owned']);
  assert.deepEqual(await service.invoices('team-eureka', randomUUID()), { items: [] });
});

test("personal subscription invoice lookup follows only its checkout subscription", async () => {
  const requestId = randomUUID();
  const service = createCheckoutService(config(), async url => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith('/login')) return Response.json({ token: 'test' });
    if (path.endsWith('/billing_checkouts')) return Response.json({ items: [
      { id: 'bco_personal', subscription_id: 'sub_personal', legal_entity_id: config().legalEntityId, metadata: { market: 'global', workspace_id: 'personal', purpose: 'sandbox-personal-checkout', local_request_id: requestId } },
      { id: 'bco_team', subscription_id: 'sub_team', legal_entity_id: config().legalEntityId, metadata: { market: 'global', workspace_id: 'team-eureka', purpose: 'sandbox-seat-checkout' } },
    ] });
    return Response.json({ items: [
      { id: 'inv_personal', subscription_id: 'sub_personal', legal_entity_id: config().legalEntityId, pdf_url: 'https://invoice.sandbox.airwallex.com/personal' },
      { id: 'inv_team', subscription_id: 'sub_team', legal_entity_id: config().legalEntityId, pdf_url: 'https://invoice.sandbox.airwallex.com/team' },
    ] });
  });
  assert.deepEqual((await service.invoices('personal', requestId)).items.map(i => i.id), ['inv_personal']);
  assert.deepEqual(await service.invoices('personal', randomUUID()), { items: [] });
});

test("personal subscriptions select their own recurring prices and cannot target teams or multiple units", async () => {
  for (const cycle of ["month", "year"] as const) {
    const mock = mockApi();
    const value = validateInput({ ...input(), kind: "personal", workspaceId: "personal", cycle });
    await createCheckoutService(config(), mock.transport).create(value);
    const payload = JSON.parse(String(mock.calls[1].options.body));
    assert.equal(payload.mode, "SUBSCRIPTION");
    assert.deepEqual(payload.line_items, [{ price_id: config().personalPrices[cycle], quantity: 1 }]);
    assert.equal(payload.metadata.workspace_id, "personal");
    assert.equal(payload.metadata.purpose, "sandbox-personal-checkout");
  }
  for (const extra of [{ workspaceId: "team-eureka" }, { quantity: 2 }]) {
    assert.throws(() => validateInput({ ...input(), kind: "personal", workspaceId: "personal", ...extra }));
  }
});
