import { test, expect, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import type { WorkspaceState } from "../../src/features/spaces/model/types";
const go = (p: Page, view: string, actor = "zhang", space = "team-eureka", id = "") => p.goto(`/workbench/?view=${view}&space=${space}&actor=${actor}&id=${id}`);
const raw = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem("eureka:workspaces:v2")!) as WorkspaceState);
const seed = (p: Page, s = M.seed()) => p.addInitScript(s => { if (!localStorage.getItem("eureka:workspaces:v2")) localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s)); }, s);

test("owner confirms rebind; switching workspaces never changes binding and admin sees only own team's metadata", async ({ page }) => {
  const s = M.seed(), b = M.acceptInvite(s, "invite-growth"); await seed(page, s);
  await go(page, "my-devices");
  const row = page.locator("tr").filter({ hasText: "EK-N-20260018" });
  await row.getByRole("button", { name: "更换绑定工作区" }).click();
  await page.getByLabel("目标工作区").selectOption("team-eureka");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  expect((await raw(page)).devices[0].spaceId).toBe("personal");
  await row.getByRole("button", { name: "更换绑定工作区" }).click();
  await page.getByLabel("目标工作区").selectOption("team-eureka");
  await page.getByRole("button", { name: "确认解绑并绑定" }).click();
  await expect(row).toContainText("EurekaMind 产品团队");
  await go(page, "home", "zhang", b.id);
  expect((await raw(page)).devices[0].spaceId).toBe("team-eureka");
  await go(page, "devices"); await expect(row).toBeVisible();
  await expect(page.getByRole("button", { name: /解绑|更换绑定/ })).toHaveCount(0);
  await go(page, "my-devices");
  await row.getByRole("button", { name: "更换绑定工作区" }).click();
  await page.getByLabel("目标工作区").selectOption(b.id);
  await page.getByRole("button", { name: "确认解绑并绑定" }).click();
  await go(page, "devices"); await expect(row).toHaveCount(0);
});

test("member manages only their devices from account menu, without gaining team metadata access", async ({ page }) => {
  const s = M.seed(); M.registerDevice(s, "team-eureka", { serial: "KEVIN-001", model: "Note", user: "kevin" }, "kevin"); await seed(page, s);
  await go(page, "my-devices", "kevin");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("KEVIN-001");
  await page.getByRole("button", { name: "解绑", exact: true }).click();
  await page.getByRole("button", { name: "确认解绑" }).click();
  await expect(page.locator("tbody")).toContainText("未绑定工作区");
  await page.getByRole("button", { name: "绑定工作区", exact: true }).click();
  await page.getByLabel("目标工作区").selectOption("team-eureka");
  await page.getByRole("button", { name: "确认绑定", exact: true }).click();
  await go(page, "devices", "kevin");
  await expect(page.getByRole("heading", { name: "仅管理员可查看设备信息" })).toBeVisible();
});

test("future content permissions expose view/edit per member; editor can edit but cannot delete or reshare", async ({ page, context }) => {
  await seed(page); await go(page, "content-permissions");
  await page.getByRole("switch", { name: "会议信息共享给团队" }).click();
  await page.getByRole("checkbox", { name: /Kevin/ }).check();
  await page.getByLabel("Kevin的内容权限").selectOption("edit");
  await page.getByRole("checkbox", { name: /林晓/ }).check();
  await page.getByRole("button", { name: "保存授权" }).click();
  await expect(page.getByRole("region", { name: "我的内容权限" })).toContainText("Kevin（编辑）");
  await go(page, "home"); await page.getByRole("button", { name: "新建笔记", exact: true }).click();
  await page.getByLabel("标题", { exact: true }).fill("协作编辑验证");
  await page.getByLabel("内容", { exact: true }).fill("允许编辑的笔记");
  await page.getByRole("button", { name: "保存笔记" }).click();
  await expect(page.locator(".md-workspace")).toContainText("协作编辑验证");
  const file = M.get(await raw(page), "team-eureka").files.find(f => f.title === "协作编辑验证")!;
  expect(file.editors).toEqual(["kevin"]);
  const editor = await context.newPage(); await go(editor, "meeting", "kevin", "team-eureka", file.id);
  await expect(editor.locator('[data-md-action="edit"]')).toBeEnabled();
  await expect(editor.locator('[data-md-action="share"]')).toBeDisabled();
  await expect(editor.locator('[data-md-action="delete"]')).toBeDisabled();
  await editor.locator('[data-md-action="rename"]').click();
  await editor.locator("#md-rename").fill("成员已修改标题");
  await editor.getByRole("dialog").getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.locator(".md-title-button")).toContainText("成员已修改标题");
  await page.locator('[data-md-action="share"]').click();
  await page.getByLabel("Kevin的内容权限").selectOption("view");
  await page.getByRole("dialog").getByRole("button", { name: "保存访问权限", exact: true }).click();
  await expect(editor.locator('[data-md-action="edit"]')).toBeDisabled();
  await go(editor, "meeting", "lin", "team-eureka", file.id);
  await expect(editor.locator('[data-md-action="edit"]')).toBeDisabled();
});

test("team cannot expose personal thought creation or sharing", async ({ page }) => {
  await seed(page); await go(page, "thoughts", "kevin");
  await expect(page.getByRole("status")).toContainText("仅在个人工作区使用");
  await expect(page.getByRole("button", { name: "新建闪念" })).toHaveCount(0);
  await go(page, "content-permissions", "kevin");
  await expect(page.getByRole("switch")).toHaveCount(2);
  await expect(page.getByRole("switch", { name: "会议信息共享给团队" })).toBeVisible();
});

test("binding and permission dialogs remain usable at desktop, laptop and mobile widths", async ({ page }) => {
  await seed(page);
  for (const [width, height] of [[1440, 900], [1080, 680], [390, 844]]) {
    await page.setViewportSize({ width, height }); await go(page, "my-devices");
    await page.getByRole("button", { name: "更换绑定工作区" }).click();
    await expect(page.getByRole("dialog")).toBeInViewport();
    await page.screenshot({ path: `test-results/device-rebinding-${width}.png`, fullPage: true });
    await page.keyboard.press("Escape"); await go(page, "content-permissions");
    await page.getByRole("switch").first().click();
    await page.getByRole("checkbox", { name: /Kevin/ }).check();
    await page.getByLabel("Kevin的内容权限").selectOption("edit");
    await page.screenshot({ path: `test-results/content-edit-permission-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
  }
});
