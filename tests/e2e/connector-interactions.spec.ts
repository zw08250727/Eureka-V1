import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/cn/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.getByRole("button", { name: "个人/团队版", exact: true }).click();
  await page.getByRole("button", { name: "邮箱", exact: true }).click();
  await page.locator("#terms").check();
  await page.locator("#email").fill("connector@example.com");
  await page.locator("#code").fill("123456");
  await page.locator("#submit").click();
  await expect(page).toHaveURL(/\/cn\/workbench\//);
}

test("domestic logos use vendor SVG assets and the custom editor follows both modes", async ({ page }) => {
  await login(page);
  await page.goto("/cn/workbench/?view=connectors");
  await expect(page.locator(".connectors-page .connector-search")).toHaveCount(0);
  for (const id of ["dingtalk", "feishu", "tencent-meeting"]) {
    await expect(page.locator(`.connector-card.is-system .connector-mark-${id} img`)).toHaveAttribute("src", new RegExp(`/assets/connectors/${id}\\.svg$`));
  }
  const custom = page.getByRole("button", { name: "查看 通讯录" });
  await expect(custom.locator(".connector-kind")).toHaveText("已连接 14 个tools");
  await expect(page.getByRole("button", { name: "查看 文档" }).locator(".connector-kind")).toHaveText("已连接 3 个tools");
  await expect(page.getByRole("button", { name: "查看 待办" }).locator(".connector-kind")).toHaveText("已连接 4 个tools");
  await expect(page.locator(".connector-card.is-custom")).toHaveCount(3);
  await expect(page.locator(".connector-card.is-custom").filter({ hasText: "已连接 0 个tools" })).toHaveCount(0);
  await expect(custom).not.toContainText("官方预置");
  await expect(custom).not.toContainText("未连接");
  const systemHeight = (await page.locator(".connector-card.is-system").first().boundingBox())!.height;
  expect(systemHeight).toBe(150);
  expect((await custom.boundingBox())!.height).toBe(systemHeight);
  expect((await page.getByRole("button", { name: "新增连接器" }).boundingBox())!.height).toBe(systemHeight);
  await page.getByRole("button", { name: "新增连接器" }).click();
  const dialog = page.getByRole("dialog", { name: "添加自定义连接器" });
  await expect(dialog).toContainText("将 MCP 服务接入百智");
  const tutorial = dialog.getByRole("link", { name: /配置教程/ });
  await expect(tutorial).toHaveAttribute("href", "https://www.yuque.com/bairongbaizhi/xp2skr/stutwdfq1lr3t4dt?singleDoc#");
  await expect(tutorial).toHaveAttribute("target", "_blank");
  await expect(dialog.getByLabel("直接URL接入")).toBeChecked();
  await expect(dialog.getByPlaceholder("请输入 MCP 服务地址（https://...）")).toBeVisible();
  await page.screenshot({ path: "test-results/markets/cn-connector-editor-url.png", animations: "disabled" });
  await dialog.getByLabel("通过JSON导入").check();
  await expect(dialog.getByLabel("JSON 配置")).toBeVisible();
  await page.screenshot({ path: "test-results/markets/cn-connector-editor-json.png", animations: "disabled" });
});

