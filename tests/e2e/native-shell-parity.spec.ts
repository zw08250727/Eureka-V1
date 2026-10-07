import { test, expect } from "@playwright/test";
test("native recording permission can cancel and authorize without losing the current page", async ({
  page,
}) => {
  await page.goto("/workbench/");
  await page.locator("#module-start-recording").click();
  await expect(page.locator("#record-permission-modal")).toBeVisible();
  await expect(page.locator(".permission-state")).toHaveText([
    "待授权",
    "待授权",
  ]);
  await expect(page.locator("#recent-meeting-title")).toBeVisible();
  await page.locator("#permission-skip").click();
  await expect(page.locator("#record-permission-modal")).toHaveCount(0);
  await page.locator("#module-start-recording").click();
  await page.locator("#permission-authorize").click();
  await expect(page.locator("#recording-layout")).toBeVisible();
  await expect(page.locator("#start-recording")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator("iframe")).toHaveCount(0);
});
test("workspace menu dialogs preserve the underlying native calendar", async ({
  page,
}) => {
  await page.goto("/workbench/?view=calendar");
  await page.locator("#ws-switcher").click();
  await page
    .getByRole("button", { name: "创建团队工作空间", exact: true })
    .click();
  await expect(page.locator("#ws-dialog")).toBeVisible();
  await expect(page.locator("#personal-actions")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#ws-dialog")).toHaveCount(0);
  await page.locator("#ws-switcher").click();
  await page.getByRole("button", { name: /工作空间邀请/ }).click();
  await expect(page.locator("#ws-dialog")).toContainText("工作空间邀请");
  await expect(page.locator("#personal-actions")).toBeVisible();
});
