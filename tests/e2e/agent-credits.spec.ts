import { test, expect, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import { mockUsageReceipt, tokenCost, validateReceipt } from "../../src/features/agent/usage";
import { settleAvailableRuns } from "../../src/features/agent/settlement";
import { markets } from "../../src/features/markets/config";
const workspaceKey = (market: string) => `eureka:market:${market}:eureka:workspaces:v2`;
async function login(page: Page, market: string) {
  await page.addInitScript(market => localStorage.setItem(`eureka:market:${market}:eureka:auth:v1`, JSON.stringify({ market, realm: `eureka-${market}`, identity: "credit-review@example.com", provider: "email" })), market);
}
async function openHome(page: Page, market: string, space = "personal", actor = "zhang", review = true) {
  await page.goto(`/${market}/workbench/?space=${space}&actor=${actor}${review ? "&review=1" : ""}`);
  await page.bringToFront();
  await page.locator(space === "personal" ? "#xiaozhi-entry" : 'button[aria-label="Ask Agent"]').first().click();
  await expect(page.getByTestId("agent-credits")).toHaveCount(0);
}
const launcher = (page: Page) => page.getByRole("button", { name: "评审工具", exact: true });
async function configure(page: Page, scenario: string) {
  await launcher(page).click();
  await page.getByLabel("计费预演场景").selectOption(scenario);
  await page.getByRole("button", { name: "应用到当前 Agent", exact: true }).click();
  await expect(page.getByTestId("simulation-assistant")).toHaveCount(0);
  await expect(page.getByTestId("agent-credits")).toHaveCount(0);
}
async function topup(page: Page) {
  await launcher(page).click();
  await page.getByRole("button", { name: /模拟(管理员)?到账 \+10 Credits/ }).click();
}
test("AGENT-CREDITS-01/02: actual receipt counts, finality, zero and precision", () => {
  const receipt = { ...mockUsageReceipt("actual"), source: "agentplatform" as const, model: "platform-model", inputTokens: 2345, outputTokens: 678 };
  expect(validateReceipt(receipt, "actual", markets.global.rates)).toBe(3.701);
  expect(tokenCost(mockUsageReceipt("zero", true), markets.cn.rates)).toBe(0);
  expect(() => validateReceipt(null, "actual", markets.global.rates)).toThrow("等待最终");
  expect(() => validateReceipt({ ...receipt, final: false }, "actual", markets.global.rates)).toThrow("等待最终");
  expect(() => validateReceipt(receipt, "different", markets.global.rates)).toThrow("不匹配");
  expect(() => validateReceipt({ ...receipt, rateVersion: "unknown" }, "actual", markets.global.rates)).toThrow("费率");
  for (const inputTokens of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER]) {
    expect(() => tokenCost({ inputTokens, outputTokens: Number.MAX_SAFE_INTEGER }, markets.global.rates)).toThrow();
  }
});

test("AGENT-CREDITS-02/03: exact, pending, conflicts, recovery and per-pool isolation", () => {
  const s = M.seed(), w = M.get(s, "personal"), team = M.get(s, "team-eureka");
  const teamBefore = JSON.stringify(team.credits);
  w.credits = { total: 2.4, used: 0, logs: [] };
  const receipt = mockUsageReceipt("once");
  expect(M.recordAgentUsage(w, "once", "问答", receipt).status).toBe("settled");
  expect(M.creditBalance(w)).toBe(0);
  M.recordAgentUsage(w, "once", "问答", receipt);
  M.recordAgentUsage(w, "once", "问答", { final: receipt.final, outputTokens: receipt.outputTokens, inputTokens: receipt.inputTokens, model: receipt.model, source: receipt.source, rateVersion: receipt.rateVersion, runId: receipt.runId });
  expect(w.credits.logs).toHaveLength(1);
  const before = JSON.stringify(w);
  expect(() => M.recordAgentUsage(w, "once", "问答", { ...receipt, outputTokens: 601 })).toThrow("冲突");
  expect(JSON.stringify(w)).toBe(before);
  expect(() => M.assertAgentAvailable(w)).toThrow("不足");
  expect(JSON.stringify(team.credits)).toBe(teamBefore);

  w.credits = { total: 0.5, used: 0, logs: [] }; w.agentRuns = [];
  const pending = M.recordAgentUsage(w, "later", "保留回答", null);
  expect(pending.status).toBe("pending"); expect(pending.cost).toBeNull();
  expect(() => M.assertAgentAvailable(w)).toThrow("待结算");
  const final = mockUsageReceipt("later");
  expect(M.recordAgentUsage(w, "later", "保留回答", final).status).toBe("insufficient");
  expect(w.credits.used).toBe(0);
  w.credits.total += 10;
  expect(M.recordAgentUsage(w, "later", "保留回答", final).status).toBe("settled");
  expect(w.credits.used).toBe(2.4); expect(w.agentRuns).toHaveLength(1);
  M.recordAgentUsage(w, "zero", "无消耗", mockUsageReceipt("zero", true));
  expect(w.credits.used).toBe(2.4);
  expect(w.credits.logs[0].amount).toBe(0);
  expect(() => M.recordAgentUsage(w, "later", "越权", final, "kevin")).toThrow();
});


