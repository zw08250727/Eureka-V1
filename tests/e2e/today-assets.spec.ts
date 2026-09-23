import { expect, test } from "@playwright/test";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, timezoneId: "Asia/Shanghai" });

test("today assets cover five types, filter by business date, and open their archives", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-23T04:00:00Z") });
  await page.goto("/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1");
  await expect(page.locator(".today-asset-card")).toHaveCount(5);
  await expect(page.locator("#today-date-label")).toContainText("9月23日");
  await expect(page.locator("#today-assets-summary")).toContainText("今天有 2 场日程，2 项待办等你推进。");
  await expect(page.locator("#today-assets-source")).toContainText("今日 9 条闪念");
  await expect(page.locator("[data-asset-type=ledger] .today-asset-caption")).toContainText("¥248.00");
  await expect(page.locator("#today-assets-grid")).not.toContainText("昨天的灵感");
  await expect(page.locator("#today-assets-grid")).not.toContainText("明日提交周报");
  await page.locator('[data-today-toggle="todo-1"]').click();
  await expect(page.locator("#today-assets-summary")).toContainText("1 项待办等你推进");
  await expect(page.locator('[data-today-toggle="todo-1"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-today-toggle="todo-1"]').click();
  await expect(page.locator("#today-assets-summary")).toContainText("2 项待办等你推进");
  for (const key of ["inspiration", "todo", "ledger", "schedule", "other"]) {
    await page.locator(`[data-today-category="${key}"]`).click();
    await expect(page.locator(`[data-thought-category="${key}"]`)).toHaveAttribute("aria-current", "true");
    await page.locator('[data-thought-file="2026-09"]').click();
    await expect(page.locator("#thought-preview-date-title")).toHaveText("2026-09-23");
    await page.locator("#home-entry").click();
  }
});

test("compact today overview leaves meetings visible on desktop", async ({ page }) => {
  await page.goto("/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1");
  for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 720], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    const overview = await page.locator("#today-workbench").boundingBox();
    const meetings = await page.locator("#recording-card").boundingBox();
    expect(overview!.height).toBeLessThan(height * 0.56);
    expect(meetings!.y + 170).toBeLessThan(height);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const overview = await page.locator("#today-workbench").boundingBox();
  expect(overview!.width).toBeLessThanOrEqual(390);
  expect(overview!.height).toBeLessThan(480);
  await page.locator('[data-today-category="other"]').click();
  await expect(page.locator('[data-thought-category="other"]')).toHaveAttribute("aria-current", "true");
});
