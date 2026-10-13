import { expect, test } from "@playwright/test";

test("enterprise card navigates to its guest workbench and back returns to edition selection", async ({ page }) => {
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.getByRole("button", { name: "企业版", exact: true }).click();
  await expect(page).toHaveURL(/\/cn\/enterprise\/login\/$/);
  const dialog = page.getByRole("dialog", { name: "百销企业登录" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await expect(dialog).toContainText("企业工作台");
  await expect(dialog).not.toContainText(/个人登录|个人\/团队版|选择登录版本|欢迎来到/);
  await expect(page.locator("#enterprise-code")).toBeFocused();
  await expect(page.locator("#submit")).toBeDisabled();
  await expect(page.locator("[data-enterprise-guest]")).toContainText("AI 专家·技能·连接器");
  await page.getByRole("button", { name: "返回版本选择" }).click();
  await expect(page).toHaveURL(/\/cn\/\?login=1$/);
  await expect(page.getByRole("navigation", { name: "登录版本" }).getByRole("button")).toHaveCount(2);
  await page.getByRole("button", { name: "关闭登录" }).click();
  await page.reload();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("closing enterprise authentication leaves its guest shell, restores focus and never creates private data", async ({ page }) => {
  await page.goto("/cn/enterprise/login/");
  await expect(page.locator("#enterprise-code")).toBeFocused();
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page).toHaveURL(/\/cn\/enterprise\/login\/$/);
  await expect(page.getByRole("heading", { name: "个人AI工作台" })).toBeVisible();
  await expect(page.getByRole("button", { name: "企业登录", exact: true }).last()).toBeFocused();
  await page.getByRole("button", { name: "已定时", exact: true }).click();
  await expect(page.getByText("暂无定时任务", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "内容来源" }).selectOption("recording");
  await page.getByRole("button", { name: "知识库", exact: true }).click();
  await expect(page.locator("#enterprise-code")).toBeFocused();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("dialog[open]"))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "知识库", exact: true })).toBeFocused();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 1024, height: 420 }]) {
  test(`enterprise entry fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto("/cn/enterprise/login/");
    await expect(page.locator("#enterprise-code")).toBeFocused();
    await page.screenshot({ path: `test-results/enterprise-entry/entry-${viewport.width}x${viewport.height}.png` });
    const box = (await page.getByRole("dialog").boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await page.getByRole("button", { name: "关闭登录" }).click();
    if (viewport.width <= 800) {
      await page.getByRole("button", { name: "打开导航" }).click();
      await expect(page.getByRole("button", { name: "知识库", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "知识库", exact: true }).click();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "知识库", exact: true })).toBeFocused();
      await page.getByRole("button", { name: "关闭导航" }).click();
    } else {
      await page.getByRole("button", { name: "收起导航" }).click();
      await page.getByRole("button", { name: "展开导航" }).click();
      await expect(page.getByRole("button", { name: "知识库", exact: true })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
