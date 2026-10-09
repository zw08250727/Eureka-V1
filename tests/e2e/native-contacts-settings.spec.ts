import { expect, test, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";

// Normal repository runs use the final static build on 3100. A shared dev
// server can be selected without starting another server:
// NATIVE_BASE_URL=http://127.0.0.1:3131 PLAYWRIGHT_CHANNEL=chrome npx playwright test --config=tests/e2e native-contacts-settings.spec.ts --workers=1
// Passing the test directory as config deliberately avoids the root webServer.
test.use({
  baseURL: process.env.NATIVE_BASE_URL || "http://127.0.0.1:3100",
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  viewport: { width: 1440, height: 960 },
});
const contactsKey = "baizhi-v14-contacts";
const settingsKey = "eureka:personal-actions:v1";
const submit = (page: Page) =>
  page.locator("[data-contact-form] [type=submit]");
const formError = (page: Page) => page.locator(".contacts-form-error");
const main = (page: Page) => page.locator(".contacts-main");
const person = (page: Page, name: string) =>
  page.locator(".contacts-person-card").filter({ hasText: name });
async function contacts(page: Page) {
  await page.goto("/workbench/?view=contacts&space=personal");
  await expect(page.locator(".contacts-person-card").first()).toBeVisible();
}
async function settings(page: Page, space = "personal", actor = "zhang") {
  await page.goto(`/workbench/?view=settings&space=${space}&actor=${actor}`);
  await expect(page.locator(".settings-profile")).toBeVisible();
}
async function openAdd(page: Page, name: string) {
  await page.locator("[data-contact-action=add]").click();
  await page.locator("[data-contact-form=add] [name=name]").fill(name);
}
async function quotaFailure(page: Page, key: string) {
  await page.evaluate((storageKey) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (
        name === storageKey &&
        sessionStorage.getItem("native-quota-failure") === "yes"
      )
        throw new DOMException("Full", "QuotaExceededError");
      return original.call(this, name, value);
    };
    sessionStorage.setItem("native-quota-failure", "yes");
  }, key);
}
async function quotaRecovery(page: Page) {
  await page.evaluate(() => sessionStorage.removeItem("native-quota-failure"));
}
async function rawContacts(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), contactsKey);
}

