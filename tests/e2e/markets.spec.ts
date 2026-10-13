import { test, expect, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import { accountWithoutTeam } from "./fixtures/workspace-state";
const key = (market: string, k: string) => `eureka:market:${market}:${k}`;
async function login(page: Page, market: "cn" | "global") {
  await page.goto(`/${market}/`);
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  if (market === "cn") await page.getByRole("link", { name: "个人/团队版", exact: true }).click();
  if (market === "cn") await page.getByRole("button", { name: "邮箱", exact: true }).click();
  await page.locator("#terms").check();
  await page.locator("#email").fill("same@example.com");
  await page.locator("#code").fill("123456");
  await page.locator("#submit").click();
  await expect(page).toHaveURL(new RegExp(`/${market}/workbench/`));
  await expect(page.locator(".app")).toBeVisible();
}
test("lobby and review board expose fixed regional entrypoints", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "选择版本" }),
  ).toBeVisible();
  await expect(page.locator('a.review-market-card[href="/cn/"]')).toBeVisible();
  await expect(
    page.locator('a.review-market-card[href="/global/"]'),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/markets/lobby-desktop.png",
    fullPage: true, animations: "disabled",
  });
  await page.goto("/review/");
  await expect(
    page.getByRole("heading", { name: "02 · 模块与主责" }),
  ).toBeVisible();
  await expect(page.locator("body")).toContainText("eureka-cn");
  await expect(page.locator("body")).toContainText("待认领");
});
for (const market of ["cn", "global"] as const) {
  test(`${market}: login, native connectors, failed authorization, persistence and scope`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/${market}/workbench/?view=connectors&review=1`);
    await expect(page.locator(".auth-overlay")).toBeVisible();
    await login(page, market);
    await page.goto(`/${market}/workbench/?view=connectors&review=1`);
    await expect(page.locator("iframe")).toHaveCount(0);
    const name = market === "cn" ? "飞书" : "Google Workspace";
    await page
      .getByRole("button", { name: `查看 ${name}`, exact: true })
      .click();
    await page.getByRole("button", { name: "连接", exact: true }).click();
    await page.getByRole("button", { name: "模拟授权失败" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      "授权未完成",
    );
    await page.getByRole("button", { name: "确认授权" }).click();
    await expect(
      page.getByRole("button", { name: `查看 ${name}`, exact: true }),
    ).toContainText("已连接");
    await page.getByRole("button", { name: "＋ 添加自定义连接器" }).click();
    await page.getByLabel("连接器名称").fill("Test MCP");
    await page.getByLabel("JSON 配置", { exact: true }).check();
    await page.getByLabel("MCP JSON 配置").fill("invalid");
    await page.getByRole("button", { name: "保存连接器" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      "JSON 格式",
    );
    await page
      .getByLabel("MCP JSON 配置")
      .fill('{"mcpServers":{"demo":{"url":"https://example.com/mcp"}}}');
    await page.getByRole("button", { name: "保存连接器" }).click();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "查看 Test MCP" }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/markets/${market}-connectors-desktop.png`,
      fullPage: true, animations: "disabled",
    });
    await page
      .getByRole("button", { name: `查看 ${name}`, exact: true })
      .click();
    await page.getByRole("button", { name: "断开连接", exact: true }).click();
    await page.getByRole("button", { name: "确认断开" }).click();
    await expect(
      page.getByRole("button", { name: `查看 ${name}`, exact: true }),
    ).toContainText("未连接");
    await page.goto(`/${market}/workbench/?view=connectors&space=team-eureka`);
    await expect(
      page.getByRole("button", { name: "查看 Test MCP" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: `查看 ${name}`, exact: true }),
    ).toContainText("未连接");
    await page.goto(`/${market}/workbench/?view=calendar`);
    await expect(page.locator("#personal-actions")).toBeVisible();
    await page.locator("#ws-switcher").click();
    await page
      .locator("#ws-menu .ws-menu-space")
      .filter({ hasText: market === "cn" ? "百智 产品团队" : "EurekaMind 产品团队" })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/${market}/workbench/.*space=team-eureka`),
    );
    expect(errors).toEqual([]);
  });
  test(`${market}: subscription purchase and credit recharge stay in market`, async ({
    page,
  }) => {
    await login(page, market);
    await page.goto(`/${market}/workbench/?view=subscription`);
    await page
      .getByRole("button", { name: market === "cn" ? "立即升级 专业版" : "立即升级 Pro", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("button", { name: /确认支付/ })
      .last()
      .click();
    await expect(page.getByRole("dialog")).toContainText(market === "cn" ? "专业版 已生效" : "Pro 已生效");
    const state = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!),
      key(market, M.KEY),
    );
    expect(
      state.spaces.find((w: { id: string }) => w.id === "personal")
        .personalOrders[0].status,
    ).toBe("paid");
    const other = market === "cn" ? "global" : "cn";
    expect(
      await page.evaluate((k) => localStorage.getItem(k), key(other, M.KEY)),
    ).toBeNull();
    await page.goto(`/${market}/workbench/`);
    await page.locator("#user-card").click();
    await page.getByRole("button", { name: "充值", exact: true }).click();
    await page.getByRole("button", { name: "确认充值", exact: true }).click();
    await page.getByRole("button", { name: /确认支付/ }).click();
    await expect(page.getByRole("dialog")).toContainText("充值成功");
  });
}
test("same email has two independent sessions; logout is local to its market", async ({
  page,
  context,
}) => {
  await login(page, "cn");
  await page.evaluate(() =>
    localStorage.setItem("eureka:market:cn:marker", "CN ONLY"),
  );
  const overseas = await context.newPage();
  await overseas.goto("/global/workbench/");
  await expect(overseas.locator(".guest-app")).toBeVisible();
  await login(overseas, "global");
  await expect(overseas.locator(".workspace-brand-copy")).toContainText(
    "海外版",
  );
  await page.locator("#user-card").click();
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await expect(page).toHaveURL(/\/cn\/$/);
  await overseas.reload();
  await expect(overseas.locator("#ws-switcher")).toBeVisible();
  expect(
    await overseas.evaluate(() =>
      localStorage.getItem("eureka:market:cn:marker"),
    ),
  ).toBe("CN ONLY");
  expect(
    await overseas.evaluate(() =>
      localStorage.getItem("eureka:market:cn:eureka:auth:v1"),
    ),
  ).toBeNull();
  await page.goto("/cn/workbench/");
  await expect(page.locator(".guest-app")).toBeVisible();
});
test("connector save refuses expired access and stale writes without losing input", async ({
  page,
}) => {
  await login(page, "cn");
  await page.goto("/cn/workbench/?view=connectors&space=team-eureka");
  await page.getByRole("button", { name: "＋ 添加自定义连接器" }).click();
  await page.getByLabel("连接器名称").fill("Pending");
  await page.getByLabel("服务地址").fill("https://example.com");
  const seed = M.seed();
  seed.spaces.find((w) => w.id === "team-eureka")!.status = "expired";
  await page.evaluate(
    ({ k, s }) => localStorage.setItem(k, JSON.stringify(s)),
    { k: key("cn", M.KEY), s: seed },
  );
  await page.getByRole("button", { name: "保存连接器" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "权限已变化",
  );
  await expect(page.getByLabel("连接器名称")).toHaveValue("Pending");
  await page.goto("/cn/workbench/?view=connectors");
  await page.getByRole("button", { name: "＋ 添加自定义连接器" }).click();
  await page.getByLabel("连接器名称").fill("Stale");
  await page.getByLabel("服务地址").fill("https://example.com");
  await page.evaluate(
    (k) => localStorage.setItem(k, '{"version":1,"items":[]}'),
    key("cn", "eureka:connectors:native:v1:personal:zhang"),
  );
  await page.getByRole("button", { name: "保存连接器" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "其他页面",
  );
});
for (const width of [390, 768, 1440])
  test(`market entry and native connectors have no horizontal overflow at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const market of ["cn", "global"] as const) {
      await page.goto(`/${market}/`);
      await page.screenshot({
        path: `test-results/markets/${market}-auth-${width}.png`,
        fullPage: true, animations: "disabled",
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await login(page, market);
      await page.goto(`/${market}/workbench/?view=connectors`);
      await expect(page.locator(".connector-card").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.getByRole("button", { name: "＋ 添加自定义连接器" }).click();
      await expect(page.getByLabel("连接器名称")).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "＋ 添加自定义连接器" }),
      ).toBeFocused();
      await page.screenshot({
        path: `test-results/markets/${market}-connectors-${width}.png`,
        fullPage: true, animations: "disabled",
      });
    }
  });

