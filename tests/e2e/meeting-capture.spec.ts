import M from "../../src/features/spaces/model/core";
import { expect, test, type Page } from "@playwright/test";

async function enter(page: Page, market: string, team = false) {
  await page.addInitScript(market => {
    localStorage.setItem(`eureka:market:${market}:eureka:auth:v1`, JSON.stringify({ market, realm: `eureka-${market}`, identity: 'capture@example.com' }));
  }, market);
  await page.goto(`/${market}/workbench/?${team ? 'space=team-eureka' : ''}`);
  await expect(page.locator(".main > .topbar")).toBeVisible();
}
async function launch(page: Page, sidebar = false) {
  await page.locator(sidebar ? '#start-recording' : '#module-start-recording').click();
  const dialog = page.getByRole('dialog', { name: '选择录制模式' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /^录制会议/ }).click();
}
async function finish(page: Page) {
  await page.locator('#recording-finish').click();
  await expect(page.getByRole('button', { name: '查看会议', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '查看会议', exact: true }).click();
  await expect(page.locator('#note-detail-title')).toBeVisible();
  return new URL(page.url()).searchParams.get('id')!;
}
for (const market of ['cn', 'global']) {
  for (const team of [false, true]) test(`${market}: ${team ? 'team fullscreen' : 'personal window'} video capture finishes into video detail and source icon`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await enter(page, market, team);
    await launch(page, team);
    await expect(page.getByRole('radio', { name: /^屏幕和音频/ })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('switch', { name: '录制麦克风音频' }).click();
    await expect(page.getByRole('combobox', { name: '选择麦克风' })).toHaveCount(0);
    if (market === "cn") await expect(page.getByRole("switch")).toHaveCSS("background-color", "rgb(235, 235, 235)");
    await expect(page.getByRole('combobox', { name: '会议转写语言' })).toHaveCount(0);
    if (!team) await page.screenshot({ path: `test-results/meeting-capture/${market}-settings.png`, animations: "disabled" });
    await page.getByRole('button', { name: '选择录制内容', exact: true }).click();
    await expect(page.getByRole('button', { name: '开始录制并转写', exact: true })).toBeDisabled();
    await page.getByRole('radio', { name: '会议窗口', exact: true }).click();
    await page.getByRole('tab', { name: '全屏', exact: true }).click();
    await expect(page.getByRole('button', { name: '开始录制并转写', exact: true })).toBeDisabled();
    if (team) await page.getByRole('radio', { name: '整个屏幕', exact: true }).click();
    else {
      await page.getByRole('tab', { name: '应用窗口', exact: true }).click();
      await page.getByRole('radio', { name: '会议窗口', exact: true }).click();
      await page.screenshot({ path: `test-results/meeting-capture/${market}-source.png`, animations: "disabled" });
    }
    await page.getByRole('button', { name: '开始录制并转写', exact: true }).click();
    await expect(page.locator('[data-capture-kind="meeting-video"]')).toContainText(team ? '整个屏幕' : '会议窗口');
    await expect(page.locator('.recording-meta')).toContainText('仅电脑声音');
    await expect(page.locator('#recording-source-language')).toHaveValue('中文（普通话）');
    await page.locator('#recording-pause').click();
    await expect(page.locator('#recording-live-state')).toHaveText('已暂停');
    const clock = await page.locator('#recording-elapsed').textContent();
    await expect(page.locator('#recording-elapsed')).toHaveText(clock!);
    await page.locator('#recording-pause').click();
    await expect(page.locator('#recording-live-state')).toHaveText('录音中');
    await page.locator('#recording-mark').click();
    const id = await finish(page);
    await expect(page.locator('.md-recording-mark')).toHaveAttribute('data-recording-source', 'video');
    const video = page.getByLabel('录制的会议视频', { exact: true });
    await expect(video).toHaveAttribute('controls', '');
    await expect(page.getByPlaceholder('搜索语音笔记')).toHaveCount(0);
    await expect(page.locator('.md-page-head')).toHaveCount(0);
    const previewBox = (await video.boundingBox())!;
    expect(previewBox.width).toBeLessThanOrEqual(480);
    expect(previewBox.height).toBeLessThanOrEqual(220);
    const tabsBox = (await page.locator('.md-tabs').boundingBox())!;
    expect(tabsBox.y + tabsBox.height).toBeLessThan(960);
    const glyph = page.locator('.md-recording-mark img');
    await expect.poll(() => glyph.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(32);
    expect((await glyph.boundingBox())!.width).toBe(48);
    await expect(page.locator('.md-info-fields')).toContainText('客户名称');
    await expect(page.locator('.md-info-fields')).toContainText('商机项目');
    await page.locator('[data-md-action="info-toggle"]').click();
    await expect(page.locator('.md-info-extra')).toBeHidden();
    await page.locator('[data-md-action="info-toggle"]').click();
    await expect(page.locator('.md-info-extra')).toBeVisible();
    await expect(page.locator('audio')).toHaveCount(0);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);
    expect(await video.evaluate((v: HTMLVideoElement) => v.duration)).toBeGreaterThan(4);
    await video.evaluate((v: HTMLVideoElement) => v.play());
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
    await video.evaluate((v: HTMLVideoElement) => v.pause());
    await page.getByRole('combobox', { name: '视频播放速度' }).selectOption('1.5');
    expect(await video.evaluate((v: HTMLVideoElement) => v.playbackRate)).toBe(1.5);
    if (!team) await page.screenshot({ path: `test-results/meeting-capture/${market}-video.png`, animations: "disabled" });
    await page.reload();
    await expect(page.getByLabel('录制的会议视频')).toBeVisible();
    if (!team) {
      await page.setViewportSize({ width: 390, height: 844 });
      const box = (await page.getByLabel('录制的会议视频').boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
      await page.screenshot({ path: `test-results/meeting-capture/${market}-video-mobile.png`, animations: "disabled" });
      await page.setViewportSize({ width: 1440, height: 960 });
    }
    await page.goto(`/${market}/workbench/?${team ? 'space=team-eureka' : ''}`);
  await expect(page.locator(".main > .topbar")).toBeVisible();
    const row = page.locator(team ? `button[data-ws-action="file"][data-value="${id}"]` : `[data-meeting-id="${id}"]`);
    await expect(team ? row.locator('xpath=ancestor::tr') : row).toContainText('视频录制');
    await expect(row.locator('[data-recording-source]')).toHaveAttribute('data-recording-source', 'video');
    await row.click();
    await expect(page.getByLabel('录制的会议视频')).toBeVisible();
    await page.getByRole('tab', { name: '转译文本', exact: true }).click();
    await expect(page.locator('#md-content')).toContainText('我们先确认一下');
  });
  test(`${market}: audio-only meeting skips source picker and retains audio playback`, async ({ page }) => {
    await enter(page, market);
    await launch(page);
    await page.getByRole('radio', { name: /^仅音频/ }).click();
    await page.getByRole('combobox', { name: '选择麦克风' }).selectOption('耳机麦克风');
    await page.getByRole('button', { name: '开始录制并转写', exact: true }).click();
    await expect(page.locator('[data-capture-kind="meeting-audio"]')).toBeVisible();
    const id = await finish(page);
    await expect(page.locator('video')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '播放录音', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: '播放录音', exact: true }).click();
    await expect.poll(() => page.locator('audio').evaluate((v: HTMLAudioElement) => v.currentTime)).toBeGreaterThan(0);
    await expect(page.locator('.md-recording-mark')).toHaveAttribute('data-recording-source', 'audio');
    await page.goto(`/${market}/workbench/`);
    await expect(page.locator(`[data-meeting-id="${id}"]`)).toContainText('音频录制');
  });
  test(`${market}: existing audio flow still requests permissions and saves Web recording`, async ({ page }) => {
    await enter(page, market);
    await page.locator('#start-recording').click();
    await page.getByRole('dialog', { name: '选择录制模式' }).getByRole('button', { name: /^开始录音/ }).click();
    await expect(page.locator('#record-permission-modal')).toBeVisible();
    await page.locator('#permission-authorize').click();
    await expect(page.locator('#recording-layout')).toBeVisible();
    await finish(page);
    await expect(page.locator('.md-recording-mark')).toHaveAttribute('data-recording-source', 'web');
    await expect(page.locator('video')).toHaveCount(0);
    await expect(page.locator('.md-top-meta')).toContainText('网页录音');
  });
  test(`${market}: mobile selection, cancel and abandon leave no meeting`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enter(page, market);
    await page.locator('#module-start-recording').click();
    const modal = page.getByRole('dialog', { name: '选择录制模式' });
    const box = (await modal.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
    const before = await page.locator('[data-meeting-id]').count();
    await launch(page);
    await page.getByRole('radio', { name: /^仅音频/ }).click();
    await page.screenshot({ path: `test-results/meeting-capture/${market}-mobile.png`, animations: "disabled" });
    await page.getByRole('button', { name: '开始录制并转写', exact: true }).click();
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#recording-abandon').click();
    await expect(page.locator('#recording-layout')).toHaveCount(0);
    await expect(page.locator('[data-meeting-id]')).toHaveCount(before);
  });
  test(`${market}: failed save can retry once; missing video stays recoverable`, async ({ page }) => {
    await enter(page, market);
    await launch(page);
    await page.getByRole('button', { name: '选择录制内容', exact: true }).click();
    const target = page.getByRole('radio', { name: '会议窗口', exact: true });
    await target.focus(); await target.press('ArrowRight');
    await expect(page.getByRole('radio', { name: '演示文稿', exact: true })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: '开始录制并转写', exact: true }).click();
    await expect(page.locator('#recording-layout')).toBeVisible();
    await page.evaluate(() => {
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { if (key.includes('eureka:actions:') || key.includes('eureka:personal-actions:v1')) throw Error('模拟保存失败'); return write.call(this, key, value); };
      Object.assign(window, { restoreCaptureStorage: () => { Storage.prototype.setItem = write; } });
    });
    await page.locator('#recording-finish').click();
    await expect(page.locator('.recording-workbench [role="alert"]')).toContainText('保存失败，输入已保留');
    await expect(page.getByRole('button', { name: '查看会议', exact: true })).toHaveCount(0);
    await page.evaluate(() => (window as unknown as { restoreCaptureStorage: () => void }).restoreCaptureStorage());
    const id = await finish(page);
    await expect(page.locator('.recording-workbench [role="alert"]')).toHaveCount(0);
    await page.evaluate(({ market, id }) => {
      const key = `eureka:market:${market}:eureka:meeting-details:v1`;
      localStorage.setItem(key, JSON.stringify({ [id]: { videoUrl: '/missing-capture.webm' } }));
    }, { market, id });
    await page.reload();
    await expect(page.getByRole('button', { name: '重新加载', exact: true })).toBeVisible();
    await expect(page.locator('audio')).toHaveCount(0);
    await page.evaluate(({ market, id }) => {
      localStorage.setItem(`eureka:market:${market}:eureka:meeting-details:v1`, JSON.stringify({ [id]: { videoUrl: '' } }));
    }, { market, id });
    await page.reload();
    await expect(page.getByText('暂无可播放的视频', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '重新加载', exact: true })).toHaveCount(0);
    expect(await page.getByLabel('录制的会议视频').getAttribute('src')).toBeNull();
  });
  test(`${market}: APP, Web and hardware remain distinct and market data stays isolated`, async ({ page }) => {
    await enter(page, market);
    const file = M.addFile(M.get(M.seed(), 'personal'), { title: 'APP capture icon', source: 'APP录音', duration: 1, summary: '示例', transcript: '示例' }, 'zhang');
    await page.evaluate(({ market, file, seed }) => {
      const key = `eureka:market:${market}:eureka:workspaces:v2`, data = JSON.parse(localStorage.getItem(key) || JSON.stringify(seed));
      data.spaces.find((w: { id: string }) => w.id === 'personal').files.unshift(file);
      localStorage.setItem(key, JSON.stringify(data));
    }, { market, file, seed: M.seed() });
    await page.reload();
    const app = page.locator(`[data-meeting-id="${file.id}"]`);
    await expect(app.locator('[data-recording-source]')).toHaveAttribute('data-recording-source', 'app');
    await expect(page.locator('[data-recording-source="web"]').first()).toBeVisible();
    await page.locator('#meeting-search').fill('百销产品试用开通与标准化讨论');
    await expect(page.locator('[data-recording-source="hardware"]').first()).toBeVisible();
    await page.goto(`/${market === 'cn' ? 'global' : 'cn'}/workbench/`);
    await expect(page.locator('.guest-app')).toBeVisible();
    await expect(page.locator(`[data-meeting-id="${file.id}"]`)).toHaveCount(0);
  });

}
