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
