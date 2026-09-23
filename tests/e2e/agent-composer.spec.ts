import { expect, test } from "@playwright/test";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const pageUrl = "/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1";

test("default and history Agent keep the composer visible while the desktop page scrolls", async ({ page }) => {
  await page.goto(pageUrl);
  for (const [width, height] of [[1366, 768], [1440, 900], [1280, 650], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.locator("#xiaozhi-entry").click();
    for (const position of [0, 5000]) {
      await page.locator(".main").evaluate((el, top) => { el.scrollTop = top; }, position);
      await expect(page.locator("#xiaozhi-send")).toBeInViewport({ ratio: 1 });
      const rail = await page.locator("#xiaozhi-rail").boundingBox();
      const header = await page.locator(".topbar").boundingBox();
      expect(rail!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
      expect(rail!.y + rail!.height).toBeLessThanOrEqual(height);
    }
    await page.locator("#history-task-list .history-row").first().click();
    await expect(page.locator("#agent-history-title")).toBeInViewport();
    await expect(page.locator("#xiaozhi-send")).toBeInViewport({ ratio: 1 });
    await page.locator("#xiaozhi-collapse").click();
  }
});

test("composer tools and Enter shortcuts match the new input interaction", async ({ page }) => {
  await page.goto(pageUrl);
  await page.locator("#xiaozhi-entry").click();
  const input = page.locator("#xiaozhi-input");
  await expect(input).toHaveAttribute("placeholder", "输入问题，按Enter发送...");
  await expect(page.locator(".agent-composer-caption")).toHaveText("Enter 发送 / Shift+Enter 换行由百智 AI 生成支持");
  await page.locator("#agent-sources-toggle").click();
  await page.locator("#xiaozhi-audio").click();
  await expect(page.locator("#xiaozhi-audio")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#agent-web-toggle").click();
  await expect(page.locator("#agent-sources-popover")).toBeHidden();
  await expect(page.locator("#agent-web-toggle")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#agent-response-mode").selectOption("deep");
  await input.fill("整理会议");
  await input.press("Shift+Enter");
  await input.pressSequentially("补充行动项");
  await expect(input).toHaveValue("整理会议\n补充行动项");
  await input.dispatchEvent("keydown", { key: "Enter", isComposing: true });
  await expect(input).not.toHaveValue("");
  await input.press("Enter");
  await expect(input).toHaveValue("");
  await expect(page.locator("#xiaozhi-rail .agent-history-message")).toContainText("深度思考");
  await expect(page.locator("#xiaozhi-rail .agent-history-message")).toContainText("未执行真实检索");
  await expect(page.locator("#xiaozhi-send")).toBeDisabled();
  await page.locator("#history-task-list .history-row").first().click();
  await input.fill("确认负责人");
  await input.press("Enter");
  await expect(page.locator("#agent-history-messages article")).toHaveCount(4);
});
