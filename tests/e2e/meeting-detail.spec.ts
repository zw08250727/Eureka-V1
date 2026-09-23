import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const url = '/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';

test.beforeEach(async ({ page }) => {
  await page.goto(url);
  await page.locator('#view-panorama').click();
  await expect(page.locator('#note-detail-title')).toHaveText('三季度产品复盘会议');
});

test('detail tabs, real sample playback and generated views work without crossing meetings', async ({ page }) => {
  await expect(page.locator('.md-library-item')).toHaveCount(20);
  await expect(page.getByRole('tablist', { name: '录音详情内容' }).getByRole('tab')).toHaveText(['智能总结','转译文本','实时翻译','思维导图','图文摘要','逐字稿']);
  await expect(page.locator('#md-duration')).not.toHaveText('00:00');
  await page.getByRole('button', { name:'播放录音', exact:true }).click();
  await expect(page.getByRole('button', { name:'暂停录音', exact:true })).toBeVisible();
  await page.getByRole('button', { name:'前进15秒', exact:true }).click();
  await expect.poll(async () => Number(await page.locator('#md-seek').inputValue())).toBeGreaterThanOrEqual(15);
  await page.getByRole('combobox', { name:'播放倍速' }).selectOption('1.5');
  await page.getByRole('button', { name:'暂停录音', exact:true }).click();
  await page.getByRole('tab', { name:'转译文本', exact:true }).click();
  await expect(page.locator('.md-speech')).toHaveCount(4);
  await page.getByRole('tab', { name:'实时翻译', exact:true }).click();
  await expect(page.locator('#md-content')).toContainText('customer feedback');
  for (const name of ['思维导图','图文摘要','逐字稿']) {
    await page.getByRole('tab', { name, exact:true }).click();
    await page.getByRole('button', { name:'立即生成', exact:true }).click();
    await expect(page.locator('#md-content')).toContainText('演示生成');
  }
  await page.locator('.md-library-item').nth(1).click();
  await expect(page.getByRole('tab', { name:'智能总结', exact:true })).toHaveAttribute('aria-selected','true');
  await page.getByRole('tab', { name:'思维导图', exact:true }).click();
  await expect(page.getByRole('button', { name:'立即生成', exact:true })).toBeVisible();
  await page.getByRole('searchbox', { name:'搜索语音笔记' }).fill('不存在');
  await expect(page.locator('#md-library-list')).toContainText('没有找到');
});

test('edits and meeting metadata survive reload while cancel leaves content intact', async ({ page }) => {
  await page.getByRole('button', { name:'编辑录音标题' }).click();
  await page.locator('#md-rename').fill('产品复盘 · 已确认');
  await page.getByRole('dialog').getByRole('button', { name:'保存', exact:true }).click();
  await expect(page.locator('#note-detail-title')).toHaveText('产品复盘 · 已确认');
  await page.getByRole('button', { name:'添加位置', exact:true }).click();
  await page.locator('#md-customer').fill('演示客户');
  await page.locator('#md-project').fill('试用项目');
  await page.locator('#md-location').fill('会议室 A');
  await page.locator('#md-tags').fill('复盘，已确认');
  await page.getByRole('dialog').getByRole('button', { name:'保存', exact:true }).click();
  await expect(page.locator('.md-info')).toContainText('演示客户');
  await page.getByRole('button', { name:/参会人 张伟/ }).click();
  await page.getByRole('textbox', { name:'参会人 1', exact:true }).fill('演示主持人');
  await page.getByRole('dialog').getByRole('button', { name:'保存', exact:true }).click();
  const firstPopup = page.waitForEvent('popup');
  await page.getByRole('button', { name:'编辑', exact:true }).click();
  const cancelledEditor = await firstPopup;
  await cancelledEditor.getByRole('textbox', { name:'编辑正文' }).fill('不保存的修改');
  await cancelledEditor.close();
  await expect(page.locator('#md-content')).not.toContainText('不保存的修改');
  const secondPopup = page.waitForEvent('popup');
  await page.getByRole('button', { name:'编辑', exact:true }).click();
  const editor = await secondPopup;
  await editor.getByRole('textbox', { name:'编辑正文' }).fill('本次会议确认了三个行动项。');
  await expect(editor.locator('#editor-body')).toHaveText('本次会议确认了三个行动项。');
  await editor.getByRole('textbox', { name:'编辑正文' }).press('ControlOrMeta+a');
  await editor.getByRole('button', { name:'加粗', exact:true }).click();
  await expect(editor.locator('#editor-body')).toHaveText('本次会议确认了三个行动项。');
  await editor.getByRole('button', { name:'保存', exact:true }).click();
  await expect(editor.locator('#editor-status')).toHaveText('已保存并同步到会议详情');
  await editor.close();
  await expect(page.locator('#md-content .md-prose b')).toHaveText('本次会议确认了三个行动项。');
  await expect(page.locator('#md-content')).toContainText('本次会议确认了三个行动项。');
  await page.reload();
  await expect(page.locator('#view-panorama')).toContainText('产品复盘 · 已确认');
  await page.locator('#view-panorama').click();
  await expect(page.locator('#note-detail-title')).toHaveText('产品复盘 · 已确认');
  await expect(page.locator('#md-content')).toContainText('本次会议确认了三个行动项。');
  await expect(page.locator('.md-info')).toContainText('演示主持人');
  await page.locator('.md-library-item').nth(1).click();
  await expect(page.locator('#md-content')).not.toContainText('本次会议确认了三个行动项。');
});