test("domestic DingTalk starts connected for visual comparison and disconnect remains explicit", async ({ page }) => {
  await login(page);
  await page.goto("/cn/workbench/?view=connectors");
  const card = page.getByRole("button", { name: "查看 钉钉" });
  await expect(card).toHaveAttribute("data-connected", "true");
  await card.click();
  const detail = page.getByRole("dialog", { name: "钉钉 · 连接器详情" });
  await expect(detail.locator(".connector-mark-dingtalk img")).toHaveAttribute("src", /\/assets\/connectors\/dingtalk\.svg$/);
  await expect(detail).toContainText("已连接");
  await page.screenshot({ path: "test-results/markets/cn-dingtalk-connected-detail.png", animations: "disabled" });
  await detail.getByRole("button", { name: "断开连接" }).click();
  const confirmation = page.getByRole("dialog", { name: "确认断开此连接器" });
  await expect(confirmation).toContainText("断开后将无法继续使用该连接器，可随时重新安装。");
  await page.screenshot({ path: "test-results/markets/cn-disconnect-confirmation.png", animations: "disabled" });
  await confirmation.getByRole("button", { name: "取消" }).click();
  await expect(card).toHaveAttribute("data-connected", "true");
  await detail.getByRole("button", { name: "断开连接" }).click();
  await page.keyboard.press("Escape");
  await expect(confirmation).toHaveCount(0);
  await expect(detail).toBeVisible();
  await expect(card).toHaveAttribute("data-connected", "true");
  await detail.getByRole("button", { name: "断开连接" }).click();
  await confirmation.getByRole("button", { name: "确认", exact: true }).click();
  await expect(card).toHaveAttribute("data-connected", "false");
  await page.reload();
  await expect(card).toHaveAttribute("data-connected", "false");
});

test("system details use original vendor SVGs and a chain icon on Connect", async ({ page }) => {
  await login(page);
  await page.goto("/cn/workbench/?view=connectors");
  for (const [name, id] of [["飞书", "feishu"], ["腾讯会议", "tencent-meeting"]] as const) {
    await page.getByRole("button", { name: `查看 ${name}` }).click();
    const detail = page.getByRole("dialog", { name: `${name} · 连接器详情` });
    await expect(detail.locator(`.connector-mark-${id} img`)).toHaveAttribute("src", new RegExp(`/assets/connectors/${id}\\.svg$`));
    const connect = detail.getByRole("button", { name: "连接", exact: true });
    await expect(connect.locator(".connector-link-icon")).toHaveCount(1);
    await page.screenshot({ path: `test-results/markets/cn-${id}-unconnected-detail.png`, animations: "disabled" });
    await detail.getByRole("button", { name: "关闭对话框" }).click();
  }
});

