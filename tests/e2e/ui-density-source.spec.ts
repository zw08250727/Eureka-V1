import { expect, test, type Page } from '@playwright/test';
async function login(page: Page, market: string) {
  await page.goto(`/${market}/`);
  await page.getByRole('button', {name:'登录 / 注册',exact:true}).last().click();
  if(market==='cn') await page.getByRole('button',{name:'个人/团队版',exact:true}).click();
  await page.locator(market==='cn'?'#phone':'#email').fill(market==='cn'?'13800138000':'density@example.com');
  await page.locator('#code').fill('123456'); await page.locator('#terms').check(); await page.locator('#submit').click();
  await expect(page.locator('.app:not(.guest-app)')).toBeVisible();
}
for (const market of ['cn','global']) {
  for(const width of [390,768,1080,1440]) test(`${market} source detail layout and complete template settings ${width}`,async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'}); await page.setViewportSize({width,height:900}); await login(page,market);
    await page.goto(`/${market}/workbench/?view=meeting&id=meeting-1&space=personal`);
    await expect(page.locator('#note-detail-title')).toHaveCSS('font-size','18px');
    await expect(page.locator('.md-image-add img')).toBeVisible();
    await expect.poll(()=>page.locator('.md-image-add img').evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0);
    await expect.poll(()=>page.locator('.md-recording-mark').evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('.md-top-actions [data-md-action=ask]')).toBeVisible();
    expect(await page.locator('.cn-audio-player').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.screenshot({animations:"disabled",path:`artifacts/ui-density/${market}-meeting-${width}.png`});
    await page.locator('.md-template-button').click();
    const dialog=page.getByRole('dialog',{name:'重新总结'});
    await expect(dialog).toBeVisible();
    await page.screenshot({animations:"disabled",path:`artifacts/ui-density/${market}-template-initial-${width}.png`});
    expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    expect(await dialog.locator('.ex-template-wrapper').evaluateAll(cards=>cards.every(card=>{
      const a=card.getBoundingClientRect(),b=card.querySelector('.meeting-template-description')!.getBoundingClientRect();
      return b.bottom <= a.bottom-14 && b.left>=a.left && b.right<=a.right;
    }))).toBe(true);
    await dialog.getByRole('button',{name:'查看模板说明：通用'}).click();
    await expect(page.getByRole('dialog',{name:'模板说明'})).toBeVisible();
    await page.getByRole('button',{name:'关闭模板说明'}).click();
    await dialog.getByText('全局设置',{exact:true}).scrollIntoViewIfNeeded();
    await expect(dialog.getByText('生成配置',{exact:true})).toBeVisible();
    await expect(dialog.getByLabel('总结语言')).toBeVisible();
    await expect(dialog.getByLabel('详细程度')).toBeVisible();
    expect(await dialog.locator('.meeting-generation-config label').evaluateAll(labels=>labels.every(label=>{
      const r=label.getBoundingClientRect(),c=label.querySelector('.ui-select')!.getBoundingClientRect();
      return c.right<=r.right+1 && c.left>=r.left+48;
    }))).toBe(true);
    await expect(dialog.getByRole('button',{name:'开始重新总结'})).toBeVisible();
    await page.screenshot({animations:"disabled",path:`artifacts/ui-density/${market}-templates-${width}.png`});
    await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
  test(`${market} filters, single focus border and compact todos across surfaces`,async({page})=>{
    test.setTimeout(90_000); await page.setViewportSize({width:1440,height:900}); await login(page,market);
    for(const space of ['personal','team-eureka']) {
      await page.goto(`/${market}/workbench/?view=home&space=${space}`);
      const controls=page.locator('.mf-control'); await expect(controls.first()).toBeVisible();
      expect(await controls.evaluateAll(nodes=>nodes.every(el=>{
        const r=el.getBoundingClientRect(),b=el.querySelector('.mf-trigger')!.getBoundingClientRect(),s=getComputedStyle(el);
        return b.top>=r.top+0.5 && b.bottom<=r.bottom-0.5 && s.borderTopWidth==='1px' && s.borderBottomWidth==='1px';
      }))).toBe(true);
      const search=page.locator(space==='personal'?'#meeting-search':'.ws-search input');
      await search.click(); await expect(search).toHaveCSS('outline-style','none');
      await expect(page.locator('.ui-todo-mark').first()).toHaveCSS('width','14px');
      await page.screenshot({animations:"disabled",path:`artifacts/ui-density/${market}-${space}-home.png`});
      if(space==='team-eureka') {
        await expect(page.locator('.team-private-todo-title').first()).toHaveCSS('font-size','13px');
        await expect(page.locator('.team-private-column h3').first()).toHaveCSS('font-size','14px');
        expect(await page.locator('.team-private-column').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
      }
      await page.goto(`/${market}/workbench/?view=contacts&space=${space}`);
      const contactSearch=page.locator('#contacts-search'); await contactSearch.click(); await expect(contactSearch).toHaveCSS('outline-style','none');
      for(const view of ['calendar','thoughts']) {
        await page.goto(`/${market}/workbench/?view=${view}&space=${space}`);
        if(view==='thoughts') await page.locator('[data-thought-category=todo]').click();
        const check=page.locator(view==='calendar'?'.pa-complete':'.th-complete').first();
        await expect(check).toBeVisible(); await expect(check.locator('.ui-todo-mark')).toHaveCSS('width','14px');
        await expect(check).toHaveCSS('border-width','0px');
        const before=await check.getAttribute(view==='calendar'?'aria-pressed':'aria-checked');
        await check.focus(); await page.keyboard.press('Space');
        await expect(check).toHaveAttribute(view==='calendar'?'aria-pressed':'aria-checked',before==='true'?'false':'true');
        await page.screenshot({animations:"disabled",path:`artifacts/ui-density/${market}-${space}-${view}.png`});
      }
    }
  });
}

for (const market of ['cn', 'global']) {
  test(`${market} UI-DENSITY-04 fixed overview, compact actions and management spacing`, async ({page}) => {
    test.setTimeout(120_000);
    await login(page, market);
    for (const width of [390,768,1080,1440]) {
      await page.setViewportSize({width,height:900});
      await page.goto(`/${market}/workbench/?view=home&space=personal`);
      const personal = page.locator('#today-assets-grid');
      await expect(personal).toBeVisible();
      const height = Math.round((await personal.boundingBox())!.height);
      await page.goto(`/${market}/workbench/?view=home&space=team-eureka`);
      const canvas = page.locator('.team-overview-canvas');
      await expect(canvas).toHaveCSS('height',`${height}px`);
      await expect(canvas.locator('.ex-share')).toHaveCount(0);
      expect(await canvas.locator('.ex-daily-row').evaluateAll(rows=>rows.every(row=>{const a=row.getBoundingClientRect(),b=row.querySelector('a')!.getBoundingClientRect();return b.top>=a.top-1&&b.bottom<=a.bottom+1}))).toBe(true);
      await expect(page.locator('.team-insight-body > span:first-child').first()).toHaveCSS('display','inline');
      await page.screenshot({path:`artifacts/ui-density/${market}-compact-overview-${width}.png`});
      const evidence = page.locator('.team-insight-foot button[aria-expanded]').first();
      await evidence.click();
      await expect(evidence).toHaveAttribute('aria-expanded','true');
      await expect(canvas).toHaveCSS('height',`${height}px`);
      await page.screenshot({path:`artifacts/ui-density/${market}-aligned-overview-${width}.png`});
      await page.goto(`/${market}/workbench/?view=contacts&space=team-eureka`);
      const count = page.locator('.contacts-list-heading');
      await expect(count).toBeVisible();
      expect(await count.evaluate(el=>el.getBoundingClientRect().top >= document.querySelector('.contacts-toolbar')!.getBoundingClientRect().bottom)).toBe(true);
      expect(await count.evaluate(el=>el.getBoundingClientRect().height<40)).toBe(true);
    }
    await page.setViewportSize({width:1440,height:900});
    await page.goto(`/${market}/workbench/?view=home&space=team-eureka`);
    await expect(page.locator('.ws-recording-table .meeting-source').first()).toHaveCSS('font-size','12px');
    await expect(page.locator('.ws-recording-table .meeting-source small')).toHaveCount(0);
    const sort=page.locator('.ws-recording-table [data-ws-action=sort]').first();
    expect(await sort.evaluate(el=>{const a=getComputedStyle(el),b=getComputedStyle(el.closest('th')!);return a.fontSize===b.fontSize&&a.color===b.color})).toBe(true);
    await sort.click(); await expect(sort.locator('..')).toHaveAttribute('aria-sort','ascending');
    await expect(page.locator('.ws-recording-table td .ws-actions .ws-btn').first()).toHaveCSS('font-size','12px');
    for(const space of ['personal','team-eureka']) {
      await page.goto(`/${market}/workbench/?view=calendar&space=${space}`);
      for(const mode of ['日','周','月']) {
        await page.locator('.pa-view-tabs').getByRole('button',{name:mode,exact:true}).click();
        await expect(page.locator('.pa-calendar-edit').first()).toHaveCSS('font-size','12px');
        expect(await page.locator('.pa-calendar-entry-actions').evaluateAll(nodes=>nodes.every(el=>{
          const share=el.querySelector('.ex-share'), edit=el.querySelector('.pa-calendar-edit');
          if(!share||!edit)return true;
          const a=getComputedStyle(share),b=getComputedStyle(edit);
          return a.fontSize===b.fontSize&&a.color===b.color&&a.fontWeight===b.fontWeight;
        }))).toBe(true);
        expect(await page.locator('.pa-calendar-entry-actions').evaluateAll(nodes=>nodes.every(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('.pa-calendar-edit')!.getBoundingClientRect();return el.scrollWidth<=el.clientWidth+1&&b.left>=a.left&&b.right<=a.right+1&&b.top>=a.top&&b.bottom<=a.bottom+1}))).toBe(true);
        await page.screenshot({path:`artifacts/ui-density/${market}-${space}-calendar-${mode}.png`});
      }
    }
    for(const view of ['members','devices','space-settings','content-permissions','audit']) {
      await page.goto(`/${market}/workbench/?view=${view}&space=team-eureka`);
      await expect(page.locator('.ws-page-head')).toHaveCSS('padding-bottom','12px');
      await expect(page.locator('#ws-view')).toHaveCSS('margin-top','12px');
      await page.screenshot({path:`artifacts/ui-density/${market}-compact-${view}.png`});
    }
  });
}
