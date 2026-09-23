import { expect, test } from "@playwright/test";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, timezoneId: "Asia/Shanghai" });

test("thoughts archive is reachable from sidebar across views and when collapsed", async ({ page }) => {
  await page.goto("/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1");
  await expect(page.locator(".today-content-head")).toHaveCount(0);
  await page.locator("[data-contacts-entry]").click();
  await page.locator("#thoughts-entry").click();
  await expect(page.locator("#thought-workspace")).toBeVisible();
  await expect(page.locator("#thoughts-entry")).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#page-crumb")).toHaveText("我的闪念");
  await page.locator("#home-entry").click();
  await expect(page.locator("#today-workbench")).toBeVisible();
  await expect(page.locator("#thoughts-entry")).not.toHaveAttribute("aria-current", "page");
  await page.locator(".collapse-btn").click();
  await expect(page.locator("#thoughts-entry .nav-label")).toBeHidden();
  await page.locator("#thoughts-entry").click();
  await expect(page.locator("#thought-workspace")).toBeVisible();
});

test("reminder heading rotates without repeats and stays stable during todo updates", async ({ page }) => {
  await page.clock.install();
  await page.goto("/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1");
  const heading = page.locator("#today-workbench-title");
  const first = await heading.textContent();
  await expect(heading).not.toContainText("张伟");
  await expect(page.locator(".today-assets-footnote")).toHaveCount(0);
  await page.locator('[data-today-toggle="todo-1"]').click();
  await expect(heading).toHaveText(first!);
  await page.clock.fastForward(60000);
  await expect(heading).not.toHaveText(first!);
  const second = await heading.textContent();
  await page.locator("#home-entry").click();
  await expect(heading).not.toHaveText(second!);
  const third = await heading.textContent();
  await page.reload();
  await expect(heading).not.toHaveText(third!);
});

test("daily brief connects today records, updates suggestions and opens source archives", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-23T04:00:00Z") });
  await page.goto("/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1");
  await expect(page.locator(".daily-brief")).toHaveCount(1);
  await expect(page.locator(".daily-rhythm")).toHaveCount(1);
  await expect(page.locator('.rhythm-event time').first()).toHaveText("14:00–14:45");
  await expect(page.locator('.rhythm-event time').last()).toHaveText("16:30–17:00");
  await expect(page.locator('.daily-brief [data-widget-all], .brief-todo-link')).toHaveCount(0);
  await expect(page.locator(".today-asset-card")).toHaveCount(0);
  await expect(page.locator("#today-date-label")).toContainText("9月23日");
  await expect(page.locator(".daily-brief-narrative")).toContainText("15:00 前发送修订后的合作方案");
  await expect(page.locator("#today-assets-source")).toHaveCount(0);
  await expect(page.locator(".daily-ledger-total")).toContainText("¥248.00");
  await expect(page.locator("#today-assets-grid")).not.toContainText("昨天的灵感");
  await expect(page.locator("#today-assets-grid")).not.toContainText("明日提交周报");
  await page.locator('[data-today-toggle="todo-1"]').click();
  await expect(page.locator(".daily-brief-narrative")).not.toContainText("15:00 前发送修订后的合作方案");
  await expect(page.locator('[data-today-toggle="todo-1"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-today-toggle="todo-1"]').click();
  await expect(page.locator(".daily-brief-narrative")).toContainText("15:00 前发送修订后的合作方案");
  for (const key of ["inspiration", "ledger", "schedule"]) {
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
  await expect(page.locator('[data-today-category="other"]')).toHaveCount(0);
  await page.locator('[data-widget-all]').click();
  await page.locator('[data-thought-category="other"]').click();
  await expect(page.locator('[data-thought-category="other"]')).toHaveAttribute("aria-current", "true");
});


test("widgets open the full archive and bring today's context into Agent drafts", async ({ page }) => {
  await page.goto("/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1");
  await page.getByRole("button", { name: "查看我的全部记录" }).click();
  await expect(page.locator("#thought-workspace")).toBeVisible();
  await expect(page.locator('[data-thought-category="all"]')).toHaveAttribute("aria-current", "true");
  await expect(page.locator("#thought-file-list")).toContainText("客户资料领取信息");
  await expect(page.locator("#thought-file-list")).toContainText("发送修订后的合作方案");
  await page.locator("#thought-file-search").fill("给产品演示");
  await expect(page.locator("[data-thought-record]")).toHaveCount(1);
  await page.locator("[data-thought-record]").click();
  await expect(page.locator("#thought-preview")).toBeVisible();
  await page.locator("#home-entry").click();
  await page.locator('[data-widget-ai="brief"]').click();
  await expect(page.locator("#xiaozhi-rail")).toBeVisible();
  for (const content of ["产品方案评审", "发送修订后的合作方案", "给产品演示增加真实客户场景"]) {
    await expect(page.locator("#xiaozhi-input")).toHaveValue(new RegExp(content));
  }
  await expect(page.locator("#xiaozhi-input")).not.toHaveValue(/昨天的灵感|明日提交周报/);
  await page.locator("#xiaozhi-send").click();
  await expect(page.locator("#widget-agent-result")).toContainText("演示建议");
});


test("daily brief exposes its sources and carries all context into Agent", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-23T12:00:00Z") });
  await page.goto("/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1");
  await expect(page.locator(".daily-brief-narrative")).toContainText("可以回顾 16:30 的客户需求沟通");
  await expect(page.locator(".daily-brief-narrative")).toContainText("发送修订后的合作方案仍待跟进");
  await expect(page.locator('#today-assets-grid [data-widget-ai]')).toHaveCount(1);
  await page.locator('[data-widget-ai="brief"]').click();
  await expect(page.locator("#xiaozhi-input")).toHaveValue(/客户拜访交通/);
  await expect(page.locator("#xiaozhi-input")).toHaveValue(/产品方案评审/);
  await page.locator("#xiaozhi-send").click();
  await expect(page.locator("#widget-agent-result")).toContainText("把今天的记录连成下一步");
  await page.locator("#xiaozhi-collapse").click();
  await page.locator('[data-today-toggle="todo-1"]').click();
  await page.locator('[data-today-toggle="todo-2"]').click();
  await expect(page.locator("#daily-brief-title")).toContainText("该推进的事已完成");
});