test("DingTalk login and Feishu app creation support partial permission authorization", async ({ page }) => {
  await login(page);
  await page.goto("/cn/workbench/?view=connectors");
  await page.evaluate(() => localStorage.setItem("eureka:market:cn:eureka:connectors:native:v1:personal:zhang", JSON.stringify({ version: 1, items: [
    { id: "dingtalk", name: "钉钉", description: "钉钉", tools: 8, connected: false, custom: false },
    { id: "feishu", name: "飞书", description: "飞书", tools: 30, connected: false, custom: false },
    { id: "tencent-meeting", name: "腾讯会议", description: "腾讯会议", tools: 4, connected: false, custom: false },
  ] })));
  await page.reload();

  await page.getByRole("button", { name: "查看 钉钉" }).click();
  const dingtalkDetail = page.getByRole("dialog", { name: "钉钉 · 连接器详情" });
  const detailSize = await dingtalkDetail.boundingBox();
  await dingtalkDetail.getByRole("button", { name: "连接", exact: true }).click();
  const dingtalk = page.getByRole("dialog", { name: "钉钉 登录与授权" });
  await expect(dingtalk).toContainText("DingTalk Workspace");
  const authorizationSize = await dingtalk.boundingBox();
  expect(Math.abs((authorizationSize?.width || 0) - (detailSize?.width || 0))).toBeLessThan(3);
  expect(Math.abs((authorizationSize?.height || 0) - (detailSize?.height || 0))).toBeLessThan(3);
  await page.screenshot({ path: "test-results/markets/cn-dingtalk-login.png", animations: "disabled" });
  await dingtalk.getByRole("button", { name: "立即登录" }).click();
  await page.screenshot({ path: "test-results/markets/cn-dingtalk-permissions.png", animations: "disabled" });
  await dingtalk.getByRole("checkbox", { name: /AI 表格/ }).uncheck();
  await expect(dingtalk.getByText("已选 115 项权限")).toBeVisible();
  await dingtalk.getByRole("button", { name: "授权并连接" }).click();
  await expect(dingtalk).toContainText("授权成功");
  await page.screenshot({ path: "test-results/markets/cn-dingtalk-authorization-success.png", animations: "disabled" });
  await expect(dingtalk).toHaveCount(0, { timeout: 3000 });
  await expect(dingtalkDetail).toContainText("已连接");
  await expect(dingtalkDetail.getByRole("heading", { name: "快速查看已连接数据" })).toBeVisible();
  await expect(dingtalkDetail.getByRole("heading", { name: "已成功接入的工具列表" })).toBeVisible();
  await expect(dingtalkDetail.getByRole("button", { name: "＋ 新增授权工具" })).toBeVisible();
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem("eureka:market:cn:eureka:connectors:native:v1:personal:zhang")!));
  expect(stored.items.find((item: { id: string }) => item.id === "dingtalk").authorizedScopes).toEqual(["messages", "contacts", "calendar"]);
  await dingtalkDetail.getByRole("button", { name: "＋ 新增授权工具" }).click();
  await expect(dingtalk).toContainText("确定开通并授权以下权限吗？");
  await expect(dingtalk).not.toContainText("DingTalk Workspace");
  await dingtalk.getByRole("checkbox", { name: "全选" }).check();
  await dingtalk.getByRole("button", { name: "授权并连接" }).click();
  await expect(dingtalk).toHaveCount(0, { timeout: 3000 });
  await expect(dingtalkDetail.getByRole("button", { name: "＋ 新增授权工具" })).toHaveCount(0);
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem("eureka:market:cn:eureka:connectors:native:v1:personal:zhang")!));
  expect(stored.items.find((item: { id: string }) => item.id === "dingtalk").authorizedScopes).toEqual(["messages", "contacts", "tables", "calendar"]);
  await dingtalkDetail.getByRole("button", { name: "关闭对话框" }).click();

  await page.getByRole("button", { name: "查看 飞书" }).click();
  await page.getByRole("dialog", { name: "飞书 · 连接器详情" }).getByRole("button", { name: "连接", exact: true }).click();
  const feishu = page.getByRole("dialog", { name: "飞书 登录与授权" });
  await expect(feishu).toContainText("创建飞书 CLI 应用");
  await page.screenshot({ path: "test-results/markets/cn-feishu-create-app.png", animations: "disabled" });
  await feishu.getByLabel("名称 *").fill("项目协作 CLI");
  await feishu.getByRole("button", { name: "创建", exact: true }).click();
  await page.screenshot({ path: "test-results/markets/cn-feishu-permissions.png", animations: "disabled" });
  await feishu.getByRole("checkbox", { name: /云文档/ }).uncheck();
  await feishu.getByRole("button", { name: "授权并连接" }).click();
  await expect(feishu).toContainText("授权成功");
  await expect(feishu).toHaveCount(0, { timeout: 3000 });
  await expect(page.getByRole("dialog", { name: "飞书 · 连接器详情" })).toContainText("已连接");
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem("eureka:market:cn:eureka:connectors:native:v1:personal:zhang")!));
  expect(stored.items.find((item: { id: string }) => item.id === "feishu").authorizedScopes).toEqual(["messages", "contacts", "calendar"]);
});

test("a connected custom preset shows its tool catalog and edit and uninstall actions", async ({ page }) => {
  await login(page);
  await page.goto("/cn/workbench/?view=connectors");
  await page.getByRole("button", { name: "查看 通讯录" }).click();
  const detail = page.getByRole("dialog", { name: "通讯录 · 工具详情" });
  await expect(detail).toContainText("已集成14个tools");
  await expect(detail.getByRole("listitem")).toHaveCount(14);
  await page.screenshot({ path: "test-results/markets/cn-custom-tools.png", animations: "disabled" });
  await detail.getByRole("button", { name: "去编辑" }).click();
  await expect(page.getByRole("dialog", { name: "编辑自定义连接器" })).toBeVisible();
  await expect(page.getByPlaceholder("请输入连接器名称")).toHaveValue("通讯录");
  await page.getByRole("dialog", { name: "编辑自定义连接器" }).getByRole("button", { name: "取消" }).click();
  await page.getByRole("button", { name: "查看 通讯录" }).click();
  await detail.getByRole("button", { name: "卸载" }).click();
  await detail.getByRole("button", { name: "确认卸载" }).click();
  await expect(page.getByRole("button", { name: "查看 通讯录" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "查看 通讯录" })).toHaveCount(0);
});

