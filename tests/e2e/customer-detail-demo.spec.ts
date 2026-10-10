import { test, expect } from "@playwright/test";
import { ensureCustomerDetailDemo } from "../../src/features/personal/customer-detail-demo";
import { ensureTeamCustomerDemo } from "../../src/features/personal/team-customer-demo";
import { createContacts } from "../../src/features/personal/store";
import { createWorkspaceStore, M } from "../../src/features/spaces/model/store";

const memory = () => { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } } as Storage; };

test("detail demo is additive, scoped and idempotent, preserves edits and deleted sources, and rolls back on failure", () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent() {} } });
  try {
    const storage = memory(); storage.setItem(M.KEY, JSON.stringify(M.seed()));
    const legacy = createContacts(storage).read();
    legacy.personal.contacts = legacy.personal.contacts.filter(c => c.subjectType !== "enterprise");
    delete legacy.personal.customerDemoVersion;
    storage.setItem("baizhi-v14-contacts", JSON.stringify(legacy));
    ensureCustomerDetailDemo(storage, "personal", "zhang");
    const solar = createContacts(storage).read().personal.contacts.find(c => c.id === "solarhub-company")!;
    expect(solar.interactions).toHaveLength(3);
    expect(new Set(solar.interactions!.flatMap(i => Object.keys(i.profile!))).size).toBe(7);
    const fileId = solar.interactions![0].id;
    createWorkspaceStore(storage).change(s => { const f = M.get(s, "personal").files.find(f => f.id === fileId)!; f.deleted = true; f.summary = "用户自己的编辑"; });
    createContacts(storage).change(s => { s.personal.contacts.find(c => c.id === solar.id)!.summary = "修改后的客户简介"; });
    const before = [storage.getItem(M.KEY), storage.getItem("baizhi-v14-contacts")];
    ensureCustomerDetailDemo(storage, "personal", "zhang");
    expect([storage.getItem(M.KEY), storage.getItem("baizhi-v14-contacts")]).toEqual(before);
    ensureTeamCustomerDemo(storage, "team-eureka", "zhang");
    ensureCustomerDetailDemo(storage, "team-eureka", "zhang");
    const team = M.get(createWorkspaceStore(storage).read(), "team-eureka");
    expect(team.files.some(f => f.id === fileId)).toBe(false);
    const own = createContacts(storage, "zhang", team.id).read().personal.contacts[0];
    expect(M.getFile(team, own.interactions![0].id, "zhang").shared).toEqual([]);
    expect(() => M.getFile(team, own.interactions![0].id, "lin")).toThrow();
    const broken = memory(); broken.setItem(M.KEY, JSON.stringify(M.seed()));
    const write = broken.setItem; broken.setItem = (k, v) => { if (k === M.KEY) throw Error("quota"); write(k, v); };
    expect(() => ensureCustomerDetailDemo(broken, "personal", "zhang")).toThrow();
    expect(broken.getItem("baizhi-v14-contacts")).toBeNull();
  } finally { Reflect.deleteProperty(globalThis, "window"); }
});

test("SolarHub has complete followups, two-sided todos, seven profile dimensions and navigable evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const legacy = createContacts(memory()).read();
  legacy.personal.contacts = legacy.personal.contacts.filter(c => c.subjectType !== "enterprise");
  delete legacy.personal.customerDemoVersion;
  await page.addInitScript(value => {
    if (!localStorage.getItem("baizhi-v14-contacts")) localStorage.setItem("baizhi-v14-contacts", value);
  }, JSON.stringify(legacy));
  await page.goto("/workbench/?view=contacts&space=personal&id=solarhub-company");
  await expect(page.locator(".customer-meeting")).toHaveCount(3);
  await expect(page.locator(".contacts-profile")).not.toContainText("暂无已核实互动");
  await expect(page.locator(".customer-keywords")).toContainText("德国渠道");
  await page.getByRole("tab", { name: "承诺", exact: true }).click();
  await expect(page.locator(".contacts-line .customer-source")).toHaveCount(6);
  await page.getByRole("tab", { name: "记忆", exact: true }).click();
  await expect(page.locator(".customer-profile-grid section")).toHaveCount(7);
  await expect(page.locator(".customer-profile-grid")).not.toContainText("待补充");
  await expect(page.locator(".customer-profile-grid")).toContainText("3 万欧元");
  await page.screenshot({ path: "test-results/customer-profile-solarhub.png" });
  await page.locator(".customer-profile-grid .customer-source").first().click();
  await expect(page).toHaveURL(/view=meeting/);
  await expect(page.locator(".main")).toContainText("SolarHub GmbH · 需求访谈（演示）");
  await page.goto("/workbench/?view=contacts&space=personal&id=solarhub-company");
  await expect(page.locator(".customer-meeting")).toHaveCount(3);
});

test("shared example team customer has readable meeting-backed profile without importing personal records", async ({ page }) => {
  await page.goto("/workbench/?view=contacts&space=team-eureka&actor=zhang");
  await page.getByLabel("筛选所属成员").selectOption("lin");
  await page.locator(".contacts-person-card").first().click();
  await expect(page.locator(".customer-meeting")).toHaveCount(3);
  await page.getByRole("tab", { name: "记忆", exact: true }).click();
  await expect(page.locator(".customer-profile-grid")).not.toContainText("待补充");
  await expect(page.locator(".customer-profile-grid .customer-source")).toHaveCount(7);
  await page.locator(".customer-profile-grid .customer-source").first().click();
  await expect(page).toHaveURL(/space=team-eureka/);
  await expect(page.locator('[data-md-action="edit"]')).toBeDisabled();
});
