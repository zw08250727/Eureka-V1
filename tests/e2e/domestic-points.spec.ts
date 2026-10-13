import { test, expect, type Page } from "@playwright/test";
const key = "eureka:market:cn:eureka:workspaces:v2";
async function login(page: Page) {
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.getByRole("link", { name: "个人/团队版", exact: true }).click();
  await page.locator("#phone").fill("13800138000");
  await page.locator("#code").fill("111111");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page.locator(".app")).toBeVisible();
}
async function openPoints(page: Page) {
  await page.getByRole("button", { name: /积分额度/ }).click();
  const popup = page.getByRole("dialog", { name: "积分与会员", exact: true });
  await expect(popup).toBeVisible();
  return popup;
}
for (const width of [390, 768, 1440]) test(`CN consumer points entry fits ${width}px and supports keyboard dismissal`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await login(page);
  const popup = await openPoints(page);
  await expect(popup).toContainText("免费版会员");
  await expect(popup.getByRole("button", { name: "升级", exact: true })).toBeFocused();
  await expect(popup).toContainText("+1,000 积分");
  await expect(popup).toContainText("+500 积分");
  await expect(popup.getByRole("button", { name: "充值积分", exact: true })).toHaveCSS("background-color", "rgb(22, 93, 255)");
  const rect = await popup.boundingBox();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(900);
  await page.screenshot({ path: `test-results/cn-points/personal-${width}.png` });
  await page.keyboard.press("Escape");
  await expect(popup).not.toBeVisible();
  await expect(page.getByRole("button", { name: /积分额度/ })).toBeFocused();
  await openPoints(page);
  await page.locator(".page-crumb").click();
  await expect(popup).not.toBeVisible();
  // UI-CN-AI-01: motion is opt-out, including hover and focused controls.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPoints(page);
  await popup.getByRole("button", { name: "做任务赚积分", exact: true }).click();
  const artwork = page.locator('[data-ai-artwork="reward"]');
  await expect(artwork).toBeVisible();
  await artwork.hover();
  const animations = await page.locator('[data-ai-icon], [data-ai-artwork]').evaluateAll(elements =>
    elements.flatMap(element => [...element.querySelectorAll('*')]).filter(element => getComputedStyle(element).animationName !== 'none').length);
  expect(animations).toBe(0);
  const tasks = page.getByRole("dialog");
  expect((await tasks.boundingBox())!.width).toBeLessThanOrEqual(width);
  await page.screenshot({ path: `test-results/cn-points/ai-rewards-${width}.png` });
});
test("CN upgrade is one click from points; paid membership is reflected without changing team rights", async ({ page }) => {
  await login(page);
  await page.goto("/cn/workbench/?space=team-eureka");
  const teamBefore = await page.getByRole("button", { name: /积分额度/ }).innerText();
  await page.goto("/cn/workbench/?space=personal");
  const popup = await openPoints(page);
  await popup.getByRole("button", { name: "升级", exact: true }).click();
  await expect(page).toHaveURL(/view=subscription/);
  await page.getByRole("button", { name: "立即升级 专业版", exact: true }).click();
  await page.getByRole("button", { name: "确认支付 ¥199.00", exact: true }).click();
  await page.getByRole("button", { name: "完成", exact: true }).click();
  const paid = await openPoints(page);
  await expect(paid).toContainText("专业版会员");
  await expect(paid).toContainText("每月享 5,000 积分");
  await expect(paid.getByRole("button", { name: "管理会员", exact: true })).toBeVisible();
  await page.goto("/cn/workbench/?space=team-eureka");
  await expect(page.getByRole("button", { name: /积分额度/ })).toHaveText(teamBefore, { useInnerText: true });
});
test("CN team points share the entry but enforce administrator and expired-team restrictions", async ({ page }) => {
  await login(page);
  await page.goto("/cn/workbench/?space=team-eureka&actor=kevin");
  let popup = await openPoints(page);
  await expect(popup).toContainText("团队可用积分");
  await expect(popup.getByRole("button", { name: "联系管理员充值", exact: true })).toBeDisabled();
  await expect(popup.getByRole("button", { name: /签到|赚积分|升级|管理订阅/ })).toHaveCount(0);
  await page.screenshot({ path: "test-results/cn-points/team-member.png" });
  await popup.getByRole("button", { name: "积分明细", exact: true }).click();
  await expect(page).toHaveURL(/space=team-eureka/);
  await expect(page.getByRole("tab", { name: "积分明细", exact: true })).toBeVisible();
  await page.goto("/cn/workbench/?space=team-eureka&actor=zhang");
  popup = await openPoints(page);
  await expect(popup.getByRole("button", { name: "管理订阅", exact: true })).toBeVisible();
  await expect(popup.getByRole("button", { name: "充值积分", exact: true })).toBeEnabled();
  await page.screenshot({ path: "test-results/cn-points/team-admin.png" });
  await popup.getByRole("button", { name: "充值积分", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "积分与会员", exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "确认充值", exact: true })).toBeVisible();
  await page.evaluate(k => { const data = JSON.parse(localStorage.getItem(k)!); data.spaces.find((w: { id: string }) => w.id === "team-eureka").status = "expired"; localStorage.setItem(k, JSON.stringify(data)); }, key);
  await page.reload();
  popup = await openPoints(page);
  await expect(popup).toContainText("团队版已到期");
  await expect(popup.getByRole("button", { name: "续费后可充值", exact: true })).toBeDisabled();
  await popup.getByRole("button", { name: "续费", exact: true }).click();
  await expect(page).toHaveURL(/view=subscription.*space=team-eureka/);
});
test("CN rewards update the entry and account menu uses the same membership card", async ({ page }) => {
  await login(page);
  let popup = await openPoints(page);
  await popup.getByRole("button", { name: /每日签到/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("每日签到");
  // Claim through the existing task flow; the entry must derive the resulting state.
  const row = page.locator('.ex-task').filter({ hasText: '每日签到' });
  await row.getByRole("button").click();
  await page.keyboard.press("Escape");
  popup = await openPoints(page);
  await expect(popup.getByRole("button", { name: /每日签到.*今日已签到/ })).toBeDisabled();
  await popup.getByRole("button", { name: /满意度打分/ }).click();
  await expect(page.getByRole("dialog")).toContainText("用户反馈");
  await page.keyboard.press("Escape");
  await page.locator("#user-card").click();
  await expect(page.getByRole("dialog", { name: "我的账户", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/cn-points/account-menu-light.png" });
  await expect(page.getByRole("dialog", { name: "我的账户", exact: true })).toContainText("免费版会员");
  await expect(page.getByRole("dialog", { name: "我的账户", exact: true }).getByRole("button", { name: "升级", exact: true })).toBeVisible();
});
