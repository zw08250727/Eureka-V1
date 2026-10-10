import { test, expect } from "@playwright/test";
import { createContacts } from "../../src/features/personal/store";
import { ensureCustomerDetailDemo } from "../../src/features/personal/customer-detail-demo";
import { ensureTeamCustomerDemo } from "../../src/features/personal/team-customer-demo";
import { setCustomerTodoCompleted } from "../../src/features/personal/customer-todos";
import { createWorkspaceStore, M } from "../../src/features/spaces/model/store";

test("customer completion is scoped, idempotent and rechecks owner, workspace and evidence", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } } as Storage;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent() {} } });
  try {
    storage.setItem(M.KEY, JSON.stringify(M.seed()));
    ensureTeamCustomerDemo(storage, "team-eureka", "zhang");
    ensureCustomerDetailDemo(storage, "team-eureka", "zhang");
    const read = () => createContacts(storage, "zhang", "team-eureka").read().personal.contacts[0];
    const person = read(), meeting = person.interactions![0], todo = meeting.todos![0];
    const complete = (actor = "zhang") => setCustomerTodoCompleted(storage, actor, "team-eureka", "zhang", person.id, meeting.id, 0, todo, true);
    complete(); complete();
    expect(read().interactions![0].todos![0].completed).toBe(true);
    expect(read().interactions![0].todos![1].completed).toBeUndefined();
    expect(() => complete("kevin")).toThrow("仅所属成员");
    const repo = createWorkspaceStore(storage);
    repo.change(s => { M.get(s, "team-eureka").status = "expired"; });
    expect(() => complete()).toThrow();
    repo.change(s => { const w = M.get(s, "team-eureka"); w.status = "active"; w.files.find(f => f.id === meeting.id)!.summary = "已修改的会议"; });
    expect(() => complete()).toThrow("来源会议已变更");
  } finally { Reflect.deleteProperty(globalThis, "window"); }
});

test("customer todos strike through in place, persist and undo; compact details fit narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/workbench/?view=contacts&space=personal&id=solarhub-company");
  await page.getByRole("tab", { name: "承诺", exact: true }).click();
  const items = page.locator(".customer-todo-toggle");
  await expect(items).toHaveCount(6);
  const initial = await items.allTextContents();
  const first = items.first();
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await expect(first.locator(".customer-todo-title")).toHaveCSS("text-decoration-line", "line-through");
  expect((await items.allTextContents()).map(t => t.replace("✓", ""))).toEqual(initial);
  await page.screenshot({ path: "test-results/customer-todos-compact.png" });
  await page.reload();
  await page.getByRole("tab", { name: "承诺", exact: true }).click();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await first.press("Space");
  await expect(first).toHaveAttribute("aria-pressed", "false");
  await expect(first.locator(".customer-todo-title")).toHaveCSS("text-decoration-line", "none");
  await page.getByRole("tab", { name: "记忆", exact: true }).click();
  await page.screenshot({ path: "test-results/customer-profile-compact.png" });
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(page.locator(".customer-profile-grid section")).toHaveCount(7);
  expect(await page.locator(".contacts-content").evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});

test("overdue home todo stays at its position and struck through after completion and refresh", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-10T04:00:00Z") });
  await page.goto("/workbench/?space=personal");
  const todos = page.locator("[data-today-toggle]");
  await expect(todos.first()).toBeVisible();
  const order = await todos.evaluateAll(els => els.map(el => el.getAttribute("data-today-toggle")));
  const target = todos.filter({ hasText: "逾期" }).first();
  const id = await target.getAttribute("data-today-toggle");
  const item = page.locator(`[data-today-toggle="${id}"]`);
  await item.click();
  await expect(item).toHaveAttribute("aria-pressed", "true");
  await expect(item.locator("span").nth(1)).toHaveCSS("text-decoration-line", "line-through");
  expect(await todos.evaluateAll(els => els.map(el => el.getAttribute("data-today-toggle")))).toEqual(order);
  await page.reload();
  await expect(item).toHaveAttribute("aria-pressed", "true");
  await item.click();
  await expect(item).toHaveAttribute("aria-pressed", "false");
});

test("shared customers retain readonly completion controls", async ({ page }) => {
  await page.goto("/workbench/?view=contacts&space=team-eureka&actor=kevin");
  await page.getByLabel("筛选所属成员").selectOption("lin");
  await page.locator(".contacts-person-card").first().click();
  await page.getByRole("tab", { name: "承诺", exact: true }).click();
  await expect(page.locator(".customer-todo-toggle")).toHaveCount(6);
  await expect(page.locator(".customer-todo-toggle").first()).toBeDisabled();
});
