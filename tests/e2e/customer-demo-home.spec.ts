import { test, expect } from "@playwright/test";
import { demoWeek } from "../../src/features/workbench/model/demo-week";
import M from "../../src/features/spaces/model/core";
import { ensureTeamCustomerDemo } from "../../src/features/personal/team-customer-demo";
import { createContacts } from "../../src/features/personal/store";
const memory = () => { const values = new Map<string, string>(); return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } } as Storage; };
test("demo migration is scoped, preserves choices and edits, and never recreates deleted examples", () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent() {} } });
  try {
    const storage = memory(), state = M.seed(), growth = M.acceptInvite(state, "invite-growth");
    growth.customerSharing = { wang: false };
    storage.setItem(M.KEY, JSON.stringify(state));
    ensureTeamCustomerDemo(storage, growth.id, "zhang");
    expect(createContacts(storage, "zhang", growth.id).readVisible().personal.contacts).toHaveLength(3);
    expect(createContacts(storage, "wang", growth.id).readVisible().personal.contacts).toHaveLength(3);
    expect(JSON.parse(storage.getItem(M.KEY)!).spaces.find((w: { id: string }) => w.id === growth.id).customerSharing.wang).toBe(false);
    const contacts = createContacts(storage, "zhang", growth.id);
    contacts.change(s => { s.personal.contacts = []; });
    const before = storage.getItem("baizhi-v14-contacts");
    ensureTeamCustomerDemo(storage, growth.id, "zhang");
    expect(storage.getItem("baizhi-v14-contacts")).toBe(before);
    const own = M.create(state, { name: "真实新团队", country: "中国", cycle: "month", seats: 2, orderId: "demo-check" });
    storage.setItem(M.KEY, JSON.stringify(state));
    ensureTeamCustomerDemo(storage, own.id, "zhang");
    expect(storage.getItem("baizhi-v14-contacts")).toBe(before);
  } finally { Reflect.deleteProperty(globalThis, "window"); }
});

test("existing customer data remains private and failed initialization rolls back", () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent() {} } });
  try {
    const storage = memory(), state = M.seed(); storage.setItem(M.KEY, JSON.stringify(state));
    const existing = JSON.stringify({ "workspace:team-eureka:account:zhang": { contacts: [{ id: "real", name: "已有客户" }], notes: {}, tasks: [] } });
    storage.setItem("baizhi-v14-contacts", existing);
    ensureTeamCustomerDemo(storage, "team-eureka", "zhang");
    expect(storage.getItem("baizhi-v14-contacts")).toBe(existing);
    expect(storage.getItem(M.KEY)).toBe(JSON.stringify(state));
    storage.removeItem("baizhi-v14-contacts");
    const set = storage.setItem; storage.setItem = (k, v) => { if (k === M.KEY) throw Error("quota"); set(k, v); };
    expect(() => ensureTeamCustomerDemo(storage, "team-eureka", "zhang")).toThrow();
    expect(storage.getItem("baizhi-v14-contacts")).toBeNull();
  } finally { Reflect.deleteProperty(globalThis, "window"); }
});

test("growth and product teams contain filterable shared examples without moving personal customers", async ({ page }) => {
  const state = M.seed(), growth = M.acceptInvite(state, "invite-growth");
  await page.addInitScript(state => { if (!localStorage.getItem("eureka:workspaces:v2")) localStorage.setItem("eureka:workspaces:v2", JSON.stringify(state)); }, state);
  await page.goto(`/workbench/?view=contacts&space=${growth.id}&actor=zhang`);
  await expect(page.locator(".contacts-person-card")).toHaveCount(6);
  await page.getByLabel("筛选所属成员").selectOption("wang");
  await expect(page.locator(".contacts-person-card")).toHaveCount(3);
  await page.getByLabel("筛选客户来源").selectOption("agent");
  await expect(page.locator(".contacts-person-card")).toHaveCount(1);
  await page.goto(`/workbench/?view=contacts&space=${growth.id}&actor=zhang`);
  await page.screenshot({ path: "test-results/growth-demo-customers.png", fullPage: true, animations: "disabled" });
  await page.goto("/workbench/?view=contacts&space=team-eureka");
  await expect(page.locator(".contacts-person-card")).toHaveCount(9);
  await page.goto("/workbench/?view=contacts&space=personal");
  await expect(page.locator(".contacts-person-card").filter({ hasText: "示例客户" })).toHaveCount(0);
});

test("homepage shows latest two inspirations and keeps modules compact with many records", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00+08:00"));
  await page.addInitScript(days => {
    if (!localStorage.getItem("eureka:thoughts:v1")) localStorage.setItem("eureka:thoughts:v1", JSON.stringify({ version: 1, demoWeekDays: days, records: Array.from({ length: 8 }, (_, i) => ({ id: `idea-${i}`, title: `灵感示例 ${i}`, type: "inspiration", date: "2026-10-09", time: `09:0${i}`, detail: "完整灵感内容", source: "manual", revision: 1 })) }));
  }, demoWeek.map(day => day.date));
  for (const [width, height] of [[1440, 900], [1080, 680]]) {
    await page.setViewportSize({ width, height }); await page.goto("/workbench/");
    await expect(page.locator(".daily-idea")).toHaveCount(2);
    await expect(page.locator(".daily-idea").first()).toContainText("灵感示例 7");
    await expect(page.locator(".daily-inspiration header button")).toContainText("8 条");
    expect((await page.locator("#today-assets-grid").boundingBox())!.height).toBeLessThanOrEqual(200);
    await page.screenshot({ path: `test-results/compact-home-${width}.png`, fullPage: true, animations: "disabled" });
  }
  await page.locator(".daily-inspiration header button").click();
  await expect(page.locator("#thought-workspace")).toContainText("灵感示例 0");
});