test("native contacts: all five populated tabs, empty tabs and search", async ({
  page,
}) => {
  await contacts(page);
  await expect(page.locator(".contacts-person-card")).toHaveCount(6);
  await page.locator("#contacts-search").fill("  德国 / 欧盟  ");
  await expect(page.locator(".contacts-person-card")).toHaveCount(1);
  await person(page, "John Chen").click();
  for (const [tab, copy] of [
    ["概览", "AI 关系摘要"],
    ["时间线", "Energy Storage Summit"],
    ["承诺", "来自 John Chen 的承诺"],
    ["主题", "活跃主题仅统计最近 30 天"],
    ["记忆", "以上推断需要后续互动确认。"],
  ]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await expect(
      page.getByRole("tab", { name: tab, exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(main(page)).toContainText(copy);
  }
  await page.locator("[data-contact-action=list]").click();
  await expect(page.locator("#contacts-search")).toHaveValue("  德国 / 欧盟  ");
  await page.locator("#contacts-search").fill("Alice");
  await person(page, "Alice Wang").click();
  for (const [tab, copy] of [
    ["时间线", "暂无时间线记录"],
    ["承诺", "暂无承诺"],
    ["记忆", "暂无推断"],
  ]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await expect(main(page)).toContainText(copy);
  }
  await page.locator("[data-contact-action=list]").click();
  await page.locator("#contacts-search").fill("no-such-contact-unique");
  await expect(page.locator(".contacts-person-card")).toHaveCount(0);
  await expect(page.locator(".contacts-empty")).toHaveText("未找到联系人");
});

test("native contacts: same-name add, note and human-owned followup persist after reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await contacts(page);
  await openAdd(page, "   ");
  await submit(page).click();
  await expect(formError(page)).toHaveText("请填写联系人姓名");
  await page.locator("[name=name]").fill("原生核验联系人");
  await page.locator("[name=company]").fill("测试公司");
  await page.locator("[name=role]").fill("产品负责人");
  await page
    .locator("[name=summary]")
    .fill('<img src=x onerror="window.BAD=true">关系上下文');
  await submit(page).click();
  await expect(person(page, "原生核验联系人")).toHaveCount(1);
  await expect(person(page, "原生核验联系人").locator("img")).toHaveCount(0);
  await openAdd(page, "原生核验联系人");
  await submit(page).click();
  await expect(person(page, "原生核验联系人")).toHaveCount(2);
  await expect(page.locator(".contacts-overlay")).toHaveCount(0);
  await expect(page.locator("[data-contact-action=add]")).toBeFocused();
  await person(page, "原生核验联系人").first().click();
  await page.locator(".contacts-actions [data-contact-action=note]").click();
  await page.locator("[name=text]").fill("   ");
  await submit(page).click();
  await expect(formError(page)).toHaveText("备注内容不能为空");
  await page.locator("[name=text]").fill("下次确认交付范围");
  await submit(page).click();
  await expect(
    page.getByRole("tab", { name: "记忆", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(main(page)).toContainText("下次确认交付范围");
  await expect(page.locator(".contacts-metrics > div").nth(1)).toHaveText(
    "1备注",
  );
  await page
    .locator(".contacts-actions [data-contact-action=followup]")
    .click();
  await page.locator("[name=title]").fill("   ");
  await submit(page).click();
  await expect(formError(page)).toHaveText("请填写任务标题");
  await page.locator("[name=title]").fill("确认验收时间");
  await page
    .locator("[data-contact-form=followup] [name=description]")
    .fill("先核对双方的交付范围");
  await expect(page.locator("[name=owner]")).toHaveValue("张伟");
  await submit(page).click();
  await expect(main(page)).toContainText("确认验收时间");
  await expect(main(page)).toContainText("先核对双方的交付范围");
  await page.reload();
  await person(page, "原生核验联系人").first().click();
  await page.getByRole("tab", { name: "记忆", exact: true }).click();
  await expect(main(page)).toContainText("下次确认交付范围");
  await expect(main(page)).toContainText("确认验收时间");
  const saved = await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key)!).personal;
    const contact = data.contacts.find(
      (item: { name: string }) => item.name === "原生核验联系人",
    );
    return {
      count: data.contacts.filter(
        (item: { name: string }) => item.name === contact.name,
      ).length,
      id: contact.id,
      notes: data.notes[contact.id],
      tasks: data.tasks,
    };
  }, contactsKey);
  expect(saved.count).toBe(2);
  expect(saved.notes).toHaveLength(1);
  expect(saved.tasks).toHaveLength(1);
  expect(saved.tasks[0]).toMatchObject({
    contactId: saved.id,
    owner: "张伟",
  });
  expect(errors).toEqual([]);
});

test("native contacts: storage quota rolls back add, note and followup; each retry saves once", async ({
  page,
}) => {
  await contacts(page);
  await quotaFailure(page, contactsKey);
  const beforeAdd = await rawContacts(page);
  await openAdd(page, "可恢复联系人");
  await submit(page).click();
  await expect(formError(page)).toContainText("保存失败");
  await expect(page.locator("[name=name]")).toHaveValue("可恢复联系人");
  expect(await rawContacts(page)).toBe(beforeAdd);
  await quotaRecovery(page);
  await submit(page).click();
  await expect(person(page, "可恢复联系人")).toHaveCount(1);
  await person(page, "可恢复联系人").click();
  for (const [kind, field, copy] of [
    ["note", "text", "重试备注"],
    ["followup", "title", "重试跟进"],
  ]) {
    const before = await rawContacts(page);
    await page
      .locator(`.contacts-actions [data-contact-action=${kind}]`)
      .click();
    await page.locator(`[name=${field}]`).fill(copy);
    await page.evaluate(() =>
      sessionStorage.setItem("native-quota-failure", "yes"),
    );
    await submit(page).click();
    await expect(formError(page)).toContainText("保存失败");
    await expect(page.locator(`[name=${field}]`)).toHaveValue(copy);
    expect(await rawContacts(page)).toBe(before);
    await quotaRecovery(page);
    await submit(page).click();
    await expect(page.locator(".contacts-overlay")).toHaveCount(0);
    await expect(main(page)).toContainText(copy);
  }
  const stored = JSON.parse((await rawContacts(page))!).personal;
  const record = stored.contacts.find(
    (item: { name: string }) => item.name === "可恢复联系人",
  );
  expect(stored.notes[record.id]).toHaveLength(1);
  expect(
    stored.tasks.filter(
      (item: { contactId: string }) => item.contactId === record.id,
    ),
  ).toHaveLength(1);
});

test("native contacts: CAS rejects stale add, note and followup without losing draft or winner", async ({
  page,
  context,
}) => {
  await contacts(page);
  const stale = await context.newPage();
  await contacts(stale);
  await openAdd(stale, "旧页面新联系人");
  await openAdd(page, "另一标签已保存");
  await submit(page).click();
  await expect(person(page, "另一标签已保存")).toBeVisible();
  let winner = await rawContacts(page);
  await submit(stale).click();
  await expect(formError(stale)).toContainText("另一页面已更新");
  await expect(stale.locator("[name=name]")).toHaveValue("旧页面新联系人");
  await stale.keyboard.press("Escape");
  await person(stale, "John Chen").click();
  for (const [kind, field, copy] of [
    ["note", "text", "旧备注草稿"],
    ["followup", "title", "旧跟进草稿"],
  ]) {
    await stale
      .locator(`.contacts-actions [data-contact-action=${kind}]`)
      .click();
    await stale.locator(`[name=${field}]`).fill(copy);
    await openAdd(page, `并发保存-${kind}`);
    await submit(page).click();
    winner = await rawContacts(page);
    await expect(stale.locator(".contacts-form-error")).toHaveText("");
    await submit(stale).click();
    await expect(formError(stale)).toContainText("另一页面已更新");
    await expect(stale.locator(`[name=${field}]`)).toHaveValue(copy);
    expect(await rawContacts(stale)).toBe(winner);
    await stale.keyboard.press("Escape");
  }
  await stale.reload();
  await expect(person(stale, "另一标签已保存")).toBeVisible();
  await stale.close();
});

test("native contacts: Agent drafts, new task and replies remain scoped to the selected person", async ({
  page,
}) => {
  await contacts(page);
  const input = page.locator("[data-contact-xiaozhi-input]");
  const answer = page.locator(".contacts-xiaozhi-answer");
  const close = page.locator(
    "#contacts-xiaozhi-rail [data-contact-action=toggle-xiaozhi]",
  );
  await page.locator(".contacts-xiaozhi-entry").click();
  await expect(input).toBeFocused();
  await input.fill("帮我准备下一次沟通");
  await page.locator("#contacts-search").fill("John");
  await expect(input).toHaveValue("帮我准备下一次沟通");
  await close.click();
  await page.locator(".contacts-xiaozhi-entry").click();
  await expect(input).toHaveValue("帮我准备下一次沟通");
  await input.press("Enter");
  await expect(answer).toContainText("经销商名单");
  await expect(input).toHaveValue("");
  await person(page, "John Chen").click();
  await input.fill("未发送的 John 草稿");
  await page.locator("[data-contact-action=list]").click();
  await page.locator("#contacts-search").fill("Alice");
  await person(page, "Alice Wang").click();
  await expect(input).toHaveValue("");
  await expect(page.locator(".xiaozhi-context .selected")).toHaveText(
    "Alice Wang",
  );
  await page
    .locator('[data-contact-action=ask][data-value="整理开放承诺"]')
    .click();
  await expect(answer).toContainText("Alice Wang 暂无已记录的开放承诺");
  await expect(answer).not.toContainText("德国经销商");
  await input.fill("新草稿");
  await page.locator("[data-contact-action=new-agent-task]").click();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(answer).toHaveText(
    "负责采购与预算确认，当前主要议题是试点预算和供应商准入。",
  );
  await input.fill("第一行");
  await input.press("Shift+Enter");
  await input.press("A");
  await expect(input).toHaveValue("第一行\nA");
  await input.press("Escape");
  await expect(page.locator("#contacts-xiaozhi-rail")).toBeHidden();
  await expect(page.locator(".contacts-xiaozhi-entry")).toBeFocused();
});

test("native contacts: Agent keyboard and pointer resizing persist, narrow viewport retains composer", async ({
  page,
}) => {
  await contacts(page);
  await page.locator(".contacts-xiaozhi-entry").click();
  await expect(page.locator("[data-contact-xiaozhi-input]")).toBeFocused();
  const handle = page.getByRole("separator", { name: "调整 Agent 窗口宽度" });
  await expect(handle).toHaveAttribute("aria-valuenow", "390");
  await handle.press("ArrowLeft");
  await expect(handle).toHaveAttribute("aria-valuenow", "414");
  await handle.press("Home");
  await expect(handle).toHaveAttribute("aria-valuenow", "300");
  await handle.press("End");
  await expect(handle).toHaveAttribute("aria-valuenow", "760");
  await handle.press("Home");
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + 4, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 76, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(handle).toHaveAttribute("aria-valuenow", "380");
  await expect(page.locator("body")).not.toHaveClass(/agent-resizing/);
  await page.reload();
  await page.locator(".contacts-xiaozhi-entry").click();
  await expect(handle).toHaveAttribute("aria-valuenow", "380");
  for (const [width, height] of [
    [1024, 768],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator("[data-contact-xiaozhi-input]")).toBeInViewport({
      ratio: 1,
    });
    await expect(
      page.locator("[data-contact-action=send-xiaozhi]"),
    ).toBeInViewport({ ratio: 1 });
    await expect
      .poll(async () => {
        const view = (await page.locator(".contacts-workspace").boundingBox())!;
        return Math.round(height - view.y - view.height);
      })
      .toBe(16);
  }
});

test("native settings: language and summary persist across reload and Personal/Team contexts", async ({
  page,
}) => {
  await settings(page);
  const language = page.locator("[data-settings-language=asr]");
  const notes = page.locator("[data-settings-language=notes]");
  const summary = page.locator("[data-settings-action=toggle-summary]");
  await expect(language).toHaveValue("en");
  await expect(notes).toHaveValue("detected");
  await expect(page.locator(".settings-profile small")).toHaveText(
    "标准版 · 个人工作空间",
  );
  await expect(page.locator(".settings-usage")).toContainText("剩余 400 分钟");
  await language.selectOption("zh-Hant");
  await notes.selectOption("zh-Hans");
  await summary.click();
  await expect(summary).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await expect(language).toHaveValue("zh-Hant");
  await expect(notes).toHaveValue("zh-Hans");
  await expect(summary).toHaveAttribute("aria-checked", "false");
  for (const [space, name, role, actor] of [
    ["team-eureka", "EurekaMind 产品团队", "管理员", "zhang"],
    ["team-eureka", "EurekaMind 产品团队", "成员", "kevin"],
  ]) {
    await settings(page, space, actor);
    await expect(page.locator(".settings-profile small")).toHaveText(
      `Team Unlimited · ${name} · ${role}`,
    );
    await expect(page.locator(".settings-usage")).toContainText(
      "Unlimited · 不限时长",
    );
    await expect(language).toHaveValue("zh-Hant");
    await expect(notes).toHaveValue("zh-Hans");
    await expect(summary).toHaveAttribute("aria-checked", "false");
    await language.selectOption("en");
    await language.selectOption("zh-Hant");
    await page.locator("[data-settings-close]").click();
    await expect(page).toHaveURL(new RegExp(`view=home.*space=${space}`));
    await expect(page.locator("#personal-settings")).toHaveCount(0);
  }
  await settings(page);
  await expect(language).toHaveValue("zh-Hant");
  await expect(summary).toHaveAttribute("aria-checked", "false");
});

test("native settings: failed language and summary saves roll back and survive reload", async ({
  page,
}) => {
  await settings(page);
  const language = page.locator("[data-settings-language=asr]");
  const notes = page.locator("[data-settings-language=notes]");
  const summary = page.locator("[data-settings-action=toggle-summary]");
  await language.selectOption("en");
  await summary.click();
  await expect(summary).toHaveAttribute("aria-checked", "false");
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    settingsKey,
  );
  await quotaFailure(page, settingsKey);
  await language.selectOption("zh-Hans");
  await expect(language).toHaveValue("en");
  await expect(page.locator("#toast")).toContainText("保存失败");
  await notes.selectOption("zh-Hans");
  await expect(notes).toHaveValue("detected");
  await summary.click();
  await expect(summary).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("[data-settings-summary-copy]")).toHaveText(
    "已关闭自动摘要",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), settingsKey),
  ).toBe(saved);
  await page.reload();
  await expect(language).toHaveValue("en");
  await expect(notes).toHaveValue("detected");
  await expect(summary).toHaveAttribute("aria-checked", "false");
  await language.selectOption("zh-Hans");
  await expect(language).toHaveValue("zh-Hans");
  await page.reload();
  await expect(language).toHaveValue("zh-Hans");
});

