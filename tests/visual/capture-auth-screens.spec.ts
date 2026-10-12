import { test, expect } from "@playwright/test";

// Capture the running product pages, not a separately drawn marketing mockup.
// Run explicitly with playwright.auth-assets.config.ts against the current static build.
test("capture team and enterprise product screens", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.locator("#phone").fill("13800138000");
  await page.locator("#code").fill("123456");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page.locator(".app")).toBeVisible();
  await page.goto("/cn/workbench/?view=home&space=team-eureka");
  await expect(page.locator(".team-overview")).toBeVisible();
  await expect(page.locator(".ws-recording-table tbody tr").first()).toBeVisible();
  await page.screenshot({ path: "test-results/auth-assets/team-workspace.png", animations: "disabled" });

  await page.goto("/cn/?edition=enterprise");
  await page.locator("#enterprise-code").fill("100001");
  await page.locator("#submit").click();
  await page.locator("#phone").fill("13800138000");
  await page.locator("#code").fill("123456");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page.locator(".enterprise-workbench")).toBeVisible();
  for (const title of ["整理项目启动会结论，补齐行动清单", "与产品负责人确认本周交付范围", "汇总客户反馈，准备下一次方案讨论", "完成季度复盘材料，发送给企业项目组", "核对项目进度，更新个人工作计划"]) {
    await page.getByLabel("新待办").fill(title);
    await page.getByRole("button", { name: "添加待办" }).click();
  }
  await page.locator(".enterprise-tasks input").last().check();
  await expect(page.locator(".enterprise-tasks li")).toHaveCount(5);
  await page.screenshot({ path: "test-results/auth-assets/enterprise-workspace.png", animations: "disabled" });
});
