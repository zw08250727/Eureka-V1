import { test, expect } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
test.use({ viewport: { width: 1440, height: 900 } });
test("sharing lives on contact cards and details; settings have no content sharing tab", async ({ page }) => {
  await page.goto("/workbench/?view=content-permissions&space=team-eureka");
  await expect(page.getByRole("navigation", { name: "空间设置" })).toBeVisible();
  await expect(page.getByRole("button", { name: "内容权限", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "内容权限", exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/team-basic-settings.png" });
  await page.getByRole("button", { name: "通讯录", exact: true }).first().click();
  await page.getByRole("button", { name: /添加联系人/ }).click();
  await page.getByRole("button", { name: "手机通讯录导入", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("尚未读取真实手机通讯录");
  await page.screenshot({ path: "test-results/phone-contact-import.png" });
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  const card = page.locator(".contact-list-item").filter({ hasText: "手机通讯录导入" });
  await expect(card).toHaveCount(1);
  await expect(page.locator(".contacts-toast")).toHaveCount(0);
  await page.screenshot({ path: "test-results/contact-list-team-share.png" });
  await card.getByRole("button", { name: "共享", exact: true }).click();
  await expect(page.getByRole("heading", { name: "联系人详情", exact: true })).toHaveCount(0);
  const share = page.getByRole("dialog");
  await expect(share).toContainText("可编辑 + 管理（默认）");
  await share.getByLabel("Kevin", { exact: true }).check();
  await share.getByRole("button", { name: "保存授权", exact: true }).click();
  await card.locator(".contacts-person-card").click();
  await page.getByRole("button", { name: "团队共享", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Kevin", { exact: true })).toBeChecked();
  await page.getByRole("dialog").getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("combobox", { name: "评审视角" }).selectOption("member");
  await expect(page).toHaveURL(/actor=kevin/);
  await page.getByRole("button", { name: "通讯录", exact: true }).first().click();
  await expect(page.locator('.contacts-person-card').filter({ hasText: "手机通讯录导入" })).toHaveCount(1);
  await page.locator('.contacts-person-card').filter({ hasText: "手机通讯录导入" }).click();
  await expect(page.getByRole("button", { name: "编辑资料", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "团队共享", exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/contact-shared-readonly.png" });
});

test("admin can edit a colleague's unshared meeting and remove member with explicit handover", async ({ page }) => {
  await page.goto("/workbench/?view=meeting&space=team-eureka&id=team-private");
  await expect(page.locator('body')).toContainText("林晓的个人绩效沟通");
  await page.goto("/workbench/?view=members&space=team-eureka");
  await page.getByRole("row").filter({ hasText: "lin.xiao@eureka.example" }).getByRole("button", { name: "移除", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("全部资料移交"); await expect(dialog).toContainText("清空硬件文件");
  await page.screenshot({ path: "test-results/member-removal-handover.png" });
  await dialog.getByRole("button", { name: "确认", exact: true }).click();
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), M.KEY);
  expect(state.devices.find((d: { id: string }) => d.id === "dev-team").bound).toBe(false);
  expect(state.spaces.find((w: { id: string }) => w.id === "team-eureka").files.find((f: { id: string }) => f.id === "team-private").owner).toBe("zhang");
});


test("meeting list and detail share team readers independently of external sharing", async ({ page }) => {
  await page.goto("/workbench/?space=team-eureka");
  const row = page.getByRole("row").filter({ hasText: "团队产品周会 · 十月路线图" });
  await expect(row).toBeVisible();
  await page.getByRole("heading", { name: "团队会议", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/meeting-list-team-share.png" });
  await row.getByRole("button", { name: "共享", exact: true }).click();
  await expect(page).not.toHaveURL(/view=meeting/);
  let dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("只读");
  await expect(dialog.getByLabel("林晓", { exact: true })).toBeDisabled();
  await dialog.getByLabel("Kevin", { exact: true }).check();
  await dialog.getByRole("button", { name: "保存授权", exact: true }).click();
  await row.getByRole("button", { name: "团队产品周会 · 十月路线图", exact: true }).click();
  await page.getByRole("button", { name: "团队共享", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Kevin", { exact: true })).toBeChecked();
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "分享", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("分享配置");
  await expect(dialog.getByLabel("分享类型")).toContainText("公开链接");
  await expect(dialog.getByRole("button", { name: "查看分享记录", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/meeting-external-share.png" });
  await dialog.getByRole("button", { name: "3天", exact: true }).click();
  await dialog.getByRole("button", { name: "预览分享内容", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("分享内容预览");
  let state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), M.KEY);
  expect(state.spaces.find((w: { id: string }) => w.id === "team-eureka").files.find((f: { id: string }) => f.id === "team-review").shared).toEqual(["kevin"]);
  await page.goto("/workbench/?view=meeting&space=team-eureka&id=team-review&actor=kevin");
  await expect(page.getByRole("button", { name: "分享", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "团队共享", exact: true })).toHaveCount(0);
  await page.goto("/workbench/?space=team-eureka&actor=zhang");
  await row.getByRole("button", { name: "共享", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Kevin", { exact: true }).uncheck();
  await page.getByRole("dialog").getByRole("button", { name: "保存授权", exact: true }).click();
  state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), M.KEY);
  expect(state.spaces.find((w: { id: string }) => w.id === "team-eureka").files.find((f: { id: string }) => f.id === "team-review").shared).toEqual([]);
  await page.reload();
  await row.getByRole("button", { name: "共享", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Kevin", { exact: true })).not.toBeChecked();
});


test("personal external sharing stays intact and expired teams cannot change grants", async ({ page }) => {
  await page.goto("/workbench/?space=personal");
  await expect(page.getByRole("button", { name: "团队共享", exact: true })).toHaveCount(0);
  await page.locator("#meeting-list .meeting-row").first().click();
  await page.getByRole("button", { name: "分享", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("分享类型")).toContainText("公开链接");
  await expect(page.getByRole("button", { name: "团队共享", exact: true })).toHaveCount(0);
  await page.goto("/workbench/?space=team-eureka");
  await expect(page.getByRole("heading", { name: "团队会议", exact: true })).toBeVisible();
  await page.evaluate(key => {
    const s = JSON.parse(localStorage.getItem(key)!);
    s.spaces.find((w: { id: string }) => w.id === "team-eureka").status = "expired";
    localStorage.setItem(key, JSON.stringify(s));
  }, M.KEY);
  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: "团队产品周会 · 十月路线图" }).getByRole("button", { name: "共享", exact: true })).toBeDisabled();
  await page.goto("/workbench/?view=space-settings&space=team-eureka&actor=kevin");
  await expect(page.getByRole("textbox", { name: "工作空间名称", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "内容权限", exact: true })).toHaveCount(0);
});


test("admins share only owned records; member filtering combines with search", async ({ page }) => {
  await page.goto("/workbench/?space=team-eureka");
  await page.getByRole("combobox", { name: "团队成员", exact: true }).selectOption("lin");
  const rows = page.locator(".ws-recording-table tbody tr");
  await expect(rows.first()).toBeVisible();
  await expect(rows.getByRole("button", { name: "共享", exact: true })).toHaveCount(0);
  await expect(rows.first().getByRole("button", { name: "删除", exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "搜索团队会议" }).fill("个人绩效");
  await expect(rows).toHaveCount(1);
  await rows.getByRole("button", { name: "林晓的个人绩效沟通", exact: true }).click();
  await expect(page.getByRole("button", { name: "团队共享", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "分享", exact: true })).toBeDisabled();
  await page.goto("/workbench/?space=team-eureka");
  await page.getByRole("combobox", { name: "团队成员", exact: true }).selectOption("zhang");
  await expect(rows.first().getByRole("button", { name: "共享", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/meeting-owner-filter.png" });
  await page.goto("/workbench/?view=contacts&space=team-eureka");
  await page.getByRole("combobox", { name: "筛选所属成员" }).selectOption("lin");
  const cards = page.locator(".contact-list-item");
  await expect(cards.first()).toBeVisible();
  await expect(cards.getByRole("button", { name: "共享", exact: true })).toHaveCount(0);
  await cards.first().locator(".contacts-person-card").click();
  await expect(page.getByRole("button", { name: "编辑资料", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "团队共享", exact: true })).toHaveCount(0);
});

test("device lists show SN only and have no sync or workspace switch entry", async ({ page }) => {
  for (const view of ["my-devices", "devices"]) {
    await page.goto(`/workbench/?view=${view}&space=team-eureka`);
    await expect(page.getByRole("columnheader")).toHaveText(["SN", "设备型号", "设备所有者", "绑定工作区", "操作"]);
    await expect(page.getByRole("button", { name: /更换绑定工作区|绑定工作区/ })).toHaveCount(0);
    await page.getByRole("button", { name: "查看信息", exact: true }).first().click();
    await expect(page.getByRole("dialog")).toContainText("设备名称");
    await expect(page.getByRole("dialog")).not.toContainText("最近同步");
    await page.getByRole("dialog").getByRole("button", { name: "关闭", exact: true }).click();
    await page.screenshot({ path: `test-results/${view}-sn-list.png` });
  }
});
