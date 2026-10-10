import { expect, test, type Page } from "@playwright/test";
import M from "../../src/features/spaces/model/core";
import type { WorkspaceState } from "../../src/features/spaces/model/types";

// The final suite uses its configured server. The shared dev server can be selected without a build.
test.use({
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  ...(process.env.NATIVE_BASE_URL
    ? { baseURL: process.env.NATIVE_BASE_URL }
    : {}),
  timezoneId: "Asia/Shanghai",
  trace: "off",
  screenshot: "off",
  video: "off",
});
const route = (view: string, actor = "zhang", space = "team-eureka", id = "") =>
  `/workbench/?${new URLSearchParams({ view, space, actor, ...(id ? { id } : {}) })}`;
const dialog = (p: Page) => p.locator("#ws-dialog");
const action = (p: Page, name: string) =>
  p.locator(`#ws-view [data-ws-action="${name}"]`).first();
async function seed(page: Page, update?: (s: WorkspaceState) => void) {
  const s = M.seed();
  update?.(s);
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("native-team-management-seeded")) {
      localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s));
      localStorage.removeItem("eureka:team-setup:v1");
      sessionStorage.setItem("native-team-management-seeded", "1");
    }
  }, s);
}
async function read(page: Page) {
  return page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("eureka:workspaces:v2")!,
      ) as WorkspaceState,
  );
}
async function open(
  page: Page,
  view: string,
  actor = "zhang",
  space = "team-eureka",
  id = "",
) {
  await page.goto(route(view, actor, space, id));
  await expect(
    page.locator(
      ["create-team", "invitations"].includes(view) ? "#ws-dialog" : "#ws-view",
    ),
  ).toBeVisible();
}
async function failStorage(page: Page) {
  await page.evaluate(() => {
    const old = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "eureka:workspaces:v2")
        throw new DOMException("quota", "QuotaExceededError");
      return old.call(this, k, v);
    };
  });
}

test("native members: pending invite, accept, roles, resend, removal and refreshed persistence", async ({
  page,
}) => {
  await seed(page);
  await open(page, "members");
  await expect(page.locator(".ws-page-head")).toContainText(
    "待接受邀请也占用席位",
  );
  await action(page, "invite").click();
  await dialog(page).locator("[name=emails]").fill("parity@example.com");
  await dialog(page).getByRole("button", { name: "发送模拟邀请" }).click();
  let row = page
    .locator(".ws-table tbody tr")
    .filter({ hasText: "parity@example.com" });
  await expect(row).toContainText("待加入生效");
  await expect(row.locator("[data-member-time=joined]")).toHaveText("—");
  await expect(row.locator("[data-member-time=left]")).toHaveText("—");
  await row.getByRole("button", { name: "重发", exact: true }).click();
  await expect(page.locator("#ws-toast")).toContainText("模拟邀请已重发");
  await row.getByRole("button", { name: "模拟接受" }).click();
  await expect(row).toContainText("Unlimited");
  await expect(row.locator("[data-member-time=joined]")).toHaveText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  const joined = await row.locator("[data-member-time=joined]").innerText();
  await row.getByRole("button", { name: "调整角色" }).click();
  await dialog(page).locator("[name=role]").selectOption("admin");
  await dialog(page).getByRole("button", { name: "保存角色" }).click();
  await page.reload();
  row = page
    .locator(".ws-table tbody tr")
    .filter({ hasText: "parity@example.com" });
  await expect(row).toContainText("管理员");
  const before = (await read(page)).spaces.find(
    (s) => s.id === "team-eureka",
  )!.seats;
  await row.getByRole("button", { name: "移除", exact: true }).click();
  await dialog(page).getByRole("button", { name: "确认", exact: true }).click();
  await expect(row).toContainText("已移除");
  await expect(row).toContainText("已终止");
  await expect(row.locator("[data-member-time=joined]")).toHaveText(joined);
  await expect(row.locator("[data-member-time=left]")).toHaveText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  const left = await row.locator("[data-member-time=left]").innerText();
  await expect(row.getByRole("button")).toHaveCount(0);
  await page.reload();
  await expect(row.locator("[data-member-time=left]")).toHaveText(left);
  expect(
    (await read(page)).spaces.find((s) => s.id === "team-eureka")!.seats,
  ).toBe(before);
  await action(page, "invite").click();
  await dialog(page).locator("[name=emails]").fill("parity@example.com");
  await dialog(page).getByRole("button", { name: "发送模拟邀请" }).click();
  await expect(row.locator("[data-member-time=joined]")).toHaveText("—");
  await row.getByRole("button", { name: "模拟接受" }).click();
  await expect(row).toHaveCount(1);
  await expect(row.locator("[data-member-time=left]")).toHaveText("—");
});

