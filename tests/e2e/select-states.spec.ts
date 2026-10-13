import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, market: string) {
  await page.goto(`/${market}/`);
  await page.getByRole('button', { name: '登录 / 注册', exact: true }).last().click();
  if (market === "cn") await page.getByRole("button", {name:"个人/团队版",exact:true}).click();
  await page.locator(market === 'cn' ? '#phone' : '#email').fill(market === 'cn' ? '13800138000' : 'select@example.com');
  await page.locator('#code').fill('123456');
  await page.locator('#terms').check();
  await page.locator('#submit').click();
  await expect(page.locator('.app:not(.guest-app)')).toBeVisible();
}
for (const market of ['cn', 'global']) for (const width of [390, 1440]) {
  test(`${market} ${width}: pointer selection is light; keyboard has one visible focus and commits only on Enter`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page, market);
    await page.goto(`/${market}/workbench/?view=thoughts&id=schedule`);
    const sort = page.getByRole('combobox', { name: '排序方式' });
    await sort.click();
    const popup = page.locator('.ui-select-popup:popover-open');
    const latest = popup.getByRole('option', { name: '最新记录优先', exact: true });
    const earliest = popup.getByRole('option', { name: '最早记录优先', exact: true });
    await expect(sort).toHaveCSS('outline-style', 'none');
    await expect(sort).toHaveCSS('box-shadow', 'none');
    await expect(sort).toHaveCSS('border-top-color', market === 'cn' ? 'rgb(235, 235, 235)' : 'rgb(220, 226, 240)');
    await expect(latest).toHaveAttribute('aria-selected', 'true');
    await expect(latest).toHaveCSS('outline-style', 'none');
    await expect(latest.locator('svg')).toBeVisible();
    await page.screenshot({ path: `test-results/select-states/${market}-${width}-pointer.png`, animations: 'disabled' });
    await earliest.hover();
    await expect(earliest).toHaveCSS('outline-style', 'none');
    await expect(latest).toHaveAttribute('aria-selected', 'true');
    await expect(sort).toHaveValue('desc');
    await sort.press('Home');
    await sort.press('ArrowDown');
    await expect(earliest).toHaveCSS('outline-width', '2px');
    await expect(sort).toHaveCSS('outline-style', 'none');
    await expect(sort).toHaveValue('desc');
    await page.screenshot({ path: `test-results/select-states/${market}-${width}-keyboard.png`, animations: 'disabled' });
    await sort.press('Enter');
    await expect(sort).toHaveValue('asc');
    await expect(popup).toHaveCount(0);
    await expect(sort).toBeFocused();
    await expect(sort).toHaveCSS('outline-width', '2px');
    await sort.press('Space');
    await sort.press('Home');
    await sort.press('Escape');
    await expect(sort).toHaveValue('asc');
    await expect(sort).toBeFocused();
    await sort.click();
    await expect(sort).toHaveCSS('outline-style', 'none');
    await latest.click();
    await expect(sort).toHaveValue('desc');
    await sort.press('Tab');
    await expect(popup).toHaveCount(0);
    await page.keyboard.press('Shift+Tab');
    await expect(sort).toBeFocused();
    await expect(sort).toHaveCSS('outline-width', '2px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
}