test("native settings: stale tab preferences cannot overwrite the newer saved settings", async ({
  page,
  context,
}) => {
  await settings(page);
  const stale = await context.newPage();
  await settings(stale);
  await page.locator("[data-settings-language=notes]").selectOption("zh-Hans");
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    settingsKey,
  );
  await stale.locator("[data-settings-language=asr]").selectOption("zh-Hans");
  await expect(stale.locator("#toast")).toContainText("另一页面已更新");
  await expect(stale.locator("[data-settings-language=asr]")).toHaveValue("en");
  await stale.locator("[data-settings-action=toggle-summary]").click();
  await expect(
    stale.locator("[data-settings-action=toggle-summary]"),
  ).toHaveAttribute("aria-checked", "true");
  expect(
    await stale.evaluate((key) => localStorage.getItem(key), settingsKey),
  ).toBe(saved);
  await stale.reload();
  await expect(stale.locator("[data-settings-language=notes]")).toHaveValue(
    "zh-Hans",
  );
  await stale.close();
});

test("native settings: legacy language fallback and logout cancel/Escape/confirm retain browser records", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("eureka:personal-actions:v1")) {
      localStorage.setItem("eurekamind:settings:asr", "zh-Hans");
      localStorage.setItem("eurekamind:settings:notes", "en");
    }
  });
  await settings(page);
  await expect(page.locator("[data-settings-language=asr]")).toHaveValue(
    "zh-Hans",
  );
  await expect(page.locator("[data-settings-language=notes]")).toHaveValue(
    "en",
  );
  await page.locator("[data-settings-action=toggle-summary]").click();
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    settingsKey,
  );
  const logout = page.locator("[data-settings-action=logout]");
  await logout.click();
  await expect(page.getByRole("dialog", { name: "退出登录？" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".pa-dialog")).toHaveCount(0);
  await expect(logout).toBeFocused();
  await logout.click();
  await page.locator(".pa-dialog footer [data-pa=modal-cancel]").click();
  await expect(logout).toBeFocused();
  await logout.click();
  await page.locator(".pa-dialog [data-pa=modal-confirm]").click();
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), settingsKey),
  ).toBe(saved);
});