test("native members: member permissions and no exit for any role", async ({
  page,
}) => {
  await seed(page, (s) => {
    M.get(s, "team-eureka").members.forEach((m) => {
      m.role = m.id === "zhang" ? "admin" : "member";
    });
  });
  await open(page, "members", "lin");
  await expect(page.locator("#ws-view [data-ws-action=invite]")).toHaveCount(0);
  await expect(
    page.locator("#ws-view [data-ws-action=member-role]"),
  ).toHaveCount(0);
  await expect(action(page, "leave")).toHaveCount(0);
  await open(page, "members");
  await expect(action(page, "leave")).toHaveCount(0);
});

test("native members: invalid/full invites and failed storage preserve form and data", async ({
  page,
}) => {
  await seed(page);
  await open(page, "members");
  await action(page, "invite").click();
  await dialog(page).locator("[name=emails]").fill("invalid-email");
  await dialog(page).getByRole("button", { name: "发送模拟邀请" }).click();
  await expect(dialog(page).locator(".ws-form-error")).not.toBeEmpty();
  await dialog(page)
    .locator("[name=emails]")
    .fill(
      "one@example.com,two@example.com,three@example.com,four@example.com,five@example.com,six@example.com",
    );
  await dialog(page).getByRole("button", { name: "发送模拟邀请" }).click();
  await expect(dialog(page).locator(".ws-form-error")).not.toBeEmpty();
  const before = await read(page);
  await dialog(page).locator("[name=emails]").fill("one@example.com");
  await failStorage(page);
  await dialog(page).getByRole("button", { name: "发送模拟邀请" }).click();
  await expect(dialog(page).locator(".ws-form-error")).toContainText(
    "保存失败",
  );
  await expect(dialog(page).locator("[name=emails]")).toHaveValue(
    "one@example.com",
  );
  expect(await read(page)).toEqual(before);
});

test("team devices are admin metadata only, including expired workspaces", async ({ page }) => {
  await seed(page, s => { M.get(s, "team-eureka").status = "expired"; });
  await open(page, "devices");
  await expect(page.getByRole("button", { name: /解绑|绑定已有|模拟同步|录入/ })).toHaveCount(0);
  await page.getByRole("button", { name: "查看信息", exact: true }).first().click();
  await expect(dialog(page)).toContainText("序列号");
  await page.keyboard.press("Escape");
  await open(page, "devices", "kevin");
  await expect(page.getByRole("heading", { name: "仅管理员可查看设备信息" })).toBeVisible();
});

test("native settings: immutable region, rename persistence, conflict and audit privacy", async ({
  page,
}) => {
  await seed(page);
  await open(page, "space-settings");
  await expect(page.locator("[name=country]")).toBeDisabled();
  await page.locator("[name=name]").fill("管理界面对齐测试");
  await page.getByRole("button", { name: "保存设置", exact: true }).click();
  await page.reload();
  await expect(page.locator("[name=name]")).toHaveValue("管理界面对齐测试");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("eureka:workspaces:v2")!);
    s.spaces[0].name += " external";
    localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s));
  });
  await page.locator("[name=name]").fill("保留未提交名称");
  await page.getByRole("button", { name: "保存设置", exact: true }).click();
  await expect(page.locator(".ws-form-error")).toContainText("其他页面");
  await expect(page.locator("[name=name]")).toHaveValue("保留未提交名称");
  await open(page, "audit");
  await expect(page.locator(".ws-list")).toContainText("更新空间名称");
  await expect(page.locator(".ws-list")).not.toContainText("私有");
});

test("native settings do not expose dissolution", async ({ page }) => {
  await seed(page);
  const before = M.seed();
  await open(page, "space-settings");
  await expect(page.getByRole("button", { name: /退出团队|解散团队/ })).toHaveCount(0);
  expect((await read(page)).spaces).toEqual(before.spaces);
});

