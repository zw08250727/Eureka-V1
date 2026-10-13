import { test, expect, type Page } from "@playwright/test";

const personalSession = "eureka:market:cn:eureka:auth:v1";
const globalSession = "eureka:market:global:eureka:auth:v1";
const enterpriseSession = "eureka:market:cn:enterprise:auth:v1";
const forbidden = /独立账号|演示身份|待 PM|本地模拟|场景示意|仅供评审|不会真实扣款|保存在本浏览器|原型仅|演示配置/;
async function enterpriseLogin(page: Page, method: "phone" | "email" = "phone") {
  await page.goto("/cn/?edition=enterprise");
  await page.locator("#enterprise-code").fill("bairong");
  await page.locator("#submit").click();
  await expect(page.getByRole("heading", { name: "百融智能" })).toBeVisible();
  if (method === "email") await page.getByRole("button", { name: "邮箱", exact: true }).click();
  await page.locator(`#${method}`).fill(method === "phone" ? "13800138000" : "lin@bairong.example");
  await page.locator("#code").fill("123456");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page.locator(".enterprise-workbench")).toBeVisible();
}

test("domestic edition cards open separate personal and Baixiao enterprise dialogs", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".review-market-card")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "百智 国内版" })).toBeVisible();
  await expect(page.getByRole("link", { name: "EurekaMind 海外版" })).toBeVisible();
  expect(await page.locator(".review-lobby").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");
  await page.getByRole("link", { name: "百智 国内版" }).click();
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await expect(page.locator(".brand")).toHaveText("百智");
  await expect(page.getByRole("navigation", { name: "登录版本" }).getByRole("button")).toHaveCount(2);
  await page.getByRole("button", {name:"个人/团队版",exact:true}).click();
  await expect(page.locator("#phone")).toBeEmpty();
  await expect(page.locator("#terms")).not.toBeChecked();
  await expect(page.locator("#google, #apple")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(forbidden);
  await page.goto("/global/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await expect(page.locator(".brand")).toContainText("EurekaMind");
  await expect(page.locator("#google, #apple")).toHaveCount(2);
  await expect(page.locator(".auth-editions")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(forbidden);
});

for (const method of ["phone", "email"] as const) {
  test(`domestic ${method} validates, resends, requires agreement and reaches personal workspace`, async ({ page }) => {
    await page.goto("/cn/");
    await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
    await page.getByRole("button", {name:"个人/团队版",exact:true}).click();
    if (method === "email") await page.getByRole("button", { name: "邮箱", exact: true }).click();
    await page.locator(`#${method}`).fill("bad");
    await page.locator("#send").click();
    await expect(page.locator("#status")).toContainText("请输入有效");
    const identity = method === "phone" ? "13900139000" : "new@example.com";
    await page.locator(`#${method}`).fill(identity);
    await page.clock.install();
    await page.locator("#send").click();
    await expect(page.locator("#send")).toBeDisabled();
    await page.clock.fastForward(61000);
    await expect(page.locator("#send")).toBeEnabled();
    await page.locator("#code").fill("123456");
    await page.locator("#submit").click();
    await expect(page.locator("#status")).toContainText("请先阅读并同意");
    await page.locator("#terms").check();
    await page.locator("#code").fill("000000");
    await page.locator("#submit").click();
    await expect(page.locator("#status")).toContainText("验证码错误");
    await page.locator("#code").fill("123456");
    await page.locator("#code").press("Enter");
    await expect(page).toHaveURL(/\/cn\/workbench\/.*space=personal/);
    await expect(page.locator(".workspace-brand strong")).toHaveText("百智");
    expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).identity, personalSession)).toBe(identity);
    expect(await page.evaluate(k => localStorage.getItem(k), enterpriseSession)).toBeNull();
  });
}

test("enterprise checks code and membership, supports changing enterprise, and cannot self-register", async ({ page }) => {
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.getByRole("button", { name: "企业版", exact: true }).click();
  await expect(page.getByRole("dialog", {name:"百销企业登录"})).not.toContainText("百智");
  await page.locator("#enterprise-code").fill("wrong");
  await page.locator("#submit").click();
  await expect(page.locator("#status")).toContainText("企业代码无效");
  await page.locator("#enterprise-code").fill("bairong");
  await page.locator("#submit").click();
  await page.locator("#phone").fill("13900139000");
  await page.locator("#code").fill("123456");
  await page.locator("#terms").check();
  await page.locator("#submit").click();
  await expect(page.locator("#status")).toContainText("不在企业成员名单");
  expect(await page.evaluate(k => localStorage.getItem(k), enterpriseSession)).toBeNull();
  await page.getByRole("button", { name: "更换企业" }).click();
  await expect(page.locator("#enterprise-code")).toBeVisible();
  await page.getByRole("button", { name: "返回版本选择", exact: true }).click();
  await page.getByRole("button", {name:"个人/团队版",exact:true}).click();
  await expect(page.locator("#phone")).toBeEmpty();
  await expect(page.locator("#terms")).not.toBeChecked();
});

