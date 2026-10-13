/* eslint-disable @typescript-eslint/no-require-imports -- Standalone deployed-site acceptance. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const expectedRevision = require("../src/prototype/prd/content.json").revision;
const base = (process.env.DEPLOYMENT_URL || "http://127.0.0.1:3135").replace(/\/$/, "");
(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  const errors = [], results = [];
  try {
    for (const market of ["cn", "global"]) {
      const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      page.on("response", response => {
        if (response.url().startsWith(base + "/") && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
      });
      await page.goto(`${base}/${market}/`);
      await page.locator(".guest-app").waitFor();
      assert.equal(await page.locator("#auth-form").count(), 0);
      assert.equal(await page.locator(".meeting-row").count(), 0);
      await page.getByRole("button", {name: "上传", exact: true}).click();
      await page.locator(".auth-overlay").waitFor();
      assert.equal(new URL(page.url()).pathname, new URL(`${base}/${market}/`).pathname);
      await page.getByRole("button", {name:"关闭登录", exact:true}).click();
      await page.goto(`${base}/${market}/workbench/?view=connectors&space=personal`);
      await page.locator(".auth-overlay").waitFor();
      if (market === "cn") {
        await page.getByRole("button", {name:"个人/团队版",exact:true}).click();
        await page.getByRole("button", {name:"邮箱", exact:true}).click();
      }
      await page.locator("#email").fill("release-check@example.com");
      await page.locator("#code").fill("123456");
      await page.locator("#terms").check();
      await page.locator("#submit").click();
      await page.locator(".connector-card").first().waitFor();
      assert.equal(await page.locator("iframe").count(), 0);
      await page.goto(`${base}/${market}/workbench/?view=subscription`);
      await page.getByRole("button", {name:market === "cn" ? "立即升级 专业版" : "立即升级 Pro", exact:true}).waitFor();
      await page.goto(`${base}/${market}/workbench/?view=home&space=team-eureka`);
      await page.locator("#ws-switcher").waitFor();
      assert.match(await page.locator("#ws-switcher").innerText(), /Team/);
      await page.goto(`${base}/${market}/`);
      await page.locator(".meeting-row").first().waitFor();
      await page.locator("#user-card").click();
      await page.getByRole("button", {name:"退出登录", exact:true}).click();
      await page.locator(".guest-app").waitFor();
      assert.equal(await page.locator("#auth-form").count(), 0);
      await context.close();
      results.push({market, guestHome: true, closableAuth: true, privateLinkResume: true, membership: true, team: true, logout: true});
    }
    const response = await fetch(`${base}/prototype/prd/content.json?revision=${encodeURIComponent(expectedRevision)}`);
    assert.equal(response.status,200);
    assert.equal((await response.json()).revision,expectedRevision);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({base, revision:expectedRevision, results, errors},null,2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
