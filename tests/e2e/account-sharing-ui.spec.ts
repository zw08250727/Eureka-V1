import { expect, test, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
const rebind = (s: ReturnType<typeof M.seed>, wid: string) => { M.unbind(s, "dev-personal"); M.bind(s, "dev-personal", wid); };
import type { WorkspaceState } from "../../src/features/spaces/model/types";

test.use({ viewport: { width: 1440, height: 960 } });
const go = (page: Page, view: string, space = "team-eureka", actor = "zhang") => page.goto(`/workbench/?view=${view}&space=${space}&actor=${actor}`);
const raw = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("eureka:workspaces:v2")!) as WorkspaceState);
test("shared device history stays after admin removal; device binding remains personal", async ({ page }) => {
  const initial = M.seed(), w = M.get(initial, "team-eureka");
  rebind(initial, w.id);
  M.setDeviceSharing(initial, w.id, "zhang", "meetings", true, ["lin"]);
  M.sync(initial, "dev-personal", "zhang", { title: "移除前共享会议", sourceId: "before-removal" });
  M.syncThought(initial, "dev-personal", "zhang", { title: "移除前共享闪念", sourceId: "before-removal-thought" });
  await page.addInitScript(s => { if (!localStorage.getItem("eureka:workspaces:v2")) localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s)); }, initial);
  await go(page, "members", "team-eureka", "lin");
  await page.locator('[data-ws-action="member-remove"][data-value="zhang"]').click();
  await expect(page.locator("#ws-dialog")).toContainText("设备绑定原工作区的关系保留");
  await page.locator("#ws-dialog").getByRole("button", { name: "确认", exact: true }).click();
  await go(page, "home", "team-eureka", "lin");
  await expect(page.getByRole("button", { name: "移除前共享会议", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /移除前共享闪念/ })).toHaveCount(0);
  await go(page, "devices", "team-eureka", "lin");
  await expect(page.locator("tr").filter({ hasText: "EK-N-20260018" })).toHaveCount(1);
  await go(page, "devices", "personal");
  await expect(page.locator("tr").filter({ hasText: "EK-N-20260018" })).toBeVisible();
  expect((await raw(page)).devices.find(d => d.id === "dev-personal")?.bound).toBe(true);
});

async function add(page: Page, name: string, company: string, email = "verified.customer@example.com") {
  await page.locator('[data-contact-action="add"]').click();
  const form = page.locator('[data-contact-form="add"]');
  await form.locator('[name="name"]').fill(name);
  await form.locator('[name="company"]').fill(company);
  await form.locator('[name="email"]').fill(email);
  await form.locator('[name="verifiedEmail"]').check();
  await form.getByRole("button", { name: "添加客户", exact: true }).click();
  await expect(form).toHaveCount(0);
}
test("manual entry and CRM import retain CRM precedence without exposing source or export panels", async ({ page }) => {
  await go(page, "contacts", "personal");
  await expect(page.locator(".contacts-person-card")).toHaveCount(8);
  await add(page, "John 的手动姓名", "手动公司", "john@abc-energy.example");
  await expect(page.locator(".contacts-person-card")).toHaveCount(8);
  const card = page.locator(".contacts-person-card").filter({ hasText: "John Chen" });
  await expect(card).toContainText("ABC Energy");
  await card.click();
  await expect(page.locator(".contacts-main")).not.toContainText("来源冲突（保留候选）");
  await expect(page.locator('[data-contact-action="export-crm"]')).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("baizhi-v14-contacts")!).personal.contacts.find((p: {id:string}) => p.id === "john"));
  expect(saved.sourceConflicts.some((c: {value:string}) => c.value === "手动公司")).toBe(true);
  await page.reload(); await card.click();
  await expect(page.locator(".contacts-facts")).toContainText("ABC Energy");
});

