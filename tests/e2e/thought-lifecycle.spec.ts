import { test, expect, type Page } from '@playwright/test';
import baseline from '../../src/features/workbench/model/baseline.json';

async function enter(page: Page, market: string) {
  await page.addInitScript(m => localStorage.setItem(`eureka:market:${m}:eureka:auth:v1`, JSON.stringify({market:m,realm:`eureka-${m}`,identity:'lifecycle@example.com',provider:'email'})), market);
}
for (const market of ['cn', 'global']) {
  test(`${market}: all five categories keep native audio controls without duplicated tools; deletion persists`, async ({ page }) => {
    await enter(page, market);
    await page.setViewportSize({width:1440,height:960});
    const records = [ ['schedule','schedule-1','日程'], ['todo','todo-1','待办'], ['inspiration','idea-1','灵感'], ['ledger','ledger-1','记账'], ['other','other-1','其他'] ];
    for (const [category,id,label] of records) {
      await page.goto(`/${market}/workbench/?view=thoughts&id=${category}`);
      const row = page.locator(`[data-thought-record="${id}"]`);
      await row.click();
      const preview = page.getByRole('dialog');
      const audio = preview.locator('audio');
      await expect(audio).toHaveAttribute('src', /meeting-demo\.wav$/);
      await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.readyState)).toBeGreaterThan(0);
      await expect(preview.getByLabel('原始录音播放速度')).toHaveCount(0);
      await expect(preview.getByRole('link',{name:'下载原始录音'})).toHaveCount(0);
      await expect(audio).toHaveAttribute('controls','');
      await audio.evaluate((el: HTMLAudioElement) => el.play());
      expect(await audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(false);
      await audio.evaluate((el: HTMLAudioElement) => el.pause());
      if (category === 'inspiration') await page.screenshot({path:`test-results/thought-lifecycle/${market}-audio-desktop.png`,animations:'disabled'});
      await preview.getByRole('button',{name:'编辑',exact:true}).click();
      const editor = page.getByRole('dialog');
      await editor.locator('input[name="title"]').fill('保留中的草稿');
      await editor.getByRole('button',{name:'删除',exact:true}).click();
      const confirm = page.getByRole('dialog',{name:`确认删除此条${label}吗？`});
      await expect(confirm).toContainText('删除后不可恢复');
      await expect(confirm.getByRole('button',{name:'删除',exact:true})).toHaveCSS('color','rgb(255, 255, 255)');
      await confirm.getByRole('button',{name:'取消',exact:true}).click();
      await expect(editor.locator('input[name="title"]')).toHaveValue('保留中的草稿');
      await editor.getByRole('button',{name:'删除',exact:true}).click();
      await expect(confirm).toBeVisible();
      if (category === 'inspiration') {
        await confirm.screenshot({path:`test-results/thought-lifecycle/${market}-delete-desktop.png`,animations:'disabled'});
        await page.setViewportSize({width:390,height:844});
        await expect(confirm).toBeVisible();
        await confirm.screenshot({path:`test-results/thought-lifecycle/${market}-delete-mobile.png`,animations:'disabled'});
        await page.setViewportSize({width:1440,height:960});
      }
      await confirm.getByRole('button',{name:'删除',exact:true}).click();
      await expect(row).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.reload();
      await expect(page.locator('#thought-workspace')).toBeVisible();
      await expect(row).toHaveCount(0);
    }
  });

  test(`${market}: personal list hides creator, mode matches detail, team keeps creator and mobile audio fits`, async ({page}) => {
    await enter(page, market);
    await page.setViewportSize({width:1440,height:960});
    await page.goto(`/${market}/workbench/?view=home`);
    const headers = page.locator('.home-meeting-table-head > span');
    await expect(headers).toHaveCount(9);
    expect(await headers.allTextContents()).not.toContain('创建人');
    expect(await page.locator('.home-meeting-table-head').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(9);
    for (const [source,mode,id] of [['M1','call','meeting-3'],['W1','call','meeting-4'],['合并录音','environment','meeting-2'],['W-PEN','environment','meeting-5']]) {
      await page.goto(`/${market}/workbench/?view=home`);
      await page.locator('#meeting-search').fill(baseline.meetings.find(m => m.id === id)!.title);
      const row = page.locator(`[data-meeting-id="${id}"]`);
      await expect(row.locator('[data-recording-mode]')).toHaveAttribute('data-recording-mode',mode);
      await expect(row.locator('.meeting-source')).toHaveText(source);
      await row.click();
      await expect(page.locator('.md-recording-mark')).toHaveAttribute('data-recording-mode',mode);
    }
    await page.goto(`/${market}/workbench/?view=home&space=team-eureka`);
    await expect(page.getByRole('columnheader',{name:'创建人',exact:true})).toBeVisible();
    await page.screenshot({path:`test-results/thought-lifecycle/${market}-team-modes.png`,animations:'disabled'});
    for (const [id,title,mode] of [['team-demo-pilot','星海试点复盘','call'],['team-demo-sales','渠道合作沟通','call'],['team-demo-research','语音记录用户访谈','call'],['team-demo-design','录音详情交互评审','environment']]) {
      await page.goto(`/${market}/workbench/?view=home&space=team-eureka`);
      await page.getByRole('searchbox',{name:'搜索团队会议'}).fill(title);
      const file = page.locator(`button[data-ws-action="file"][data-value="${id}"]`);
      await expect(file.locator('[data-recording-mode]')).toHaveAttribute('data-recording-mode',mode);
      await file.click();
      await expect(page.locator('.md-recording-mark')).toHaveAttribute('data-recording-mode',mode);
    }
    await page.setViewportSize({width:390,height:844});
    await page.goto(`/${market}/workbench/?view=thoughts&id=idea-2`);
    await expect(page.locator('audio[aria-label="原始捕获音频"]')).toBeVisible();
    await page.getByRole('dialog').screenshot({path:`test-results/thought-lifecycle/${market}-audio-mobile.png`,animations:'disabled'});
    const box = await page.getByRole('dialog').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x+box!.width).toBeLessThanOrEqual(390);
  });
}
