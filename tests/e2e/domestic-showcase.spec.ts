import { expect, test } from "@playwright/test";

test("domestic demo accepts 111111 and fills a usable code when requested", async ({ page }) => {
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.locator("#phone").fill("18519127583");
  await page.locator("#code").fill("111111");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page).toHaveURL(/\/cn\/workbench/);
  await page.evaluate(() => localStorage.removeItem("eureka:market:cn:eureka:auth:v1"));
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.getByRole("button", { name: "邮箱", exact: true }).click();
  await page.locator("#email").fill("member@example.com");
  await page.locator("#send").click();
  await expect(page.locator("#code")).toHaveValue("111111");
  await page.locator("#submit").click();
  await expect(page.locator("#status")).toContainText("请先阅读并同意");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page).toHaveURL(/\/cn\/workbench/);
});

test("enterprise entry toast dismisses, repeats and also appears for direct entry", async ({ page }) => {
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.clock.install();
  await expect(page.locator(".auth-entry-toast")).toHaveCount(0);
  await page.getByRole("button", { name: "企业版", exact: true }).click();
  await expect(page.locator(".auth-entry-toast")).toContainText("以线上为准");
  await expect(page.locator("#enterprise-code")).toBeVisible();
  await page.clock.fastForward(4600);
  await expect(page.locator(".auth-entry-toast")).toHaveCount(0);
  await page.getByRole("button", { name: "企业版", exact: true }).click();
  await expect(page.locator(".auth-entry-toast")).toBeVisible();
  await page.getByRole("button", { name: "关闭提示" }).click();
  await expect(page.locator(".auth-entry-toast")).toHaveCount(0);
  await page.goto("/cn/?edition=enterprise");
  await expect(page.locator(".auth-entry-toast")).toContainText("以线上为准");
  await page.locator("#enterprise-code").fill("100001");
  await page.locator("#submit").click();
  await page.locator("#phone").fill("13800138000");
  await page.locator("#send").click();
  await expect(page.locator("#code")).toHaveValue("111111");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page.locator(".enterprise-workbench")).toBeVisible();
});

// AUTH-UI-01 replaces the former split-screen preview/zoom layout.
for (const width of [390, 768, 1024, 1440]) test(`centered domestic login and enterprise selection at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.locator("#phone").fill("13900139000");
  await expect(page.locator(".auth-visual")).toHaveCount(0);
  const form = await page.locator("#auth-form").boundingBox();
  expect(Math.abs(form!.x + form!.width / 2 - width / 2)).toBeLessThan(1);
  const column = await page.locator(".auth-overlay").boundingBox();
  expect(Math.abs(column!.y + column!.height / 2 - 450)).toBeLessThan(1);
  await expect(page.locator("#phone")).toHaveValue("13900139000");
  await page.screenshot({ path: `test-results/auth/cn-centered-${width}.png`, animations: "disabled", fullPage: true });
  await page.getByRole("button", { name: "企业版", exact: true }).click();
  await expect(page.locator("#enterprise-code")).toBeVisible();
  const enterprise = await page.locator("#auth-form").boundingBox();
  expect(Math.abs(enterprise!.x + enterprise!.width / 2 - width / 2)).toBeLessThan(1);
  await page.screenshot({ path: `test-results/auth/cn-enterprise-centered-${width}.png`, animations: "disabled", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