test("native create team: plans, draft recovery, failure, retry, success invite and cancellation", async ({
  page,
}) => {
  await seed(page, (s) => { s.spaces = s.spaces.filter((w) => w.type === "personal"); s.devices = []; });
  await open(page, "create-team", "zhang", "personal");
  await expect(dialog(page)).toHaveClass(/ws-dialog-wide/);
  await dialog(page).getByRole("button", { name: "月付", exact: true }).click();
  await expect(dialog(page).locator(".ws-price")).toContainText("28.00");
  await dialog(page)
    .getByRole("button", { name: "创建团队", exact: true })
    .click();
  await dialog(page).locator("[name=name]").fill("原生开通验证");
  await dialog(page).getByRole("button", { name: "确认订单" }).click();
  await page.reload();
  await expect(dialog(page).locator("h2")).toHaveText("确认团队订单");
  const before = (await read(page)).spaces.length;
  await dialog(page).getByRole("button", { name: "模拟支付失败" }).click();
  await expect(dialog(page).locator(".ws-form-error")).toContainText(
    "模拟支付失败",
  );
  expect((await read(page)).spaces).toHaveLength(before);
  await dialog(page).getByRole("button", { name: "模拟支付并开通" }).click();
  await expect(dialog(page).locator("h2")).toHaveText("团队已准备好");
  expect((await read(page)).spaces).toHaveLength(before + 1);
  await dialog(page).getByRole("button", { name: "邀请伙伴" }).click();
  await expect(dialog(page).locator("h2")).toHaveText("邀请空间成员");
});

test("native task management routes are no longer available", async ({ page }) => {
  await seed(page);
  await page.goto(route("tasks"));
  await expect(page.getByText("此入口不属于当前工作空间。", { exact: true })).toBeVisible();
  await expect(page.locator(".sidebar")).not.toContainText(/任务管理|全部任务|自动任务|历史会话/);
});

for (const width of [1920, 1440, 1024, 390])
  test(`native management responsive ${width}: settings, members and device guide`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await seed(page);
    await open(page, "space-settings");
    for (const card of await page.locator(".ws-settings-form").all())
      expect(
        await card.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBeTruthy();
    await open(page, "members");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    await action(page, "invite").click();
    const invite = await dialog(page).boundingBox();
    expect(invite!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await open(page, "devices", "zhang", "personal");
    await page.getByRole("button", { name: "绑定已有设备" }).click();
    expect((await dialog(page).boundingBox())!.width).toBeLessThanOrEqual(
      width,
    );
    expect(
      await dialog(page).evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBeTruthy();
  });

test("native members do not expose exit", async ({ page }) => {
  await seed(page);
  const before = M.seed();
  await open(page, "members");
  await expect(page.getByRole("button", { name: /退出团队|解散团队/ })).toHaveCount(0);
  expect((await read(page)).spaces).toEqual(before.spaces);
});

test("native sole-admin demotion is rejected; pending revoke releases capacity", async ({
  page,
}) => {
  await seed(page, (s) => {
    M.get(s, "team-eureka").members.find((m) => m.id === "lin")!.role =
      "member";
  });
  await open(page, "members");
  const me = page
    .locator(".ws-table tr")
    .filter({ hasText: "zhang.wei@eureka.example" });
  await me.getByRole("button", { name: "调整角色" }).click();
  await dialog(page).locator("[name=role]").selectOption("member");
  await dialog(page).getByRole("button", { name: "保存角色" }).click();
  await expect(dialog(page).locator(".ws-form-error")).not.toBeEmpty();
  await page.keyboard.press("Escape");
  const before = M.usedSeats(M.get(await read(page), "team-eureka"));
  await page
    .locator(".ws-table tr")
    .filter({ hasText: "alice@eureka.example" })
    .getByRole("button", { name: "撤销", exact: true })
    .click();
  await dialog(page).getByRole("button", { name: "确认", exact: true }).click();
  expect(M.usedSeats(M.get(await read(page), "team-eureka"))).toBe(before - 1);
});

test("personal devices: binding guide, own metadata, failed unbind rollback and successful unbind", async ({ page }) => {
  await seed(page);
  await open(page, "devices", "zhang", "personal");
  await page.getByRole("button", { name: "绑定已有设备" }).click();
  await expect(dialog(page).locator(".ws-device-guide-card")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "查看信息", exact: true }).click();
  await expect(dialog(page)).toContainText("设备所有者");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "解绑", exact: true }).click();
  await failStorage(page);
  await page.getByRole("button", { name: "确认解绑", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("保存失败");
  expect((await read(page)).devices.find(d => d.id === "dev-personal")?.bound).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "解绑", exact: true }).click();
  await page.getByRole("button", { name: "确认解绑", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("未绑定工作区");
});

test("native settings: expired write denied, nonadmin denial, and empty audit", async ({
  page,
}) => {
  await seed(page, (s) => {
    const w = M.get(s, "team-eureka");
    w.status = "expired";
    w.audit = [];
  });
  await open(page, "space-settings");
  await page.locator("[name=name]").fill("到期不能保存");
  await page.getByRole("button", { name: "保存设置", exact: true }).click();
  await expect(page.locator(".ws-form-error")).not.toBeEmpty();
  await open(page, "audit");
  await expect(page.locator(".ws-empty h3")).toHaveText("暂无管理活动");
  await open(page, "space-settings", "kevin");
  await expect(page.locator(".ws-empty h3")).toHaveText("此页面暂不可访问");
});

test("native creation cancellation and stale draft do not create teams", async ({
  page,
}) => {
  await seed(page, (s) => { s.spaces = s.spaces.filter((w) => w.type === "personal"); s.devices = []; });
  await open(page, "create-team", "zhang", "personal");
  await dialog(page)
    .getByRole("button", { name: "创建团队", exact: true })
    .click();
  await dialog(page).locator("[name=name]").fill("取消演示");
  await dialog(page).getByRole("button", { name: "确认订单" }).click();
  const before = (await read(page)).spaces.length;
  await dialog(page).getByRole("button", { name: "取消订单" }).click();
  await expect(page).toHaveURL(/view=home/);
  expect(
    await page.evaluate(() => localStorage.getItem("eureka:team-setup:v1")),
  ).toBeNull();
  expect((await read(page)).spaces).toHaveLength(before);
  await open(page, "create-team", "zhang", "personal");
  await dialog(page)
    .getByRole("button", { name: "创建团队", exact: true })
    .click();
  await dialog(page).locator("[name=name]").fill("并发开通演示");
  await dialog(page).getByRole("button", { name: "确认订单" }).click();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("eureka:team-setup:v1")!);
    s.name = "其他标签页草稿";
    localStorage.setItem("eureka:team-setup:v1", JSON.stringify(s));
  });
  await dialog(page).getByRole("button", { name: "模拟支付并开通" }).click();
  await expect(dialog(page).locator(".ws-form-error")).toContainText(
    "其他页面",
  );
  expect((await read(page)).spaces).toHaveLength(before);
});

