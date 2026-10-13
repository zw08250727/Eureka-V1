import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import { writeFile, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
});
const results = [];
try {
  for (const [index, market] of ["cn", "global"].entries()) {
    const port = 3136 + index,
      origin = `http://127.0.0.1:${port}`;
    const server = spawn(
      "python3",
      [
        "-m",
        "http.server",
        String(port),
        "--bind",
        "127.0.0.1",
        "--directory",
        `artifacts/markets/${market}`,
      ],
      { stdio: "ignore" },
    );
    let started = false;
    try {
      for (let n = 0; n < 40; n++) {
        if (server.exitCode !== null) throw Error("Static server exited");
        try {
          const response = await fetch(origin);
          if (response.ok) {
            started = true;
            break;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert(started, "Static server did not start");
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin);
      assert.equal(await page.locator(".review-market-card").count(), 1);
      await page.locator(".review-market-card").click();
      assert.equal(new URL(page.url()).pathname, `/${market}/`);
      await page.locator(".guest-app").waitFor();
      assert.equal(await page.locator(".auth-overlay").count(), 0);
      await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
      if (market === "cn") {
        await page.getByRole("link", { name: "个人/团队版", exact: true }).click();
        await page.getByRole("button", { name: "邮箱", exact: true }).click();
      }
      await page.locator("#email").fill("member@example.com");
      await page.locator("#code").fill("123456");
      await page.locator("#terms").check();
      await page.locator("#submit").click();
      await page.locator("#ws-switcher").waitFor();
      assert.equal(new URL(page.url()).pathname, `/${market}/workbench/`);
      await page.goto(`${origin}/${market}/workbench/?view=connectors`);
      await page.locator(".connector-card").first().waitFor();
      assert.equal(await page.locator("iframe").count(), 0);
      const session = await page.evaluate(
        (m) =>
          JSON.parse(localStorage.getItem(`eureka:market:${m}:eureka:auth:v1`)),
        market,
      );
      assert.equal(session.market, market);
      const other = await page.request.get(
        `${origin}/${market === "cn" ? "global" : "cn"}/`,
      );
      assert.equal(other.status(), 404);
      await page.goto(`${origin}/review/`);
      assert.equal(
        await page
          .locator(`a[href^="/${market === "cn" ? "global" : "cn"}/"]`)
          .count(),
        0,
      );
      await page.goto(`${origin}/${market}/workbench/?view=subscription`);
      await page.getByRole("button", { name: market === "cn" ? "立即升级 专业版" : "立即升级 Pro", exact: true }).click();
      await page.getByRole("button", { name: /确认支付/ }).click();
      await page.getByRole("button", { name: "完成", exact: true }).click();
      await page.goto(`${origin}/${market}/workbench/`);
      await page.locator("#user-card").click();
      await page.getByRole("button", { name: "充值", exact: true }).click();
      await page.getByRole("button", { name: "确认充值", exact: true }).click();
      await page.getByRole("button", { name: "确认支付", exact: true }).click();
      await page.getByText("充值成功", { exact: true }).waitFor();
      const paid = await page.evaluate(m => JSON.parse(localStorage.getItem(`eureka:market:${m}:eureka:workspaces:v2`)).spaces.find(w => w.id === "personal"), market);
      assert.equal(paid.personalOrders[0].amount, market === "cn" ? 199 : 99.99);
      assert.equal(paid.creditOrders[0].currency, market === "cn" ? "CNY" : "USD");
      assert.equal(paid.creditOrders[0].status, "paid");
      if (market === "cn") {
        await page.goto(`${origin}/cn/?edition=enterprise`);
        await page.locator("#enterprise-code").fill("100001");
        await page.locator("#submit").click();
        await page.locator("#phone").fill("13800138000");
        await page.locator("#code").fill("123456");
        await page.locator("#terms").check();
        await page.locator("#submit").click();
        await page.locator(".enterprise-workbench").waitFor();
        await page.getByLabel("新待办").fill("静态包待办");
        await page.getByRole("button", { name: "添加待办" }).click();
        await page.reload();
        await page.getByText("静态包待办", { exact: true }).waitFor();
      }
      assert.deepEqual(errors, []);
      await context.close();
      const manifest = JSON.parse(
        await readFile(`artifacts/markets/${market}/manifest.json`, "utf8"),
      );
      results.push({
        market,
        passed: true,
        entry: manifest.entry,
        checks: [
          "standalone root",
          "login",
          "workbench",
          "native connectors",
          "personal subscription and credit purchase",
          "regional session",
          "other market route absent",
          "no broken other-market review links",
          "no page errors",
        ],
      });
    } finally {
      server.kill();
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/markets/package-smoke.json",
  JSON.stringify({ verifiedAt: new Date().toISOString(), results }, null, 2) +
    "\n",
);
console.log("Both standalone market packages passed.");
