import { expect, test, type Locator, type Page } from "@playwright/test";

async function login(page: Page, market: string) {
  await page.goto(`/${market}/`);
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  if (market === "cn") await page.getByRole("link", { name: "个人/团队版", exact: true }).click();
  await page.locator(market === "cn" ? "#phone" : "#email").fill(market === "cn" ? "13800138000" : "visual@example.com");
  await page.locator("#code").fill("123456");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page.locator(".app:not(.guest-app)")).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function targetSize(locator: Locator, minimum: number) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(minimum);
}
for (const market of ["cn", "global"]) {
  for (const [width, height] of [[390, 844], [768, 900], [1080, 680], [1440, 900]]) {
    test(`${market} UI: bounded login and usable connector dialog at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${market}/`);
      const trigger = page.getByRole("button", { name: "登录 / 注册", exact: true }).last();
      await trigger.click();
      const dialog = page.locator(".auth-overlay");
      await expect(dialog).toBeVisible();
      const box = (await dialog.boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(520);
      expect(box.height).toBeLessThanOrEqual(height - 24);
      expect(box.y).toBeGreaterThanOrEqual(12);
      expect(box.y + box.height).toBeLessThanOrEqual(height - 12);
      expect((await page.locator(".auth-form").boundingBox())!.width).toBeLessThanOrEqual(market === "cn" ? 520 : 400);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await login(page, market);
      await noOverflow(page);
      await page.goto(`/${market}/workbench/?view=connectors`);
      const add = page.getByRole("button", { name: "＋ 添加自定义连接器" });
      await targetSize(add, width <= 760 ? 44 : 40);
      await add.click();
      const form = page.locator(".connector-dialog");
      await expect(form).toBeVisible();
      const input = form.locator("input").first();
      await input.focus();
      await expect(input).toHaveCSS("outline-color", market === "cn" ? "rgb(22, 93, 255)" : "rgb(56, 88, 182)");
      await expect(input).toHaveCSS("outline-width", "2px");
      expect((await form.boundingBox())!.width).toBeLessThanOrEqual(Math.min(520, width - 32));
      await input.fill("视觉验收");
      await expect(input).toHaveValue("视觉验收");
      await page.screenshot({ path: `test-results/ui-standards/${market}-connector-${width}.png`, animations: "disabled" });
      page.once("dialog", confirmation => confirmation.accept());
      await page.keyboard.press("Escape");
      await expect(add).toBeFocused();
      await noOverflow(page);
    });
  }
  test(`${market} UI: collapsed rewards remain usable and agent disabled state is distinct`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, market);
    await expect(page.locator(".brief-task").first()).toHaveCSS("font-size", market === "cn" ? "12px" : "14px");
    const reward = page.locator(market === "cn" ? ".cn-points-guide" : ".ex-lower-credits");
    // CSS can collapse the shell on resize without a route remount.
    for (const width of [1080, 768]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await reward.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
      expect((await reward.boundingBox())!.width).toBe(44);
      await expect(reward.locator(market === "cn" ? ".cn-points-guide-copy" : ".credits-guide-copy")).toBeHidden();
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator(".collapse-btn").click();
    await expect(reward).toHaveAccessibleName(market === "cn" ? "赚积分" : "做任务赚 Credits");
    await targetSize(reward, 44);
    expect(await reward.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    expect(await page.locator(".sidebar").evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    await reward.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator('[data-ai-artwork="reward"]')).toHaveCount(market === "cn" ? 1 : 0);
    await page.screenshot({ path: `test-results/ui-standards/${market}-reward-artwork.png`, animations: "disabled" });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Ask Agent", exact: true }).click();
    const send = page.locator("#xiaozhi-rail .xiaozhi-send");
    await expect(send).toBeDisabled();
    const disabledColor = await send.evaluate(e => getComputedStyle(e).backgroundColor);
    await page.locator("#xiaozhi-rail textarea").fill("整理会议要点");
    await expect(send).toBeEnabled();
    await expect(send).toHaveCSS("background-color", market === "cn" ? "rgb(38, 38, 38)" : "rgb(56, 88, 182)");
    await expect(send).not.toHaveCSS("background-color", disabledColor);
    await expect(send).toHaveCSS("border-radius", market === "cn" ? "6px" : "8px");
    await noOverflow(page);
  });
  test(`${market} UI: readable mobile modules and operable audio controls`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, market);
    await expect(page.locator("#today-workbench-title")).toHaveCSS("font-size", "28px");
    await expect(page.locator("#today-workbench-title")).toHaveCSS("line-height", market === "cn" ? "38px" : "36px");
    for (const view of ["calendar", "thoughts", "contacts", "settings", "my-devices", "subscription", "recording"] as const) {
      await page.goto(`/${market}/workbench/?view=${view}`);
      await expect(page.locator(".app:not(.guest-app)")).toBeVisible();
      await noOverflow(page);
      const control = page.locator({ calendar: ".pa-btn.primary", thoughts: ".th-btn.primary", contacts: ".contacts-button.primary", settings: ".pa-settings .ex-button", "my-devices": ".ws-table .ws-btn", subscription: ".ps-plan-footer .primary", recording: "#recording-add-image" }[view]!).first();
      await targetSize(control, 44);
      await expect(control).toHaveCSS("font-size", "14px");
    }
    await page.goto(`/${market}/workbench/?view=meeting&id=meeting-1`);
    await expect(page.locator(".md-prose").first()).toHaveCSS("font-size", "15px");
    await expect(page.locator(".md-prose").first()).toHaveCSS("line-height", market === "cn" ? "26px" : "24px");
    if (market === "cn") {
      const player = page.locator(".cn-audio-player");
      const outer = (await player.boundingBox())!;
      for (const control of await player.locator(".md-play, .cn-audio-skip, select").all()) {
        const rect = (await control.boundingBox())!;
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
        expect(rect.x).toBeGreaterThanOrEqual(outer.x);
        expect(rect.x + rect.width).toBeLessThanOrEqual(outer.x + outer.width + 1);
      }
    }
    await noOverflow(page);
  });
}
