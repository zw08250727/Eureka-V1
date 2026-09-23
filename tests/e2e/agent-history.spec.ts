import { expect, test } from "@playwright/test";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const pageUrl = "/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1";

test("history opens the selected conversation, preserves drafts and resumes independently", async ({ page }) => {
  await page.goto(pageUrl);
  await page.locator("[data-contacts-entry]").click();
  const rows = page.locator("#history-task-list .history-row");
  const input = page.locator("#xiaozhi-input");
  const log = page.locator("#agent-history-messages");
  for (let index = 0; index < 4; index += 1) {
    await rows.nth(index).click();
    await expect(page.locator("#xiaozhi-rail")).toBeVisible();
    await expect(page.locator("#xiaozhi-entry")).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#agent-history-title")).toHaveText((await rows.nth(index).locator(".history-text").textContent())!);
    await expect(rows.nth(index)).toHaveAttribute("aria-current", "true");
    await expect(page.locator("#toast")).not.toHaveClass(/show/);
    await expect(log.locator("article")).toHaveCount(2);
  }
  await rows.first().click();
  await input.fill("请补充每项任务的验收标准");
  await page.locator("#xiaozhi-send").click();
  await expect(log.locator("article")).toHaveCount(4);
  await expect(log).toContainText("请补充每项任务的验收标准");
  await input.fill("下次继续确认负责人");
  await rows.nth(1).click();
  await expect(input).toHaveValue("");
  await expect(log).not.toContainText("请补充每项任务的验收标准");
  await rows.first().click();
  await expect(input).toHaveValue("下次继续确认负责人");
  await expect(log.locator("article")).toHaveCount(4);
  await page.locator("#xiaozhi-collapse").click();
  await rows.first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#agent-history-title")).toBeFocused();
  await expect(input).toHaveValue("下次继续确认负责人");
  await page.locator('[data-widget-ai="schedule"]').click();
  await expect(page.locator("#agent-history-session")).toBeHidden();
  await page.locator("#xiaozhi-send").click();
  await expect(page.locator("#widget-agent-result")).toBeVisible();
  await expect(page.locator("#widget-agent-result")).toContainText("会前准备清单");
});

test("opening history anchors a usable conversation below the topbar on desktop and mobile", async ({ page }) => {
  await page.goto(pageUrl);
  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844]]) {
    await page.setViewportSize({ width, height });
    if (await page.locator(".history-row").first().isVisible()) await page.locator(".history-row").first().click();
    else await page.locator("#xiaozhi-history").click();
    await expect(page.locator("#agent-history-title")).toBeInViewport();
    await expect(page.locator("#xiaozhi-input")).toBeInViewport();
    await expect(page.locator("#xiaozhi-send")).toBeInViewport();
    const rail = await page.locator("#xiaozhi-rail").boundingBox();
    const header = await page.locator(".topbar").boundingBox();
    expect(rail!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    expect(rail!.height).toBeLessThan(height);
    await page.locator("#agent-history-continue").click();
    await expect(page.locator("#xiaozhi-send")).toBeEnabled();
  }
});