for (const market of ["cn", "global"] as const) {
  test(`${market}: agent history uses only its regional identity and tool namespace`, async ({
    page,
  }) => {
    await login(page, market);
    await page.goto(`/${market}/workbench/?view=contacts&id=john`);
    await page
      .locator('[data-contact-action="toggle-xiaozhi"]')
      .first()
      .click();
    await page.locator("[data-contact-xiaozhi-input]").fill("整理开放承诺");
    await page.locator('[data-contact-action="send-xiaozhi"]').click();
    await expect(page.locator(".contacts-xiaozhi-answer")).toContainText(
      "双方待办",
    );
    const sessions = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!),
      key(market, "eureka:agent-sessions:v1"),
    );
    expect(sessions[0].agentId).toBe(`eurekamind-agent-${market}`);
    expect(sessions[0].dataMcp).toEqual([`${market}:contacts`]);
    expect(sessions[0].skills).toEqual([`${market}:relationship-followup`]);
    expect(
      await page.evaluate(
        (k) => localStorage.getItem(k),
        key(market === "cn" ? "global" : "cn", "eureka:agent-sessions:v1"),
      ),
    ).toBeNull();
  });
  test(`${market}: account without a team creates one through payment and keeps the same login`, async ({
    page,
  }) => {
    await login(page, market);
    const state = M.seed();
    state.spaces = state.spaces.filter((w) => w.type === "personal");
    state.devices = [];
    await page.evaluate(
      ({ k, s }) => localStorage.setItem(k, JSON.stringify(s)),
      { k: key(market, M.KEY), s: state },
    );
    await page.goto(`/${market}/workbench/?view=create-team`);
    await page.getByRole("button", { name: "创建团队", exact: true }).click();
    await page.locator('#ws-dialog [name="name"]').fill(`${market} 评审团队`);
    await page.getByRole("button", { name: "确认订单", exact: true }).click();
    await page
      .getByRole("button", { name: "支付并开通", exact: true })
      .click();
    await page.getByRole("button", { name: "进入团队", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${market}/workbench/`));
    await expect(page.locator("#ws-switcher")).toContainText(
      `${market} 评审团队`,
    );
    const session = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!),
      key(market, "eureka:auth:v1"),
    );
    expect(session.identity).toBe("same@example.com");
    await page.locator("#ws-switcher").click();
    await expect(
      page.getByRole("button", { name: "创建团队工作空间", exact: true }),
    ).toBeDisabled();
  });
}

test("connector storage failure retains the draft and creates no false success", async ({
  page,
}) => {
  await login(page, "cn");
  await page.goto("/cn/workbench/?view=connectors");
  await page.getByRole("button", { name: "＋ 添加自定义连接器" }).click();
  await page.getByLabel("连接器名称").fill("Unsaved MCP");
  await page.getByLabel("服务地址").fill("https://example.com/mcp");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k.includes("connectors:native")) throw new Error("演示存储已满");
      return original.call(this, k, v);
    };
  });
  await page.getByRole("button", { name: "保存连接器" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "存储已满",
  );
  await expect(page.getByLabel("连接器名称")).toHaveValue("Unsaved MCP");
  await expect(
    page.getByRole("button", { name: "查看 Unsaved MCP" }),
  ).toHaveCount(0);
});

for (const market of ["cn", "global"] as const) {
  for (const status of ["active", "expired", "cancelled"] as const) {
    test(`ACCOUNT-01 / MARKET-01: ${market} ${status} team blocks further membership without cross-market writes`, async ({ page }) => {
      await login(page, market);
      const state = M.seed(); M.get(state, "team-eureka").status = status;
      await page.evaluate(({ k, state }) => localStorage.setItem(k, JSON.stringify(state)), { k: key(market, M.KEY), state });
      await page.goto(`/${market}/workbench/?view=invitations`);
      await expect(page.getByRole("button", { name: "接受并进入" })).toBeDisabled();
      await page.keyboard.press("Escape");
      await page.locator("#ws-switcher").click();
      await expect(page.getByRole("button", { name: "创建团队工作空间", exact: true })).toBeDisabled();
      await expect(page.locator("#ws-menu .ws-menu-space")).toHaveCount(2);
      await page.goto(`/${market}/workbench/?view=create-team`);
      await page.getByRole("button", { name: "创建团队", exact: true }).click();
      await page.getByLabel("工作空间名称").fill("不应创建的第二团队");
      await page.getByRole("button", { name: "确认订单", exact: true }).click();
      await expect(page.locator("#ws-dialog .ws-form-error")).toContainText("最多只能");
      const after = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key(market, M.KEY));
      expect(M.accountTeams(after).map(w => w.id)).toEqual(["team-eureka"]);
      expect(after.orders).toEqual(state.orders);
      expect(after.invitations).toEqual(state.invitations);
      expect(M.get(after, "personal").credits).toEqual(M.get(state, "personal").credits);
      expect(await page.evaluate(k => localStorage.getItem(k), key(market === "cn" ? "global" : "cn", M.KEY))).toBeNull();
    });
  }
  test(`ACCOUNT-01: ${market} first invitation keeps the login and allows only personal plus one team`, async ({ page }) => {
    await login(page, market);
    const state = accountWithoutTeam();
    await page.evaluate(({ k, state }) => localStorage.setItem(k, JSON.stringify(state)), { k: key(market, M.KEY), state });
    await page.goto(`/${market}/workbench/?view=invitations`);
    await page.getByRole("button", { name: "接受并进入" }).click();
    await expect(page.locator("#ws-switcher")).toContainText("增长研究小组");
    await expect(page).toHaveURL(new RegExp(`/${market}/workbench/`));
    await page.reload();
    await page.locator("#ws-switcher").click();
    await expect(page.locator("#ws-menu .ws-menu-space")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "创建团队工作空间", exact: true })).toBeDisabled();
    const after = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key(market, M.KEY));
    expect(M.accountTeams(after)).toHaveLength(1);
    expect(M.get(after, "personal").credits).toEqual(M.get(state, "personal").credits);
    expect(M.get(after, "personal").entitlementFreeze).toBeUndefined();
    const session = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key(market, "eureka:auth:v1"));
    expect(session.identity).toBe("same@example.com");
  });
}
