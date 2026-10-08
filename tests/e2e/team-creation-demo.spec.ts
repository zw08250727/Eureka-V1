import { expect, test, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import { creationDemoSeed, CREATION_DEMO_KEY, CREATION_DEMO_DRAFT } from "../../src/features/spaces/creation-demo";

const ORIGINAL_DRAFT = "eureka:team-setup:v1";
const toggle = (page: Page) => page.getByRole("combobox", { name: "评审视角", exact: true });

test("creation demo starts without membership and keeps personal device ownership valid", () => {
  const state = creationDemoSeed();
  expect(M.accountTeam(state)).toBeUndefined();
  expect(state.spaces.map((w) => w.id)).toEqual(["personal"]);
  expect(state.orders).toEqual([]);
  expect(state.devices.every((d) => d.spaceId === "personal")).toBe(true);
});

test("existing team account can demo checkout, recovery, invitation, restart and return without changing original data", async ({ page }) => {
  const original = M.seed();
  await page.addInitScript(({ original, key, draft }) => {
    if (!sessionStorage.getItem("creation-demo-seeded")) {
      localStorage.setItem(key, JSON.stringify(original));
      localStorage.setItem(draft, "original draft must remain untouched");
      sessionStorage.setItem("creation-demo-seeded", "1");
    }
  }, { original, key: M.KEY, draft: ORIGINAL_DRAFT });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/workbench/?view=members&space=team-eureka");
  const originalRaw = await page.evaluate((key) => localStorage.getItem(key), M.KEY);
  await toggle(page).selectOption("creation-demo");
  await expect(page).toHaveURL(/demo=create-team/);
  await expect(page.getByRole("dialog", { name: "EurekaMind Team", exact: true })).toBeVisible();
  if (process.env.PRD_CAPTURE) await page.screenshot({ path: "src/prototype/prd/images/team-creation-demo.png", animations: "disabled" });
  await page.getByRole("button", { name: "创建团队", exact: true }).click();
  await page.locator('#ws-dialog [name="name"]').fill("评审创建的新团队");
  await page.getByRole("button", { name: "确认订单", exact: true }).click();
  await page.getByRole("button", { name: "模拟支付失败", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("模拟支付失败");
  await page.reload();
  await expect(page.getByRole("dialog", { name: "确认团队订单", exact: true })).toContainText("评审创建的新团队");
  await page.getByRole("button", { name: "模拟支付并开通", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("团队已准备好");
  await page.getByRole("button", { name: "邀请伙伴", exact: true }).click();
  await page.locator('#ws-dialog [name="emails"]').fill("review@example.com");
  await page.getByRole("button", { name: "发送模拟邀请", exact: true }).click();
  await page.locator(".sidebar").getByRole("button", { name: "团队成员", exact: true }).click();
  await expect(page.locator("#ws-view")).toContainText("review@example.com");
  await expect(toggle(page)).toHaveValue("creation-demo");
  await expect(page.locator("#ws-switcher")).toContainText("评审创建的新团队");
  await page.reload();
  await expect(page.locator("#ws-view")).toContainText("review@example.com");
  await page.locator("#ws-switcher").click();
  await page.getByRole("button", { name: "创建团队工作空间", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "不能再创建" })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), M.KEY)).toBe(originalRaw);
  expect(await page.evaluate((key) => localStorage.getItem(key), ORIGINAL_DRAFT)).toBe("original draft must remain untouched");
  await page.getByRole("button", { name: "重新体验", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "EurekaMind Team", exact: true })).toBeVisible();
  const demo = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CREATION_DEMO_KEY);
  expect(demo.spaces).toHaveLength(1);
  expect(demo.orders).toHaveLength(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), CREATION_DEMO_DRAFT)).toBeNull();
  await page.getByRole("button", { name: "创建团队", exact: true }).waitFor();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page).toHaveURL(/view=home/);
  await expect(page.getByRole("heading", { name: "创建团队演示", exact: true })).toBeVisible();
  await toggle(page).selectOption("exit-demo");
  await expect(page).toHaveURL(/view=members&space=team-eureka/);
  await expect(page).not.toHaveURL(/demo=/);
  await expect(page.locator("#ws-switcher")).toContainText("EurekaMind 产品团队");
  expect(await page.evaluate((key) => localStorage.getItem(key), M.KEY)).toBe(originalRaw);
});

test("direct demo links support cancellation, joining and safe personal-page boundaries", async ({ page }) => {
  await page.goto("/workbench/?view=create-team&space=personal&demo=create-team");
  await expect(page.getByRole("dialog", { name: "EurekaMind Team", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "创建团队", exact: true }).waitFor();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page).toHaveURL(/view=home/);
  await page.getByRole("button", { name: "体验接受邀请", exact: true }).click();
  await page.getByRole("button", { name: "接受并进入", exact: true }).click();
  await expect(page.locator("#ws-switcher")).toContainText("增长研究小组");
  await expect(page).toHaveURL(/demo=create-team/);
  await page.goto("/workbench/?view=contacts&space=personal&demo=create-team");
  await expect(page.getByRole("heading", { name: "创建团队演示", exact: true })).toBeVisible();
  await expect(page.locator("#contacts-root")).toHaveCount(0);
  await toggle(page).selectOption("exit-demo");
  await expect(page).not.toHaveURL(/demo=/);
  await expect(page.locator("#recent-meeting-title")).toBeVisible();
});
