import M from "../../src/features/spaces/model/core";
import { expect, test, type Page } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  const state = M.seed(); state.spaces = state.spaces.filter(w => w.type === "personal"); M.reconcileEntitlements(state);
  await page.addInitScript(s => { if (!localStorage.getItem("eureka:workspaces:v2")) localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s)); }, state);
});
const enter = (page: Page, view: string) =>
  page.goto(`/workbench/?view=${view}&space=personal`);
const submit = (page: Page, form: string) =>
  page.locator(`${form} button[type=submit]`).click();
test("reference calendar: cross-day creation, quick edit guard, full detail, responsive grids", async ({
  page,
}) => {
  await enter(page, "calendar");
  await expect(page.locator("#personal-actions")).toHaveClass(
    "main-inner pa-workspace",
  );
  await expect(page.locator(".pa-day-section")).toHaveCount(2);
  for (const [mode, count] of [
    ["week", 7],
    ["month", 42],
  ] as const) {
    await page.locator(`[data-pa=calendar-mode][data-id=${mode}]`).click();
    await expect(page.locator(".pa-calendar-cell")).toHaveCount(count);
  }
  await page.locator("[data-pa=new-schedule]").click();
  await page.locator("#pa-edit-form [name=title]").fill("跨日原生验证");
  await page.locator("#pa-edit-form [name=start]").fill("2026-10-24T23:30");
  await page.locator("#pa-edit-form [name=end]").fill("2026-10-25T00:30");
  await submit(page, "#pa-edit-form");
  await expect(page.locator(".pa-create-dialog")).toHaveCount(0);
  await page.locator("[data-pa=calendar-mode][data-id=day]").click();
  await expect(page.locator("#pa-list")).toContainText("跨日原生验证");
  await page.locator("#pa-calendar-date").fill("2026-10-25");
  await expect(page.locator("#pa-list")).toContainText("跨日原生验证");
  await page.locator(".pa-calendar-edit").first().click();
  await page.locator("#ap-edit-form [name=title]").fill("尚未保存的安排");
  await page.keyboard.press("Escape");
  await expect(page.locator(".ap-guard")).toBeVisible();
  await page.locator("[data-ap=continue]").click();
  await expect(page.locator("#ap-edit-form [name=title]")).toHaveValue(
    "尚未保存的安排",
  );
  await submit(page, "#ap-edit-form");
  await page
    .locator(".pa-list-row")
    .filter({ hasText: "尚未保存的安排" })
    .click();
  await expect(page.locator(".pa-detail-grid")).toBeVisible();
  await page.locator("[data-pa=edit]").click();
  await page.locator("#pa-edit-form [name=title]").fill("已保存的安排");
  await submit(page, "#pa-edit-form");
  await expect(page.locator("#personal-actions h1")).toHaveText("已保存的安排");
  await page.locator("[data-pa=back]").click();
  for (const mode of ["day", "week", "month"]) {
    await page.locator(`[data-pa=calendar-mode][data-id=${mode}]`).click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page
        .locator("#personal-actions")
        .evaluate((e) => e.scrollWidth - e.clientWidth),
    ).toBeLessThan(3);
  }
});
test("reference calendar Agent: draft confirmation, source session and resize", async ({
  page,
}) => {
  await enter(page, "calendar");
  await page.locator("[data-pa=agent]").click();
  await page.locator("[data-pa=agent-summary]").click();
  await expect(page.locator("#pa-agent-result")).toContainText("根据当前视图");
  await page.locator("#pa-prompt").fill("明天 18:00 创建待办「核对原生实现」");
  await page.locator("#pa-prompt").press("Enter");
  await expect(page.locator("#pa-agent-form [name=end]")).toHaveCount(0);
  await page.locator("[data-pa=close-agent]").click();
  await expect(page.locator(".pa-dialog")).toContainText("保留这次修改");
  await page.locator(".pa-dialog [data-pa=modal-cancel]").last().click();
  await submit(page, "#pa-agent-form");
  await page.locator("#pa-agent [data-pa=open-created]").click();
  await expect(page.locator(".pa-origin")).toContainText("Agent 创建");
  await page.locator("[data-pa=source-session]").click();
  await expect(page.locator("#pa-agent-result")).toContainText("核对原生实现");
  const rail = page.locator("#pa-agent"),
    handle = rail.getByRole("separator");
  const before = (await rail.boundingBox())!.width;
  await handle.focus();
  await handle.press("ArrowLeft");
  expect((await rail.boundingBox())!.width).toBeGreaterThan(before);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .locator("#personal-actions")
      .evaluate((e) => e.scrollWidth - e.clientWidth),
  ).toBeLessThan(3);
});
test("reference thoughts: category counts, popup edits, filter-preserving detail return, guide", async ({
  page,
}) => {
  await enter(page, "thoughts");
  for (const type of ["schedule", "todo", "inspiration", "ledger", "other"]) {
    await page.locator(`[data-thought-category=${type}]`).click();
    const count = Number(
      await page.locator(`[data-thought-category=${type}] em`).textContent(),
    );
    await expect(page.locator("[data-thought-record]")).toHaveCount(
      Math.min(count, 40),
    );
  }
  await page.locator("[data-thought-category=todo]").click();
  const title = await page
    .locator(".th-row")
    .first()
    .locator("strong")
    .textContent();
  await page.locator("#thought-file-search").fill(title!);
  const check = page.locator(".th-row").first().getByRole("checkbox");
  const checked = await check.getAttribute("aria-checked");
  await check.click();
  await expect(check).toHaveAttribute(
    "aria-checked",
    checked === "true" ? "false" : "true",
  );
  await page.locator("[data-thought-record]").first().click();
  await expect(page.locator("#action-quick-dialog")).toContainText("截止时间");
  await page.locator("[data-ap=details]").click();
  await expect(page.locator("#personal-actions h1")).toHaveText(title!);
  await page.locator("[data-pa=back]").click();
  await expect(page.locator("#thought-file-search")).toHaveValue(title!);
  await page.locator("[data-thought-category=ledger]").click();
  await page.locator("[data-thought-record]").first().click();
  await page.locator("#thought-record-dialog [data-th=edit]").click();
  await page.locator("#th-edit-form [name=amount]").fill("63.50");
  await page.locator("#th-edit-form [name=detail]").fill("核对收支内容");
  await page.keyboard.press("Escape");
  await expect(page.locator(".th-guard")).toBeVisible();
  await page.locator("[data-th=continue]").click();
  await submit(page, "#th-edit-form");
  await expect(page.locator(".th-detail-money")).toContainText("63.50");
  await page.locator("#thought-record-dialog [data-th=close]").last().click();
  await page.locator("[data-th=new]").click();
  await expect(page.locator("#ws-dialog")).toContainText("绑定你的设备");
  await page.locator("#ws-dialog [data-ws-action=close-dialog]").click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(391);
});
test("native popup keeps draft on failed writes and concurrent updates", async ({
  page,
  context,
}) => {
  await enter(page, "thoughts");
  await page.locator(".th-row [data-th=edit]").first().click();
  await page.locator("#ap-edit-form [name=title]").fill("必须保留的输入");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "eureka:personal-actions:v1") throw Error("quota");
      original.call(this, k, v);
    };
  });
  await submit(page, "#ap-edit-form");
  await expect(page.locator("#action-quick-dialog .th-error")).toContainText(
    "保存失败",
  );
  const other = await context.newPage();
  await enter(other, "thoughts");
  await other.locator(".th-row [data-th=edit]").first().click();
  await other.locator("#ap-edit-form [name=title]").fill("另一窗口的新安排");
  await submit(other, "#ap-edit-form");
  await expect(page.locator("#action-quick-dialog .th-error")).toContainText(
    "另一页面已更新",
  );
  await expect(page.locator("#ap-edit-form [name=title]")).toHaveValue(
    "必须保留的输入",
  );
});
