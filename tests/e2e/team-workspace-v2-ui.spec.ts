import { test, expect, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
const rebind = (s: ReturnType<typeof M.seed>, wid: string) => { M.unbind(s, "dev-personal"); M.bind(s, "dev-personal", wid); };
import type { WorkspaceState } from "../../src/features/spaces/model/types";
const go = (page: Page, view = "home", actor = "zhang", space = "team-eureka") => page.goto(`/workbench/?view=${view}&space=${space}&actor=${actor}`);
const raw = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("eureka:workspaces:v2")!) as WorkspaceState);
const seed = async (page: Page, s = M.seed()) => page.addInitScript(state => { if (!localStorage.getItem("eureka:workspaces:v2")) localStorage.setItem("eureka:workspaces:v2", JSON.stringify(state)); }, s);

test("common primary entries, admin-only device information and member content settings", async ({ page }) => {
  await seed(page); await go(page);
  const nav = page.locator(".sidebar-quick-nav");
  for (const name of ["首页", "开始录音", "团队客户"]) await expect(nav.getByRole("button", { name, exact: true })).toBeVisible();
  const teamNav = page.getByRole("navigation", { name: "团队工作区", exact: true });
  await expect(teamNav.getByRole("button", { name: "我的客户", exact: true })).toHaveCount(0);
  await expect(teamNav.getByRole("button", { name: "闪念", exact: true })).toHaveCount(0);
  await expect(teamNav.getByRole("button", { name: "设备查看", exact: true })).toBeVisible();
  await expect(teamNav.getByRole("link", { name: "开放API调用", exact: true })).toBeVisible();
  await teamNav.getByRole("button", { name: "设备查看", exact: true }).click();
  await expect(page.getByRole("heading", { name: "设备查看", exact: true })).toBeVisible();
  for (const name of [/模拟同步/, /模拟闪念同步/, /解绑/, /录入设备/, /绑定已有设备/]) await expect(page.getByRole("button", { name })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "当前可见闪念" })).toHaveCount(0);
  await expect(page.getByRole("switch")).toHaveCount(0);
  await page.getByRole("button", { name: "查看信息", exact: true }).first().click();
  await expect(page.getByRole("dialog")).toContainText("序列号");
  await page.keyboard.press("Escape");
  await go(page, "content-permissions", "kevin");
  await expect(teamNav.getByRole("button", { name: "设备查看", exact: true })).toHaveCount(0);
  await expect(teamNav.getByRole("button", { name: "空间设置", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "我的内容权限" })).toBeVisible();
  await expect(page.getByLabel("新设备内容保存到")).toHaveCount(0);
  await expect(page.getByLabel("共享设置所属团队")).toHaveCount(0);
  await go(page, "devices", "kevin");
  await expect(page.getByRole("heading", { name: "仅管理员可查看设备信息" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("content policies are scoped to owner and current workspace; upload and software recording use them", async ({ page }) => {
  const s = M.seed(), second = M.acceptInvite(s, "invite-growth").id;
  await seed(page, s); await go(page, "content-permissions");
  for (const name of ["会议信息共享给团队"]) {
    await page.getByRole("switch", { name }).click();
    await page.getByRole("checkbox", { name: /林晓/ }).check();
    await page.getByRole("button", { name: "保存授权", exact: true }).click();
    await expect(page.getByRole("switch", { name })).toBeChecked();
  }
  await go(page, "content-permissions", "kevin");
  await expect(page.getByRole("switch", { name: "会议信息共享给团队" })).not.toBeChecked();
  await go(page, "content-permissions", "zhang", second);
  await expect(page.getByRole("switch", { name: "会议信息共享给团队" })).not.toBeChecked();
  await go(page);
  await page.getByRole("button", { name: "上传", exact: true }).click();
  await page.getByLabel("选择音频文件").setInputFiles({ name: "来自软件的授权上传.wav", mimeType: "audio/wav", buffer: Buffer.from("demo") });
  await page.getByRole("dialog").getByRole("button", { name: "上传", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  let w = M.get(await raw(page), "team-eureka");
  expect(w.files.find(f => f.title === "来自软件的授权上传")?.shared).toEqual(["lin"]);
  await page.locator("#module-start-recording").click();
  await expect(page.locator("#record-permission-modal")).toBeVisible();
  await expect(page.getByRole("heading", { name: "新建网页录音" })).toHaveCount(0);
  await page.getByRole("button", { name: "开始授权", exact: true }).click();
  await expect(page).toHaveURL(/view=recording/);
  await page.getByRole("button", { name: "结束录音", exact: true }).click();
  await expect(page.getByText("录音已结束，转写内容已保存", { exact: true })).toBeVisible();
  w = M.get(await raw(page), "team-eureka");
  expect(w.files.find(f => f.title === "新录音 · 产品沟通")?.shared).toEqual(["lin"]);
  expect(M.get(await raw(page), second).files.some(f => f.title === "来自软件的授权上传")).toBe(false);
});

test("team offers private calendar and thought modules without a sharing switch", async ({ page }) => {
  await seed(page); await go(page);
  await expect(page.locator(".sidebar-quick-nav").getByRole("button", { name: "日程与待办", exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "我的闪念与安排" })).toBeVisible();
  await expect(page.getByRole("region", { name: "团队简报", exact: true })).toBeVisible();
  await go(page, "calendar");
  await expect(page.locator("#personal-actions h1")).toHaveText("日程与待办");
  await go(page, "thoughts");
  await expect(page.getByRole("heading", { name: "全部闪念", exact: true })).toBeVisible();
  await go(page, "content-permissions");
  await expect(page.getByRole("switch")).toHaveCount(2);
  await expect(page.getByRole("switch", { name: "闪念信息共享给团队" })).toHaveCount(0);
  await go(page, "home", "zhang", "personal");
  await expect(page.locator(".sidebar-quick-nav").getByRole("button", { name: "日程与待办", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "今日闪念概览", exact: true })).toBeVisible();
});

test("expired workspace is readable and searchable, mutation/AI disabled, devices stay bound and personal resumes", async ({ page }) => {
  const s = M.seed(), w = M.get(s, "team-eureka");
  w.files[0].summary = "可以检索这段已有转录中的核心验收词";
  rebind(s, w.id); w.status = "expired"; M.reconcileEntitlements(s);
  M.sync(s, "dev-personal", "zhang", { title: "到期后设备原始录音", sourceId: "expired-audio" });
  await seed(page, s); await go(page);
  await expect(page.locator(".ws-readonly")).toContainText("原始音频");
  await expect(page.locator("#module-start-recording")).toBeDisabled();
  await expect(page.getByRole("button", { name: "上传", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "新建笔记", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Ask Agent", exact: true })).toBeDisabled();
  await page.getByLabel("搜索团队会议").fill("核心验收词");
  await expect(page.locator(".ws-recording-table tbody tr")).toHaveCount(1);
  await page.getByLabel("搜索团队会议").fill("到期后设备原始录音");
  await page.getByRole("button", { name: "到期后设备原始录音", exact: true }).click();
  await expect(page.locator(".md-workspace")).toContainText("尚未转录或生成摘要");
  await expect(page.locator('[data-md-action="edit"]')).toBeDisabled();
  await go(page, "content-permissions");
  await expect(page.getByRole("switch").first()).toBeDisabled();
  await go(page, "home", "zhang", "personal");
  expect(M.get(await raw(page), "personal").entitlementFreeze).toBeUndefined();
  expect((await raw(page)).devices[0].bound).toBe(true);
  await page.locator("#start-recording").click();
  await expect(page.locator("#record-permission-modal")).toBeVisible();
});

test("new layout and permission settings fit desktop, laptop and phone", async ({ page }) => {
  await seed(page);
  for (const [width, height] of [[1440, 900], [1080, 680], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await go(page);
    await expect(page.getByRole("region", { name: "团队简报", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/team-workspace-home-${width}.png`, fullPage: true });
    await go(page, "content-permissions", "kevin");
    await page.getByRole("switch").first().click();
    await expect(page.getByRole("dialog")).toBeInViewport();
    await page.screenshot({ path: `test-results/team-content-permissions-${width}.png`, fullPage: true });
    await page.keyboard.press("Escape");
  }
});

test("compact team brief keeps source navigation and Agent evidence usable", async ({ page }) => {
  await seed(page);
  for (const width of [1440, 1080, 390]) {
    await page.setViewportSize({ width, height: 900 }); await go(page);
    await expect(page.getByRole("region", { name: "团队简报", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/team-overview-compact-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const evidence = page.locator(".team-insight-evidence").first();
  await page.getByRole("button", { name: "查看会议依据", exact: true }).first().click();
  await expect(evidence.getByRole("link").first()).toBeVisible();
  await evidence.getByRole("link").first().click(); await expect(page).toHaveURL(/view=meeting/);
  await go(page);
  await page.getByRole("button", { name: /问问 Agent：/ }).first().click();
  await expect(page.getByRole("complementary", { name: "Ask Agent", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/team-overview-agent.png", fullPage: true });
  await page.setViewportSize({ width: 1080, height: 900 });
  const overview = page.locator(".team-overview");
  expect(await overview.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect((await overview.locator("h1").boundingBox())!.height).toBeLessThan(40);
  expect((await overview.locator(".team-brief-column").boundingBox())!.width).toBeGreaterThan(280);
  await page.screenshot({ path: "test-results/team-overview-agent-1080.png", fullPage: true });
});