test("document and todo demos expose discovered tools", async ({ page }) => {
  await login(page);
  await page.goto("/cn/workbench/?view=connectors");
  await page.getByRole("button", { name: "查看 文档" }).click();
  await expect(page.getByRole("dialog", { name: "文档 · 工具详情" }).getByRole("listitem")).toHaveCount(3);
  await page.getByRole("dialog", { name: "文档 · 工具详情" }).getByRole("button", { name: "关闭对话框" }).click();
  await page.getByRole("button", { name: "查看 待办" }).click();
  await expect(page.getByRole("dialog", { name: "待办 · 工具详情" }).getByRole("listitem")).toHaveCount(4);
});

test("incomplete custom configuration stays accessible outside the successful card list", async ({ page }) => {
  await login(page);
  await page.goto("/cn/workbench/?view=connectors");
  await page.evaluate(() => localStorage.setItem("eureka:market:cn:eureka:connectors:native:v1:personal:zhang", JSON.stringify({ version: 1, items: [
    { id: "pending-mcp", name: "待配置服务", description: "已保存配置", tools: 0, connected: false, custom: true, url: "https://example.com/mcp" },
    { id: "stale-connected", name: "旧连接", description: "缺少工具清单", tools: 3, connected: true, custom: true, url: "https://example.com/old" },
  ] })));
  await page.reload();
  await expect(page.locator(".connector-card.is-system")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "查看 待配置服务" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "查看 旧连接" })).toHaveCount(0);
  await page.getByRole("button", { name: "待接入配置 2" }).click();
  await expect(page.getByRole("dialog", { name: "待接入配置" })).toContainText("旧连接");
  await page.getByRole("dialog", { name: "待接入配置" }).getByRole("button", { name: "继续配置" }).first().click();
  await expect(page.getByPlaceholder("请输入连接器名称")).toHaveValue("待配置服务");
  await page.getByRole("dialog", { name: "编辑自定义连接器" }).getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("button", { name: "查看 待配置服务" }).locator(".connector-kind")).toHaveText("已连接 3 个tools");
  await page.reload();
  await expect(page.getByRole("button", { name: "查看 待配置服务" })).toBeVisible();
});

test("connected recommendations navigate by content and disconnected recommendations stay disabled", async ({ page }) => {
  await login(page);
  for (const [title, view] of [["浏览本周会议", "home"], ["查看本周日程", "calendar"], ["梳理我的未完成待办", "calendar"]] as const) {
    await page.goto("/cn/workbench/?view=connectors&review=1");
    await page.getByRole("button", { name: "查看 飞书" }).click();
    const detail = page.getByRole("dialog", { name: "飞书 · 连接器详情" });
    await expect(detail.getByRole("button", { name: title })).toBeDisabled();
    await detail.getByRole("button", { name: "评审：模拟授权成功" }).click();
    await page.getByRole("button", { name: "查看 飞书" }).click();
    await detail.getByRole("button", { name: title }).click();
    await expect(page).toHaveURL(new RegExp(`view=${view}`));
  }
});

