/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser deployment smoke check. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
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
  ["tasks&space=team-eureka", "#ws-dialog"],
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
      assert.equal(await page.locator("iframe").count(), 0);
      console.log("PASS", view);
      await page.close();
    }
    const prd = await context.request.get(base + "/prototype/prd/content.json");
    assert.equal(prd.status(), 200);
    assert.equal((await prd.json()).revision, "prd-20261007-40");
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
        prd: "prd-20261007-40",
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
