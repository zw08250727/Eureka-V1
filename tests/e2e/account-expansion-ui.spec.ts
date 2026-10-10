import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => console.log("PAGEERROR", e.stack));
});
test.use({ viewport: { width: 1440, height: 960 } });
const home = "/workbench/?space=personal&actor=zhang";
test("personal account: no duplicate workspace switch, rewards, checkout retry and tabs", async ({
  page,
}) => {
  await page.goto(home);
  await page.locator("#user-card").click();
  const menu = page.getByRole("dialog", { name: "我的账户", exact: true });
  await expect(menu).toBeVisible();
  await expect(menu).not.toContainText("创建团队工作空间");
  await expect(menu).toContainText("赚 Credits");
  await menu.getByRole("button", { name: "立即领取" }).click();
  const task = page.getByRole("dialog", {
    name: "做任务赚 Credits",
    exact: true,
  });
  await task.getByRole("tab", { name: "活跃互动" }).click();
  await task.getByRole("button", { name: "立即签到" }).click();
  await expect(task.getByRole("button", { name: "今日已签到" })).toBeDisabled();
  await task.getByRole("button", { name: "关闭", exact: true }).click();
  await page
    .locator(".topbar")
    .getByRole("button", { name: /Credits/ })
    .click();
  await page.getByRole("button", { name: "充值 Credits", exact: true }).click();
  const pay = page.getByRole("dialog", { name: "充值 Credits", exact: true });
  await expect(pay).toContainText("$149");
  await pay.getByRole("button", { name: "确认充值", exact: true }).click();
  await pay.getByRole("button", { name: "模拟支付失败" }).click();
  await pay.getByRole("button", { name: "重试模拟支付" }).click();
  await expect(pay).toContainText("充值成功");
  await pay.getByRole("button", { name: "查看订单" }).click();
  await expect(
    page.getByRole("dialog", { name: "我的订单", exact: true }),
  ).toContainText("已支付");
  await page.goto("/workbench/?view=settings&space=personal&actor=zhang");
  await expect(page.getByRole("tab", { name: "录音设置" })).toBeVisible();
  await page.getByRole("tab", { name: "Credits 明细" }).click();
  await expect(page.locator("#personal-settings")).toContainText("每日签到");
  await expect(page.locator("#personal-settings")).toContainText(
    "充值 Credits",
  );
  await page.screenshot({
    path: "test-results/account-settings.png",
    fullPage: true,
  });
});
test("team daily ownership, share-only own records, no reward or note entry", async ({
  page,
}) => {
  await page.goto("/workbench/?space=team-eureka&actor=zhang");
  await expect(
    page.getByRole("heading", { name: "团队洞察", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "新建笔记", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".team-private-column .ex-owner").first(),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/team-home.png", fullPage: true });
  const other = page
    .locator(".team-private-todo")
    .filter({ has: page.locator(".ex-owner", { hasText: "林晓" }) })
    .first();
  if (await other.count())
    await expect(
      other.getByRole("button", { name: "共享", exact: true }),
    ).toHaveCount(0);
  await page.locator("#user-card").click();
  const menu = page.getByRole("dialog", { name: "我的账户", exact: true });
  await expect(menu).not.toContainText("赚 Credits");
  await expect(menu).not.toContainText("签到");
  await menu.getByRole("button", { name: "充值", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "充值 Credits", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.goto(
    "/workbench/?view=thoughts&space=team-eureka&actor=zhang&id=todo",
  );
  const share = page
    .locator(".th-row")
    .filter({ has: page.locator(".ex-owner", { hasText: "张伟" }) })
    .first()
    .getByRole("button", { name: "共享", exact: true });
  await share.click();
  await expect(
    page.getByRole("dialog", { name: "共享待办", exact: true }),
  ).toContainText("接收成员仅可查看");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.screenshot({
    path: "test-results/team-thoughts.png",
    fullPage: true,
  });
});
test("connector source functions add, edit, search and persist scoped configuration", async ({
  page,
}) => {
  await page.goto("/workbench/?view=connectors&space=personal&actor=zhang");
  const f = page.frameLocator('iframe[title="连接器"]');
  await expect(f.getByText("系统连接器", { exact: true })).toBeVisible();
  await f.getByText("新增连接器", { exact: true }).click();
  await f.locator("#fName").fill("Demo MCP");
  await f.locator("#fUrl").fill("not-a-url");
  await f.locator("#maskAdd button").filter({ hasText: "确定" }).click();
  await expect(f.locator("#eUrl")).toBeVisible();
  await f.locator("#fUrl").fill("https://example.com/mcp");
  await f.locator("#maskAdd button").filter({ hasText: "确定" }).click();
  await expect(f.locator("#customGrid")).toContainText("Demo MCP");
  await page.reload();
  await expect(f.locator("#customGrid")).toContainText("Demo MCP");
  const card = f.locator(".conn-card").filter({ hasText: "Demo MCP" });
  await card.hover();
  await card.getByTitle("编辑", { exact: true }).click();
  await f.locator("#fName").fill("Edited MCP");
  await f.locator("#maskAdd .primary").click();
  await expect(f.locator("#customGrid")).toContainText("Edited MCP");
  await f.getByText("新增连接器", { exact: true }).click();
  await f.locator("#tabJson").click();
  await f.locator("#fName2").fill("JSON MCP");
  await f.locator("#fJson").fill("invalid");
  await f.locator("#maskAdd .primary").click();
  await expect(f.locator("#eJson")).toBeVisible();
  await f
    .locator("#fJson")
    .fill(
      JSON.stringify({
        mcpServers: { demo: { url: "https://example.com/json" } },
      }),
    );
  await f.locator("#maskAdd .primary").click();
  await expect(f.locator("#customGrid")).toContainText("JSON MCP");
  await f.locator("#connSearch").fill("Edited MCP");
  await expect(f.locator(".conn-card:visible")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/connectors.png",
    fullPage: true,
  });
  await f.locator(".conn-card:visible").hover();
  await f
    .locator(".conn-card:visible")
    .getByTitle("删除", { exact: true })
    .click();
  await f.locator("#dlgOk").click();
  await expect(f.locator("#customGrid")).not.toContainText("Edited MCP");
  await page.goto("/workbench/?view=connectors&space=team-eureka&actor=zhang");
  await expect(f.locator("#customGrid")).not.toContainText("JSON MCP");
});
test("meeting library is on right; template community and changelog gallery are functional", async ({
  page,
}) => {
  await page.goto(
    "/workbench/?view=meeting&space=team-eureka&actor=zhang&id=daily-insight-team-eureka-0",
  );
  await expect(page.locator(".md-library")).toBeVisible();
  const library = await page.locator(".md-library").boundingBox(),
    main = await page.locator(".md-main").boundingBox();
  expect(library!.x).toBeGreaterThan(main!.x);
  const template = page.locator(
    '[data-md="template"], [data-md-action="template"], [data-action="template"]',
  );
  if (await template.count()) await template.first().click();
  else await page.getByText("当前使用模板", { exact: false }).click();
  await page.getByRole("button", { name: "探索模板社区" }).click();
  await expect(
    page.getByRole("dialog", { name: "模板社区", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "☆ 收藏", exact: true })
    .first()
    .click();
  await page.getByRole("tab", { name: "我的收藏" }).click();
  await expect(
    page.getByRole("button", { name: "使用模板", exact: true }),
  ).toHaveCount(1);
  await page.screenshot({ path: "test-results/templates.png", fullPage: true });
  await page.goto("/workbench/?view=updates&space=personal&actor=zhang");
  await expect(page.locator(".ex-log article").first()).toBeVisible();
  await expect(page.locator(".ex-log-images img").first()).toBeVisible();
  await page.locator(".ex-log-images button").first().click();
  await expect(
    page.getByRole("dialog", { name: "更新图片预览" }),
  ).toBeVisible();
});

test("notification reads persist and product introduction is reachable in both spaces", async ({
  page,
}) => {
  await page.goto(home);
  await page.getByRole("button", { name: "所有通知", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "所有通知", exact: true });
  await expect(modal.locator(".ex-dot")).toHaveCount(3);
  await modal.getByRole("button", { name: "全部已读" }).click();
  await expect(modal.locator(".ex-dot")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "所有通知", exact: true }).click();
  await expect(page.locator(".ex-dot")).toHaveCount(0);
  await page.goto("/workbench/?view=product&space=team-eureka&actor=zhang");
  await expect(
    page.getByRole("heading", { name: "让每一次记录，成为下一步行动。" }),
  ).toBeVisible();
});
