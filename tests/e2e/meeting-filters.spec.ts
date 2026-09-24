import { expect, test } from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL || undefined});
const url='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
test.beforeEach(async ({page})=>{
  await page.clock.setFixedTime(new Date('2026-09-23T12:00:00'));
  await page.goto(url);
});

test('source, date and search combine; clearing and keyboard navigation preserve filter state',async ({page})=>{
  const source=page.locator('#meeting-source-filter-trigger');
  const date=page.locator('#meeting-date-filter-trigger');
  const calendar=page.getByRole('dialog',{name:'选择录音日期'});
  const rows=page.locator('#meeting-list .home-meeting-row:visible');
  await source.click();
  await expect(page.getByRole('option',{name:'全部来源',exact:true})).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await expect(source).toContainText('网页录音');
  await date.click();
  await expect(calendar.getByRole('button',{name:'2026年9月23日',exact:true})).toBeFocused();
  await calendar.getByRole('button',{name:'2026年9月2日',exact:true}).click();
  await expect(rows).toHaveCount(1);
  await expect(date).toContainText('2026 / 09 / 02');
  await date.click();
  await expect(calendar.locator('[aria-selected=true] button')).toHaveAccessibleName('2026年9月2日');
  await page.keyboard.press('Escape');
  await expect(calendar).toBeHidden(); await expect(date).toBeFocused();
  await page.locator('#meeting-search').fill('不存在'); await expect(rows).toHaveCount(0);
  await page.locator('#meeting-search').clear(); await expect(rows).toHaveCount(1);
  await page.getByRole('button',{name:'清除录音日期',exact:true}).click();
  await expect(source).toContainText('网页录音');
  await page.getByRole('button',{name:'清除来源筛选',exact:true}).click();
  await expect(rows).toHaveCount(10);
  await date.click(); await calendar.getByRole('button',{name:'今天',exact:true}).click();
  await expect(date).toContainText('2026 / 09 / 23');
  await date.click(); await calendar.getByRole('button',{name:'昨天',exact:true}).click();
  await expect(date).toContainText('2026 / 09 / 22');
  await date.click(); await page.keyboard.press('PageUp'); await page.keyboard.press('Enter');
  await expect(date).toContainText('2026 / 08 / 22');
  await expect(rows).toHaveCount(1);
  await date.click(); await calendar.getByRole('button',{name:'不限日期',exact:true}).click();
  await expect(rows).toHaveCount(10);
});

test('floating filters stay inside desktop and mobile viewports and dismiss outside',async ({page})=>{
  for(const [width,height] of [[1440,900],[1024,650],[390,844]]) {
    await page.setViewportSize({width,height});
    for(const id of ['meeting-source-filter','meeting-date-filter']) {
      const trigger=page.locator(`#${id}-trigger`);
      await trigger.click();
      const popup=page.locator(`#${id}-popover`);
      await expect(popup).toBeInViewport({ratio:1});
      const box=(await popup.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(width);
      expect(box.y+box.height).toBeLessThanOrEqual(height);
      await page.keyboard.press('Escape'); await expect(popup).toBeHidden();
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#meeting-source-filter-trigger').click();
  await page.locator('#meeting-search').click();
  await expect(page.locator('#meeting-source-filter-popover')).toBeHidden();
  await expect(page.locator('#meeting-source-filter-trigger')).toHaveAttribute('aria-expanded','false');
});
