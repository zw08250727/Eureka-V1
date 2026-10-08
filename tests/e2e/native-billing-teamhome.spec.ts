import { expect, test, type Page } from "@playwright/test";
test.use({
  baseURL: process.env.NATIVE_BASE_URL || "http://127.0.0.1:3100",
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  viewport: { width: 1440, height: 900 },
  trace: "off",
});
const key = "eureka:workspaces:v2";
const action = (p: Page, name: string) =>
  p.locator(`[data-ws-action="${name}"]:visible`).last();
const submit = (p: Page) => p.locator('#ws-dialog button[type="submit"]');
const dialog = (p: Page) => p.locator("#ws-dialog");
async function go(
  p: Page,
  view = "subscription",
  space = "team-eureka",
  actor = "zhang",
) {
  await p.goto(`/workbench/?view=${view}&space=${space}&actor=${actor}`);
  await expect(p.locator("#ws-view")).toBeVisible();
}
async function state(p: Page, id = "team-eureka") {
  return p.evaluate(
    ({ key, id }) =>
      JSON.parse(localStorage.getItem(key)!).spaces.find(
        (w: { id: string }) => w.id === id,
      ),
    { key, id },
  );
}
async function patch(p: Page, fn: string) {
  await p.evaluate(
    ({ key, fn }) => {
      const s = JSON.parse(localStorage.getItem(key)!);
      const change = new Function("s", fn);
      change(s);
      localStorage.setItem(key, JSON.stringify(s));
    },
    { key, fn },
  );
}
async function establish(p: Page) {
  await go(p);
  await action(p, "billing-info").click();
  await submit(p).click();
}
async function seats(p: Page, n: string) {
  await action(p, "seats").click();
  await dialog(p).locator('[name="seats"]').fill(n);
  await submit(p).click();
}
async function confirm(p: Page, name: string) {
  await action(p, name).click();
  await action(p, "confirm").click();
}

test("native billing: personal purchase failure/resume/success, renew, restore, switching and cancellation", async ({
  page,
}) => {
  await go(page, "subscription", "personal");
  await expect(page.locator(".ps-account")).toContainText("400");
  await expect(page.locator(".ps-plan-option")).toHaveCount(2);
  await action(page, "personal-buy").click();
  await expect(dialog(page)).toContainText("$99.99 USD");
  await action(page, "personal-fail").click();
  await expect(dialog(page).locator(".ws-seat-payment-error")).toContainText(
    "未开通权益",
  );
  expect((await state(page, "personal")).personalOrders[0].status).toBe(
    "failed",
  );
  await page.reload();
  await action(page, "personal-checkout").click();
  await submit(page).click();
  await expect(dialog(page)).toContainText("Pro 已生效");
  const paid = await state(page, "personal");
  expect(paid.personalOrders[0].status).toBe("paid");
  const download = page.waitForEvent("download");
  await dialog(page).locator('[data-ws-action="personal-receipt"]').click();
  expect((await download).suggestedFilename()).toMatch(/\.txt$/);
  await action(page, "close-dialog").click();
  await confirm(page, "personal-renew");
  await expect(page.locator(".ps-account")).toContainText("权益保留至");
  await confirm(page, "personal-renew");
  await action(page, "personal-restore").click();
  expect((await state(page, "personal")).credits.total).toBe(
    paid.credits.total,
  );
  await page
    .locator('[data-ws-action="personal-cycle"][data-value="month"]')
    .click();
  await action(page, "personal-buy").click();
  await expect(dialog(page)).toContainText("$17.99 USD");
  await action(page, "personal-cancel").click();
  await action(page, "confirm").click();
  await expect(page.locator(".ws-table")).toContainText("已取消");
  expect((await state(page, "personal")).personalSubscription.cycle).toBe(
    "year",
  );
});

