import { expect, test, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import type { WorkspaceState } from "../../src/features/spaces/model/types";
import { accountWithoutTeam } from "./fixtures/workspace-state";
const go = (page: Page, view: string, space = "personal", actor = "zhang") => page.goto(`/workbench/?view=${view}&space=${space}&actor=${actor}`);
const raw = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("eureka:workspaces:v2")!) as WorkspaceState);
async function seed(page: Page, state = M.seed()) {
  await page.addInitScript(s => { if (!sessionStorage.getItem("workspace-seeded")) { localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s)); sessionStorage.setItem("workspace-seeded", "1"); } }, state);
}

for (const status of ["active", "expired", "cancelled"] as const) {
  test(`ACCOUNT-01: ${status} membership blocks second-team invitation and direct creation`, async ({ page }) => {
    const state = M.seed(); M.get(state, "team-eureka").status = status;
    await seed(page, state);
    await go(page, "invitations");
    await expect(page.getByRole("button", { name: "接受并进入" })).toBeDisabled();
    const before = await raw(page);
    await page.keyboard.press("Escape");
    await page.locator("#ws-switcher").click();
    await expect(page.locator("#ws-menu .ws-menu-space")).toHaveCount(2);
    await expect(page.locator("#ws-menu")).not.toContainText("增长研究小组");
    await expect(page.getByRole("button", { name: "创建团队工作空间", exact: true })).toBeDisabled();
    await go(page, "create-team");
    await page.getByRole("button", { name: "创建团队", exact: true }).click();
    await page.getByLabel("工作空间名称").fill("不应创建的第二团队");
    await page.getByRole("button", { name: "确认订单", exact: true }).click();
    await expect(page.locator("#ws-dialog .ws-form-error")).toContainText("最多只能");
    const after = await raw(page);
    expect(M.accountTeams(after).map(w => w.id)).toEqual(["team-eureka"]);
    expect(after.orders).toEqual(before.orders);
    expect(after.invitations).toEqual(before.invitations);
    expect(M.get(after, "personal").credits).toEqual(M.get(before, "personal").credits);
    await page.reload();
    expect(M.accountTeams(await raw(page))).toHaveLength(1);
  });
}

test("ACCOUNT-01 / RIGHTS-01: a no-team account accepts its first invitation and cannot create another", async ({ page }) => {
  const state = accountWithoutTeam(), personal = structuredClone(M.get(state, "personal"));
  await seed(page, state);
  await go(page, "invitations");
  await expect(page.getByRole("button", { name: "接受并进入" })).toBeEnabled();
  await page.getByRole("button", { name: "接受并进入" }).click();
  await expect(page.locator("#ws-switcher")).toContainText("增长研究小组");
  const joined = await raw(page), team = M.accountTeam(joined)!;
  expect(M.accountTeams(joined)).toHaveLength(1);
  expect(joined.invitations[0].status).toBe("accepted");
  expect(M.get(joined, "personal").credits).toEqual(personal.credits);
  expect(M.get(joined, "personal").entitlementFreeze).toBeUndefined();
  await page.locator("#ws-switcher").click();
  await expect(page.locator("#ws-menu .ws-menu-space")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "创建团队工作空间", exact: true })).toBeDisabled();
  await page.locator("#ws-menu").getByRole("button", { name: /个人工作空间/ }).click();
  await expect(page).toHaveURL(/space=personal/);
  await go(page, "subscription", team.id);
  await expect(page.locator("#ws-view")).toContainText("当前工作区的权益由管理员付费开通和管理");
  await page.reload();
  expect(M.accountTeams(await raw(page)).map(w => w.id)).toEqual([team.id]);
});

test("RIGHTS-01: personal subscription and recording remain usable with one team", async ({ page }) => {
  const state = M.seed(); M.consumeMinutes(M.get(state, "personal"), "previous-personal-recording", 12);
  await seed(page, state);
  await go(page, "subscription");
  await expect(page.locator("#ws-view")).not.toContainText("冻结");
  await expect(page.locator('[data-ws-action="personal-buy"]')).toBeEnabled();
  await page.locator('[data-ws-action="personal-buy"]').click();
  await expect(page.locator("#ws-dialog")).toBeVisible();
  await go(page, "recording");
  const before = await raw(page);
  await page.getByRole("button", { name: "结束录音", exact: true }).click();
  await expect(page.getByText("录音已结束，转写内容已保存", { exact: true })).toBeVisible();
  const after = await raw(page), used = M.get(after, "personal").transcriptionUsage!.used;
  expect(used).toBe(12);
  expect(M.get(after, "team-eureka").credits).toEqual(M.get(before, "team-eureka").credits);
  expect(M.get(after, "team-eureka").transcriptionUsage).toEqual(M.get(before, "team-eureka").transcriptionUsage);
  await go(page, "subscription", "team-eureka");
  await go(page, "subscription");
  await expect(page.locator(".ps-account progress")).toHaveAttribute("value", String(400 - used));
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("SPACE-01: team recording and Agent consume only the sole team's pool across view switches", async ({ page }) => {
  await seed(page);
  await go(page, "recording", "team-eureka");
  const before = await raw(page);
  await page.getByRole("button", { name: "结束录音", exact: true }).click();
  await expect(page.getByText("录音已结束，转写内容已保存", { exact: true })).toBeVisible();
  let state = await raw(page);
  expect(M.get(state, "team-eureka").transcriptionUsage?.used).toBeGreaterThan(0);
  await go(page, "home", "team-eureka");
  await page.getByRole("button", { name: "Ask Agent", exact: true }).click();
  await page.getByLabel("向团队 Agent 提问").fill("总结当前会议");
  await page.getByRole("button", { name: "发送问题", exact: true }).click();
  await expect.poll(async () => M.get(await raw(page), "team-eureka").credits.used).toBeGreaterThan(M.get(before, "team-eureka").credits.used);
  state = await raw(page);
  expect(M.get(state, "personal").credits).toEqual(M.get(before, "personal").credits);
  expect(M.get(state, "personal").transcriptionUsage).toEqual(M.get(before, "personal").transcriptionUsage);
  await go(page, "subscription");
  await go(page, "subscription", "team-eureka");
  await expect(page.locator("#ws-view")).toContainText(`本工作区累计转写：${M.get(state, "team-eureka").transcriptionUsage?.used} 分钟`);
  expect(M.accountTeams(await raw(page))).toHaveLength(1);
});

test("REMOVE-01 / RIGHTS-01: removal revokes the only team while preserving personal content and benefits", async ({ page }) => {
  await seed(page);
  await go(page, "members", "team-eureka", "lin");
  const before = structuredClone(M.get(await raw(page), "personal"));
  await page.locator('[data-ws-action="member-remove"][data-value="zhang"]').click();
  await page.locator("#ws-dialog").getByRole("button", { name: "确认", exact: true }).click();
  await go(page, "subscription");
  await expect(page.locator("#ws-view")).not.toContainText("冻结");
  const state = await raw(page);
  expect(M.accountTeams(state)).toHaveLength(0);
  expect(M.get(state, "personal")).toEqual(before);
  expect(M.member(M.get(state, "team-eureka"), "zhang")).toBeFalsy();
  await page.locator("#ws-switcher").click();
  await expect(page.locator("#ws-menu .ws-menu-space")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "创建团队工作空间", exact: true })).toBeEnabled();
});
