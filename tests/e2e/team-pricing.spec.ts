import { test, expect } from "@playwright/test";
import M from "../../src/features/spaces/model/core";

for (const cycle of ["month", "year"] as const) {
  test(`${cycle}: first subscription discount, regular renewal and USD seat invoices`, () => {
    const state = M.seed();
    const w = M.create(state, { name: "价格验证", country: "中国", cycle, seats: 2, orderId: `pricing-${cycle}` });
    expect(w.invoices[0]).toMatchObject({ currency: "USD", amount: cycle === "month" ? 56 : 480 });
    expect(M.create(state, { name: "价格验证", country: "中国", cycle, seats: 2, orderId: `pricing-${cycle}` }).id).toBe(w.id);
    expect(w.invoices).toHaveLength(1);
    M.advanceCycle(w);
    expect(w.invoices[0]).toMatchObject({ currency: "USD", amount: cycle === "month" ? 70 : 600 });
    const order = M.createSeatOrder(w, 3);
    expect(order).toMatchObject({ currency: "USD", amount: cycle === "month" ? 35 : 300 });
    M.paySeatOrder(w, order.id, "success");
    expect(w.invoices[0]).toMatchObject({ currency: "USD", amount: order.amount });
  });

  test(`${cycle}: plan, two-seat checkout and successful invoice match supplied prices`, async ({ page }) => {
    await page.goto("/workbench/?view=create-team&space=personal");
    const dialog = page.locator("#ws-dialog");
    await dialog.getByRole("button", { name: cycle === "month" ? "月付" : "年付", exact: true }).click();
    await expect(dialog.locator(".ws-price")).toContainText(cycle === "month" ? "$28.00" : "$20.00");
    await expect(dialog.locator(".ws-price s")).toHaveText(cycle === "month" ? "$35.00" : "$25.00");
    await page.screenshot({ path: `test-results/team-pricing-${cycle}.png` });
    await dialog.getByRole("button", { name: "创建团队", exact: true }).click();
    await dialog.locator("[name=name]").fill("截图价格验证");
    await dialog.locator("[name=seats]").fill("2");
    await dialog.getByRole("button", { name: "确认订单", exact: true }).click();
    const rows = dialog.locator(".ws-order");
    await expect(rows).toContainText("USD");
    await expect(rows).toContainText(cycle === "month" ? "$70.00" : "$600.00");
    await expect(rows.locator(".ws-price-discount")).toContainText(cycle === "month" ? "−$14.00" : "−$120.00");
    await expect(rows.locator("div").last()).toContainText(cycle === "month" ? "$56.00" : "$480.00");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `test-results/team-checkout-${cycle}-390.png` });
    await dialog.getByRole("button", { name: "模拟支付并开通", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "团队已准备好" })).toBeVisible();
    const invoice = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("eureka:workspaces:v2")!); return s.spaces.find((w: { id: string }) => w.id === s.activeId).invoices[0]; });
    expect(invoice).toMatchObject({ currency: "USD", amount: cycle === "month" ? 56 : 480 });
  });
}

test("old CNY unpaid quotes require reconfirmation; paid historical invoices are unchanged", () => {
  const w = M.get(M.seed(), "team-eureka");
  w.invoices.push({ id: "old-cny", date: "2026-10-01", amount: 1908, label: "历史账单", status: "已支付" });
  const old = M.createSeatOrder(w, 7);
  old.currency = "CNY";
  expect(() => M.paySeatOrder(w, old.id, "success")).toThrow("订单金额已变化");
  const replacement = M.createSeatOrder(w, 7);
  expect(replacement.id).not.toBe(old.id);
  expect(old.status).toBe("cancelled");
  expect(w.invoices.find(i => i.id === "old-cny")).toMatchObject({ amount: 1908 });
});
