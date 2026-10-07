import { expect, test } from "@playwright/test";
const url = "/workbench/";
const legacy =
  "/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1";
test.use({
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  timezoneId: "Asia/Shanghai",
});
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-07T04:00:00Z") });
});

test("React home keeps legacy data, native rendering, todo changes and return navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await expect(page.locator(".meeting-title")).toHaveCount(10);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator(".daily-ledger-total")).toContainText("¥248.00");
  await expect(page.locator(".daily-rhythm-events .rhythm-event")).toHaveCount(
    4,
  );
  await expect(page.locator(".meeting-head")).toContainText("共 20 个会议笔记");
  await page.locator('[data-today-toggle="todo-1"]').click();
  await expect(page.locator('[data-today-toggle="todo-1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(page.locator('[data-today-toggle="todo-1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("link", { name: "日程与待办", exact: true }).click();
  await expect(page.locator("#personal-actions")).toBeVisible();
  await page.locator("#home-entry").click();
  await expect(page).toHaveURL(/\/workbench\/$/);
  await expect(page.locator('[data-today-toggle="todo-1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});

test("meeting search, source, date, incremental rows, tag and recycle interactions", async ({
  page,
}) => {
  await page.goto(url);
  const rows = page.locator(".ui-table tbody tr");
  await expect(rows).toHaveCount(10);
  await page.locator(".ui-table-scroll").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(rows).toHaveCount(20);
  await page.getByRole("textbox", { name: "搜索会议" }).fill("不存在");
  await expect(rows).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: "没有符合" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "搜索会议" }).clear();
  await expect(rows).toHaveCount(10);
  await page.getByLabel("选择会议来源").selectOption("M1");
  await expect(rows).toHaveCount(4);
  await page.getByRole("button", { name: "清除来源筛选" }).click();
  await page.getByRole("button", { name: "录音日期", exact: true }).click();
  await page.getByRole("button", { name: "2026年9月2日", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await page.getByRole("button", { name: "清除录音日期" }).click();
  await page
    .getByRole("button", { name: "编辑三季度产品复盘会议标签" })
    .click();
  await page.getByLabel("标签", { exact: true }).fill("迁移验证");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(rows.first()).toContainText("迁移验证");
  await page
    .getByRole("button", { name: "删除三季度产品复盘会议", exact: true })
    .click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.locator(".meeting-head")).toContainText("共 19");
  await page.getByRole("button", { name: "录音回收站", exact: true }).click();
  await page.getByRole("button", { name: "恢复", exact: true }).click();
  await page.getByRole("button", { name: "返回我的会议" }).click();
  await expect(page.locator(".meeting-head")).toContainText("共 20");
  await page
    .getByRole("link", { name: "三季度产品复盘会议", exact: true })
    .click();
  await expect(page.locator("#note-detail-title")).toHaveText(
    "三季度产品复盘会议",
  );
});

test("upload rejects invalid files, retains selection on failure and shares records with legacy", async ({
  page,
}) => {
  await page.goto(url);
  await page.getByRole("button", { name: "上传", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await page.getByLabel("选择音频文件").setInputFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("demo"),
  });
  await expect(dialog.getByRole("alert")).toContainText("请选择");
  await expect(
    dialog.getByRole("button", { name: "上传", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("选择音频文件").setInputFiles({
    name: "验收音频.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("demo"),
  });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, {
      restoreStorage: () => (Storage.prototype.setItem = original),
    });
    Storage.prototype.setItem = () => {
      throw Error("full");
    };
  });
  await dialog.getByRole("button", { name: "上传", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("保存失败");
  await expect(dialog).toContainText("验收音频.wav");
  await page.evaluate(() => {
    (window as unknown as { restoreStorage: () => void }).restoreStorage();
  });
  await dialog.getByRole("button", { name: "上传", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".ui-table tbody tr").first()).toContainText(
    "验收音频",
  );
  await page.reload();
  await expect(page.locator(".ui-table tbody tr").first()).toContainText(
    "验收音频",
  );
  await page.goto(legacy);
  await expect(
    page.locator("#meeting-list .home-meeting-row").first(),
  ).toContainText("验收音频");
});

test("Agent drafts, keyboard, local responses and panel width survive UI changes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await page.getByRole("button", { name: "帮我安排", exact: true }).click();
  const panel = page.getByRole("complementary", { name: "Ask Agent" }),
    input = panel.getByRole("textbox");
  await expect(panel).toBeVisible();
  await expect(input).toHaveValue(/产品方案评审/);
  await expect(input).toHaveValue(/客户拜访交通/);
  await input.press("Enter");
  await expect(panel.getByRole("log")).toContainText("把今天的记录连成下一步");
  await expect(input).toHaveValue("");
  await expect(
    panel.getByRole("button", { name: "发送给 Ask Agent" }),
  ).toBeDisabled();
  await input.fill("保留草稿");
  const handle = page.getByRole("separator", { name: "调整 Agent 窗口宽度" });
  await handle.focus();
  await handle.press("ArrowLeft");
  await expect(handle).toHaveAttribute("aria-valuenow", "414");
  await page
    .getByRole("button", { name: "收起 Ask Agent", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Ask Agent", exact: true }).click();
  await expect(input).toHaveValue("保留草稿");
  await panel.getByRole("button", { name: "引用资料", exact: true }).click();
  await panel.getByRole("button", { name: "音频文件" }).click();
  await expect(panel.getByRole("button", { name: "音频文件" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await panel.getByRole("button", { name: "关闭", exact: true }).click();
  await panel.getByRole("button", { name: "新建任务" }).click();
  await expect(input).toHaveValue("");
  await expect(panel.getByRole("log")).toBeEmpty();
});

test("all non-migrated destinations remain reachable and home returns to React", async ({
  page,
}) => {
  const destinations: [string, string][] = [
    ["contacts", "[data-main-view=contacts]"],
    ["thoughts", "#thought-workspace"],
    ["devices", "#ws-view"],
    ["subscription", "#ws-view"],
    ["settings", "#personal-settings"],
  ];
  for (const [entry, selector] of destinations) {
    await page.goto(legacy + "&migration=1&entry=" + entry);
    await expect(page.locator(selector)).toBeVisible();
    await page.locator("#home-entry").click();
    await expect(page).toHaveURL(/\/workbench\/$/);
    await expect(page.locator(".meeting-head")).toContainText("我的会议");
  }
  await page.goto(legacy + "&migration=1&entry=create-team");
  await expect(page.getByRole("dialog")).toContainText("创建团队");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await page.locator("#home-entry").click();
  await expect(page).toHaveURL(/\/workbench\/$/);
});

test("desktop and narrow layouts retain usable actions without document overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await expect(page.locator(".meeting-title")).toHaveCount(10);
  for (const [width, height] of [
    [1440, 900],
    [1280, 650],
    [1080, 680],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      )
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `/tmp/eureka-react-home-${width}.png`,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Ask Agent", exact: true }).click();
    await expect(page.locator(".agent-panel")).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "向 Ask Agent 输入问题" }),
    ).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "发送给 Ask Agent" }),
    ).toBeInViewport();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      )
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `/tmp/eureka-react-agent-${width}.png`,
      animations: "disabled",
    });
    await page
      .locator(".agent-panel")
      .getByRole("button", { name: "收起 Ask Agent" })
      .click();
  }
  expect(errors).toEqual([]);
});

test("download QR and uploaded recording recycle keep their original behavior", async ({
  page,
}) => {
  await page.goto(url);
  await page.getByRole("button", { name: "下载 EurekaMind App" }).click();
  const qr = page.getByRole("dialog", { name: "EurekaMind App 下载二维码" });
  await expect(qr.getByRole("img")).toBeVisible();
  await expect(qr.getByRole("link")).toHaveAttribute(
    "href",
    "https://apps.apple.com/us/app/eurekamind-ai-note-taker/id6742087483",
  );
  await page.keyboard.press("Escape");
  await expect(qr).toHaveCount(0);
  await page.getByRole("button", { name: "上传", exact: true }).click();
  await page
    .getByLabel("选择音频文件")
    .setInputFiles({
      name: "回收验证.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from("demo"),
    });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "上传", exact: true })
    .click();
  await page.getByRole("button", { name: "删除回收验证", exact: true }).click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "录音回收站", exact: true }).click();
  await expect(page.locator(".ui-table tbody")).toContainText("回收验证");
  await page.getByLabel("搜索回收站录音").fill("不存在");
  await expect(page.locator(".ui-table tbody tr")).toHaveCount(0);
  await page.getByLabel("搜索回收站录音").fill("回收");
  await page.getByLabel("筛选回收站录音日期").fill("2026-10-06");
  await expect(page.locator(".ui-table tbody tr")).toHaveCount(0);
  await page.getByLabel("筛选回收站录音日期").fill("2026-10-07");
  await expect(page.locator(".ui-table tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "彻底删除", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "取消", exact: true })
    .click();
  await expect(page.locator(".ui-table tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "彻底删除", exact: true }).click();
  await page.getByRole("button", { name: "确认彻底删除", exact: true }).click();
  await expect(page.locator(".ui-table tbody tr")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("eureka:audio-uploads:v1") || "[]"),
    ),
  ).toEqual([]);
});
