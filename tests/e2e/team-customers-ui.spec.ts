import { test, expect, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
const go = (page: Page, view = "contacts", actor = "zhang", space = "team-eureka") => page.goto(`/workbench/?view=${view}&space=${space}&actor=${actor}`);
const cards = (page: Page) => page.locator(".contacts-person-card");
async function seed(page: Page) {
  const state = M.seed(); M.setCustomerSharing(state, "team-eureka", true, "lin"); M.setCustomerSharing(state, "team-eureka", true, "kevin");
  const scope = (ownerId: string, name: string, company: string, channel: string) => ({ contacts: [{ id: "same-id", ownerId, name, company, role: "客户", summary: `${company}资料`, initials: name.slice(0, 2), email: "same@example.com", tag: "客户", count: 0, recent: "", region: "上海", subjectType: "enterprise", createdAt: "2026-10-09", themes: [], memories: [], inferences: [], sources: [{ id: "same-source", channel, crmId: "same-crm", crmSystem: "demo", fields: {}, updatedAt: "2026-10-09" }] }], notes: { "same-id": [{ text: `${company}备注`, time: "2026-10-09" }] }, tasks: [] });
  const contacts = { personal: scope("zhang", "个人专属客户", "个人公司", "manual"), "workspace:team-eureka:account:zhang": scope("zhang", "同一客户", "张伟公司", "crm"), "workspace:team-eureka:account:lin": scope("lin", "同一客户", "林晓公司", "crm"), "workspace:team-eureka:account:kevin": scope("kevin", "Agent 客户", "Kevin公司", "meeting"), "workspace:team-design:account:lin": scope("lin", "其他空间客户", "其他公司", "manual") };
  await page.addInitScript(({ state, contacts }) => { if (!localStorage.getItem("eureka:workspaces:v2")) localStorage.setItem("eureka:workspaces:v2", JSON.stringify(state)); if (!localStorage.getItem("baizhi-v14-contacts")) localStorage.setItem("baizhi-v14-contacts", JSON.stringify(contacts)); }, { state, contacts });
}

test("team directory retains duplicate customers, member labels, Agent source and workspace boundaries", async ({ page }) => {
  await seed(page); await go(page);
  await expect(page.getByRole("heading", { name: "团队客户", exact: true })).toBeVisible();
  await expect(page.locator(".sidebar-quick-nav").getByRole("button", { name: "团队客户", exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(3); await expect(cards(page).filter({ hasText: "同一客户" })).toHaveCount(2);
  await page.getByLabel("筛选所属成员").selectOption("lin"); await expect(cards(page)).toHaveCount(1); await expect(cards(page)).toContainText("所属成员：林晓");
  await cards(page).click(); await expect(page.locator(".contacts-profile")).toContainText("林晓公司");
  await expect(page.getByRole("button", { name: "编辑资料", exact: true })).toBeDisabled();
  await page.getByRole("tab", { name: "记忆", exact: true }).click(); await expect(page.getByText("林晓公司备注", { exact: true })).toBeVisible();
  await go(page); await page.getByLabel("筛选客户来源").selectOption("agent"); await expect(cards(page)).toHaveCount(1); await expect(cards(page)).toContainText("Agent 客户");
  expect(await page.getByLabel("筛选客户来源").locator("option").allTextContents()).toEqual(["全部来源", "手动录入", "Agent 创建", "CRM"]);
  await go(page, "contacts", "zhang", "personal"); await expect(cards(page)).toHaveCount(1); await expect(cards(page)).toContainText("个人专属客户");
  await expect(page.getByLabel("筛选所属成员")).toHaveCount(0);
});

test("switch shares existing and new customers with everyone; closure revokes an open detail immediately", async ({ page, context }) => {
  await seed(page); await go(page, "content-permissions");
  const lin = await context.newPage(); await go(lin, "contacts", "lin"); await expect(cards(lin)).toHaveCount(2);
  await page.getByRole("switch", { name: "我的客户共享给团队", exact: true }).click(); await expect(cards(lin)).toHaveCount(3);
  await cards(lin).filter({ hasText: "张伟公司" }).click(); await expect(lin.locator(".contacts-profile")).toContainText("张伟公司");
  await page.getByRole("switch", { name: "我的客户共享给团队", exact: true }).click();
  await expect(lin.locator(".contacts-empty[role=alert]")).toContainText("关闭共享"); await expect(lin.locator(".contacts-profile")).toHaveCount(0);
  await go(page); await expect(cards(page)).toHaveCount(3);
  await go(page, "content-permissions"); await page.getByRole("switch", { name: "我的客户共享给团队", exact: true }).click();
  await go(page); await page.getByRole("button", { name: "＋ 添加客户", exact: true }).click();
  await page.getByLabel("客户姓名", { exact: true }).fill("共享开启后的新客户"); await page.getByRole("button", { name: "添加客户", exact: true }).click();
  await go(lin, "contacts", "lin"); await expect(cards(lin)).toHaveCount(4);
  await expect(cards(lin).filter({ hasText: "共享开启后的新客户" })).toContainText("所属成员：张伟");
});

test("team customer filters and permission switches fit desktop, laptop and mobile", async ({ page }) => {
  await seed(page);
  for (const width of [1440, 1080, 390]) {
    await page.setViewportSize({ width, height: 900 }); await go(page);
    await expect(cards(page)).toHaveCount(3); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/team-customers-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 }); await go(page, "content-permissions");
  await expect(page.getByRole("switch")).toHaveCount(2); await page.screenshot({ path: "test-results/team-customer-permissions.png", fullPage: true });
});
