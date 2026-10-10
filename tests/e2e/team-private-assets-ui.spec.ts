import { expect, test, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import { localDay } from "../../src/features/personal/asset-rules";

test.use({ timezoneId: "Asia/Shanghai", viewport: { width: 1440, height: 900 } });
const go = (page: Page, view = "home", actor = "zhang", space = "team-eureka", id = "") => page.goto(`/workbench/?view=${view}&space=${space}&actor=${actor}&id=${id}`);
async function seed(page: Page, expired = false) {
  const s = M.seed(), w = M.get(s, "team-eureka"), today = localDay();
  for (let i = 0; i < 3; i++) {
    const t = M.addThought(w, { title: `团队内私有灵感 ${i + 1}`, detail: "只属于本区本人的访谈想法" });
    t.date = today; t.time = `10:0${i}`;
  }
  const ledger = M.addThought(w, { title: "团队访谈交通费", detail: "本人记录的费用" });
  Object.assign(ledger, { type: "ledger", amount: 38, currency: "CNY", direction: "expense", date: today, time: "10:30" });
  if (expired) w.status = "expired";
  const record = { id: "private-todo", type: "todo", title: "准备本人访谈提纲", start: today + "T18:00", end: "", done: false, source: "manual", notes: "私有备注", reminder: "none", location: "", participants: "", created: new Date().toISOString(), updated: new Date().toISOString(), revision: 1, links: [] };
  await page.addInitScript(({ s, record }) => {
    if (localStorage.getItem("eureka:workspaces:v2")) return;
    localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s));
    localStorage.setItem("eureka:actions:team-eureka:zhang:v1", JSON.stringify({ version: 1, records: [record], meetings: [], sessions: [], settings: {} }));
  }, { s, record });
}

test("compact team overview integrates private assets; navigation and edits remain scoped", async ({ page }) => {
  await seed(page); await go(page);
  const privateArea = page.getByRole("complementary", { name: "我的闪念与安排" });
  await expect(privateArea).toContainText("仅自己可见");
  await expect(privateArea.locator(".team-private-idea")).toHaveCount(2);
  await expect(privateArea).toContainText("团队内私有灵感 3");
  await expect(privateArea).not.toContainText("团队内私有灵感 1");
  await expect(privateArea).toContainText("38.00");
  await expect(page.locator(".ws-team-brief")).not.toContainText("团队内私有灵感");
  await privateArea.getByRole("button", { name: "完成状态：准备本人访谈提纲" }).click();
  await expect(privateArea.getByRole("button", { name: "完成状态：准备本人访谈提纲" })).toHaveAttribute("aria-pressed", "true");
  expect((await page.locator(".team-overview-canvas").boundingBox())!.height).toBeLessThan(360);
  await page.screenshot({ path: "test-results/team-private-assets-desktop.png" });
  await privateArea.getByRole("link", { name: /团队内私有灵感 3/ }).click();
  await expect(page.getByRole("dialog")).toContainText("团队内私有灵感 3");
  await page.getByRole("dialog").getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("dialog").locator('[name="title"]').fill("仅本区的修改");
  await page.getByRole("dialog").locator('button[type="submit"]').click();
  await go(page, "thoughts", "lin", "team-eureka", "inspiration");
  await expect(page.locator("#thought-file-list")).not.toContainText("仅本区的修改");
  await go(page, "thoughts", "zhang", "personal", "inspiration");
  await expect(page.locator("#thought-file-list")).not.toContainText("仅本区的修改");
  await go(page, "calendar");
  await expect(page.locator('#pa-list')).toContainText("准备本人访谈提纲");
  await page.locator('[data-pa="new-schedule"]').click();
  await page.locator('#pa-edit-form [name="title"]').fill("团队区本人日程");
  await page.locator('#pa-edit-form button[type="submit"]').click();
  await expect(page.locator('#pa-list')).toContainText("团队区本人日程");
  await go(page, "calendar", "lin");
  await expect(page.locator('#pa-list')).not.toContainText("团队区本人日程");
  await go(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(privateArea).toBeVisible();
  expect(await page.locator(".team-overview").evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThan(2);
  await page.screenshot({ path: "test-results/team-private-assets-mobile.png", fullPage: true });
});

test("expired workspace keeps private assets readable and disables calendar, edit and todo mutations", async ({ page }) => {
  await seed(page, true); await go(page);
  await expect(page.getByRole("button", { name: "完成状态：准备本人访谈提纲" })).toBeDisabled();
  await page.getByRole("link", { name: /团队内私有灵感 3/ }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "编辑", exact: true })).toBeDisabled();
  await go(page, "calendar");
  await expect(page.locator('[data-pa="new-schedule"]')).toBeDisabled();
  await expect(page.locator('[data-pa="new-todo"]')).toBeDisabled();
  await expect(page.locator('#pa-list')).toContainText("准备本人访谈提纲");
});
