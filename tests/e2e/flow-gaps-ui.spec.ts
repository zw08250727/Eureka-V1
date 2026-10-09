import { expect, test, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import { demoWeek } from "../../src/features/workbench/model/demo-week";
test.use({
  timezoneId: "Asia/Shanghai",
  viewport: { width: 1440, height: 1000 },
});
const key = "baizhi-v14-contacts";
const submit = (p: Page) => p.locator("[data-contact-form] [type=submit]");
const person = {
  id: "only-mine",
  initials: "同名",
  name: "同名联系人",
  company: "甲公司",
  role: "产品",
  summary: "原始摘要",
  region: "",
  email: "",
  tag: "伙伴",
  count: 99,
  recent: "旧值",
  themes: [],
  memories: ["偏好邮件沟通"],
  inferences: [],
  commitments: [],
  myCommitments: [["我提供材料", "未设置期限", "待跟进"]],
};
async function seedContacts(page: Page) {
  await page.addInitScript(
    ({ key, person }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            personal: { contacts: [person], notes: {}, tasks: [] },
          }),
        );
    },
    { key, person },
  );
}
async function contacts(page: Page, id = "") {
  await page.goto(
    `/workbench/?view=contacts&space=personal${id ? `&id=${id}` : ""}`,
  );
  await expect(page.locator(".contacts-main")).toBeVisible();
}
async function add(page: Page, name: string, company: string) {
  await page.locator("[data-contact-action=add]").click();
  await page.locator("[name=name]").fill(name);
  await page.locator("[name=company]").fill(company);
}

test("missing contact cannot silently open or edit another contact", async ({
  page,
}) => {
  await seedContacts(page);
  await contacts(page, "does-not-exist");
  await expect(page.locator(".contacts-main").getByRole("alert")).toContainText(
    "客户不存在、已删除或所属成员已关闭共享",
  );
  await expect(page.locator(".contacts-profile")).toHaveCount(0);
  await expect(page.locator("[data-contact-action=note]")).toHaveCount(0);
  await page.getByRole("button", { name: "返回我的客户列表" }).click();
  await expect(page.locator(".contacts-person-card")).toHaveCount(1);
});

test("same names remain distinct; editing and notes persist without legacy commitment status or memory confirmation", async ({
  page,
}) => {
  await seedContacts(page);
  await contacts(page);
  await add(page, person.name, "乙公司");
  await submit(page).click();
  await expect(page.locator(".contacts-person-card")).toHaveCount(2);
  await page
    .locator('[data-contact-action=person][data-value="only-mine"]')
    .click();
  await page.getByRole("tab", { name: "承诺", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "我的待办", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("承诺状态：我提供材料")).toHaveCount(0);
  await expect(page.locator(".contacts-metrics")).toHaveCount(0);
  await page.locator("[data-contact-action=edit]").click();
  await page.locator("[name=company]").fill("甲公司已更正");
  await submit(page).click();
  await page.locator(".contacts-actions [data-contact-action=note]").click();
  await page.locator("[name=text]").fill("需要确认的备注");
  await submit(page).click();
  await page.getByRole("button", { name: "编辑备注", exact: true }).click();
  await page.locator("[name=text]").fill("更正后的备注");
  await submit(page).click();
  await expect(page.getByRole("button", { name: "确认记忆", exact: true })).toHaveCount(0);
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "删除备注", exact: true }).click();
  await page.reload();
  const data = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).personal,
    key,
  );
  expect(data.contacts).toHaveLength(2);
  expect(data.contacts[0].company).toBe("甲公司已更正");
  expect(data.contacts[1].company).toBe("乙公司");

  expect(data.notes[person.id]).toEqual([]);
});

