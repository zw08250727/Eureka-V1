import { expect, test } from "@playwright/test";

const scenes = [
  { name: "home", query: "", entry: "#xiaozhi-entry" },
  { name: "thoughts", query: "view=thoughts", entry: '[data-th="ask"]' },
  { name: "calendar", query: "view=calendar", entry: '[data-pa="agent"]' },
  { name: "contacts", query: "view=contacts&id=john", entry: ".contacts-xiaozhi-entry" },
  { name: "team", query: "space=team-eureka", entry: 'button[aria-label="Ask Agent"]' },
  { name: "meeting", query: "view=meeting&id=meeting-1", entry: ".md-ask-agent" },
  { name: "team-meeting", query: "view=meeting&space=team-eureka&id=team-review", entry: ".md-ask-agent" },
  { name: "history", query: "view=history&id=本周会议决策整理", entry: "" },
  { name: "recording", query: "view=recording&capture=meeting-video&surface=window", entry: "#recording-assistant-toggle" },
];

for (const market of ["cn", "global"]) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1080, height: 680 }, { width: 768, height: 900 }]) {
    test(`${market}: UI-AGENT-DOCK-01 across scenes at ${viewport.width}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      await page.addInitScript(market => {
        localStorage.setItem(`eureka:market:${market}:eureka:auth:v1`, JSON.stringify({
          market, realm: `eureka-${market}`, identity: "dock-test@example.com",
        }));
      }, market);
      for (const scene of scenes) {
        await page.goto(`/${market}/workbench/?${scene.query}`);
        if (scene.entry) await page.locator(scene.entry).first().click();
        const rail = page.locator('[data-shell-agent="true"]');
        await expect(rail).toBeVisible();
        await expect.poll(async () => (await rail.boundingBox())?.y, { message: `${scene.name}: panel reaches the topbar` }).toBe(0);
        const box = (await rail.boundingBox())!;
        expect(box.y + box.height).toBeCloseTo(viewport.height, 0);
        const topbar = page.locator(".main > .topbar");
        expect((await topbar.boundingBox())!.x + (await topbar.boundingBox())!.width).toBeLessThanOrEqual(box.x + 1);
        for (const selector of [".topbar-right .ex-top-credits", "#hardware-top-promo", "#app-download-btn"]) {
          const buttons = page.locator(selector);
          for (const button of await buttons.all()) {
            await expect(button).toBeInViewport();
            const action = (await button.boundingBox())!;
            expect(action.x + action.width).toBeLessThanOrEqual(box.x + 1);
          }
        }
        await expect(rail.locator("textarea").first()).toBeInViewport();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
        if (scene.name === "home") {
          const handle = rail.getByRole("separator");
          await handle.focus();
          await handle.press("ArrowRight");
          await expect.poll(async () => (await rail.boundingBox())!.width).toBeLessThan(box.width);
          await page.screenshot({ path: `test-results/agent-dock-${market}-${viewport.width}.png` });
          await page.setViewportSize({ width: 390, height: 844 });
          await expect(rail.locator("textarea").first()).toBeInViewport();
          await page.setViewportSize(viewport);
          await expect.poll(async () => (await rail.boundingBox())?.y).toBe(0);
        }
        await rail.getByRole("button", { name: /收起|关闭/ }).first().click();
        await expect(page.locator('.main[data-agent-docked="true"]')).toHaveCount(0);
        const restored = (await topbar.boundingBox())!;
        expect(restored.x + restored.width).toBeCloseTo(viewport.width, 0);
      }
    });
  }
}
