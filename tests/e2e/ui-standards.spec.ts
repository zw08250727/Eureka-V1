import { expect, test, type Locator, type Page } from "@playwright/test";

async function login(page: Page, market: string) {
  await page.goto(`/${market}/`);
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  if (market === "cn") await page.getByRole("button", {name:"个人/团队版",exact:true}).click();
  await page.locator(market === "cn" ? "#phone" : "#email").fill(market === "cn" ? "13800138000" : "visual@example.com");
  const identity = page.locator(market === "cn" ? "#phone" : "#email");
  await expect(identity).toHaveCSS("outline-width", "1px");
  await expect(identity).toHaveCSS("box-shadow", "none");
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
      const add = page.getByRole("button", { name: /新增连接器|添加自定义连接器/ }).first();
      await targetSize(add, width <= 760 ? 44 : 40);
      await add.click();
      const form = page.locator(".connector-dialog");
      await expect(form).toBeVisible();
      const input = form.getByPlaceholder("请输入连接器名称");
      await input.focus();
      await expect(input).toHaveCSS("outline-color", market === "cn" ? "rgb(22, 93, 255)" : "rgb(56, 88, 182)");
      await expect(input).toHaveCSS("outline-width", "1px");
      expect((await form.boundingBox())!.width).toBeLessThanOrEqual(Math.min(600, width - 32));
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
    await expect(reward).toHaveAccessibleName(market === "cn" ? "赚Credits" : "做任务赚 Credits");
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
    await expect(page.locator("#today-workbench-title")).toHaveCSS("font-size", "24px");
    await expect(page.locator("#today-workbench-title")).toHaveCSS("line-height", "32px");
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

for (const width of [390, 1440]) {
  test(`CN account palette, lightweight selection and composite focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto('/cn/?edition=enterprise');
    const code = page.locator('#enterprise-code');
    await code.click();
    await expect(code).toHaveCSS('outline-style', 'none');
    await expect(code).toHaveCSS('box-shadow', 'none');
    await expect(page.locator('.credential-input')).toHaveCSS('outline-width', '1px');
    await page.screenshot({ path: `test-results/account-ui/cn-enterprise-${width}.png` });
    await page.keyboard.press('Tab');
    await expect(page.locator('.credential-input')).not.toHaveCSS('outline-style', 'solid');
    await page.goto('/cn/');
    await page.getByRole('button', { name: '登录 / 注册', exact: true }).last().click();
    await page.getByRole('button', { name: '个人/团队版', exact: true }).click();
    await page.locator('#phone').click();
    await expect(page.locator('#phone')).toHaveCSS('outline-width', '1px');
    await expect(page.locator('#phone')).toHaveCSS('outline-offset', '-1px');
    await expect(page.locator('#phone')).toHaveCSS('box-shadow', 'none');
    await page.screenshot({ path: `test-results/account-ui/cn-personal-${width}.png` });
    await page.keyboard.press('Escape');
    await login(page, 'cn');
    await page.getByRole('button', { name: /Credits额度/ }).click();
    await page.getByRole('button', { name: '做任务赚Credits', exact: true }).click();
    await expect(page.locator('.ex-hero h3')).toHaveCSS('color', 'rgb(38, 38, 38)');
    await expect(page.locator('.ex-hero h3')).toHaveCSS('font-size', '16px');
    await expect(page.locator('.ex-task > b').first()).toHaveCSS('color', 'rgb(38, 38, 38)');
    await expect(page.locator('.ex-task p').first()).toHaveCSS('font-size', '12px');
    await page.screenshot({ path: `test-results/account-ui/cn-tasks-${width}.png` });
    await page.keyboard.press('Escape');
    await page.goto('/cn/workbench/?view=settings&id=recording');
    await expect(page.locator('.settings-float-head h4').first()).toHaveCSS('color', 'rgb(38, 38, 38)');
    await expect(page.locator('.settings-row-copy span').first()).toHaveCSS('font-size', '12px');
    await page.screenshot({ path: `test-results/account-ui/cn-recording-settings-${width}.png` });
    await page.goto('/cn/workbench/?view=settings&id=credits');
    await expect(page.locator('.ex-credit-settings .ex-summary strong')).toHaveCSS('color', 'rgb(38, 38, 38)');
    await expect(page.locator('.ex-credit-settings .ex-grid .ex-rule').first()).toHaveCSS('margin-top', '0px');
    await expect(page.locator('.ex-credit-settings .ex-table th').first()).toHaveCSS('color', 'rgb(89, 89, 89)');
    await page.screenshot({ path: `test-results/account-ui/cn-settings-${width}.png` });
    await page.locator('.ex-credit-settings').getByRole('button', { name: '充值', exact: true }).click();
    const sku = page.locator('.ex-sku').first();
    await sku.click();
    await expect(sku).toHaveAttribute('aria-pressed', 'true');
    await expect(sku).toHaveCSS('box-shadow', 'none');
    await expect(sku).toHaveCSS('border-color', 'rgb(235, 235, 235)');
    await expect(sku).toHaveCSS('background-color', 'rgb(242, 243, 245)');
    await expect(sku.locator('strong')).toHaveCSS('font-size', '24px');
    await page.screenshot({ path: `test-results/account-ui/cn-recharge-${width}.png` });
    await page.keyboard.press('Tab');
    await expect(page.locator('.ex-sku').nth(1)).toBeFocused();
    await expect(page.locator('.ex-sku').nth(1)).toHaveCSS('outline-width', '2px');
    await page.keyboard.press('Escape');
    await page.goto('/cn/workbench/?view=subscription');
    await expect(page.locator('.cn-membership h1')).toHaveCSS('font-size', '22px');
    const cycle = page.locator('.cn-member-cycles .selected');
    await expect(cycle).toHaveCSS('box-shadow', 'none');
    await expect(cycle).toHaveCSS('border-color', 'rgb(235, 235, 235)');
    await page.screenshot({ path: `test-results/account-ui/cn-membership-${width}.png` });
    await page.getByRole('tab', { name: '加时包', exact: true }).click();
    await expect(page.locator('.cn-time-options [aria-pressed=true]')).toHaveCSS('box-shadow', 'none');
    await noOverflow(page);
  });
}