test("contacts update between tabs and reject already-open stale forms", async ({
  page,
  context,
}) => {
  await seedContacts(page);
  await contacts(page);
  const other = await context.newPage();
  await contacts(other);
  await add(other, "保留草稿", "草稿公司");
  await add(page, "已保存新联系人", "获胜数据");
  await submit(page).click();
  await expect(other.locator(".contacts-person-card")).toHaveCount(2);
  await submit(other).click();
  await expect(other.locator(".contacts-form-error")).toContainText(
    "另一页面已更新",
  );
  await expect(other.locator("[name=name]")).toHaveValue("保留草稿");
  await other.keyboard.press("Escape");
  await add(other, "最新页面新增", "丙公司");
  await submit(other).click();
  await expect(page.locator(".contacts-person-card")).toHaveCount(3);
  await other.close();
});

test("manual todo can be saved without deadline and stays under unscheduled", async ({
  page,
}) => {
  await page.goto("/workbench/?view=calendar&space=personal");
  await page.locator('[data-pa="new-todo"]').click();
  await page.locator('[name="title"]').fill("没有截止时间的待办");
  await expect(page.locator('[name="start"]')).toHaveValue("");
  await page.locator('form [type="submit"]').click();
  await page.reload();
  const section = page.getByRole("region", { name: "未安排待办" });
  await expect(section).toContainText("没有截止时间的待办");
  const todo = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("eureka:personal-actions:v1")!,
    ).records.find((r: { title: string }) => r.title === "没有截止时间的待办"),
  );
  expect(todo.start).toBe("");
  expect(todo.reminder).toBe("none");
});

for (const space of ["personal", "team-eureka"])
  test(`recording saves transcript, marks and Agent history in ${space}`, async ({
    page,
  }) => {
    const state = M.seed();
    if (space === "personal") { state.spaces = state.spaces.filter(w => w.type === "personal"); M.reconcileEntitlements(state); }
    await page.addInitScript((state) => {
      if (!localStorage.getItem("eureka:workspaces:v2"))
        localStorage.setItem("eureka:workspaces:v2", JSON.stringify(state));
    }, state);
    await page.goto(`/workbench/?view=recording&space=${space}&actor=zhang`);
    await page.locator("#recording-mark").click();
    await page.locator("#recording-assistant-toggle").click();
    await page.locator("#recording-assistant-input").fill("录音中需要跟进什么");
    await page.locator("#recording-assistant-send").click();
    await page.getByRole("button", { name: "新建会话", exact: true }).click();
    await page.locator("#recording-assistant-input").fill("新的录音会话");
    await page.locator("#recording-assistant-send").click();
    await page.getByRole("button", { name: "历史会话", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "历史会话" })).toContainText(
      "录音中需要跟进什么",
    );
    await expect(page.getByRole("dialog", { name: "历史会话" })).toContainText(
      "新的录音会话",
    );
    await page.getByRole("button", { name: "关闭历史会话" }).click();
    await page.locator("#recording-finish").click();
    await expect(
      page.getByRole("button", { name: "查看会议", exact: true }),
    ).toBeVisible();
    const saved = await page.evaluate((space) => {
      if (space === "personal")
        return JSON.parse(
          localStorage.getItem("eureka:personal-actions:v1")!,
        ).meetings.at(-1);
      const w = JSON.parse(
        localStorage.getItem("eureka:workspaces:v2")!,
      ).spaces.find((w: { id: string }) => w.id === space);
      return {
        ...w.files.find(
          (f: { title: string }) => f.title === "新录音 · 产品沟通",
        ),
        threads: w.threads,
      };
    }, space);
    expect(saved.transcript).toContain("授权完成后直接进入录制页");
    expect(
      space === "personal" ? saved.marks : saved.detail.marks,
    ).toHaveLength(1);
    if (space !== "personal")
      expect(
        saved.threads
          .filter((t: { recordingId: string }) => t.recordingId === saved.id)
          .every((t: { files: string[] }) => t.files.includes(saved.id)),
      ).toBe(true);
    // Init script must not overwrite the newly persisted workspace on navigation.
    await page.getByRole("button", { name: "查看会议", exact: true }).click();
    await expect(page.locator("body")).toContainText("网页录音");
    await expect(page.locator("body")).toContainText("本地演示录音");
  });

