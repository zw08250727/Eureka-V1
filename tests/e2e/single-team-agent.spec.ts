import { expect, test, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import { agentRoute } from "../../src/features/agent/registry";
import type { WorkspaceState } from "../../src/features/spaces/model/types";
const KEY = "eureka:workspaces:v2";
const blocked = "你已创建或加入一个团队，不能再创建或加入其他团队";
function personalOnly() { const s = M.seed(); s.spaces = s.spaces.filter((w) => w.type === "personal"); s.devices = []; return s; }
async function seed(page: Page, state: WorkspaceState) {
  await page.addInitScript(({ state, key }) => {
    if (!sessionStorage.getItem("single-team-seeded")) { localStorage.setItem(key, JSON.stringify(state)); sessionStorage.setItem("single-team-seeded", "1"); }
  }, { state, key: KEY });
}

test("single team model rejects create/join and lifecycle mutations without side effects", () => {
  const s = M.seed();
  expect(s.spaces.filter((w) => w.type === "team")).toHaveLength(1);
  const before = JSON.stringify(s), w = M.get(s, "team-eureka");
  expect(() => M.create(s, { name: "第二个", country: "中国", cycle: "year", seats: 3, orderId: "second" })).toThrow(blocked);
  expect(() => M.acceptInvite(s, "invite-growth")).toThrow(blocked);
  expect(() => M.leave(s, w)).toThrow("不支持退出");
  expect(() => M.dissolve(s, w, w.name)).toThrow("不支持解散");
  expect(() => M.memberAction(s, w, "zhang", "remove")).toThrow("不支持退出");
  expect(JSON.stringify(s)).toBe(before);
  w.status = "expired";
  expect(() => M.assertCanJoinTeam(s)).toThrow(blocked);
});

test("first creation is idempotent and first join blocks creation", () => {
  const s = personalOnly(), input = { name: "唯一团队", country: "中国", cycle: "year" as const, seats: 3, orderId: "one" };
  const w = M.create(s, input);
  expect(M.create(s, input).id).toBe(w.id);
  expect(s.orders).toHaveLength(1);
  expect(() => M.acceptInvite(s, "invite-growth")).toThrow(blocked);
  const joined = personalOnly();
  M.acceptInvite(joined, "invite-growth");
  expect(() => M.create(joined, input)).toThrow(blocked);
  expect(joined.spaces.filter((w) => w.type === "team")).toHaveLength(1);
});

test("one Agent identity uses different scene data and skills", () => {
  const scenes = ["home", "thoughts", "calendar", "contacts", "meeting", "team"] as const;
  expect(new Set(scenes.map((s) => agentRoute(s).agentId)).size).toBe(1);
  expect(agentRoute("contacts").dataMcp).toEqual(["contacts"]);
  expect(agentRoute("calendar").skills).toEqual(["schedule-planning"]);
  const w = M.get(M.seed(), "team-eureka");
  const reply = M.ask(w, "总结团队会议", null, "zhang");
  expect(w.threads.find((t) => t.id === reply.threadId)).toMatchObject({ agentId: "eurekamind-agent", scene: "team", dataMcp: ["team-meetings"] });
});

test("create and accept show toast for existing team and keep current page and data", async ({ page }) => {
  await seed(page, M.seed());
  await page.goto("/workbench/?view=calendar");
  const original = await page.evaluate((key) => localStorage.getItem(key), KEY);
  await page.locator("#ws-switcher").click();
  await page.getByRole("button", { name: "创建团队工作空间", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: blocked })).toBeVisible();
  await expect(page.locator("#ws-dialog")).toHaveCount(0);
  await expect(page.locator("#personal-actions")).toBeVisible();
  await page.locator("#ws-switcher").click();
  await page.getByRole("button", { name: /工作空间邀请/ }).click();
  await page.getByRole("button", { name: "接受并进入" }).click();
  await expect(page.getByRole("status").filter({ hasText: blocked }).last()).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(original);
  await page.goto("/workbench/?view=create-team");
  await expect(page.getByRole("dialog", { name: "无法创建团队" })).toBeVisible();
  await expect(page.getByRole("button", { name: "模拟支付并开通" })).toHaveCount(0);
});

