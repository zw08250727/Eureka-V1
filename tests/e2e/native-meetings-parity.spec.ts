import { expect, test } from "@playwright/test";
const base = process.env.NATIVE_BASE_URL || "";
const meeting = `${base}/workbench/?view=meeting&space=personal&id=meeting-1`;
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });

test("native meeting tabs, local audio, drafts and generation stay isolated", async ({
  page,
}) => {
  await page.goto(meeting);
  await expect(page.locator("#note-detail-title")).toHaveText(
    "三季度产品复盘会议",
  );
  await expect(page.locator(".md-library-item")).toHaveCount(20);
  await expect(
    page.getByRole("tablist", { name: "录音详情内容" }).getByRole("tab"),
  ).toHaveText([
    "智能总结",
    "转译文本",
    "实时翻译",
    "思维导图",
    "图文摘要",
    "逐字稿",
  ]);
  await expect(page.locator("#md-duration")).not.toHaveText("00:00");
  await page.getByRole("button", { name: "播放录音", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停录音", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "前进15秒" }).click();
  await expect
    .poll(async () => Number(await page.locator("#md-seek").inputValue()))
    .toBeGreaterThanOrEqual(15);
  await page.getByRole("button", { name: "暂停录音", exact: true }).click();
  await page.getByRole("tab", { name: "转译文本", exact: true }).click();
  await expect(page.locator(".md-speech")).toHaveCount(4);
  await page.getByRole("tab", { name: "实时翻译", exact: true }).click();
  await expect(page.locator("#md-content")).toContainText("customer feedback");
  for (const name of ["思维导图", "图文摘要", "逐字稿"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await page.getByRole("button", { name: "立即生成", exact: true }).click();
    await expect(page.locator("#md-content")).toContainText("演示生成");
  }
  await page.getByRole("tab", { name: "智能总结", exact: true }).click();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "编辑正文", exact: true });
  await editor.fill("");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.locator(".md-inline-edit-status")).toHaveText(
    "正文不能为空",
  );
  await editor.fill("原生会议草稿");
  await page.locator(".md-library-item").nth(1).click();
  await expect(editor).toHaveCount(0);
  await page.locator(".md-library-item").first().click();
  await expect(editor).toHaveText("原生会议草稿");
  await editor.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "加粗", exact: true }).click();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.locator("#md-content .md-prose b")).toHaveText(
    "原生会议草稿",
  );
  await page.reload();
  await expect(page.locator("#md-content .md-prose")).toHaveText(
    "原生会议草稿",
  );
});

test("native metadata query, templates, export, sharing and delete are source-shaped", async ({
  page,
}) => {
  await page.goto(`${meeting}&dialog=info`);
  await expect(
    page.getByRole("dialog", { name: "补充会议信息" }),
  ).toBeVisible();
  await page.locator("#md-customer").fill("原生测试客户");
  await page.locator("#md-project").fill("交付项目");
  await page.locator("#md-tags").fill("复盘，已确认");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await expect(page.locator(".md-info")).toContainText("原生测试客户");
  await page.getByRole("button", { name: "通用 ›", exact: true }).click();
  await page.getByRole("button", { name: "项目进度", exact: true }).click();
  await page.locator("#md-detail").selectOption("详细");
  await page.getByRole("button", { name: "开始重新总结" }).click();
  await expect(page.locator("#md-content")).toContainText("风险与待确认");
  await page.getByRole("button", { name: "评分 8", exact: true }).click();
  await page.getByRole("button", { name: "提交反馈", exact: true }).click();
  await expect(page.locator(".md-feedback")).toContainText(
    "已记录你的 8 分评价",
  );
  await page
    .locator(".md-top-actions")
    .getByRole("button", { name: "导出", exact: true })
    .click();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("radio", { name: /JSON/ }).check();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
  await page
    .locator(".md-top-actions")
    .getByRole("button", { name: "分享", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "全选" }).uncheck();
  await page.getByRole("button", { name: "预览分享内容" }).click();
  await expect(page.getByRole("dialog")).toContainText("请至少选择一项");
  await page.getByRole("button", { name: "总结", exact: true }).click();
  await page.getByRole("button", { name: "生成分享链接" }).click();
  await expect(page.getByRole("dialog")).toContainText("无法生成公开链接");
  await page.getByRole("button", { name: "预览分享内容" }).click();
  await expect(page.getByRole("dialog")).toContainText("风险与待确认");
  await page.getByRole("button", { name: "关闭弹窗" }).click();
  await page
    .locator(".md-top-actions")
    .getByRole("button", { name: "删除", exact: true })
    .click();
  await expect(page.locator(".scrim.show")).toBeVisible();
  await expect(page.locator("section#delete-confirm-modal")).toBeVisible();
  await page.locator("#delete-confirm-submit").click();
  await expect(page).toHaveURL(/view=home/);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("eureka:meeting-details:v1") || "{}")[
            "meeting-1"
          ].deleted,
      ),
    )
    .toBe(true);
});