test("native incoming invitations: decline to empty and accept into isolated team", async ({
  page,
}) => {
  await seed(page, (s) => { s.spaces = s.spaces.filter((w) => w.type === "personal"); s.devices = []; });
  await open(page, "invitations", "zhang", "personal");
  await expect(dialog(page).locator(".ws-invitation")).toContainText("王晨");
  await dialog(page).getByRole("button", { name: "婉拒" }).click();
  await expect(dialog(page).locator(".ws-empty h3")).toHaveText(
    "没有待处理的邀请",
  );
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("eureka:workspaces:v2")!);
    s.invitations[0].status = "pending";
    localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s));
  });
  await page.reload();
  await dialog(page).getByRole("button", { name: "接受并进入" }).click();
  await expect(page).toHaveURL(/view=home/);
  expect((await read(page)).invitations[0].status).toBe("accepted");
});



test("native personal history: exact replies, continuation, sources, new task and resize", async ({
  page,
}) => {
  await seed(page, s => { s.spaces = s.spaces.filter(w => w.type === "personal"); M.reconcileEntitlements(s); });
  await page.goto(route("history", "zhang", "personal", "本周会议决策整理"));
  await expect(page.locator("#agent-history-title")).toHaveText(
    "本周会议决策整理",
  );
  await page.locator("#agent-history-continue").click();
  await expect(page.locator("#xiaozhi-input")).not.toBeEmpty();
  await page.locator("#xiaozhi-send").click();
  await expect(
    page.locator("#agent-history-messages .assistant").last(),
  ).toContainText("收到你的补充");
  await page.locator("#agent-sources-toggle").click();
  await expect(page.locator("#agent-sources-popover")).toBeVisible();
  await page.locator("#xiaozhi-audio").click();
  await page.keyboard.press("Escape");
  await page.locator("#xiaozhi-new-task").click();
  await expect(page.locator("#agent-history-session")).toBeHidden();
  await expect(page.locator(".xiaozhi-intro")).toBeVisible();
  const handle = page.getByRole("separator", { name: "调整 Agent 窗口宽度" });
  await handle.focus();
  const before = Number(await handle.getAttribute("aria-valuenow"));
  await page.keyboard.press("ArrowLeft");
  expect(
    Number(await handle.getAttribute("aria-valuenow")),
  ).toBeGreaterThanOrEqual(before);
});