test("homepage shows ongoing schedule, overdue todo and business-date multi-currency totals", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-15T04:00:00Z"));
  await page.addInitScript(
    (days) => {
      const base = {
        done: false,
        source: "manual",
        notes: "",
        reminder: "none",
        location: "",
        participants: "",
        created: "",
        updated: "",
        links: [],
      };
      localStorage.setItem(
        "eureka:personal-actions:v1",
        JSON.stringify({
          version: 1,
          calendarDemoVersion: 1,
          demoWeekDays: days,
          records: [
            {
              ...base,
              id: "ongoing",
              title: "跨天进行中",
              type: "schedule",
              start: "2026-10-14T23:00",
              end: "2026-10-15T13:00",
            },
            {
              ...base,
              id: "late",
              title: "昨天的逾期待办",
              type: "todo",
              start: "2026-10-14T18:00",
              end: "",
            },
          ],
          meetings: [],
          sessions: [],
          settings: {},
        }),
      );
      localStorage.setItem(
        "eureka:thoughts:v1",
        JSON.stringify({
          version: 1,
          demoWeekDays: days,
          records: [
            {
              id: "usd",
              title: "美元支出",
              type: "ledger",
              date: "2026-10-14",
              time: "09:00",
              detail: "",
              occurredOn: "2026-10-15",
              currency: "USD",
              amount: 12,
              direction: "expense",
            },
            {
              id: "income",
              title: "入账",
              type: "ledger",
              date: "2026-10-15",
              time: "09:00",
              detail: "",
              amount: 80,
              direction: "income",
            },
          ],
        }),
      );
    },
    demoWeek.map((d) => d.date),
  );
  await page.goto("/workbench/?view=home&space=personal");
  await expect(page.locator(".daily-brief-narrative")).toContainText(
    "当前安排是",
  );
  await expect(page.locator("[data-today-toggle=late]")).toContainText("逾期");
  await expect(page.locator(".today-workbench")).toContainText("US$12.00");
  await expect(page.locator(".today-workbench")).toContainText("80.00");
});

test("ledger editing preserves captured content while correcting business date and currency", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("eureka:thoughts:v1"))
      localStorage.setItem(
        "eureka:thoughts:v1",
        JSON.stringify({
          version: 1,
          records: [
            {
              id: "expense-edit",
              type: "ledger",
              title: "差旅收支",
              date: "2026-10-15",
              time: "09:00",
              detail: "交通",
              amount: 45,
              direction: "expense",
              source: "hardware",
              capture: "原始语音文本",
            },
          ],
        }),
      );
  });
  await page.goto("/workbench/?view=thoughts&space=personal&id=expense-edit");
  await page.locator('#thought-record-dialog [data-th="edit"]').click();
  await page.locator('[name="occurredOn"]').fill("2026-10-14");
  await page.locator('[name="currency"]').fill("USD");
  await page.locator('#th-edit-form [type="submit"]').click();
  await expect(page.locator("#th-edit-form")).toHaveCount(0);
  await expect(page.locator("#thought-record-dialog")).toContainText(
    "US$45.00",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("eureka:thoughts:v1")!).records.find(
      (r: { id: string }) => r.id === "expense-edit",
    ),
  );
  expect(saved).toMatchObject({
    occurredOn: "2026-10-14",
    date: "2026-10-15",
    currency: "USD",
    capture: "原始语音文本",
    source: "hardware",
  });
});

test("missing team history is explicit and does not display another conversation", async ({
  page,
}) => {
  const state = M.seed();
  M.get(state, "team-eureka").threads.push({
    id: "valid-history",
    user: "zhang",
    prompt: "别人的历史不应回退显示",
    answer: "Existing unrelated answer",
    time: new Date().toISOString(),
    files: [],
  });
  await page.addInitScript(
    (state) =>
      localStorage.setItem("eureka:workspaces:v2", JSON.stringify(state)),
    state,
  );
  await page.goto(
    "/workbench/?view=history&space=team-eureka&actor=zhang&id=missing-history",
  );
  await expect(page.locator(".ws-agent-scroll")).toContainText(
    "会话已失效或无权访问",
  );
  await expect(page.locator(".ws-agent-scroll")).not.toContainText(
    "Existing unrelated answer",
  );
});