test("native meeting viewport and Agent preserve conversation and draft", async ({
  page,
}) => {
  await page.goto(meeting);
  await expect(page.locator("#note-detail-title")).toBeVisible();
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1280, 650],
    [1024, 768],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(async () => {
        const box = await page.locator(".md-frame").boundingBox();
        return Math.round(height - box!.y - box!.height);
      })
      .toBe(16);
    const box = await page.locator(".md-frame").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    await page.getByRole("button", { name: "通用 ›", exact: true }).click();
    const dialog = await page.getByRole("dialog").boundingBox();
    expect(dialog!.x).toBeGreaterThanOrEqual(0);
    expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(width + 1);
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("textbox", { name: "编辑正文" }).fill("未保存内容");
  await page.getByRole("button", { name: "Ask Agent", exact: true }).click();
  await expect(page.locator("#md-agent-host #xiaozhi-rail")).toBeVisible();
  await page.locator("#xiaozhi-input").fill("会议追问");
  await page.locator("#xiaozhi-send").click();
  await expect(page.locator(".md-agent-messages")).toContainText("会议追问");
  await page.locator("#xiaozhi-input").fill("继续整理负责人");
  await page.locator("#xiaozhi-collapse").click();
  await page.getByRole("button", { name: "Ask Agent", exact: true }).click();
  await expect(page.locator("#xiaozhi-input")).toHaveValue("继续整理负责人");
  await page.getByRole("button", { name: "切换录音列表" }).click();
  await page.locator(".md-library-item").nth(1).click();
  await expect(page.locator(".md-agent-messages")).not.toContainText(
    "会议追问",
  );
  await page.getByRole("button", { name: "切换录音列表" }).click();
  await page.locator(".md-library-item").first().click();
  await expect(page.locator("#xiaozhi-input")).toHaveValue("继续整理负责人");
  await expect(page.getByRole("textbox", { name: "编辑正文" })).toHaveText(
    "未保存内容",
  );
  for (const [width, height] of [
    [1920, 1080],
    [1280, 650],
    [1024, 768],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator("#xiaozhi-send")).toBeInViewport({ ratio: 1 });
  }
  await page.locator("#xiaozhi-collapse").click();
  await page.getByRole("button", { name: "退出编辑" }).click();
});

test("native recording title, pause, marks, Agent and finish work", async ({
  page,
}) => {
  await page.goto(
    `${base}/workbench/?view=recording&space=personal&title=${encodeURIComponent("会议确认名称")}`,
  );
  await expect(page.locator("#recording-name")).toHaveText("会议确认名称");
  await page.locator("#recording-pause").click();
  await expect(page.locator("#recording-layout")).toHaveClass(/paused/);
  await page.locator("#recording-mark").click();
  await expect(page.locator(".recording-session-generated")).toContainText(
    "重点标记",
  );
  await page.locator("#recording-pause").click();
  await page.locator("#recording-assistant-toggle").click();
  await page.getByRole("button", { name: "提炼重点", exact: true }).click();
  await page.locator("#recording-assistant-send").click();
  await expect(page.locator("#recording-assistant-messages")).toContainText(
    "录音授权说明",
  );
  await page.locator("#recording-assistant-new-task").click();
  await expect(page.locator(".recording-assistant-empty")).toBeVisible();
  await page.locator("#recording-finish").click();
  await expect(page.locator("#recording-layout")).toHaveClass(/ended/);
  await expect(page.locator("#transcript-live-line")).toHaveCount(0);
  await page.locator("#recording-back-home").click();
  await expect(page).toHaveURL(/view=home/);
});
