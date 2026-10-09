import { expect, test } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import { changeAsMember, memberPerspective } from "../../src/features/spaces/review-perspective";

function legacyDesignTeam() {
  const s = M.seed();
  const w = M.get(s, "team-eureka");
  w.id = "team-design";
  w.name = "设计共创空间";
  delete w.demoAdminVersion;
  w.members = w.members.filter((m) => ["lin", "zhang"].includes(m.id));
  w.members.find((m) => m.id === "zhang")!.role = "member";
  return s;
}

test("legacy demo role migration is additive, one-time and limited to built-in teams", () => {
  const s = legacyDesignTeam(), w = M.get(s, "team-design");
  const files = JSON.stringify(w.files), lin = JSON.stringify(M.member(w, "lin"));
  M.enrich(s);
  expect(M.admin(w, "zhang")).toBe(true);
  expect(JSON.stringify(w.files)).toBe(files);
  expect(JSON.stringify(M.member(w, "lin"))).toBe(lin);
  w.members.find((m) => m.id === "zhang")!.role = "member";
  M.enrich(s);
  expect(M.admin(w, "zhang")).toBe(false);
  const custom = legacyDesignTeam();
  M.get(custom, "team-design").id = "team-custom";
  M.enrich(custom);
  expect(M.admin(M.get(custom, "team-custom"), "zhang")).toBe(false);
});

test("member preview enforces business permissions and restores the stored admin role", () => {
  const s = M.seed(), w = M.get(s, "team-eureka");
  expect(M.admin(M.get(memberPerspective(s, w.id, "zhang"), w.id), "zhang")).toBe(false);
  expect(() => changeAsMember(s, w.id, "zhang", (state) => M.invite(M.get(state, w.id), "new@example.com", "member", "zhang"))).toThrow("仅管理员");
  expect(M.admin(w, "zhang")).toBe(true);
  changeAsMember(s, w.id, "zhang", (state) => M.edit(M.get(state, w.id), "team-review", { title: "成员可以编辑自己的会议" }, "zhang"));
  expect(w.files.find((f) => f.id === "team-review")!.title).toBe("成员可以编辑自己的会议");
  expect(M.admin(w, "zhang")).toBe(true);
});

test("legacy team defaults to admin and header preview survives navigation without changing data", async ({ page }) => {
  const s = legacyDesignTeam();
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("review-seeded")) {
      localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s));
      sessionStorage.setItem("review-seeded", "1");
    }
  }, s);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/workbench/?view=members&space=team-design");
  const toggle = page.getByRole("combobox", { name: "评审视角", exact: true });
  await expect(toggle).toHaveValue("admin");
  await expect(page.locator('#ws-view [data-ws-action="invite"]')).toBeVisible();
  await expect(page.locator("#ws-switcher")).toContainText("管理员");
  const original = await page.evaluate(() => localStorage.getItem("eureka:workspaces:v2"));
  if (process.env.PRD_CAPTURE) await page.screenshot({ path: "src/prototype/prd/images/review-admin.png" });
  await toggle.selectOption("member");
  await expect(toggle).toHaveValue("member");
  await expect(page.locator('#ws-view [data-ws-action="invite"]')).toHaveCount(0);
  await expect(page.locator("#ws-switcher")).toContainText("成员");
  if (process.env.PRD_CAPTURE) await page.screenshot({ path: "src/prototype/prd/images/review-member.png" });
  await page.reload();
  await expect(toggle).toHaveValue("member");
  await expect(page.locator(".sidebar").getByRole("button", { name: "设备查看", exact: true })).toHaveCount(0);
  await page.locator(".sidebar").getByRole("button", { name: "空间设置", exact: true }).click();
  await expect(toggle).toHaveValue("member");
  expect(await page.evaluate(() => localStorage.getItem("eureka:workspaces:v2"))).toBe(original);
  await toggle.selectOption("admin");
  await page.locator(".sidebar").getByRole("button", { name: "团队成员", exact: true }).click();
  await expect(page.locator('#ws-view [data-ws-action="invite"]')).toBeVisible();
  await page.goto("/workbench/?view=space-settings&space=team-design");
  await toggle.selectOption("member");
  await expect(page).toHaveURL(/view=home/);
  await page.locator("#ws-switcher").click();
  await page.locator("#ws-menu").getByRole("button", { name: /个人工作空间/ }).click();
  await expect(page).not.toHaveURL(/perspective=/);
  await expect(page.locator("#recent-meeting-title")).toBeVisible();
  await expect(toggle).toHaveValue("personal");
});

test("review switch fits narrow screens and cannot elevate actual member-only teams", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workbench/?view=members&space=team-eureka");
  const toggle = page.getByRole("combobox", { name: "评审视角", exact: true });
  await expect(toggle).toBeVisible();
  const box = await toggle.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await toggle.selectOption("member");
  await expect(toggle).toHaveValue("member");
  await page.evaluate(() => {
    const raw = localStorage.getItem("eureka:workspaces:v2");
    if (raw) localStorage.removeItem("eureka:workspaces:v2");
  });
  const s = M.seed();
  M.get(s, "team-eureka").members.find((m) => m.id === "zhang")!.role = "member";
  await page.evaluate((s) => localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s)), s);
  await page.reload();
  await expect(toggle).toHaveValue("member");
  await expect(toggle.locator('option[value="admin"]')).toHaveJSProperty("disabled", true);
});

test("personal pages expose global review entry and can enter both team perspectives", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const toggle = page.getByRole("combobox", { name: "评审视角", exact: true });
  for (const view of ["home", "thoughts", "calendar", "contacts", "settings", "devices"]) {
    await page.goto(`/workbench/?view=${view}`);
    await expect(toggle).toHaveValue("personal");
    await expect(toggle).toBeVisible();
  }
  await page.goto("/workbench/?view=thoughts");
  await expect(page.locator("#thought-workspace")).toBeVisible();
  if (process.env.PRD_CAPTURE) await page.screenshot({ path: "src/prototype/prd/images/review-personal.png", animations: "disabled" });
  await toggle.selectOption("admin");
  await expect(page).toHaveURL(/space=team-eureka/);
  await expect(toggle).toHaveValue("admin");
  await expect(page.locator(".sidebar").getByRole("button", { name: "空间设置", exact: true })).toBeVisible();
  await toggle.selectOption("personal");
  await expect(page).toHaveURL(/space=personal/);
  await expect(page.locator("#recent-meeting-title")).toBeVisible();
  await toggle.selectOption("member");
  await expect(toggle).toHaveValue("member");
  await expect(page.locator(".sidebar").getByRole("button", { name: "空间设置", exact: true })).toBeVisible();
  await toggle.selectOption("personal");
  await expect(page).not.toHaveURL(/perspective=/);
});

test("accounts without a team retain the review entry without creating a team", async ({ page }) => {
  const s = M.seed();
  s.spaces = s.spaces.filter((w) => w.type === "personal");
  await page.addInitScript((s) => localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s)), s);
  await page.goto("/workbench/?view=thoughts");
  const toggle = page.getByRole("combobox", { name: "评审视角", exact: true });
  await expect(toggle).toHaveValue("personal");
  await expect(toggle.locator('option[value="admin"]')).toHaveJSProperty("disabled", true);
  await expect(toggle.locator('option[value="member"]')).toHaveJSProperty("disabled", true);
});
