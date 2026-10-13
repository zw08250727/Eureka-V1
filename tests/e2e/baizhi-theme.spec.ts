import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  if (new URL(page.url()).pathname.startsWith("/cn/")) await page.getByRole("link", { name: "个人/团队版", exact: true }).click();
  await page.locator("#phone").fill("13800138000");
  await page.locator("#code").fill("123456");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page.locator(".app")).toBeVisible();
}

// UI-CN / UI-GLOBAL now specify market fonts and shared control dimensions.
// Assert the approved geometry, rather than deleting the market theme at runtime.
async function expectResponsiveGeometry(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const rect = await page.locator(selector).boundingBox();
    expect(rect, selector).not.toBeNull();
    expect(rect!.width, selector).toBeGreaterThan(0);
    expect(rect!.x, selector).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width, selector).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const width of [390, 768, 1440]) {
  test(`CN theme meets responsive auth and workbench bounds at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/cn/");
    await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  if (new URL(page.url()).pathname.startsWith("/cn/")) await page.getByRole("link", { name: "个人/团队版", exact: true }).click();
    await expect(page.locator("#phone")).toHaveCSS("background-color", "rgb(242, 243, 245)");
    await expectResponsiveGeometry(page, [".auth", ".auth-form", ".form", ".auth-methods", "#phone", "#code", "#submit"]);
    await login(page);
    await expect(page.locator(".recording-primary").first()).toHaveCSS("background-color", "rgb(38, 38, 38)");
    await page.screenshot({ path: `test-results/markets/cn-home-${width}.png`, fullPage: true, animations: "disabled" });
    await expectResponsiveGeometry(page, [".app", ".topbar", "#today-assets-grid", ".home-meeting-library"]);
  });
}

test("CN portals and module surfaces use the theme without losing interactions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.getByRole("button", { name: "Ask Agent", exact: true }).click();
  await expect(page.locator("#xiaozhi-rail")).toBeVisible();
  await expect(page.locator("#xiaozhi-rail")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.screenshot({ path: "test-results/markets/cn-agent.png", animations: "disabled" });
  await page.goto("/cn/workbench/?view=home&space=team-eureka");
  await expect(page.locator(".team-overview")).toBeVisible();
  await page.screenshot({ path: "test-results/markets/cn-team-home.png", animations: "disabled" });
  await page.goto("/cn/workbench/?view=calendar&space=personal");
  await expect(page.locator("#personal-actions")).toBeVisible();
  await page.screenshot({ path: "test-results/markets/cn-calendar.png", animations: "disabled" });
  await page.goto("/cn/workbench/?view=subscription&space=personal");
  await page.getByRole('button', {name:'立即升级 专业版',exact:true}).click();
  const pay = page.getByRole("dialog", { name: "确认个人订阅" });
  await expect(pay).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await pay.getByLabel("支付方式").click();
  const list = page.locator(".ui-select-popup:popover-open");
  await expect(list).toBeVisible();
  const selected = list.getByRole("option", { selected: true });
  await expect(selected).toHaveCSS("color", "rgb(38, 38, 38)");
  await expect(selected).toHaveCSS("background-color", "rgb(242, 243, 245)");
  await expect(selected).toHaveCSS("outline-style", "none");
  await expect(selected.locator(".ui-select-check")).toBeVisible();
  await page.screenshot({ path: "test-results/markets/cn-payment-select.png", animations: "disabled" });
  await list.getByRole("option", { name: "支付宝" }).click();
  await expect(pay.getByLabel("支付方式")).toHaveValue("支付宝");
  await page.keyboard.press("Escape");
  await expect(pay).toHaveCount(0);
  await page.goto("/global/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  if (new URL(page.url()).pathname.startsWith("/cn/")) await page.getByRole("link", { name: "个人/团队版", exact: true }).click();
  await expect(page.locator("#submit")).toHaveCSS("background-color", "rgb(56, 88, 182)");
  await expect(page.locator("#email")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});