test("automatic recovery preserves finality, entitlement, actor scope and idempotency", () => {
  const state=M.seed(), w=M.get(state,"team-eureka");
  w.credits={total:.5,used:0,logs:[]}; w.agentRuns=[];
  M.recordAgentUsage(w,"kevin-run","客户问题",mockUsageReceipt("kevin-run"),"kevin");
  M.recordAgentUsage(w,"zhang-run","会议问题",mockUsageReceipt("zhang-run"),"zhang");
  w.credits.total=10;
  w.status="expired"; settleAvailableRuns(w,"kevin"); expect(w.credits.used).toBe(0);
  w.status="active"; settleAvailableRuns(w,"kevin"); settleAvailableRuns(w,"kevin");
  expect(w.credits.used).toBe(2.4); expect(w.credits.logs).toHaveLength(1);
  expect(w.agentRuns.find(r=>r.runId==="zhang-run")!.status).toBe("insufficient");
  M.recordAgentUsage(w,"unknown","未确认费用",null,"kevin"); settleAvailableRuns(w,"kevin");
  expect(w.agentRuns.find(r=>r.runId==="unknown")!.status).toBe("pending");
});

for (const market of ["cn", "global"]) {
  for (const space of ["personal", "team-eureka"]) test(`${market}/${space}: simulation uses native composer and conversation, isolated balances and recovery`, async ({page}) => {
    test.setTimeout(90000); await login(page, market); await openHome(page, market, space);
    const before = await page.evaluate(k => localStorage.getItem(k), workspaceKey(market));
    const input = page.locator(space === "personal" ? "#xiaozhi-input" : ".ws-composer textarea");
    await page.clock.install();
    async function send(scenario: string) {
      await configure(page, scenario);
      await input.fill("整理当前场景的重点与后续行动"); await input.press("Enter");
      await page.clock.fastForward(6500);
    }
    for (const scenario of ["enough", "insufficient", "exact", "pending", "zero", "interrupted", "failure", "duplicate", "empty", ...(space === "team-eureka" ? ["concurrent", "expired"] : [])]) {
      await send(scenario);
      await expect(page.getByTestId("agent-credits")).toHaveCount(0);
      await expect(page.getByText("Credits 预演 ·", {exact:false})).toHaveCount(0);
      const usage=page.getByTestId("preview-usage");
      if (["empty", "expired"].includes(scenario)) {
        await expect(input).toHaveValue("整理当前场景的重点与后续行动");
        await expect(page.getByTestId("simulation-user")).toHaveCount(0);
        await expect(page.getByRole("alert").filter({hasText: scenario === "empty" ? "不足" : "到期"})).toBeVisible();
        if (scenario === "expired") {
          await expect(page.getByRole("link", {name:"管理订阅",exact:true})).toHaveAttribute("href", /subscription/);
          await launcher(page).click();
          await page.getByRole("button", {name:"模拟团队续费",exact:true}).click();
          await input.press("Enter"); await page.clock.fastForward(6500);
          await expect(usage).toContainText("本轮已扣 2.4 Credits");
        }
      } else {
        await expect(page.getByTestId("simulation-user")).toHaveCount(1);
        await expect(page.getByTestId("simulation-assistant")).not.toContainText(/tokens|1,200|600|费率|换算/);
        expect(await page.getByTestId("simulation-user").evaluate(el=>!!el.closest(".xiaozhi-intro, .ws-agent-scroll"))).toBe(true);
        if (["insufficient", "concurrent"].includes(scenario)) {
          await expect(usage).toContainText("待结算 2.4 Credits");
          await topup(page); await expect(page.getByRole("button", {name:"重新结算本轮",exact:true})).toHaveCount(0);
          await expect(usage).toContainText("本轮已扣 2.4 Credits"); await expect(page.getByTestId("simulation-user")).toHaveCount(1);
        } else if (scenario === "pending") {
          await expect(usage).toHaveText("消耗待确认 · 暂未扣费");
          await launcher(page).click(); await page.getByRole("button",{name:"模拟最终回执到达",exact:true}).click();
          await expect(usage).toContainText("本轮已扣 2.4 Credits");
        } else await expect(usage).toContainText(`本轮已扣 ${["zero","failure"].includes(scenario) ? "0" : scenario === "interrupted" ? "1.6" : "2.4"} Credits`);
        if (scenario === "failure") await expect(input).toHaveValue("整理当前场景的重点与后续行动");
        if (scenario === "exact") {
          await input.fill("下一轮的问题"); await input.press("Enter"); await expect(input).toHaveValue("下一轮的问题");
          await expect(page.getByTestId("simulation-user")).toHaveCount(1);
        }
      }
    }
    await configure(page, "enough");
    for (const question of ["第一轮问题","第二轮问题"]) { await input.fill(question); await input.press("Enter"); await page.clock.fastForward(6500); }
    await expect(page.getByTestId("simulation-user")).toHaveCount(2);
    await expect(page.getByTestId("preview-usage")).toHaveCount(2);
    expect(await page.evaluate(k => localStorage.getItem(k), workspaceKey(market))).toBe(before);
    await page.screenshot({path:`test-results/agent-credits/${market}-${space}-native-conversation.png`});
  });
  test(`${market}: actual composer retains insufficient input and settles original run after topup`, async ({ page }) => {
    await login(page, market);
    await openHome(page, market);
    // Persist a known small pool; the real UI should keep its reply and pending receipt.
    await page.evaluate(({ key, seed }) => {
      const s = JSON.parse(localStorage.getItem(key) || JSON.stringify(seed));
      s.spaces.find((w: { id: string }) => w.id === "personal").credits = { total: 0.5, used: 0, logs: [] };
      localStorage.setItem(key, JSON.stringify(s));
    }, { key: workspaceKey(market), seed: M.seed() });
    await openHome(page, market);
    await page.locator("#xiaozhi-input").fill("请整理本次记录");
    await page.locator("#xiaozhi-send").click();
    await expect(page.getByTestId("agent-credits")).toContainText("回答已保留", {timeout:10000});
    await expect(page.locator(".agent-history-message.user").last()).toContainText("请整理本次记录");
    await expect(page.locator(".agent-history-message.assistant").last()).not.toContainText("已收到你的问题");
    await expect(page.locator(".agent-history-message").last()).toBeInViewport();
    await page.screenshot({ path: `test-results/agent-credits/${market}-composer-insufficient.png` });
    await openHome(page, market); // An old pending run stays hidden until another send attempt.
    await page.locator("#xiaozhi-input").fill("保留这条未发送的问题");
    await page.locator("#xiaozhi-send").click();
    await expect(page.locator("#xiaozhi-input")).toHaveValue("保留这条未发送的问题");
    const before = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), workspaceKey(market));
    expect(before.spaces.find((w: { id: string }) => w.id === "personal").credits.used).toBe(0);
    await page.getByTestId("agent-credits").getByRole("button",{name:"充值 Credits",exact:true}).click();
    const checkout = page.getByRole("dialog",{name:"充值 Credits",exact:true});
    await checkout.locator(".ex-sku").first().click();
    await checkout.getByRole("button",{name:"确认充值",exact:true}).click();
    await checkout.getByRole("button",{name:"确认支付",exact:true}).click();
    await expect(checkout).toContainText("充值成功");
    await checkout.getByRole("button",{name:"关闭",exact:true}).click();
    await expect(page.getByTestId("agent-credits")).toContainText("本轮已扣 2.4 Credits");
    await expect(page.getByRole("button", { name: "重新结算本轮", exact: true })).toHaveCount(0);
    const after = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), workspaceKey(market));
    const w = after.spaces.find((w: { id: string }) => w.id === "personal");
    expect(w.credits.used).toBe(2.4); expect(w.credits.logs).toHaveLength(1); expect(w.agentRuns).toHaveLength(1);
    expect(after.spaces.find((w: { id: string }) => w.id === "team-eureka").credits).toEqual(before.spaces.find((w: { id: string }) => w.id === "team-eureka").credits);
    await expect(page.locator("#xiaozhi-input")).toHaveValue("保留这条未发送的问题");
  });


  test(`${market}: all scenes use existing inputs and team member recovery stays in the team pool`, async ({page}) => {
    test.setTimeout(90000); await login(page,market);
    const scenes = [
      ["", "#xiaozhi-entry", "#xiaozhi-input"],
      ["view=thoughts", '[data-th="ask"]', "#xiaozhi-input"],
      ["view=calendar", '[data-pa="agent"]', "#pa-agent-prompt textarea"],
      ["view=contacts&id=john", ".contacts-xiaozhi-entry", "[data-contact-xiaozhi-input]"],
      ["view=meeting&id=meeting-1", ".md-ask-agent", "#xiaozhi-input"],
      ["view=recording", "#recording-assistant-toggle", "#recording-assistant-input"],
      ["view=history&id=本周会议决策整理", "", "#xiaozhi-input"],
      ["space=team-eureka", 'button[aria-label="Ask Agent"]', ".ws-composer textarea"],
      ["view=thoughts&space=team-eureka", '[data-th="ask"]', "#xiaozhi-input"],
      ["view=calendar&space=team-eureka", '[data-pa="agent"]', "#pa-agent-prompt textarea"],
      ["view=contacts&space=team-eureka", ".contacts-xiaozhi-entry", "[data-contact-xiaozhi-input]"],
      ["view=meeting&space=team-eureka&id=team-review", ".md-ask-agent", ".ws-composer textarea"],
      ["view=recording&space=team-eureka", "#recording-assistant-toggle", "#recording-assistant-input"],
    ];
    for (const [query,entry,selector] of scenes) {
      await page.goto(`/${market}/workbench/?${query}&review=1`); await page.bringToFront();
      if (entry) await page.locator(entry).first().click();
      await configure(page,"empty"); const input=page.locator(selector);
      await input.fill("不足时保留的问题");await input.press("Enter");await expect(input).toHaveValue("不足时保留的问题");
      await configure(page,"enough");await input.press("Enter");
      await expect(page.getByTestId("simulation-user")).toContainText("不足时保留的问题");
      await expect(page.getByRole("button",{name:"停止生成",exact:true})).toBeVisible();
      await page.getByRole("button",{name:"停止生成",exact:true}).click();
      await expect(page.getByTestId("preview-usage")).toContainText("1.6 Credits");
      if (/view=(recording|calendar|contacts)/.test(query)) await page.screenshot({path:`test-results/agent-credits/${market}-${query.split("&")[0]}-${query.includes("team-eureka") ? "team" : "personal"}.png`});
      await launcher(page).click();await page.getByRole("button",{name:"结束模拟",exact:true}).click();await page.getByRole("button",{name:"关闭评审工具",exact:true}).click();
      await input.fill("请总结当前内容的重点");await input.press("Enter");
      await expect(page.getByTestId("agent-credits")).toContainText("已扣 2.4", {timeout:10000});
    }
    await openHome(page,market,"team-eureka","kevin");await configure(page,"insufficient");
    await page.locator(".ws-composer textarea").fill("请整理会议");await page.locator(".ws-composer textarea").press("Enter");
    await expect(page.getByTestId("preview-usage")).toContainText("待结算",{timeout:10000});
    await expect(page.getByTestId("simulation-assistant").getByRole("button",{name:"充值 Credits",exact:true})).toHaveCount(0);
    await expect(page.getByTestId("simulation-assistant")).toContainText("请联系团队管理员充值");await launcher(page).click();await page.getByRole("button",{name:"模拟管理员到账 +10 Credits",exact:true}).click();
    await expect(page.getByRole("button",{name:"重新结算本轮",exact:true})).toHaveCount(0);await expect(page.getByTestId("preview-usage")).toContainText("本轮已扣 2.4 Credits");
  });
  for (const space of ["personal", "team-eureka"]) test(`${market}/${space}: recharge opens existing checkout and automatically recovers without real ledger writes`, async ({page}) => {
    await login(page,market); await openHome(page,market,space); await page.clock.install();
    const before = await page.evaluate(k => localStorage.getItem(k), workspaceKey(market));
    const input = page.locator(space === "personal" ? "#xiaozhi-input" : ".ws-composer textarea");
    await configure(page,"insufficient"); await input.fill("分析近期客户会议中的重点需求"); await input.press("Enter"); await page.clock.fastForward(6500);
    const answer = page.getByTestId("preview-answer"), original = await answer.textContent();
    const note = page.getByTestId("agent-system-note");
    const typography = await answer.evaluate(el => ({size:parseFloat(getComputedStyle(el).fontSize), color:getComputedStyle(el).color}));
    const hint = await note.evaluate(el => ({size:parseFloat(getComputedStyle(el).fontSize), color:getComputedStyle(el).color}));
    expect(hint.size).toBeLessThan(typography.size); expect(hint.color).not.toBe(typography.color);
    await expect(page.getByRole("button",{name:"重新结算本轮",exact:true})).toHaveCount(0);
    for (const width of [1440,1080,390]) {
      await page.setViewportSize({width,height:width === 1080 ? 680 : 900});
      await page.clock.runFor(200);
      await expect(input).toBeInViewport();
      await page.screenshot({path:`test-results/agent-credits/${market}-${space}-${width}-payment-feedback.png`});
    }
    const recharge = page.getByTestId("simulation-assistant").getByRole("button", {name:"充值 Credits",exact:true});
    await recharge.click();
    const dialog = page.getByRole("dialog", {name:"充值 Credits",exact:true});
    await expect(dialog).toBeVisible(); await expect(page.getByRole("dialog",{name:"评审工具",exact:true})).toHaveCount(0);
    await expect(dialog).toContainText(market === "cn" ? "CNY" : "USD");
    await dialog.getByRole("button", {name:"关闭",exact:true}).click(); await expect(recharge).toBeFocused();
    await expect(page.getByTestId("preview-usage")).toContainText("待结算 2.4 Credits");
    await recharge.click(); await dialog.locator(".ex-sku").first().click(); await dialog.getByRole("button",{name:"确认充值",exact:true}).click();
    await dialog.getByRole("button",{name:"取消订单",exact:true}).click();
    await expect(page.getByTestId("preview-usage")).toContainText("待结算 2.4 Credits");
    await dialog.getByRole("button",{name:"确认充值",exact:true}).click();
    await dialog.getByRole("button",{name:"模拟支付失败",exact:true}).click(); await expect(dialog).toContainText("支付未完成");
    await expect(page.getByTestId("preview-usage")).toContainText("待结算 2.4 Credits");
    await dialog.getByRole("button",{name:"重试支付",exact:true}).click(); await expect(dialog).toContainText("充值成功");
    await dialog.getByRole("button",{name:"关闭",exact:true}).click(); await page.clock.runFor(50);
    await expect(page.getByTestId("simulation-assistant")).toBeFocused();
    await expect(page.getByTestId("preview-usage")).toContainText("本轮已扣 2.4 Credits"); await expect(answer).toHaveText(original!);
    await expect(page.getByTestId("simulation-user")).toHaveCount(1);
    expect(await page.evaluate(k => localStorage.getItem(k), workspaceKey(market))).toBe(before);
    await launcher(page).click(); await expect(page.getByRole("dialog",{name:"评审工具",exact:true})).toContainText("4,998.1");
  });
  for (const space of ["personal", "team-eureka"]) test(`${market}/${space}: process events follow streamed text and stop without late updates`, async ({page}) => {
    await login(page, market); await openHome(page, market, space);
    const input = page.locator(space === "personal" ? "#xiaozhi-input" : ".ws-composer textarea");
    await page.clock.install(); await configure(page, "enough");
    await input.fill("结合知识库生成一份项目复盘报告"); await input.press("Enter");
    await page.clock.runFor(400);
    if (space === "team-eureka") await expect(page.locator(".ws-agent-prompts")).toHaveCount(0);
    const intro = await page.getByTestId("preview-answer").textContent();
    expect(intro!.length).toBeGreaterThan(0);
    await page.clock.runFor(500);
    await expect(page.getByTestId("agent-process-label")).toHaveText("加载 skill · 复盘整理");
    const paused = await page.getByTestId("preview-answer").textContent();
    await page.clock.runFor(1600);
    await expect(page.getByTestId("agent-process-label")).toHaveText("调用 MCP · 知识库检索");
    await expect(page.getByTestId("preview-answer")).toHaveText(paused!);
    await page.screenshot({path:`test-results/agent-credits/${market}-${space}-mcp-event.png`});
    const copy = await page.getByTestId("agent-waiting-copy").textContent();
    await page.clock.runFor(1200);
    await expect(page.getByTestId("agent-waiting-copy")).not.toHaveText(copy!);
    expect(await page.getByTestId("agent-process-label").evaluate(el => {
      const row = el.closest('[data-testid="simulation-assistant"]')!;
      return !!(row.querySelector('[data-testid="preview-answer"]')!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
    await page.clock.runFor(600);
    await expect(page.getByTestId("agent-process-label")).toHaveText("读取文件 · 项目资料.md");
    await page.getByTestId("agent-process-label").click();
    await expect(page.getByRole("list", {name:"执行步骤"})).toContainText("项目资料.md");
    await page.screenshot({path:`test-results/agent-credits/${market}-${space}-file-event.png`});
    await page.clock.runFor(800);
    await expect(page.getByTestId("agent-process-label")).toHaveText("组织回答");
    expect((await page.getByTestId("preview-answer").textContent())!.length).toBeGreaterThan(paused!.length);
    await page.screenshot({path:`test-results/agent-credits/${market}-${space}-resumed-stream.png`});
    await page.clock.runFor(1800);
    await expect(page.getByTestId("preview-answer")).toContainText("复盘提纲");
    await expect(page.getByTestId("agent-process-label")).toHaveCount(0);
    await expect(page.getByTestId("preview-usage")).toHaveCount(1);
    await expect(page.getByTestId("simulation-assistant")).not.toContainText(/tokens|输入.*输出|换算/);

    await input.fill("分析客户需求"); await input.press("Enter"); await page.clock.runFor(2600);
    await expect(page.getByTestId("agent-process-label")).toContainText("调用 MCP");
    const partial = await page.getByTestId("preview-answer").last().textContent();
    await page.getByRole("button",{name:"停止生成",exact:true}).click(); await page.clock.fastForward(10000);
    await expect(page.getByTestId("preview-answer").last()).toHaveText(partial!);
    await expect(page.getByTestId("agent-process-label")).toHaveCount(0);
    await expect(page.getByTestId("preview-usage").last()).toContainText("1.6 Credits");

    await launcher(page).click(); await page.getByLabel("响应过程").selectOption("text");
    await page.getByRole("button",{name:"应用到当前 Agent",exact:true}).click();
    await input.fill("整理会议行动清单"); await input.press("Enter"); await page.clock.runFor(2600);
    await expect(page.getByTestId("agent-process-label")).toHaveText("组织回答");
    await expect(page.getByTestId("simulation-assistant")).not.toContainText(/调用 MCP|加载 skill/);
    await page.clock.fastForward(6500);
    await expect(page.getByTestId("preview-answer")).toContainText("行动清单草案");
  });
  test(`${market}: ordinary home chat streams distinct roles and keeps charges with their reply`, async ({page}) => {
    await login(page,market); await openHome(page,market); await page.clock.install();
    await page.locator("#xiaozhi-input").fill("分析近期客户会议中的重点需求");
    await page.locator("#xiaozhi-send").click(); await page.clock.runFor(400);
    await expect(page.locator(".agent-history-message.user")).toContainText("分析近期客户会议中的重点需求");
    await expect(page.getByTestId("native-stream-answer")).not.toBeEmpty();
    await expect(page.getByTestId("agent-credits")).toHaveCount(0);
    await page.clock.runFor(2200);
    await expect(page.getByTestId("agent-process-label")).toContainText("调用 MCP");
    await page.clock.fastForward(6500);
    await expect(page.locator(".agent-history-message.assistant")).toContainText("核心诉求");
    await expect(page.locator(".agent-history-message.assistant")).not.toContainText("已收到你的问题");
    await expect(page.locator(".agent-history-message.assistant").getByTestId("agent-credits")).toContainText("2.4 Credits");
    await expect(page.getByTestId("agent-process-label")).toHaveCount(0);
    await page.locator("#xiaozhi-input").fill("生成一份项目复盘"); await page.locator("#xiaozhi-send").click();
    await page.clock.runFor(1000);
    const partial = await page.getByTestId("native-stream-answer").textContent();
    await page.locator("#xiaozhi-send").click(); await page.clock.fastForward(10000);
    await expect(page.getByTestId("agent-process-label")).toHaveCount(0);
    await expect(page.locator(".agent-history-message.assistant").last()).toContainText(partial!);
    await expect(page.locator(".agent-history-message.assistant").last()).toContainText("已停止生成");
    await expect(page.locator(".agent-history-message.assistant").last()).toContainText("消耗待确认");
    await expect(page.locator("#xiaozhi-input")).toHaveValue("生成一份项目复盘");
    await configure(page,"enough");
    await page.locator("#xiaozhi-input").fill("整理行动项"); await page.locator("#xiaozhi-send").click(); await page.clock.fastForward(6500);
    await expect(page.getByTestId("agent-credits")).toHaveCount(0);
    await expect(page.getByTestId("preview-usage")).toHaveCount(1);
  });
  for (const width of [390,1440]) test(`${market}: native streaming and draggable review at ${width}px`, async ({page})=>{
    await login(page,market);await page.setViewportSize({width,height:900});await openHome(page,market);
    const button=launcher(page), box=(await button.boundingBox())!;
    await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(40,180,{steps:10});await page.mouse.up();
    await expect(page.getByRole("dialog",{name:"评审工具",exact:true})).toHaveCount(0);
    expect((await button.boundingBox())!.x).toBeCloseTo(20,0);await button.focus();await button.press("ArrowRight");expect((await button.boundingBox())!.x).toBeCloseTo(30,0);
    await configure(page,"enough");
    await page.getByRole("button",{name:"整理行动项",exact:true}).click();
    await expect(page.locator("#xiaozhi-input")).toHaveValue("整理本周会议并生成行动清单");
    await page.clock.install();
    await page.locator("#xiaozhi-send").click();await expect(page.locator("#xiaozhi-send")).toHaveAttribute("aria-label","停止生成");
    await expect(page.getByTestId("simulation-user")).toContainText("整理本周会议并生成行动清单");
    await page.clock.runFor(900);
    await expect(page.getByTestId("agent-process-label")).toContainText("加载 skill");
    const skillCopy = await page.getByTestId("agent-waiting-copy").textContent();
    await page.clock.runFor(1200);
    await expect(page.getByTestId("agent-waiting-copy")).not.toHaveText(skillCopy!);
    await page.clock.runFor(400);
    await expect(page.getByTestId("agent-process-label")).toContainText("调用 MCP");
    await expect(page.getByTestId("preview-answer")).not.toBeEmpty();
    await expect(page.getByTestId("agent-credits")).toHaveCount(0);
    await expect(page.getByText("让每次讨论都有下一步",{exact:true})).toHaveCount(0);
    await expect(page.locator("#xiaozhi-send")).toBeInViewport();await page.screenshot({path:`test-results/agent-credits/${market}-${width}-native-stream.png`});
    await page.locator("#xiaozhi-send").click();await expect(page.getByTestId("preview-usage")).toContainText("1.6 Credits");await expect(page.getByTestId("agent-waiting-copy")).toHaveCount(0);
    await expect(page.locator("#xiaozhi-send")).toHaveAttribute("aria-label","发送给 Ask Agent");
    await page.reload();await expect.poll(async()=>(await launcher(page).boundingBox())?.x).toBeCloseTo(30,0);
  });
}