test("native billing: seats preview, failed payment, resume, idempotent fulfillment and receipt", async ({
  page,
}) => {
  await go(page);
  await action(page, "add-seats").click();
  await expect(dialog(page).locator('[name="seats"]')).toHaveValue("7");
  await expect(page.locator("#ws-seat-estimate")).toContainText("¥1,908.00");
  await action(page, "close-dialog").click();
  await seats(page, "8");
  await expect(page.locator(".ws-seat-total")).toContainText("¥3,816.00");
  expect((await state(page)).seats).toBe(6);
  await action(page, "seat-pay-fail").click();
  await expect(page.locator(".ws-seat-payment-error")).toContainText(
    "未增加席位",
  );
  await page.reload();
  await action(page, "seat-checkout").click();
  await submit(page).click();
  await expect(dialog(page)).toContainText("总席位 8 个");
  const paid = await state(page);
  expect(paid.seats).toBe(8);
  expect(paid.invoices).toHaveLength(2);
  await action(page, "close-dialog").click();
  await page.reload();
  expect((await state(page)).invoices).toHaveLength(2);
  const download = page.waitForEvent("download");
  await action(page, "invoice").click();
  expect((await download).suggestedFilename()).toMatch(/\.txt$/);
  await seats(page, "9");
  await action(page, "seat-back").click();
  await dialog(page).locator('[name="seats"]').fill("10");
  await submit(page).click();
  await action(page, "seat-cancel").click();
  expect((await state(page)).seats).toBe(8);
});

test("native billing: reduction, cycle reversal, billing form, expiry and renewal", async ({
  page,
}) => {
  await go(page);
  await seats(page, "5");
  expect((await state(page)).pendingSeats).toBe(5);
  await action(page, "cancel-reduction").click();
  expect((await state(page)).pendingSeats).toBeNull();
  await confirm(page, "cycle");
  expect((await state(page)).pendingCycle).toBe("month");
  await action(page, "cancel-cycle").click();
  expect((await state(page)).pendingCycle).toBeNull();
  await confirm(page, "cycle");
  await confirm(page, "advance-cycle");
  expect((await state(page)).cycle).toBe("month");
  await seats(page, "8");
  await expect(page.locator(".ws-seat-total")).toContainText("¥398.00");
  await action(page, "seat-cancel").click();
  await action(page, "billing-info").click();
  await dialog(page).locator('[name="company"]').fill("原生账单测试公司");
  await dialog(page).locator('[name="email"]').fill("billing@example.test");
  await dialog(page).locator('[name="taxId"]').fill("000123");
  await dialog(page)
    .locator('[name="method"]')
    .selectOption("Mastercard ···· 5555");
  await submit(page).click();
  await expect(page.locator(".ws-billing-details")).toContainText(
    "原生账单测试公司",
  );
  await confirm(page, "renew");
  expect((await state(page)).renew).toBe(false);
  await confirm(page, "advance-cycle");
  await expect(page.locator(".ws-readonly")).toBeVisible();
  await expect(action(page, "add-seats")).toBeDisabled();
  await confirm(page, "renew");
  expect((await state(page)).status).toBe("active");
  await confirm(page, "expire");
  expect((await state(page)).status).toBe("expired");
});

test("native billing: credit packs, back, failure/resume, success, cancellation, logs and balance isolation", async ({
  page,
}) => {
  await go(page, "credits");
  await expect(page.locator(".ws-credit-summary")).toContainText("37,600");
  await expect(page.locator(".ws-credit-usage th")).toHaveCount(4);
  await action(page, "topup").click();
  await submit(page).click();
  await action(page, "credit-back").click();
  await dialog(page).locator('[name="packId"][value="credits-50k"]').check();
  await submit(page).click();
  await expect(dialog(page)).toContainText("¥450.00");
  await action(page, "credit-pay-fail").click();
  await expect(page.locator(".ws-seat-payment-error")).toContainText(
    "未增加 Credits",
  );
  const before = await state(page);
  await page.reload();
  await action(page, "credit-checkout").click();
  await submit(page).click();
  await expect(dialog(page)).toContainText("Credits 已到账");
  expect((await state(page)).credits.total).toBe(before.credits.total + 50000);
  const paid = await state(page);
  const download = page.waitForEvent("download");
  await dialog(page).locator('[data-ws-action="invoice"]').click();
  expect((await download).suggestedFilename()).toMatch(/\.txt$/);
  await action(page, "close-dialog").click();
  await action(page, "credit-checkout").click();
  expect((await state(page)).credits.total).toBe(paid.credits.total);
  await action(page, "close-dialog").click();
  await action(page, "topup").click();
  await submit(page).click();
  await action(page, "credit-cancel").click();
  await action(page, "confirm").click();
  await expect(page.locator(".ws-credit-orders")).toContainText("已取消");
  expect((await state(page, "personal")).credits.used).toBe(0);
});

