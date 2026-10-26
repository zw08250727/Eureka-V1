import { expect, test, type Page } from "@playwright/test";

async function openConnections(page: Page) {
  await page.goto("/global/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.locator("#terms").check();
  await page.locator("#email").fill("connections@example.com");
  await page.locator("#code").fill("123456");
  await page.locator("#submit").click();
  await expect(page).toHaveURL(/\/global\/workbench\//);
  await page.goto("/global/workbench/?view=connectors");
}

for (const width of [390, 768, 1080, 1440]) {
  test(`overseas Connections aligns content and loads vendor logos at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openConnections(page);
    await expect(page.getByRole("heading", { name: "接入其他应用", exact: true })).toBeVisible();
    await expect(page.locator(".connections-layout [role=tablist]")).toHaveCount(0);
    await expect(page.locator(".skills-landing")).toHaveCount(0);
    await expect(page.locator(".connections-heading h1")).toHaveCSS("font-size", "22px");
    const marks = page.locator(".connector-card.is-system .connector-mark img");
    await expect(marks).toHaveCount(5);
    await expect.poll(() => marks.evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const heading = (await page.locator(".connections-heading h1").boundingBox())!;
    const grid = (await page.locator(".connector-grid").first().boundingBox())!;
    expect(Math.abs(heading.x - grid.x)).toBeLessThan(1);
    expect(Math.abs(heading.width - grid.width)).toBeLessThan(1);
    const firstCard = (await page.locator(".connector-card.is-system").first().boundingBox())!;
    const addCard = (await page.getByRole("button", { name: "新增连接器" }).boundingBox())!;
    expect(Math.abs(firstCard.width - addCard.width)).toBeLessThan(1);
    for (const card of await page.locator(".connector-card.is-system").all()) {
      const box = (await card.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/markets/global-connections-services-${width}.png`, fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: "查看 Slack", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Slack · 连接器详情" });
    await expect(dialog.locator(".connector-mark-slack img")).toHaveAttribute("src", /\/connector-logos\/slack\.png$/);
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

  });
}
