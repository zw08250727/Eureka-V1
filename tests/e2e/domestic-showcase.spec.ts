import { expect, test } from "@playwright/test";

// ENTERPRISE-01 (2026-10-13): edition cards navigate to separate login routes.
test("domestic cards separate login routes and preserve a protected personal destination", async ({ page }) => {
  await page.goto("/cn/workbench/?view=connectors&space=personal");
  await expect(page.getByRole("navigation", { name: "登录版本" }).getByRole("link")).toHaveCount(2);
  await expect(page.locator("#phone, #enterprise-code")).toHaveCount(0);
  await page.getByRole("link", { name: "个人/团队版", exact: true }).click();
  await expect(page).toHaveURL(/\/cn\/login\/\?next=/);
  await expect(page.locator(".auth-overlay, .auth-editions")).toHaveCount(0);
  await page.locator("#phone").fill("13900139000");
  await page.locator("#send").click();
  await expect(page.locator("#code")).toHaveValue("111111");
  await page.locator("#submit").click();
  await expect(page.locator("#status")).toContainText("请先阅读并同意");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page.locator(".connector-card").first()).toBeVisible();
});

test("bairong matches the verified phone/email flow, resets credentials and completes only an enterprise session", async ({ page }) => {
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.getByRole("link", { name: "企业版", exact: true }).click();
  await expect(page).toHaveURL(/\/cn\/enterprise\/login\/$/);
  await expect(page.locator("#submit")).toBeDisabled();
  await page.locator("#enterprise-code").fill("bairong");
  await expect(page.locator("#enterprise-code")).toHaveValue("BAIRONG");
  await page.locator("#enterprise-code").press("Enter");
  await expect(page.getByRole("heading", { name: "百融智能", exact: true })).toBeVisible();
  await expect(page.locator(".enterprise-method-help")).toContainText("使用企业登记的 手机号");
  await page.locator("#phone").fill("13800138000");
  await page.locator("#send").click();
  await page.locator("#terms").check();
  await page.getByRole("button", { name: "邮箱", exact: true }).click();
  await expect(page.locator("#email")).toBeEmpty();
  await expect(page.locator("#code")).toBeEmpty();
  await expect(page.locator("#terms")).not.toBeChecked();
  await expect(page.locator("#send")).toBeEnabled();
  await expect(page.locator(".enterprise-method-help")).toContainText("使用企业分配的 企业邮箱");
  await page.getByRole("button", { name: "返回企业代码", exact: true }).click();
  await expect(page.locator("#enterprise-code")).toBeEmpty();
  await page.locator("#enterprise-code").fill("BAIRONG");
  await page.locator("#submit").click();
  await page.locator("#phone").fill("13800138000");
  await page.locator("#code").fill("111111");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page.locator(".enterprise-workbench")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("eureka:market:cn:eureka:auth:v1"))).toBeNull();
});

for (const width of [320, 390, 768, 1024, 1440]) test(`edition cards and enterprise login fit ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await expect(page.locator(".domestic-entry-cards")).toBeVisible();
  await page.screenshot({ path: `test-results/auth/cn-cards-${width}.png`, animations: "disabled" });
  await page.getByRole("link", { name: "企业版", exact: true }).click();
  await expect(page.locator("#enterprise-code")).toBeVisible();
  await page.screenshot({ path: `test-results/auth/cn-enterprise-code-${width}.png`, fullPage: true });
  await page.locator("#enterprise-code").fill("bairong");
  await page.locator("#submit").click();
  await expect(page.locator(".enterprise-tenant h2")).toHaveText("百融智能");
  await expect(page.locator("#submit")).toHaveCSS("background-color", "rgb(49, 94, 251)");
  await page.screenshot({ path: `test-results/auth/cn-enterprise-phone-${width}.png`, fullPage: true });
  await page.getByRole("button", { name: "邮箱", exact: true }).click();
  await page.screenshot({ path: `test-results/auth/cn-enterprise-email-${width}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const selector of [".enterprise-login-card", "#email", "#code", "#send", "#submit"]) {
    const box = (await page.locator(selector).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
});

test("personal return URL cannot escape the domestic workbench", async ({ page }) => {
  await page.goto("/cn/login/?next=https%3A%2F%2Fevil.example%2F");
  await page.locator("#phone").fill("13900139000");
  await page.locator("#code").fill("111111");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page).toHaveURL(/\/cn\/workbench\/\?view=home&space=personal$/);
});

test("legacy enterprise fixture retains its own records and identity", async ({ page }) => {
  await page.goto("/cn/enterprise/login/");
  await page.locator("#enterprise-code").fill("100001");
  await page.locator("#submit").click();
  await expect(page.locator(".enterprise-tenant h2")).toHaveText("青禾科技");
  await page.locator("#phone").fill("13800138000");
  await page.locator("#code").fill("111111");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page.locator(".enterprise-workbench")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("eureka:market:cn:enterprise:auth:v1")!).realm)).toBe("baizhi-enterprise:100001");
});

for (const [path, input] of [["/cn/login/", "#phone"], ["/cn/enterprise/login/", "#enterprise-code"]]) {
  test(`static credentials wait for hydration at ${path}`, async ({ page }) => {
    let resume!: () => void;
    const scriptsReady = new Promise<void>(resolve => { resume = resolve; });
    await page.route("**/_next/static/**/*.js", async route => { await scriptsReady; await route.continue(); });
    try {
      await page.goto(path, { waitUntil: "commit" });
      await expect(page.locator(input)).toBeVisible();
      await expect(page.locator(input)).toBeDisabled();
      if (input === "#phone") await expect(page.getByRole("button", { name: "邮箱", exact: true })).toBeDisabled();
    } finally { resume(); }
    await expect(page.locator(input)).toBeEnabled();
    await page.locator(input).fill(input === "#phone" ? "13900139000" : "bairong");
    if (input === "#phone") {
      await page.locator("#send").click();
      await expect(page.locator("#code")).toHaveValue("111111");
    } else {
      await page.locator("#submit").click();
      await expect(page.locator(".enterprise-tenant h2")).toHaveText("百融智能");
    }
  });
}