test("native billing: seat payment storage rollback and cross-tab conflict preserve pending quote", async ({
  page,
}) => {
  await go(page);
  await seats(page, "8");
  const before = await state(page);
  await page.evaluate((k) => {
    const save = Storage.prototype.setItem;
    let fail = true;
    Storage.prototype.setItem = function (name, value) {
      if (name === k && fail) {
        fail = false;
        throw Error("quota");
      }
      save.call(this, name, value);
    };
  }, key);
  await submit(page).click();
  await expect(dialog(page).locator(".ws-form-error")).toContainText(
    "保存失败",
  );
  expect((await state(page)).seats).toBe(before.seats);
  await submit(page).click();
  await expect(dialog(page)).toContainText("模拟支付成功");
  await action(page, "close-dialog").click();
  await seats(page, "9");
  await patch(
    page,
    "s.spaces.find(w=>w.id==='team-eureka').pendingCycle='month'",
  );
  await submit(page).click();
  await expect(dialog(page).locator(".ws-form-error")).toContainText(
    "其他页面更新",
  );
  await page.reload();
  await action(page, "seat-checkout").click();
  await expect(dialog(page)).toContainText("重新确认费用");
  await submit(page).click();
  await expect(dialog(page).locator(".ws-form-error")).not.toBeEmpty();
  await action(page, "seat-back").click();
  await submit(page).click();
  await submit(page).click();
  await expect(dialog(page)).toContainText("模拟支付成功");
});

test("native billing: credits and personal payment storage failure do not grant entitlements", async ({
  page,
}) => {
  for (const [view, space, buy] of [
    ["credits", "team-eureka", "topup"],
    ["subscription", "personal", "personal-buy"],
  ]) {
    await go(page, view, space);
    await action(page, buy).click();
    if (view === "credits") await submit(page).click();
    const before = await state(page, space);
    await page.evaluate((k) => {
      const save = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === k) throw Error("quota");
        save.call(this, name, value);
      };
    }, key);
    await submit(page).click();
    await expect(dialog(page).locator(".ws-form-error")).toContainText(
      "保存失败",
    );
    const after = await state(page, space);
    expect(after.credits).toEqual(before.credits);
    expect(after.personalSubscription).toEqual(before.personalSubscription);
  }
});