test("enterprise realm is separate from CN personal/team and global; logout preserves both and enterprise work", async ({ page, context }) => {
  await page.goto("/cn/");
  await page.evaluate(({ personalSession, globalSession }) => {
    localStorage.setItem(personalSession, JSON.stringify({market: "cn", realm: "eureka-cn", identity: "lin@bairong.example"}));
    localStorage.setItem(globalSession, JSON.stringify({market: "global", realm: "eureka-global", identity: "lin@bairong.example"}));
  }, { personalSession, globalSession });
  await page.goto("/cn/enterprise/");
  await expect(page).toHaveURL(/\/cn\/enterprise\/login\//);
  await enterpriseLogin(page, "email");
  await page.getByLabel("新待办").fill("确认企业采购清单");
  await page.getByRole("button", {name: "添加待办"}).click();
  await page.getByRole("checkbox", {name: "确认企业采购清单"}).check();
  await page.reload();
  await expect(page.getByRole("checkbox", {name: "确认企业采购清单"})).toBeChecked();
  await page.getByRole("button", {name: "企业成员", exact: true}).click();
  await expect(page.locator(".enterprise-member")).toContainText("林晓");
  const other = await context.newPage();
  await other.goto("/cn/enterprise/");
  await expect(other.locator(".enterprise-workbench")).toBeVisible();
  await page.getByRole("button", {name: "退出登录"}).click();
  await expect(other).toHaveURL(/\/cn\/enterprise\/login\//);
  const states = await page.evaluate(keys => keys.map(k => localStorage.getItem(k)), [personalSession, globalSession, enterpriseSession]);
  expect(states[0]).not.toBeNull(); expect(states[1]).not.toBeNull(); expect(states[2]).toBeNull();
  await enterpriseLogin(page);
  await expect(page.getByRole("checkbox", {name: "确认企业采购清单"})).toBeChecked();
});

test("enterprise cannot reuse an invalid realm and storage failures do not falsely complete login or tasks", async ({ page }) => {
  await page.goto("/cn/");
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({realm: "eureka-cn", code: "bairong", identity: "lin@bairong.example"})), enterpriseSession);
  await page.goto("/cn/enterprise/");
  await expect(page).toHaveURL(/enterprise\/login/);
  await page.locator("#enterprise-code").fill("bairong"); await page.locator("#submit").click();
  await page.locator("#phone").fill("13800138000"); await page.locator("#code").fill("123456"); await page.locator("#terms").check();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("存储空间不足"); }; });
  await page.locator("#submit").click();
  await expect(page.locator("#status")).toContainText("存储空间不足");
  await expect(page.locator("#phone")).toHaveValue("13800138000");
  await enterpriseLogin(page);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("Quota"); }; });
  await page.getByLabel("新待办").fill("不能丢失的草稿"); await page.getByRole("button", {name: "添加待办"}).click();
  await expect(page.getByRole("status")).toContainText("保存失败");
  await expect(page.getByLabel("新待办")).toHaveValue("不能丢失的草稿");
  await expect(page.locator(".enterprise-tasks li")).toHaveCount(0);
});

for (const width of [390, 768, 1440]) test(`enterprise forms and workbench fit ${width}px`, async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({width, height: 900});
  await page.goto("/cn/?edition=enterprise");
  await expect(page.locator("#enterprise-code")).toBeVisible();
  await page.screenshot({path: `test-results/markets/enterprise-code-${width}.png`, fullPage: true, animations: "disabled"});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator("#enterprise-code").fill("bairong"); await page.locator("#submit").click();
  await page.screenshot({path: `test-results/markets/enterprise-member-${width}.png`, fullPage: true, animations: "disabled"});
  await enterpriseLogin(page);
  await page.screenshot({path: `test-results/markets/enterprise-home-${width}.png`, fullPage: true, animations: "disabled"});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator("body")).not.toContainText(forbidden);
  expect(errors).toEqual([]);
});

for (const market of ["cn", "global"]) test(`${market} business surfaces do not include prototype prose or review controls`, async ({page}) => {
  await page.goto(`/${market}/`);
  await page.evaluate(m => localStorage.setItem(`eureka:market:${m}:eureka:auth:v1`, JSON.stringify({market:m, realm:`eureka-${m}`, identity:"member@example.com"})), market);
  for (const view of ["home", "connectors", "subscription", "credits", "calendar", "settings", "contacts"]) {
    await page.goto(`/${market}/workbench/?view=${view}`);
    await expect(page.locator(".app")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(forbidden);
    await expect(page.getByRole("button", {name:/模拟支付失败|模拟授权失败|模拟到期|评审工具/})).toHaveCount(0);
  }
  await page.goto(`/${market}/workbench/?view=subscription`);
  await page.getByRole("button", {name:market === "cn" ? "立即升级 专业版" : "立即升级 Pro",exact:true}).click();
  await expect(page.getByRole("dialog")).not.toContainText(forbidden);
  await expect(page.getByRole("button", {name:"模拟支付失败"})).toHaveCount(0);
});