test("native contacts: empty dataset and a new contact expose every empty detail branch", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    if (!localStorage.getItem(key))
      localStorage.setItem(
        key,
        JSON.stringify({ personal: { contacts: [], notes: {}, tasks: [] } }),
      );
  }, contactsKey);
  await page.goto("/workbench/?view=contacts&space=personal");
  await expect(page.locator(".contacts-empty")).toHaveText("未找到联系人");
  await expect(page.locator(".contacts-toolbar-hint")).toHaveText(
    "共 0 位联系人",
  );
  await page.locator(".contacts-xiaozhi-entry").click();
  await expect(page.locator(".contacts-xiaozhi-answer")).toHaveText(
    "暂无关系摘要",
  );
  await page
    .locator('[data-contact-action=ask][data-value="整理开放承诺"]')
    .click();
  await expect(page.locator(".contacts-xiaozhi-answer")).toHaveText(
    "当前没有可用联系人上下文。",
  );
  await page
    .locator("#contacts-xiaozhi-rail [data-contact-action=toggle-xiaozhi]")
    .click();
  await openAdd(page, "全空详情联系人");
  await submit(page).click();
  await person(page, "全空详情联系人").click();
  for (const [tab, expected] of [
    ["概览", ["待补充", "暂无承诺", "暂无主题"]],
    ["时间线", ["暂无时间线记录"]],
    ["承诺", ["暂无承诺"]],
    ["主题", ["暂无主题"]],
    ["记忆", ["暂无关系记忆", "暂无推断"]],
  ] as const) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    for (const copy of expected) await expect(main(page)).toContainText(copy);
  }
  await page.locator(".contacts-xiaozhi-entry").click();
  await page.locator(".contacts-actions [data-contact-action=note]").click();
  await expect(page.locator("[name=text]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".contacts-overlay")).toHaveCount(0);
  await expect(page.locator("#contacts-xiaozhi-rail")).toBeVisible();
  await expect(
    page.locator(".contacts-actions [data-contact-action=note]"),
  ).toBeFocused();
});

