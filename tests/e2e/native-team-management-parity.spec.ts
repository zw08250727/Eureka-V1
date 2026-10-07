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
  await row.getByRole("button", { name: "重发", exact: true }).click();
  await expect(page.locator("#ws-toast")).toContainText("模拟邀请已重发");
  await row.getByRole("button", { name: "模拟接受" }).click();
  await expect(row).toContainText("Unlimited");
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
  await expect(row).toHaveCount(0);
  expect(
    (await read(page)).spaces.find((s) => s.id === "team-eureka")!.seats,
  ).toBe(before);
});

test("native members: member permissions and sole-admin handoff block", async ({
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
  await action(page, "leave").click();
  await expect(page.locator("#ws-toast")).toContainText("请先切回自己的视角");
  await open(page, "members");
  await action(page, "leave").click();
  await expect(dialog(page).locator("h2")).toHaveText("请先交接管理员");
  await dialog(page).getByRole("button", { name: "前往成员管理" }).click();
  await expect(page.locator(".ws-page-head h1")).toHaveText("成员与角色");
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

test("native devices: register textual serial, duplicate rejection, metadata, sync and unbind", async ({
  page,
}) => {
  await seed(page);
  await open(page, "devices");
  await action(page, "register-device").click();
  await dialog(page).locator("[name=serial]").fill("0000474204126010000027");
  await dialog(page).locator("[name=model]").fill("W2");
  await dialog(page).getByRole("button", { name: "保存并绑定" }).click();
  const row = page
    .locator(".ws-table tbody tr")
    .filter({ hasText: "0000474204126010000027" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "详情" }).click();
  await expect(dialog(page).locator(".ws-device-detail")).toContainText(
    "0000474204126010000027",
  );
  await page.keyboard.press("Escape");
  await action(page, "register-device").click();
  await dialog(page).locator("[name=serial]").fill("0000474204126010000027");
  await dialog(page).locator("[name=model]").fill("W2");
  await dialog(page).getByRole("button", { name: "保存并绑定" }).click();
  await expect(dialog(page).locator(".ws-form-error")).not.toBeEmpty();
  await page.keyboard.press("Escape");
  const before = M.get(await read(page), "team-eureka").files.length;
  await row.getByRole("button", { name: "模拟同步" }).click();
  await expect(page.locator("#ws-toast")).toContainText("团队成员可直接查看");
  expect(M.get(await read(page), "team-eureka").files).toHaveLength(before + 1);
  await row.getByRole("button", { name: "解绑" }).click();
  await dialog(page).getByRole("button", { name: "确认", exact: true }).click();
  await expect(row).toHaveCount(0);
  expect(M.get(await read(page), "team-eureka").files).toHaveLength(before + 1);
});

test("native devices: member-only registration, empty state, expired denial, App guide", async ({
  page,
}) => {
  await seed(page, (s) => {
    s.devices = s.devices.filter((d) => d.spaceId !== "team-eureka");
  });
  await open(page, "devices", "kevin");
  await expect(page.locator(".ws-empty h3")).toHaveText("当前空间尚未绑定设备");
  await action(page, "register-device").click();
  await expect(dialog(page).locator("[name=user] option")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await action(page, "bind").click();
  await expect(dialog(page).locator(".ws-device-guide-card")).toHaveCount(2);
  await expect(dialog(page).locator(".ws-device-guide-qr img")).toHaveAttribute(
    "src",
    /eurekamind-download-qr.png/,
  );
  await expect(
    dialog(page).getByRole("link", { name: "购买设备" }),
  ).toHaveAttribute("href", "https://eurekamind.ai/shop");
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("eureka:workspaces:v2")!);
    s.spaces.find((w: { id: string }) => w.id === "team-eureka").status =
      "expired";
    localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s));
  });
  await page.reload();
  await action(page, "register-device").click();
  await expect(page.locator("#ws-toast")).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
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

test("native dissolve: exact-name guard and closure receipt, frozen credits and cancelled orders", async ({
  page,
}) => {
  await seed(page);
  await open(page, "space-settings");
  const before = M.get(await read(page), "team-eureka");
  await action(page, "dissolve").click();
  await expect(dialog(page).locator(".ws-exit-rules > div")).toHaveCount(5);
  await dialog(page).locator("[name=confirmName]").fill("wrong");
  await dialog(page).getByRole("button", { name: "确认解散团队" }).click();
  await expect(dialog(page).locator(".ws-form-error")).toContainText("名称");
  await dialog(page).locator("[name=confirmName]").fill(before.name);
  await dialog(page).getByRole("button", { name: "确认解散团队" }).click();
  await expect(dialog(page).locator("h2")).toHaveText("团队已解散");
  const after = M.get(await read(page), "team-eureka");
  expect(after.status).toBe("dissolved");
  expect(after.renew).toBe(false);
  expect(after.closure!.frozenCredits).toBe(M.creditBalance(before));
  const download = page.waitForEvent("download");
  await dialog(page).getByRole("button", { name: "下载结算记录" }).click();
  expect((await download).suggestedFilename()).toContain("解散结算记录");
});

test("native create team: plans, draft recovery, failure, retry, success invite and cancellation", async ({
  page,
}) => {
  await seed(page);
  await open(page, "create-team", "zhang", "personal");
  await expect(dialog(page)).toHaveClass(/ws-dialog-wide/);
  await dialog(page).getByRole("button", { name: "月付", exact: true }).click();
  await expect(dialog(page).locator(".ws-price")).toContainText("199.00");
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

test("native own automatic task: save, paused-run guard, simulation and own history", async ({
  page,
}) => {
  await seed(page);
  await open(page, "tasks");
  await dialog(page).locator("[name=title]").fill("原生自动任务");
  await dialog(page).locator("[name=prompt]").fill("整理当前团队的会议行动项");
  await dialog(page).getByRole("button", { name: "保存任务" }).click();
  const task = M.scheduledTasks(
    M.get(await read(page), "team-eureka"),
    "zhang",
  ).find((t) => t.title === "原生自动任务")!;
  await open(page, "tasks", "zhang", "team-eureka", task.id);
  await dialog(page).getByRole("button", { name: "暂停任务" }).click();
  await expect(
    dialog(page).getByRole("button", { name: "模拟运行" }),
  ).toBeDisabled();
  await dialog(page).getByRole("button", { name: "启用任务" }).click();
  await dialog(page).getByRole("button", { name: "模拟运行" }).click();
  await expect(page.locator(".ws-agent-history-context h3")).toHaveText(
    "原生自动任务",
  );
  await expect(page.locator(".ws-chat-answer")).not.toBeEmpty();
  await page.locator(".ws-composer textarea").fill("继续整理");
  await page.locator(".ws-composer [type=submit]").click();
  await expect(page.locator(".ws-chat-user")).toHaveCount(2);
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
    await open(page, "devices");
    await action(page, "bind").click();
    expect((await dialog(page).boundingBox())!.width).toBeLessThanOrEqual(
      width,
    );
    expect(
      await dialog(page).evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBeTruthy();
  });

test("native leave: active second admin allows leaving with device/task cleanup and personal return", async ({
  page,
}) => {
  await seed(page, (s) => {
    const w = M.get(s, "team-eureka");
    M.registerDevice(
      s,
      w.id,
      { serial: "EXIT-DEVICE-001", model: "W2", user: "zhang" },
      "zhang",
    );
    M.saveTask(
      w,
      {
        title: "离开后暂停",
        prompt: "整理会议",
        frequency: "daily",
        time: "09:00",
      },
      "zhang",
    );
  });
  await open(page, "members");
  await action(page, "leave").click();
  await expect(dialog(page).locator(".ws-exit-rules > div")).toHaveCount(4);
  await dialog(page).getByRole("button", { name: "确认退出团队" }).click();
  await expect(page).toHaveURL(/space=personal/);
  const s = await read(page),
    w = M.get(s, "team-eureka");
  expect(w.members.find((m) => m.id === "zhang")!.status).toBe("removed");
  expect(
    s.devices.find((d) => d.serial === "EXIT-DEVICE-001")!.spaceId,
  ).toBeNull();
  expect(w.automaticTasks.find((t) => t.title === "离开后暂停")!.enabled).toBe(
    false,
  );
  expect(w.seats).toBe(6);
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

test("native device registration: failed write and concurrent write retain exact inputs", async ({
  page,
}) => {
  await seed(page);
  await open(page, "devices");
  await action(page, "register-device").click();
  await dialog(page).locator("[name=serial]").fill("00009999999999999999");
  await dialog(page).locator("[name=model]").fill("W2");
  await failStorage(page);
  await dialog(page).getByRole("button", { name: "保存并绑定" }).click();
  await expect(dialog(page).locator(".ws-form-error")).toContainText(
    "保存失败",
  );
  await expect(dialog(page).locator("[name=serial]")).toHaveValue(
    "00009999999999999999",
  );
  await page.reload();
  await action(page, "register-device").click();
  await dialog(page).locator("[name=serial]").fill("00009999999999999999");
  await dialog(page).locator("[name=model]").fill("W2");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("eureka:workspaces:v2")!);
    s.account.name = "并发修改";
    localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s));
  });
  await dialog(page).getByRole("button", { name: "保存并绑定" }).click();
  await expect(dialog(page).locator(".ws-form-error")).toContainText(
    "其他页面",
  );
  await expect(dialog(page).locator("[name=serial]")).toHaveValue(
    "00009999999999999999",
  );
});

test("native personal devices: empty App guide, own detail, and no team registration section", async ({
  page,
}) => {
  await seed(page);
  await open(page, "devices", "zhang", "personal");
  await expect(
    page.locator("#ws-view [data-ws-action=register-device]"),
  ).toHaveCount(0);
  await action(page, "device-detail").click();
  await expect(dialog(page).locator(".ws-device-detail")).toContainText(
    "个人工作空间",
  );
  await page.keyboard.press("Escape");
  await action(page, "unbind").click();
  await dialog(page).getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".ws-empty")).toContainText(
    "在手机 App 完成设备绑定",
  );
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
  await seed(page);
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
  await seed(page);
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

test("native task privacy, low credits, deleted results, sources and keyboard resizing", async ({
  page,
}) => {
  const s = M.seed(),
    w = M.get(s, "team-eureka");
  const t = M.saveTask(
    w,
    {
      title: "额度与权限验证",
      prompt: "整理团队会议",
      frequency: "daily",
      time: "09:00",
    },
    "zhang",
  );
  t.runs = [
    { time: "2026-10-07 09:00", status: "success", threadId: "removed-thread" },
  ];
  w.credits.used = w.credits.total;
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("native-team-management-seeded")) {
      localStorage.setItem("eureka:workspaces:v2", JSON.stringify(s));
      sessionStorage.setItem("native-team-management-seeded", "1");
    }
  }, s);
  await open(page, "tasks", "kevin", "team-eureka", t.id);
  await expect(dialog(page).locator(".ws-form-error")).toContainText(
    "无权访问",
  );
  await open(page, "tasks", "zhang", "team-eureka", t.id);
  await expect(dialog(page)).toContainText("会话已删除或不可访问");
  await dialog(page).getByRole("button", { name: "模拟运行" }).click();
  await expect(page.locator("#ws-toast")).toBeVisible();
  expect(
    M.scheduledTasks(M.get(await read(page), "team-eureka"), "zhang").find(
      (x) => x.id === t.id,
    )!.runs,
  ).toHaveLength(1);
});

test("native personal history: exact replies, continuation, sources, new task and resize", async ({
  page,
}) => {
  await seed(page);
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
