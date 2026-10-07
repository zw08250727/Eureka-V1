import { expect, test } from "@playwright/test";
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const authUrl = "/prototype/auth-shell.html";
const homePath =
  "/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1";

for (const mode of ["login", "register"]) {
  test(`${mode} enters home directly and refresh stays on home`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(authUrl);
    if (mode === "register")
      await page.getByRole("button", { name: "立即注册", exact: true }).click();
    const navigations: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });
    // Enter submits the same form as clicking its button, without another step.
    await page.locator("#code").press("Enter");
    await expect(page).toHaveURL(new RegExp(homePath.replaceAll("?", "\\?")));
    await expect(page.locator('[data-main-view="home"]')).toBeVisible();
    await expect(page.locator("#recent-meeting-title")).toHaveText("我的会议");
    await expect(page.locator("#edition-gate")).toBeHidden();
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(navigations).toHaveLength(1);
    await page.reload();
    await expect(page.locator("#home-entry")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(errors).toEqual([]);
  });
}

test("validation blocks invalid submission and successful entry has immediate feedback", async ({
  page,
}) => {
  await page.goto(authUrl);
  await page.locator("#terms").uncheck();
  await page.locator("#submit").click();
  await expect(page.locator("#status")).toContainText("请先同意");
  await page.locator("#terms").check();
  await page.locator("#email").fill("bad-email");
  await page.locator("#submit").click();
  await expect(page.locator("#status")).toContainText("有效的邮箱");
  await page.locator("#email").fill("demo@example.com");
  await page.locator("#code").clear();
  await page.locator("#submit").click();
  await expect(page.locator("#status")).toContainText("请输入邮箱验证码");
  await page.locator("#code").fill("123456");
  // Observe the same submit event before the browser replaces the document.
  await page.evaluate(() =>
    document.addEventListener(
      "submit",
      () => {
        sessionStorage.setItem(
          "auth-test-feedback",
          JSON.stringify({
            disabled: (document.getElementById("submit") as HTMLButtonElement)
              .disabled,
            text: document.getElementById("submit")!.textContent,
            busy: document
              .getElementById("auth-form")!
              .getAttribute("aria-busy"),
          }),
        );
      },
      { once: true },
    ),
  );
  await page.locator("#submit").click();
  await expect(page.locator("#recent-meeting-title")).toHaveText("我的会议");
  const feedback = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("auth-test-feedback")!),
  );
  expect(feedback).toEqual({
    disabled: true,
    text: "正在进入首页…",
    busy: "true",
  });
});

for (const provider of ["google", "apple"]) {
  test(`simulated ${provider} sign-in enters home without hanging`, async ({
    page,
  }) => {
    await page.goto(authUrl);
    await page.locator(`#${provider}`).click();
    await expect(page.locator("#recent-meeting-title")).toHaveText("我的会议");
    await expect(page.locator("#edition-gate")).toBeHidden();
  });
}