test('templates, export, sharing boundaries and recycle are connected', async ({ page }) => {
  await page.getByRole('button', { name:'通用 ›', exact:true }).click();
  await page.getByRole('button', { name:'项目进度', exact:true }).click();
  await page.locator('#md-detail').selectOption('详细');
  await page.getByRole('button', { name:'开始重新总结', exact:true }).click();
  await expect(page.locator('#md-content')).toContainText('风险与待确认');
  await expect(page.getByRole('button', { name:'项目进度 ›', exact:true })).toBeVisible();
  await page.getByRole('button', { name:'评分 8', exact:true }).click();
  await page.getByRole('button', { name:'提交反馈', exact:true }).click();
  await expect(page.locator('.md-feedback')).toContainText('已记录你的 8 分评价');
  await page.getByRole('button', { name:'更多操作' }).click();
  await page.locator('#md-menu').getByRole('button', { name:'导出', exact:true }).click();
  await page.getByRole('button', { name:'下一步', exact:true }).click();
  await page.getByRole('radio', { name:/JSON/ }).check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name:'下载', exact:true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.content).toContain('风险与待确认');
  expect(exported.demo).toBe(true);
  await page.getByRole('button', { name:'更多操作' }).click();
  await page.locator('#md-menu').getByRole('button', { name:'分享', exact:true }).click();
  await page.getByRole('checkbox', { name:'全选', exact:true }).uncheck();
  await page.getByRole('button', { name:'预览分享内容' }).click();
  await expect(page.getByRole('dialog')).toContainText('请至少选择一项');
  await page.getByRole('dialog').getByRole('button', { name:'总结', exact:true }).click();
  await page.getByRole('button', { name:'生成分享链接' }).click();
  await expect(page.getByRole('dialog')).toContainText('无法生成公开链接');
  await page.getByRole('button', { name:'预览分享内容' }).click();
  await expect(page.getByRole('dialog')).toContainText('风险与待确认');
  await expect(page.getByRole('dialog')).not.toContainText('This is a demonstration');
  await page.getByRole('button', { name:'关闭弹窗' }).click();
  await page.getByRole('button', { name:'更多操作' }).click();
  await page.locator('#md-menu').getByRole('button', { name:'删除', exact:true }).click();
  await page.locator('#delete-confirm-submit').click();
  await expect(page.locator('#meeting-detail-root')).toBeHidden();
  await expect(page.locator('#meeting-view-description')).toHaveText('共 19 个会议笔记');
  await page.locator('#recording-recycle-entry').click();
  await page.locator('#recycle-list [data-recycle-action=restore]').first().click();
  await page.locator('#home-entry').click();
  await page.locator('#view-panorama').click();
  await expect(page.locator('#md-content')).toContainText('风险与待确认');
});

test('detail and dialogs fit desktop and narrow viewports', async ({ page }) => {
  for (const [width,height] of [[1920,1080],[1440,900],[1024,768],[390,844]]) {
    await page.setViewportSize({width,height});
    const frame = await page.locator('.md-frame').boundingBox();
    expect(frame!.x).toBeGreaterThanOrEqual(0);
    expect(frame!.x+frame!.width).toBeLessThanOrEqual(width+1);
    await page.getByRole('button', { name:'通用 ›', exact:true }).click();
    const dialog = await page.getByRole('dialog', { name:'重新总结', exact:true }).boundingBox();
    expect(dialog!.x).toBeGreaterThanOrEqual(0);
    expect(dialog!.y).toBeGreaterThanOrEqual(0);
    expect(dialog!.x+dialog!.width).toBeLessThanOrEqual(width+1);
    await page.getByRole('button', { name:'关闭弹窗', exact:true }).click();
  }
  await page.getByRole('button', { name:'切换录音列表' }).click();
  await expect(page.locator('.md-frame')).toHaveClass(/library-mobile/);
  await page.locator('.md-library-item').nth(1).click();
  await expect(page.locator('#note-detail-title')).toHaveText('百销产品能力与市场匹配调研');
  await expect(page.locator('.md-frame')).not.toHaveClass(/library-mobile/);
});