test("workspace private notes, personal-only thoughts and customer sharing switches", async ({ page, context }) => {
  await go(page, "home");
  await page.getByRole("button", { name: "新建笔记", exact: true }).click();
  await page.getByLabel("标题", { exact: true }).fill("不公开的产品笔记");
  await page.getByLabel("内容", { exact: true }).fill("只允许邀请的人看见");
  await page.getByRole("button", { name: "保存笔记" }).click();
  await expect(page.locator(".md-workspace")).toContainText("不公开的产品笔记");
  const state = await raw(page), note = M.get(state, "team-eureka").files.find(f => f.title === "不公开的产品笔记")!;
  expect(note.shared).toEqual([]);
  const other = await context.newPage();
  await go(other, "home", "team-eureka", "lin");
  await expect(other.getByRole("button", { name: "不公开的产品笔记", exact: true })).toHaveCount(0);
  await page.locator('[data-md-action="share"]').click();
  await page.getByRole("checkbox", { name: /林晓/ }).check();
  await page.getByRole("button", { name: "保存访问权限" }).click();
  await other.reload();
  await expect(other.getByRole("button", { name: "不公开的产品笔记", exact: true })).toBeVisible();
  await other.getByRole("button", { name: "不公开的产品笔记", exact: true }).click();
  await expect(other.locator('[data-md-action="share"]')).toBeDisabled();
  await expect(other.locator(".md-workspace")).toContainText("只允许邀请的人看见");
  await page.locator('[data-md-action="share"]').click();
  await page.getByRole("checkbox", { name: /林晓/ }).uncheck();
  await page.getByRole("button", { name: "保存访问权限" }).click();
  await expect(other.locator(".md-workspace").getByRole("alert")).toBeVisible();
  await expect(other.locator(".md-workspace")).not.toContainText("只允许邀请的人看见");
  await go(page, "thoughts");
  await expect(page.getByRole("status")).toContainText("仅在个人工作区使用");
  await go(page, "contacts");
  await expect(page.locator(".contacts-person-card")).toHaveCount(0);
  await add(page, "团队私有客户", "团队客户公司");
  await page.locator(".contacts-person-card").filter({ hasText: "团队私有客户" }).click();
  await go(other, "contacts", "team-eureka", "lin");
  await expect(other.locator(".contacts-person-card")).toHaveCount(0);
  await go(page, "content-permissions");
  await page.getByRole("switch", { name: "我的客户共享给团队" }).click();
  await expect(other.locator(".contacts-person-card")).toHaveCount(1);
  await expect(other.locator(".contacts-person-card")).toContainText("所属成员：张伟");
  await page.getByRole("switch", { name: "我的客户共享给团队" }).click();
  await expect(other.locator(".contacts-person-card")).toHaveCount(0);
  await go(page, "contacts", "personal");
  await expect(page.locator(".contacts-person-card")).toHaveCount(8);
  await expect(page.getByText("团队私有客户", { exact: true })).toHaveCount(0);
});

test("content permissions reject missing recipients and preserve input on failed save", async ({ page }) => {
  await go(page, "content-permissions");
  await expect(page.getByRole("switch", { name: "会议信息共享给团队" })).not.toBeChecked();
  await page.getByRole("switch", { name: "会议信息共享给团队" }).click();
  await page.getByRole("button", { name: "保存授权" }).click();
  await expect(page.locator("#ws-dialog").getByRole("alert")).toContainText("请选择接收成员");
  await page.getByRole("checkbox", { name: /林晓/ }).check();
  await page.evaluate(() => { const old = Storage.prototype.setItem; Storage.prototype.setItem = function (k,v) { if (k === "eureka:workspaces:v2") throw Error("quota"); old.call(this,k,v); }; });
  await page.getByRole("button", { name: "保存授权" }).click();
  await expect(page.locator("#ws-dialog").getByRole("alert")).toContainText("保存失败");
  await expect(page.getByRole("checkbox", { name: /林晓/ })).toBeChecked();
  await expect(page.getByRole("switch", { name: "会议信息共享给团队" })).not.toBeChecked();
});

test("sharing settings and invitations remain usable on desktop, laptop and mobile", async ({ page }) => {
  await go(page, "content-permissions");
  for (const [width, height] of [[1440, 900], [1080, 680], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByRole("switch", { name: "会议信息共享给团队" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/private-settings-${width}.png`, fullPage: true });
    await page.getByRole("switch", { name: "会议信息共享给团队" }).click();
    await expect(page.locator("#ws-dialog")).toBeVisible();
    await page.screenshot({ path: `test-results/private-invitation-${width}.png` });
    await page.getByRole("button", { name: "取消", exact: true }).click();
  }
});

test("team uploads are private and never leak titles through admin activity or credits", async ({ page, context }) => {
  await go(page, "home", "team-eureka", "kevin");
  await page.getByRole("button", { name: "上传", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("遵循本人内容权限");
  await page.getByLabel("选择音频文件").setInputFiles({ name: "保密上传客户方案.wav", mimeType: "audio/wav", buffer: Buffer.from("local demo") });
  await dialog.getByRole("button", { name: "上传", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "保密上传客户方案", exact: true })).toBeVisible();
  const state = await raw(page), team = M.get(state, "team-eureka");
  expect(team.files.find(f => f.title === "保密上传客户方案")?.shared).toEqual([]);
  expect(team.audit.some(a => a.action.includes("保密上传客户方案"))).toBe(false);
  M.settleCredits(team, "private-usage", "私有客户秘密提问", { inputTokens: 10, outputTokens: 10 }, "kevin");
  await page.evaluate(s => localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s)), state);
  const admin = await context.newPage();
  await go(admin, "home");
  await expect(admin.getByText("保密上传客户方案", { exact: true })).toHaveCount(0);
  await go(admin, "audit");
  await expect(admin.locator("#ws-view")).not.toContainText("保密上传客户方案");
  await go(admin, "credits");
  await expect(admin.locator("#ws-view")).not.toContainText("私有客户秘密提问");
  await expect(admin.locator("#ws-view")).toContainText("成员 Agent 用量（内容私有）");
});