test("no-team account can create through payment and cannot create or join again", async ({ page }) => {
  await seed(page, personalOnly());
  await page.goto("/workbench/?view=create-team");
  await page.getByRole("button", { name: "创建团队", exact: true }).click();
  await page.locator('#ws-dialog [name="name"]').fill("唯一新团队");
  await page.getByRole("button", { name: "确认订单", exact: true }).click();
  await page.getByRole("button", { name: "模拟支付并开通", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("团队已准备好");
  await page.getByRole("button", { name: "进入团队", exact: true }).click();
  await expect(page.locator("#ws-switcher")).toContainText("唯一新团队");
  await page.locator("#ws-switcher").click();
  await page.getByRole("button", { name: "创建团队工作空间", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: blocked })).toBeVisible();
});

test("navigation and management have no task, leave or dissolve controls", async ({ page }) => {
  for (const view of ["home", "members", "space-settings", "subscription"]) {
    await page.goto(`/workbench/?view=${view}&space=team-eureka`);
    await expect(page.locator("#ws-team-nav")).toBeVisible();
    await expect(page.locator(".sidebar")).not.toContainText(/任务管理|历史会话|全部任务|自动任务/);
    await expect(page.getByRole("button", { name: /退出团队|解散团队/ })).toHaveCount(0);
  }
  await page.goto("/workbench/?view=subscription&space=team-eureka&actor=kevin");
  await expect(page.getByRole("heading", { name: "团队权益" })).toBeVisible();
  await expect(page.getByRole("button", { name: /退出团队|解散团队/ })).toHaveCount(0);
  await page.goto("/workbench/?view=tasks&space=team-eureka");
  await expect(page.getByRole("alert").filter({ hasText: "此入口不属于当前工作空间。" })).toBeVisible();
});

test("personal scene conversations share history and resume after refresh", async ({ page }) => {
  await page.goto("/workbench/?view=contacts&id=john");
  await page.locator('[data-contact-action="toggle-xiaozhi"]').first().click();
  await page.locator('[data-contact-xiaozhi-input]').fill("整理开放承诺");
  await page.locator('[data-contact-action="send-xiaozhi"]').click();
  await expect(page.locator(".contacts-xiaozhi-answer")).toContainText("开放承诺");
  await page.getByRole("button", { name: "新建会话", exact: true }).click();
  await page.getByRole("button", { name: "历史会话", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "历史会话", exact: true })).toContainText("整理开放承诺");
  await page.getByRole("link", { name: /整理开放承诺/ }).click();
  await expect(page.locator("#agent-history-title")).toHaveText("整理开放承诺");
  await expect(page.locator("#agent-history-messages")).toContainText("开放承诺");
  await page.locator("#xiaozhi-input").fill("继续梳理");
  await page.locator("#xiaozhi-input").press("Enter");
  await expect(page.locator("#agent-history-messages")).toContainText("继续梳理");
  await page.reload();
  await expect(page.locator("#agent-history-messages")).toContainText("继续梳理");
  const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem("eureka:agent-sessions:v1")!));
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).toMatchObject({ agentId: "eurekamind-agent", scene: "contacts", dataMcp: ["contacts"], sourceId: "john" });
  await page.getByRole("button", { name: "历史会话", exact: true }).click();
  await page.getByRole("button", { name: "删除会话：整理开放承诺", exact: true }).click();
  await expect(page.getByRole("link", { name: /整理开放承诺/ })).toHaveCount(0);
});