test("native settings: Pro, expired personal plan and expired team show their actual entitlement", async ({
  page,
}) => {
  const state = M.seed();
  const personal = state.spaces.find((space) => space.id === "personal")!;
  personal.personalSubscription = {
    plan: "Pro",
    cycle: "month",
    minutes: 99999,
    credits: 5000,
    endsAt: "2099-01-01T00:00:00.000Z",
    nextRefresh: "2098-12-01T00:00:00.000Z",
    renew: true,
  };
  await page.addInitScript((seed) => {
    if (!localStorage.getItem("eureka:workspaces:v2"))
      localStorage.setItem("eureka:workspaces:v2", JSON.stringify(seed));
  }, state);
  await settings(page);
  await expect(page.locator(".settings-profile small")).toHaveText(
    "Pro · 个人工作空间",
  );
  await expect(page.locator(".settings-usage")).toContainText("99,999 分钟");
  await page.evaluate(() => {
    const key = "eureka:workspaces:v2",
      data = JSON.parse(localStorage.getItem(key)!);
    data.spaces.find(
      (space: { id: string }) => space.id === "personal",
    ).personalSubscription.endsAt = "2020-01-01T00:00:00.000Z";
    data.spaces.find(
      (space: { id: string }) => space.id === "team-eureka",
    ).status = "expired";
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
  await expect(page.locator(".settings-profile small")).toHaveText(
    "标准版 · 个人工作空间",
  );
  await expect(page.locator(".settings-usage")).toContainText("剩余 400 分钟");
  await settings(page, "team-eureka");
  await expect(page.locator(".settings-usage")).toContainText("转写权益已暂停");
  await expect(page.locator(".settings-usage")).toContainText("团队订阅已到期");
  await page.locator("[data-settings-language=notes]").selectOption("zh-Hans");
  await page.reload();
  await expect(page.locator("[data-settings-language=notes]")).toHaveValue(
    "zh-Hans",
  );
});

test("native settings: compact controls, legal links and logout dialog fit desktop and phone", async ({
  page,
}) => {
  await settings(page);
  for (const [width, height] of [
    [1440, 1000],
    [1024, 768],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    expect(
      await page
        .locator("#personal-settings")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page
      .locator("[data-settings-language=notes]")
      .selectOption("zh-Hans");
    await expect(page.locator("[data-settings-language=notes]")).toHaveValue(
      "zh-Hans",
    );
    await expect(page.locator(".settings-link")).toHaveCount(2);
    for (const link of await page.locator(".settings-link").all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute(
        "href",
        /^https:\/\/docs.google.com\/document\//,
      );
    }
    await page.locator("[data-settings-action=logout]").click();
    const dialog = page.getByRole("dialog", { name: "退出登录？" });
    await expect(dialog).toBeInViewport({ ratio: 1 });
    await page.keyboard.press("Escape");
    await page.locator("[data-settings-close]").scrollIntoViewIfNeeded();
    await expect(page.locator("[data-settings-close]")).toBeInViewport({
      ratio: 1,
    });
  }
});
