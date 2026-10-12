import { test, expect, type Page } from "@playwright/test";
async function signIn(page: Page, market: string) {
  if (market === "cn") await page.locator("#phone").fill("13800138000");
  else await page.locator("#email").fill("guest@example.com");
  await page.locator("#code").fill("123456");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
}
for (const market of ["cn", "global"]) {
  test(`${market}: home is public; all private entrypoints open a dismissible auth overlay without writing data`, async ({ page }) => {
    await page.goto(`/${market}/`);
    await expect(page.locator(".guest-app")).toBeVisible();
    await expect(page.locator(".auth-overlay")).toHaveCount(0);
    await expect(page.locator(".meeting-row")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/张伟|3,000|5,000/);
    const names = ["开始录音", "通讯录", "日程与待办", "连接器", "创建团队", "加入团队", "上传", "Ask Agent", "帮我安排", "全部闪念", "查看日程与待办", "查看全部记账", "升级会员", "所有通知", "搜索会议", "录音回收站", "登录 / 注册"];
    for (const name of names) {
      const trigger = page.getByRole("button", { name, exact: true }).first();
      await trigger.click();
      await expect(page.locator(".auth-overlay")).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/${market}/$`));
      await page.getByRole("button", { name: "关闭登录", exact: true }).click();
      await expect(page.locator(".auth-overlay")).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
    await page.getByRole("button", { name: "下载 App", exact: true }).click();
    await expect(page.locator(".guest-download-dialog")).toBeVisible();
    await expect(page.locator(".auth-overlay")).toHaveCount(0);
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
    await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
    for (let n = 0; n < 20; n++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest(".auth-overlay"))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(page.locator(".auth-overlay")).toHaveCount(0);
  });
  test(`${market}: protected deep link resumes after login; cancel returns home and refresh stays public`, async ({ page }) => {
    await page.goto(`/${market}/workbench/?view=connectors&space=personal`);
    await expect(page.locator(".auth-overlay")).toBeVisible();
    await expect(page.locator(".connector-card")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(page.locator(".guest-app")).toBeVisible();
    await expect(page.locator(".auth-overlay")).toHaveCount(0);
    await page.getByRole("button", { name: "连接器", exact: true }).click();
    await signIn(page, market);
    await expect(page.locator(".connector-card").first()).toBeVisible();
    await page.goto(`/${market}/`);
    await expect(page.locator(".app:not(.guest-app)")).toBeVisible();
    await expect(page.locator(".auth-overlay")).toHaveCount(0);
  });
  for (const action of ["上传", "Ask Agent", "开始录音", "所有通知"]) test(`${market}: login resumes ${action} without starting an operation`, async ({ page }) => {
    await page.goto(`/${market}/`);
    await page.getByRole("button", { name: action, exact: true }).first().click();
    await signIn(page, market);
    if (action === "Ask Agent") await expect(page.locator("#xiaozhi-rail")).toBeVisible();
    else await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).not.toHaveURL(/action=/);
    await page.reload();
    await expect(page.locator(".app:not(.guest-app)")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
  test(`${market}: other market stays signed out; cross-tab logout removes all private UI`, async ({ page, context }) => {
    await page.goto(`/${market}/`);
    await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
    await signIn(page, market);
    await expect(page.locator(".meeting-row").first()).toBeVisible();
    const other = await context.newPage();
    await other.goto(`/${market === "cn" ? "global" : "cn"}/`);
    await expect(other.locator(".guest-app")).toBeVisible();
    await page.evaluate(m => localStorage.setItem(`eureka:market:${m}:saved-draft`, "keep me"), market);
    const saved = await page.evaluate(() => Object.keys(localStorage).filter(k => !k.endsWith("auth:v1")));
    expect(saved.length).toBeGreaterThan(0);
    await other.evaluate(m => localStorage.removeItem(`eureka:market:${m}:eureka:auth:v1`), market);
    await expect(page.locator(".guest-app")).toBeVisible();
    await expect(page.locator(".meeting-row")).toHaveCount(0);
    expect(await page.evaluate(() => Object.keys(localStorage).filter(k => !k.endsWith("auth:v1")))).toEqual(saved);
  });
  for (const width of [390, 768, 1440]) test(`${market}: guest and overlay at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${market}/`);
    await expect(page.locator(".guest-app")).toBeVisible();
    await page.screenshot({ path: `test-results/guest-${market}-${width}.png`, fullPage: true, animations: "disabled" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
    await expect(page.locator("#auth-form")).toBeVisible();
    await page.screenshot({ path: `test-results/guest-auth-${market}-${width}.png`, animations: "disabled" });
    const box = await page.locator(".auth-overlay").boundingBox();
    expect(Math.abs(box!.x + box!.width / 2 - width / 2)).toBeLessThan(2);
    expect(box!.height).toBeLessThanOrEqual(900);
    await page.getByRole("button", { name: "关闭登录", exact: true }).click();
    if (width < 1100) {
      await page.getByRole("button", { name: "打开导航" }).click();
      const calendar = page.getByRole("button", { name: "日程与待办", exact: true });
      await calendar.click();
      await expect(page.locator(".auth-overlay")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(calendar).toBeFocused();
      await page.locator("#user-card").click();
      await expect(page.locator(".auth-overlay")).toBeVisible();
    }
  });
}
test("corrupt credentials show guest home and failed persistence keeps credentials in the overlay", async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("eureka:market:cn:eureka:auth:v1", "broken-json"));
  await page.goto("/cn/");
  await expect(page.locator(".guest-app")).toBeVisible();
  await page.getByRole("button", {name:"登录 / 注册", exact:true}).last().click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("存储空间不足"); }; });
  await signIn(page,"cn");
  await expect(page.locator("#status")).toContainText("存储空间不足");
  await expect(page.locator("#phone")).toHaveValue("13800138000");
  await expect(page.locator(".guest-app")).toBeVisible();
});
