import { expect, test } from "@playwright/test";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const pageUrl = "/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1";

test("meeting history loads ten at a time and resets after filtering", async ({ page }) => {
  // Extend only the test response; keep the prototype's actual meeting count intact.
  await page.route("**/team-only-app.html?*", async (route) => {
    const response = await route.fetch();
    let html = await response.text();
    const template = html.match(/<button class="meeting-row home-meeting-row" id="view-panorama"[^]*?<\/button>/)![0];
    const fixtures = Array.from({ length: 18 }, (_, index) => template
      .replace('id="view-panorama"', `data-meeting="分页测试 ${index + 1}"`)
      .replace("三季度产品复盘会议", `分页测试 ${index + 1}`)).join("");
    html = html.replace(template, template + fixtures);
    await route.fulfill({ response, body: html });
  });
  await page.goto(pageUrl);
  const rows = page.locator("#meeting-list .home-meeting-row:visible");
  const scroller = page.locator("#meeting-table-scroll");
  await expect(page.locator("#meeting-view-description")).toHaveText("共 23 个会议笔记");
  await expect(rows).toHaveCount(10);
  await expect(page.locator("#meeting-list input[type=checkbox]")).toHaveCount(0);
  await expect(page.locator("#meeting-select-all")).toHaveCount(0);
  await expect(page.locator("#recycle-bin-entry")).toBeHidden();
  await expect(page.locator("#recording-recycle-entry")).toBeVisible();
  const initialHeight = await scroller.evaluate((el) => el.clientHeight);
  await scroller.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect(rows).toHaveCount(20);
  const headerOffset = await scroller.evaluate((el) => el.querySelector(".home-meeting-table-head")!.getBoundingClientRect().top - el.getBoundingClientRect().top);
  expect(Math.abs(headerOffset)).toBeLessThanOrEqual(2);
  await scroller.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect(rows).toHaveCount(23);
  await expect(page.locator("#meeting-load-status")).toHaveText("已显示全部 23 条会议笔记");
  expect(await scroller.evaluate((el) => el.clientHeight)).toBe(initialHeight);
  await page.locator("#meeting-search").fill("不存在的会议");
  await expect(rows).toHaveCount(0);
  await expect(page.locator("#meeting-filter-empty")).toBeVisible();
  await expect(page.locator("#meeting-view-description")).toHaveText("共 0 个会议笔记");
  await page.locator("#meeting-search").clear();
  await expect(rows).toHaveCount(10);
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(0);
  await page.locator("#meeting-source-filter").selectOption("M1");
  await expect(rows).toHaveCount(1);
  await expect(page.locator("#meeting-view-description")).toHaveText("共 1 个会议笔记");
  await page.locator("#meeting-source-filter").selectOption("all");
  await page.locator("#meeting-date-filter").fill("2026-09-02");
  await expect(rows).toHaveCount(1);
});

test("meeting list fits desktop, smaller screens and an open Agent panel", async ({ page }) => {
  await page.goto(pageUrl);
  for (const [width, height] of [[1920, 1080], [1440, 900], [1024, 768], [390, 844]]) {
    await page.setViewportSize({ width, height });
    const metrics = await page.locator("#meeting-table-scroll").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const parent = el.parentElement!.getBoundingClientRect();
      return { width: rect.width, parent: parent.width, height: rect.height, max: innerHeight };
    });
    expect(metrics.width).toBeLessThanOrEqual(metrics.parent);
    expect(metrics.height).toBeLessThan(metrics.max);
    const header = await page.locator("#recording-card .home-meeting-head").boundingBox();
    expect(header!.height).toBeLessThan(260);
    await expect(page.locator("#recording-recycle-entry")).toBeVisible();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#xiaozhi-entry").click();
  await expect(page.locator("#meeting-agent-grid")).toHaveClass(/agent-open/);
  await expect(page.locator("#meeting-view-description")).toHaveText("共 5 个会议笔记");
  await page.locator("#recording-recycle-entry").click();
  await expect(page.locator('[data-main-view="recycle-bin"]')).toBeVisible();
  await page.locator("#home-entry").click();
  await page.locator("#meeting-list [data-meeting-action=delete]").first().click();
  await page.locator("#delete-confirm-submit").click();
  await expect(page.locator("#meeting-view-description")).toHaveText("共 4 个会议笔记");
  await page.locator("#recording-recycle-entry").click();
  await page.locator("#recycle-list [data-recycle-action=restore]").first().click();
  await page.locator("#home-entry").click();
  await expect(page.locator("#meeting-view-description")).toHaveText("共 5 个会议笔记");
});