test("home and calendar Agent pickers toggle connections and open connector details", async ({ page }) => {
  await login(page);
  await page.evaluate(() => {
    localStorage.setItem("eureka:market:cn:eureka:connectors:native:v1:personal:zhang", JSON.stringify({ version: 1, items: [
      { id: "dingtalk", name: "钉钉", description: "钉钉", tools: 8, connected: false, demoDisconnected: true, custom: false },
      { id: "feishu", name: "飞书", description: "飞书", tools: 30, connected: true, custom: false },
      { id: "tencent-meeting", name: "腾讯会议", description: "会议", tools: 4, connected: false, custom: false },
      { id: "custom-contacts", name: "通讯录", description: "自定义", tools: 1, connected: true, custom: true, toolDefinitions: [{ name: "contact_list", description: "查询联系人" }] },
    ] }));
  });
  await page.goto("/cn/workbench/?view=home");
  await page.getByRole("button", { name: "Ask Agent", exact: true }).click();
  const agent = page.locator("#xiaozhi-rail");
  const trigger = agent.getByRole("button", { name: "连接器", exact: true });
  await expect(trigger).toContainText("连接器");
  expect((await trigger.boundingBox())!.width).toBeGreaterThan(90);
  await trigger.click();
  const popover = page.getByRole("dialog", { name: "连接器选择" });
  await expect(popover).toBeVisible();
  await expect(popover.getByRole("button", { name: "连接" }).first().locator(".connector-link-icon")).toHaveCount(1);
  for (const id of ["feishu", "dingtalk", "tencent-meeting"]) await expect(popover.locator(`.connector-mark-${id} img`)).toHaveAttribute("src", new RegExp(`/assets/connectors/${id}\\.svg$`));
  await expect(popover.getByRole("switch", { name: "通讯录 关闭" })).toHaveAttribute("aria-checked", "true");
  const box = (await popover.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1280);
  await page.screenshot({ path: "test-results/markets/cn-agent-connector-picker.png", animations: "disabled" });
  const toggle = popover.getByRole("switch", { name: "飞书 关闭" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(popover.getByRole("switch", { name: "飞书 启用" })).toHaveAttribute("aria-checked", "false");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("eureka:market:cn:eureka:connectors:native:v1:personal:zhang")!).items.find((item: { id: string }) => item.id === "feishu").enabled)).toBe(false);
  await popover.getByRole("button", { name: "连接" }).first().click();
  await expect(page).toHaveURL(/view=connectors/);
  await expect(page.getByRole("dialog", { name: "钉钉 · 连接器详情" })).toBeVisible();
  await page.goto("/cn/workbench/?view=calendar");
  await page.locator("#personal-actions [data-pa=agent]").click();
  const calendarAgent = page.locator("#pa-agent");
  await calendarAgent.getByRole("button", { name: "连接器", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "连接器选择" })).toBeVisible();
  await page.getByRole("dialog", { name: "连接器选择" }).getByRole("button", { name: "接入工具" }).click();
  await expect(page).toHaveURL(/view=connectors/);
});