test("native team home: original table columns, sorting, filters, calendar, pagination and recycle", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-07T04:00:00Z"));
  await go(page, "home");
  await expect(page.locator(".ws-team-brief")).toBeVisible();
  await expect(page.locator(".ws-recording-table th")).toHaveCount(10);
  await expect(page.locator(".ws-recording-table tbody tr")).toHaveCount(10);
  await expect(page.locator(".ws-pagination")).toContainText(
    "共 11 个会议笔记",
  );
  await action(page, "list-next").click();
  await expect(page.locator(".ws-recording-table tbody tr")).toHaveCount(1);
  await action(page, "list-prev").click();
  await page.locator("#ws-file-search").fill("不存在的会议");
  await expect(page.locator(".ws-empty")).toContainText("没有符合条件的会议");
  await page.locator("#ws-file-search").fill("");
  await page.locator("#ws-meeting-source-trigger").click();
  await page.getByRole("option", { name: "M1", exact: true }).click();
  await expect(
    page.locator('.mf-clear[aria-label="清除来源筛选"]'),
  ).toBeVisible();
  await page.getByRole("button", { name: "清除来源筛选" }).click();
  await page.locator("#ws-meeting-date-trigger").click();
  await expect(page.locator(".mf-calendar-grid")).toBeVisible();
  await page.getByRole("button", { name: "上个月", exact: true }).click();
  await page.getByRole("button", { name: "不限日期", exact: true }).click();
  await page.locator("#ws-meeting-status").selectOption("待处理");
  await expect(page.locator(".ws-empty")).toBeVisible();
  await page.locator("#ws-meeting-status").selectOption("all");
  await page.locator('[data-ws-action="sort"][data-value="updated"]').click();
  await expect(page.locator('[data-value="updated"]')).toContainText("↓");
  await action(page, "delete").click();
  await expect(dialog(page)).toContainText("30 天内");
  await action(page, "confirm").click();
  await action(page, "recycle").click();
  await expect(page.locator(".ws-recording-table th")).toHaveCount(6);
  await expect(page.locator(".ws-team-brief")).toHaveCount(0);
  await action(page, "restore").click();
  await expect(page.locator(".ws-empty")).toContainText("回收站暂无内容");
  await action(page, "recycle").click();
  await action(page, "delete").click();
  await action(page, "confirm").click();
  await action(page, "recycle").click();
  await action(page, "purge").click();
  await expect(dialog(page)).toContainText("无法恢复");
  await action(page, "confirm").click();
  await expect(page.locator(".ws-empty")).toBeVisible();
});