for (const size of [{ width: 1440, height: 900 }, { width: 1080, height: 680 }]) {
  test(`history and new chat are reachable side by side at ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/workbench/?view=history&id=本周会议决策整理");
    const history = page.getByRole("button", { name: "历史会话", exact: true });
    const create = page.getByRole("button", { name: "新建会话", exact: true });
    await expect(history).toBeVisible(); await expect(create).toBeVisible();
    const a = (await history.boundingBox())!, b = (await create.boundingBox())!;
    expect(Math.abs(a.y - b.y)).toBeLessThan(3); expect(a.x + a.width).toBeLessThanOrEqual(b.x + 1);
    await history.click();
    await expect(page.getByRole("dialog", { name: "历史会话", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "历史会话", exact: true })).toHaveCSS("border-radius", "16px");
    await page.keyboard.press("Escape"); await expect(history).toBeFocused();
    await page.screenshot({ path: `test-results/single-agent-${size.width}.png` });
  });
}

test("scene headers share history across home, thoughts, calendar, contacts, meeting and team", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const views = [
    { name: "home", url: "/workbench/", entry: "#xiaozhi-entry" },
    { name: "thoughts", url: "/workbench/?view=thoughts", entry: '[data-th="ask"]' },
    { name: "calendar", url: "/workbench/?view=calendar", entry: '[data-pa="agent"]' },
    { name: "contacts", url: "/workbench/?view=contacts&id=john", entry: '.contacts-xiaozhi-entry' },
    { name: "team", url: "/workbench/?space=team-eureka", entry: '[data-ws-action="agent"]' },
    { name: "meeting", url: "/workbench/?view=meeting&id=meeting-1", entry: '.md-ask-agent' },
    { name: "team-meeting", url: "/workbench/?view=meeting&space=team-eureka&id=team-review", entry: '.md-ask-agent' },
  ];
  for (const view of views) {
    await page.goto(view.url);
    await expect(page.locator(".sidebar")).not.toContainText(/历史会话|全部任务|自动任务|任务管理/);
    await page.locator(view.entry).first().click();
    const history = page.getByRole("button", { name: "历史会话", exact: true });
    await expect(history).toBeVisible();
    await expect(page.getByRole("button", { name: "新建会话", exact: true })).toBeVisible();
    if (process.env.PRD_CAPTURE) await page.screenshot({ path: `src/prototype/prd/images/single-agent-${view.name}.png` });
    await history.click();
    await expect(page.getByRole("dialog", { name: "历史会话", exact: true })).toBeVisible();
    if (view.name === "home" && process.env.PRD_CAPTURE) await page.screenshot({ path: "src/prototype/prd/images/single-agent-history.png" });
    await page.keyboard.press("Escape");
  }
});

test("team history remains scoped to actor and excludes personal conversations", async ({ page }) => {
  const s = M.seed(), w = M.get(s, "team-eureka");
  M.ask(w, "张伟专属会话记录", null, "zhang");
  M.ask(w, "Kevin专属会话记录", null, "kevin");
  await seed(page, s);
  await page.goto("/workbench/?space=team-eureka&actor=kevin");
  await page.locator('[data-ws-action="agent"]').click();
  await page.getByRole("button", { name: "历史会话", exact: true }).click();
  const history = page.getByRole("dialog", { name: "历史会话", exact: true });
  await expect(history).toContainText("Kevin专属会话记录");
  await expect(history).not.toContainText("张伟专属会话记录");
  await expect(history).not.toContainText("本周会议决策整理");
  await history.getByRole("link", { name: /Kevin专属会话记录/ }).click();
  await expect(page.locator(".ws-agent")).toContainText("Kevin专属会话记录");
});

test("PRD revision replaces obsolete rules and retains stable sections", async ({ page }) => {
  const response = await page.request.get("/prototype/prd/content.json");
  const prd = await response.json();
  expect(prd.version).toBe("1.2");
  expect(prd.sections).toHaveLength(35);
  const content = JSON.stringify(prd.sections);
  expect(content).toContain("全站只有一个 Agent");
  expect(content).toContain("HISTORY-01");
  expect(content).toContain("TEAM-06");
  expect(content).not.toContain("统一账号切换多个团队");
  expect(content).not.toContain("退出确认](images/team-leave-confirm.png)");
});

test("single-team settings and membership capture match the revised PRD", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [view, name] of [["members", "members"], ["space-settings", "settings"], ["subscription", "billing"]]) {
    await page.goto(`/workbench/?view=${view}&space=team-eureka`);
    await expect(page.locator("#ws-view")).toBeVisible();
    await expect(page.getByRole("button", { name: /退出团队|解散团队/ })).toHaveCount(0);
    if (process.env.PRD_CAPTURE) await page.screenshot({ path: `src/prototype/prd/images/single-team-${name}.png` });
  }
  await page.locator("#ws-switcher").click();
  await expect(page.locator("#ws-menu .ws-menu-space")).toHaveCount(2);
  if (process.env.PRD_CAPTURE) await page.screenshot({ path: "src/prototype/prd/images/single-team-switcher.png" });
  await page.getByRole("button", { name: "创建团队工作空间", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: blocked })).toBeVisible();
  if (process.env.PRD_CAPTURE) await page.screenshot({ path: "src/prototype/prd/images/single-team-toast.png" });
});