test("active connector chips remain visible in home and calendar and can turn a connector off", async ({ page }) => {
  await login(page);
  await page.goto("/cn/workbench/?view=home");
  await page.getByRole("button", { name: "Ask Agent", exact: true }).click();
  const home = page.locator("#xiaozhi-rail");
  const chips = home.getByLabel("已启用连接器");
  await expect(chips.getByText("已启用", { exact: true })).toHaveCount(0);
  await expect(chips.getByRole("button", { name: "关闭 钉钉 连接器" })).toBeVisible();
  await expect(chips.getByRole("button", { name: "关闭 通讯录 连接器" })).toBeVisible();
  await expect(chips.getByRole("button", { name: "关闭 文档 连接器" })).toBeVisible();
  await expect(chips.getByRole("button", { name: "关闭 待办 连接器" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/markets/cn-agent-active-connectors.png", animations: "disabled" });
  await chips.getByRole("button", { name: "关闭 文档 连接器" }).click();
  await expect(chips.getByRole("button", { name: "关闭 文档 连接器" })).toHaveCount(0);
  await home.getByRole("button", { name: "连接器", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "连接器选择" });
  await expect(picker.getByRole("switch", { name: "文档 启用" })).toHaveAttribute("aria-checked", "false");
  await picker.getByRole("switch", { name: "文档 启用" }).click();
  await expect(chips.getByRole("button", { name: "关闭 文档 连接器" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(chips.getByRole("button", { name: "关闭 文档 连接器" })).toBeVisible();
  await page.goto("/cn/workbench/?view=calendar");
  await page.locator("#personal-actions [data-pa=agent]").click();
  await expect(page.locator("#pa-agent").getByLabel("已启用连接器").getByRole("button", { name: "关闭 文档 连接器" })).toBeVisible();
});

test("home contacts and calendar Agents keep page context and can add knowledge materials", async ({ page }) => {
  await login(page);
  await page.goto("/cn/workbench/?view=home");
  await page.getByRole("button", { name: "Ask Agent", exact: true }).click();
  const home = page.locator("#xiaozhi-rail");
  await expect(home.getByLabel("当前引用素材")).toHaveCount(1);
  await home.getByRole("button", { name: "添加素材文件" }).click();
  const picker = page.getByRole("dialog", { name: "选择知识库文件" });
  for (const tab of ["我的会议", "通讯录", "我的闪念", "日程与待办"]) await expect(picker.getByRole("button", { name: new RegExp(tab) })).toBeVisible();
  await expect(picker.getByLabel("素材来源").locator("option")).toHaveText(["全部来源", "网页录音", "合并录音", "三方会议", "M1", "W1", "W2", "W-PEN"]);
  await page.screenshot({ path: "test-results/markets/cn-agent-material-picker.png", animations: "disabled" });
  await picker.getByRole("button", { name: /通讯录/ }).click();
  await expect(picker.getByLabel("素材来源").locator("option")).toHaveText(["全部来源", "手动创建", "CRM 系统导入", "手机通讯录导入"]);
  await picker.locator(".agent-material-list input[type=checkbox]").first().check();
  await picker.locator(".agent-material-list input[type=checkbox]").nth(1).check();
  const selectedTitle = await picker.locator(".agent-material-list strong").first().textContent();
  await picker.getByRole("button", { name: "添加", exact: true }).click();
  await expect(home.getByLabel("当前引用素材")).toContainText(selectedTitle || "");
  await expect(home.getByLabel("当前引用素材").locator(".agent-material-summary-track > button")).toHaveCount(2);
  await page.screenshot({ path: "test-results/markets/cn-agent-material-selected.png", animations: "disabled" });

  await page.goto("/cn/workbench/?view=contacts&id=john");
  await page.locator(".contacts-xiaozhi-entry").click();
  const contacts = page.locator("#contacts-xiaozhi-rail");
  await expect(contacts.getByLabel("当前引用素材")).toContainText("通讯录 ·");
  await contacts.getByRole("button", { name: "添加素材文件" }).click();
  await expect(picker).toBeVisible();
  await picker.getByRole("button", { name: "关闭素材选择" }).click();

  await page.goto("/cn/workbench/?view=calendar");
  await page.locator("#personal-actions [data-pa=agent]").click();
  const calendar = page.locator("#pa-agent");
  await expect(calendar.getByLabel("当前引用素材")).toContainText(/日程与待办 · \d+个明细/);
  await calendar.getByRole("button", { name: "添加素材文件" }).click();
  await expect(picker).toBeVisible();
});

for (const width of [390, 768, 1440]) test(`Agent connector picker stays inside the viewport at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await login(page);
  await page.goto("/cn/workbench/?view=home");
  await page.getByRole("button", { name: "Ask Agent", exact: true }).click();
  await expect(page.locator("#xiaozhi-rail").getByLabel("已启用连接器")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator("#xiaozhi-rail").getByRole("button", { name: "连接器", exact: true }).click();
  const popup = page.getByRole("dialog", { name: "连接器选择" });
  await expect(popup).toBeVisible();
  const box = (await popup.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await page.keyboard.press("Escape");
  await page.locator("#xiaozhi-rail").getByRole("button", { name: "添加素材文件" }).click();
  const materials = page.getByRole("dialog", { name: "选择知识库文件" });
  const materialBox = (await materials.boundingBox())!;
  expect(materialBox.x).toBeGreaterThanOrEqual(0);
  expect(materialBox.x + materialBox.width).toBeLessThanOrEqual(width);
  expect(materialBox.y).toBeGreaterThanOrEqual(0);
  expect(materialBox.y + materialBox.height).toBeLessThanOrEqual(844);
});