for (const entry of ["/prototype/index.html"]) {
  test(`${entry} embeds only one page through sign-in and home`, async ({
    page,
  }) => {
    await page.goto(entry);
    const shell = page.frameLocator("iframe");
    await shell.locator("#submit").click();
    await expect(shell.locator("#recent-meeting-title")).toHaveText("我的会议");
    await expect(shell.locator("iframe")).toHaveCount(0);
    await expect(shell.locator("#home-entry")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
}

for (const mode of ["login", "register"])
  test(`native ${mode} enters the React home without iframe`, async ({
    page,
  }) => {
    await page.goto("/");
    if (mode === "register")
      await page.getByRole("button", { name: "立即注册", exact: true }).click();
    await page.locator("#terms").uncheck();
    await page.locator("#submit").click();
    await expect(page.locator("#status")).toContainText("请先同意");
    await page.locator("#terms").check();
    await page.locator("#submit").click();
    await expect(page).toHaveURL(/workbench/);
    await expect(page.locator("#recent-meeting-title")).toHaveText("我的会议");
    await expect(page.locator("iframe")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("#home-entry")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

for (const provider of ["google", "apple"]) {
  test(`native ${provider} validates agreement and enters home`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#terms").uncheck();
    await page.locator(`#${provider}`).click();
    await expect(page.locator("#status")).toContainText("请先同意");
    await page.locator("#terms").check();
    await page.locator(`#${provider}`).click();
    await expect(page).toHaveURL(/workbench\/\?view=home&space=personal/);
    await expect(page.locator("#recent-meeting-title")).toHaveText("我的会议");
  });
}

test("native email validation, resend after changing email and keyboard submit", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#email").fill("invalid");
  await page.locator("#send").click();
  await expect(page.locator("#status")).toContainText("有效的邮箱");
  await page.locator("#submit").click();
  await expect(page).not.toHaveURL(/workbench/);
  await page.locator("#email").fill("tester@example.com");
  await page.locator("#send").click();
  await expect(page.locator("#status")).toContainText("演示验证码：123456");
  await expect(page.locator("#send")).toBeDisabled();
  await page.locator("#email").fill("second@example.com");
  await expect(page.locator("#send")).toBeEnabled();
  await page.locator("#code").fill("abc");
  await page.locator("#code").press("Enter");
  await expect(page.locator("#status")).toContainText("6 位数字");
  await page.locator("#updates").uncheck();
  await page.locator("#code").fill("123456");
  await page.locator("#code").press("Enter");
  await expect(page).toHaveURL(/workbench/);
});

test("showcase cycles, pauses on hover and focus, and preserves auth input", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.clock.install();
  await page.goto("/");
  const visual = page.locator(".auth-visual");
  await expect(visual).toHaveAttribute("data-playing", "true");
  await page.locator("#email").fill("keep@example.com");
  await page.clock.fastForward(6100);
  await expect(
    page.getByRole("heading", { name: "汇聚交流，让团队同频。" }),
  ).toBeVisible();
  await page.clock.fastForward(6100);
  await expect(
    page.getByRole("heading", { name: "连接知识，让下一步清晰。" }),
  ).toBeVisible();
  await page.clock.fastForward(6100);
  await expect(
    page.getByRole("heading", { name: "留住灵感，让想法生长。" }),
  ).toBeVisible();
  await visual.hover();
  await expect(visual).toHaveAttribute("data-playing", "false");
  await page.clock.fastForward(13000);
  await expect(
    page.getByRole("heading", { name: "留住灵感，让想法生长。" }),
  ).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(visual).toHaveAttribute("data-playing", "true");
  await page.getByRole("button", { name: "查看团队共识" }).focus();
  await expect(visual).toHaveAttribute("data-playing", "false");
  await page.getByRole("button", { name: "查看团队共识" }).press("Enter");
  await page.locator("#email").focus();
  await page.clock.fastForward(13000);
  await expect(
    page.getByRole("heading", { name: "汇聚交流，让团队同频。" }),
  ).toBeVisible();
  await expect(page.locator("#email")).toHaveValue("keep@example.com");
  await page.getByRole("button", { name: "播放场景轮播" }).click();
  await page.locator("#email").focus();
  await page.mouse.move(5, 5);
  await expect(visual).toHaveAttribute("data-playing", "true");
  await page.clock.fastForward(6100);
  await expect(
    page.getByRole("heading", { name: "连接知识，让下一步清晰。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "暂停场景轮播" }).click();
  await page.locator("#email").focus();
  await page.mouse.move(5, 5);
  await expect(visual).toHaveAttribute("data-playing", "false");
});

test("reduced motion disables animation and autoplay but keeps manual navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".auth-visual")).toHaveAttribute(
    "data-playing",
    "false",
  );
  await page.clock.fastForward(20000);
  await expect(
    page.getByRole("heading", { name: "留住灵感，让想法生长。" }),
  ).toBeVisible();
  expect(
    await page
      .locator(".preview-wave i")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.getByRole("button", { name: "查看Agent 助力" }).click();
  await page.screenshot({ path: "test-results/auth/agent-desktop.png", fullPage: true, animations: "disabled" });
  await expect(
    page.getByRole("heading", { name: "连接知识，让下一步清晰。" }),
  ).toBeVisible();
});

for (const [width, height] of [
  [1440, 1000],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [320, 568],
]) {
  for (const mode of ["login", "register"]) {
    test(`native ${mode} visual layout ${width}x${height}`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      if (mode === "register")
        await page
          .getByRole("button", { name: "立即注册", exact: true })
          .click();
      await expect(
        page.getByRole("heading", {
          name: mode === "login" ? "欢迎回来" : "创建你的账号",
          exact: true,
        }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width <= 960) {
        await expect(page.locator(".auth-visual")).toBeHidden();
        await expect(page.locator(".auth-visual")).toHaveAttribute(
          "data-playing",
          "false",
        );
      } else await expect(page.locator(".auth-visual")).toBeVisible();
      const email = await page.locator("#email").boundingBox();
      const code = await page.locator("#code").boundingBox();
      const send = await page.locator("#send").boundingBox();
      const submit = await page.locator("#submit").boundingBox();
      const terms = await page.locator(".check").first().boundingBox();
      expect(send!.x + send!.width).toBeLessThanOrEqual(
        email!.x + email!.width + 1,
      );
      expect(code!.width).toBeGreaterThan(120);
      expect(submit!.y + submit!.height).toBeLessThan(terms!.y);
      await page.screenshot({
        path: `test-results/auth/${mode}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
      if (process.env.PRD_CAPTURE === "1" && width === 1440) {
        await page.screenshot({
          path: `src/prototype/prd/images/${mode === "login" ? "auth" : "auth-register"}.png`,
          fullPage: true,
          animations: "disabled",
        });
        if (mode === "login") {
          await page.getByRole("button", { name: "查看团队共识" }).click();
          await page.screenshot({
            path: "src/prototype/prd/images/auth-team.png",
            fullPage: true,
            animations: "disabled",
          });
        }
      }
      await page.locator("#submit").click();
      await expect(page).toHaveURL(/workbench/);
      expect(errors).toEqual([]);
    });
  }
}
