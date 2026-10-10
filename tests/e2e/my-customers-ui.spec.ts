import { expect, test, type Page } from "@playwright/test";
const go = (page: Page, space = "personal", actor = "zhang") => page.goto(`/workbench/?view=contacts&space=${space}&actor=${actor}`);
const cards = (page: Page) => page.locator(".contacts-person-card");
const openJohn = async (page: Page) => { await go(page); await cards(page).filter({ hasText: "John Chen" }).click(); };

test("customer types, source and creation filters compose; manual and CRM are the only add methods", async ({ page }) => {
  await go(page);
  await expect(page.getByRole("heading", { name: "我的客户", exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(8);
  await page.getByLabel("筛选主体类型").selectOption("enterprise");
  await expect(cards(page)).toHaveCount(2);
  await page.getByLabel("筛选客户来源").selectOption("crm");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toContainText("ABC Energy");
  await page.getByLabel("创建开始日期").fill("2026-09-01");
  await expect(cards(page)).toHaveCount(0);
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await page.getByLabel("按创建时间排序").selectOption("asc");
  await expect(cards(page).first()).toContainText("John Chen");
  await page.locator('[data-contact-action="add"]').click();
  const dialog = page.getByRole("dialog", { name: "添加客户", exact: true });
  await expect(dialog.getByRole("group", { name: "录入方式" }).getByRole("button")).toHaveCount(2);
  await expect(dialog.locator('[name="sourceId"]')).toBeHidden();
  await dialog.getByLabel("主体类型", { exact: true }).selectOption("enterprise");
  await dialog.getByLabel("企业名称", { exact: true }).fill("测试企业");
  await dialog.getByRole("button", { name: "添加客户", exact: true }).click();
  await expect(cards(page)).toHaveCount(9);
  await page.reload();
  await expect(cards(page).filter({ hasText: "测试企业" })).toContainText("企业");
  for (let i = 0; i < 2; i++) {
    await page.locator('[data-contact-action="add"]').click();
    await dialog.getByRole("button", { name: "CRM 系统导入", exact: true }).click();
    await expect(dialog).toContainText("尚未连接真实 CRM");
    await dialog.getByLabel("选择 CRM 客户").selectOption("CRM-yuanhang");
    await dialog.getByRole("button", { name: "确认导入" }).click();
  }
  await expect(cards(page).filter({ hasText: "远航智能" })).toHaveCount(1);
  await expect(cards(page)).toHaveCount(10);
});

test("meeting followups, keywords, source todos and customer profile replace legacy panels", async ({ page }) => {
  await openJohn(page);
  await expect(page.locator(".contacts-metrics")).toHaveCount(0);
  await expect(page.getByRole("tab")).toHaveCount(4);
  await expect(page.getByRole("tab", { name: "主题", exact: true })).toHaveCount(0);
  await expect(page.locator('[data-contact-action="export-crm"]')).toHaveCount(0);
  await expect(page.getByText("客户来源与归一", { exact: true })).toHaveCount(0);
  await expect(page.locator(".customer-meeting")).toHaveCount(3);
  await expect(page.locator(".customer-keywords")).toContainText("试点3 场会议");
  await page.getByRole("tab", { name: "承诺", exact: true }).click();
  await expect(page.getByRole("heading", { name: "我的待办" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "客户的待办" })).toBeVisible();
  await expect(page.locator(".contacts-line .customer-source")).toHaveCount(6);
  await expect(page.locator(".contacts-main select")).toHaveCount(0);
  await expect(page.locator(".contact-commitment-state")).toHaveCount(0);
  await page.getByRole("tab", { name: "记忆", exact: true }).click();
  await expect(page.locator(".customer-profile-grid section")).toHaveCount(7);
  await expect(page.locator(".customer-profile-grid")).toContainText("Alice 审批采购预算");
  await expect(page.getByRole("button", { name: /确认记忆/ })).toHaveCount(0);
  await page.getByRole("tab", { name: "时间线", exact: true }).click();
  const first = page.locator(".customer-meeting").first();
  await expect(first.locator("p")).toContainText("经销商");
  await first.click();
  await expect(page).toHaveURL(/view=meeting.*id=meeting-16/);
  await expect(page.locator(".md-workspace")).toContainText("渠道合作方案沟通");
});

test("create followup uses schedule form, validates time, persists scoped data and opens calendar", async ({ page }) => {
  await openJohn(page);
  await page.locator('[data-contact-action="followup"]').click();
  const dialog = page.getByRole("dialog", { name: "新建日程或待办" });
  await expect(dialog.getByRole("heading", { name: "新建日程" })).toBeVisible();
  await expect(dialog.locator('[name="participants"]')).toHaveValue("John Chen");
  await dialog.locator('[name="title"]').fill("客户 Demo 评审");
  await dialog.locator('[name="start"]').fill("2026-10-12T10:00");
  await dialog.locator('[name="end"]').fill("2026-10-12T09:00");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.locator('[name="end"]').fill("2026-10-12T11:00");
  await dialog.locator('[name="location"]').fill("线上会议");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("link", { name: "客户 Demo 评审 ↗", exact: true })).toBeVisible();
  await page.reload();
  await cards(page).filter({ hasText: "John Chen" }).click();
  await page.getByRole("link", { name: "客户 Demo 评审 ↗", exact: true }).click();
  await expect(page).toHaveURL(/view=calendar/);
  await expect(page.locator("#personal-actions")).toContainText("线上会议");
  await go(page, "team-eureka");
  await page.locator('[data-contact-action="add"]').click();
  await page.getByLabel("客户姓名", { exact: true }).fill("团队客户");
  await page.getByRole("button", { name: "添加客户", exact: true }).click();
  await cards(page).filter({ hasText: "团队客户" }).click();
  await expect(page.locator('[data-contact-action="followup"]')).toHaveCount(0);
  await page.goto("/workbench/?view=calendar&space=team-eureka&actor=lin");
  await expect(page.getByRole("heading", { name: "日程与待办", exact: true })).toBeVisible();
  await page.goto("/workbench/?view=calendar&space=personal");
  await expect(page.getByRole("region", { name: "未安排待办" })).toHaveCount(0);
});

test("deleted meeting invalidates derived profile, keywords and todos", async ({ page }) => {
  await openJohn(page);
  await expect(page.locator(".customer-meeting")).toHaveCount(3);
  await page.evaluate(() => {
    localStorage.setItem("eureka:meeting-details:v1", JSON.stringify({ "meeting-16": { deleted: true } }));
    window.dispatchEvent(new Event("eureka:data"));
  });
  await expect(page.locator(".customer-meeting")).toHaveCount(2);
  await page.getByRole("tab", { name: "记忆", exact: true }).click();
  await expect(page.locator(".customer-profile-grid")).not.toContainText("偏好简洁、数据化");
  await page.getByRole("tab", { name: "承诺", exact: true }).click();
  await expect(page.locator(".contacts-main")).not.toContainText("提供首批经销商名单");
});

test("customer list, detail and import dialog fit desktop and phone", async ({ page }) => {
  for (const width of [1440, 1080, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await go(page);
    await expect(cards(page)).toHaveCount(8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/my-customers-${width}.png`, fullPage: true });
    await cards(page).filter({ hasText: "John Chen" }).click();
    await page.getByRole("tab", { name: "记忆", exact: true }).click();
    await page.screenshot({ path: `test-results/customer-profile-${width}.png`, fullPage: true });
    await page.locator('[data-contact-action="list"]').click();
    await page.locator('[data-contact-action="add"]').click();
    const dialog = page.getByRole("dialog", { name: "添加客户", exact: true });
    await dialog.getByRole("button", { name: "CRM 系统导入" }).click();
    await expect(dialog.getByRole("button", { name: "确认导入" })).toBeInViewport();
    await page.screenshot({ path: `test-results/customer-import-${width}.png`, fullPage: true });
    await page.keyboard.press("Escape");
  }
});

test("followup save failure preserves draft and retry creates a single schedule", async ({ page }) => {
  await openJohn(page);
  await page.locator('[data-contact-action="followup"]').click();
  const dialog = page.getByRole("dialog", { name: "新建日程或待办" });
  await dialog.locator('[name="title"]').fill("失败后重试的跟进");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) { if (k === "eureka:personal-actions:v1" && sessionStorage.getItem("schedule-fail") === "1") throw Error("quota"); return original.call(this, k, v); };
    sessionStorage.setItem("schedule-fail", "1");
  });
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("保存失败");
  await expect(dialog.locator('[name="title"]')).toHaveValue("失败后重试的跟进");
  await page.evaluate(() => sessionStorage.removeItem("schedule-fail"));
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const count = await page.evaluate(() => JSON.parse(localStorage.getItem("eureka:personal-actions:v1")!).records.filter((r: {title:string}) => r.title === "失败后重试的跟进").length);
  expect(count).toBe(1);
});