test("native team home: insight Agent sources, message persistence, width, web and insufficient credits", async ({
  page,
}) => {
  await go(page, "home");
  await action(page, "meeting-prompt").click();
  await expect(page.locator(".ws-agent-insight-context")).toBeVisible();
  const prompt = page.locator(".ws-composer textarea");
  await expect(prompt).not.toHaveValue("");
  await action(page, "agent-sources").click();
  await expect(dialog(page)).toContainText("不会引用个人闪念");
  await dialog(page).locator('[name="files"]').first().check();
  await dialog(page).locator('[name="appData"]').check();
  await submit(page).click();
  await action(page, "agent-web").click();
  await expect(action(page, "agent-web")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await prompt.press("Enter");
  await expect(page.locator(".ws-agent-usage")).toBeVisible();
  const first = await state(page);
  expect(first.credits.logs[0].amount).toBe(
    (first.credits.logs[0].inputTokens +
      2 * first.credits.logs[0].outputTokens) /
      1000,
  );
  const handle = page.getByRole("separator", { name: "调整 Agent 窗口宽度" });
  const width = Number(await handle.getAttribute("aria-valuenow"));
  await handle.press("ArrowLeft");
  expect(Number(await handle.getAttribute("aria-valuenow"))).toBe(width + 24);
  await action(page, "agent-new").click();
  await expect(page.locator(".ws-agent-insight-context")).toHaveCount(0);
  await expect(page.locator(".ws-chat-user")).toHaveCount(0);
  await action(page, "agent-close").click();
  await patch(
    page,
    "s.spaces.find(w=>w.id==='team-eureka').credits.used=50000",
  );
  await page.reload();
  await action(page, "agent").click();
  await prompt.fill("整理行动项");
  await prompt.press("Enter");
  await expect(page.locator(".ws-composer .ws-form-error")).not.toBeEmpty();
});

test("native team home: upload failure validation, shared pending recording and recording naming entry", async ({
  page,
}) => {
  await go(page, "home");
  await page.locator("[data-audio-upload]").click();
  await expect(page.locator("#audio-upload-dialog")).toContainText(
    "团队成员可查看",
  );
  await page
    .locator("#audio-upload-input")
    .setInputFiles({
      name: "wrong.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("audio"),
    });
  await expect(page.locator("#audio-upload-error")).not.toBeEmpty();
  await page
    .locator("#audio-upload-input")
    .setInputFiles({
      name: "native-upload.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("mock audio"),
    });
  await page.locator("#audio-upload-submit").click();
  await expect(page.locator(".ws-recording-table")).toContainText(
    "native-upload",
  );
  const f = (await state(page)).files.find(
    (f: { title: string }) => f.title === "native-upload",
  );
  expect(f.visibility).toBe("team");
  expect(f.status).toBe("待处理");
  expect(f.size).toBe("10 B");
  await go(page, "home", "team-eureka", "kevin");
  await expect(page.locator(".ws-recording-table")).toContainText(
    "native-upload",
  );
  await action(page, "record").click();
  await expect(dialog(page)).toContainText("仅自己可见");
  await dialog(page).locator('[name="title"]').fill("保留输入的会议名");
  await submit(page).click();
  await expect(page).toHaveURL(/title=/);
  await expect(page.locator("#recording-name")).toHaveText("保留输入的会议名");
});

test("native billing/team home: member privacy, empty states, seat ceiling and closure record", async ({
  page,
}) => {
  await establish(page);
  await go(page, "subscription", "team-eureka", "kevin");
  await expect(page.locator(".ws-perks")).toBeVisible();
  await expect(page.locator(".ws-billing-details")).toHaveCount(0);
  await expect(action(page, "leave")).toHaveCount(0);
  await go(page, "credits", "team-eureka", "kevin");
  await expect(page.locator(".ws-empty")).toContainText("此页面暂不可访问");
  await expect(page.locator(".ws-credit-summary")).toHaveCount(0);
  await patch(
    page,
    "const w=s.spaces.find(w=>w.id==='team-eureka');w.files=[];w.credits.logs=[];w.creditOrders=[];w.seats=50",
  );
  await go(page, "home");
  await expect(page.locator(".ws-insight-empty")).toBeVisible();
  await expect(page.locator(".ws-empty")).toContainText("没有符合条件的会议");
  await go(page, "credits");
  await expect(page.locator(".ws-credit-usage")).toContainText("暂无使用记录");
  await expect(page.locator(".ws-credit-orders")).toContainText(
    "暂无 Credits 购买记录",
  );
  await go(page);
  await expect(action(page, "add-seats")).toBeDisabled();
  await patch(
    page,
    "const w=s.spaces.find(w=>w.id==='team-eureka');w.status='dissolved';w.closure={actor:'zhang',name:w.name,endedAt:'2026-10-07T00:00:00Z',frozenCredits:37600,paidThrough:w.nextDate,purchasedSeats:6,invoices:w.invoices}",
  );
  await go(page, "subscription", "personal");
  await expect(page.locator("#ws-view")).toContainText("团队解散结算记录");
  const download = page.waitForEvent("download");
  await action(page, "closure-receipt").click();
  expect((await download).suggestedFilename()).toMatch(/解散结算记录\.json$/);
});

test("native billing: dialogs and page surfaces fit mobile/tablet/desktop; Escape closes and returns focus", async ({
  page,
}) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await go(page);
    await action(page, "add-seats").click();
    await submit(page).click();
    await expect(dialog(page)).toBeVisible();
    expect(
      await dialog(page).evaluate((e) => e.scrollWidth - e.clientWidth),
    ).toBeLessThan(3);
    await submit(page).scrollIntoViewIfNeeded();
    await expect(submit(page)).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    await go(page, "subscription", "personal");
    expect(
      await page
        .locator("#ws-view")
        .evaluate((e) => e.scrollWidth - e.clientWidth),
    ).toBeLessThan(3);
    await go(page, "home");
    expect(
      await page
        .locator("#ws-view")
        .evaluate((e) => e.scrollWidth - e.clientWidth),
    ).toBeLessThan(3);
  }
});
