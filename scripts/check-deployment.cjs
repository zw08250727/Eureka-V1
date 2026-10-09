/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser deployment smoke check. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const expectedRevision = require("../src/prototype/prd/content.json").revision;
const base = (
  process.env.DEPLOYMENT_URL || "http://127.0.0.1:3122/Eureka-V1"
).replace(/\/$/, "");
const routes = [
  ["home", "#recent-meeting-title"],
  ["calendar", "#personal-actions"],
  ["thoughts", "#thought-workspace"],
  ["contacts", "#contacts-root"],
  ["settings", "#personal-settings"],
  ["meeting&id=meeting-1", "#note-detail-title"],
  ["recording", "#recording-layout"],
  ["recording&space=team-eureka", "#recording-layout"],
  [
    "history&id=" + encodeURIComponent("本周会议决策整理"),
    "#agent-history-title",
  ],
  ["trash", "#recycle-title"],
  ["create-team", "#ws-dialog"],
  ["invitations", "#ws-dialog"],
  ...["devices", "subscription"].map((view) => [view, "#ws-view"]),
  ...[
    "home",
    "members",
    "devices",
    "subscription",
    "credits",
    "space-settings",
    "audit",
  ].map((view) => [view + "&space=team-eureka", "#ws-view"]),
  ["tasks&space=team-eureka", 'p[role="alert"]'],
  ["contacts&space=team-eureka", "#contacts-root"],
  ["content-permissions&space=team-eureka", ".ws-sharing-settings"],
];
(async () => {
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  });
  const errors = [];
  const context = await browser.newContext();
  function observe(page) {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (response) => {
      if (response.url().startsWith(base + "/") && response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
  }
  try {
    const auth = await context.newPage();
    observe(auth);
    await auth.goto(base + "/");
    assert.equal(await auth.locator(".auth-demo").count(), 0);
    await auth.getByRole("button", { name: "查看团队共识" }).click();
    await auth.getByRole("heading", { name: "汇聚交流，让团队同频。" }).waitFor();
    await auth.locator("#submit").click();
    await auth.locator("#recent-meeting-title").waitFor();
    assert.ok(auth.url().startsWith(base + "/workbench/"));
    assert.equal(await auth.locator("iframe").count(), 0);
    await auth.close();
    for (const [view, selector] of routes) {
      const page = await context.newPage();
      observe(page);
      await page.goto(base + "/workbench/?view=" + view);
      await page.locator(selector).waitFor();
      await page.locator('.topbar-right select[aria-label="评审视角"]').waitFor();
      assert.equal(await page.locator("iframe").count(), 0);
      assert.doesNotMatch(await page.locator(".sidebar").innerText(), /任务管理|历史会话|全部任务|自动任务/);
      assert.equal(await page.getByRole("button", { name: /退出团队|解散团队/ }).count(), 0);
      if (view.startsWith("history")) {
        await page.getByRole("button", { name: "历史会话", exact: true }).click();
        await page.getByRole("dialog", { name: "历史会话", exact: true }).waitFor();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "新建会话", exact: true }).waitFor();
      }
      if (view.startsWith("tasks")) assert.match(await page.locator(selector).innerText(), /此入口不属于当前工作空间/);
      if (view === "recording") assert.equal(await page.getByRole("heading", { name: "个人工作区权益已冻结" }).count(), 0);
      if (view === "contacts&space=team-eureka") {
        await page.getByRole("heading", { name: "团队客户", exact: true }).waitFor();
        assert.deepEqual(await page.getByLabel("筛选客户来源").locator("option").allTextContents(), ["全部来源", "手动录入", "Agent 创建", "CRM"]);
        await page.getByLabel("筛选所属成员").waitFor();
      }
      if (view === "content-permissions&space=team-eureka") {
        assert.equal(await page.getByRole("switch").count(), 2);
        await page.getByRole("switch", { name: "我的客户共享给团队", exact: true }).waitFor();
      }
      if (view === "create-team") {
        assert.match(await page.locator(".ws-price").innerText(), /\$20\.00/);
        await page.getByRole("button", { name: "月付", exact: true }).click();
        assert.match(await page.locator(".ws-price").innerText(), /\$28\.00/);
      }
      console.log("PASS", view);
      await page.close();
    }
    const prd = await context.request.get(base + "/prototype/prd/content.json");
    assert.equal(prd.status(), 200);
    assert.equal((await prd.json()).revision, expectedRevision);
    const page = await context.newPage();
    observe(page);
    await page.goto(base + "/prototype/prd/index.html");
    await page.getByText("参考与边界", { exact: false }).first().waitFor();
    await page.goto(
      base +
        "/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1",
    );
    await page.locator("#recent-meeting-title").waitFor();
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        base,
        nativeViews: routes.length,
        auth: "passed",
        prd: expectedRevision,
        reference: "passed",
        errors,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
