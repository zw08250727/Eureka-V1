import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, market: string) {
  await page.goto(`/${market}/`);
  await page.getByRole('button', { name: '登录 / 注册', exact: true }).last().click();
  if (market === 'cn') await page.getByRole('button', { name: '个人/团队版', exact: true }).click();
  await page.locator(market === 'cn' ? '#phone' : '#email').fill(market === 'cn' ? '13800138000' : 'type@example.com');
  await page.locator('#code').fill('123456');
  await page.locator('#terms').check();
  await page.locator('#submit').click();
  await expect(page.locator('.app:not(.guest-app)')).toBeVisible();
}
const common = ['home', 'contacts', 'contacts&id=john', 'calendar', 'thoughts', 'connectors', 'settings', 'settings&id=recording', 'settings&id=credits', 'my-devices', 'subscription', 'credits', 'recording', 'meeting&id=meeting-1', 'history', 'trash', 'updates', 'product'];
const teamOnly = ['members', 'devices', 'space-settings', 'content-permissions', 'audit'];

for (const market of ['cn', 'global']) {
  test(`${market} UI-TYPE-02 complete personal/team route inventory`, async ({page}, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({width: 1440, height: 900});
    await page.emulateMedia({reducedMotion: 'reduce'});
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await login(page, market);
    const inventory: object[] = [];
    for (const space of ['personal', 'team-eureka']) {
      const views = [...common, ...(space === 'personal' ? ['create-team', 'invitations'] : teamOnly)];
      for (const view of views) {
        await page.goto(`/${market}/workbench/?space=${space}&view=${space === "team-eureka" ? view.replace("id=meeting-1", "id=team-review").replace("&id=john", "") : view}`);
        await expect(page.locator('.app:not(.guest-app) .main')).toBeVisible();
        await expect(page.locator('.main :is(h1,h2,h3,.settings-float-toolbar-copy,.connector-page,.ws-page,.ws-surface,.ex-product,.pa-page,[role=alert])')).not.toHaveCount(0);
        if (space === 'team-eureka' && view === 'contacts&id=john') {
          await page.locator('.contacts-person-card').first().click();
          await expect(page.locator('.contacts-profile')).toBeVisible();
        }
        if (view.startsWith('meeting')) await expect(page.locator('#note-detail-title')).toHaveCSS('font-size','18px');
        if (space === 'team-eureka' && view === 'home') {
          // Preserve the separately published UI-TEAM-THOUGHTS-01 while changing global tokens.
          const overview = page.locator('.team-overview-refined');
          await expect(overview.locator('.team-section-heading h2').first()).toHaveCSS('font-size', '16px');
          await expect(overview.locator('.team-private-column h3').first()).toHaveCSS('font-size', '14px');
          await expect(overview.locator('.team-private-todo-title').first()).toHaveCSS('font-size', '13px');
          await expect(overview.locator('.team-private-column time').first()).toHaveCSS('font-size', '12px');
          await expect(overview.locator('.team-todo-mark').first()).toHaveCSS('width', '14px');
          await expect(overview.locator('.team-todo-mark').first()).toHaveCSS('height', '14px');
        }

        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${space}/${view}: page overflow`).toBe(true);
        const headings = await page.locator('.main :is(h1,h2,h3,h4,.page-crumb)').evaluateAll(nodes => nodes.filter(el => el.getBoundingClientRect().height > 0).map(el => ({text: el.textContent?.trim().slice(0,70), size: getComputedStyle(el).fontSize, line: getComputedStyle(el).lineHeight, className: el.className})));
        inventory.push({space, view, headings});
        await page.screenshot({path: `artifacts/ui-typography/${market}-${space}-${view.replaceAll('&','-').replaceAll('=','-')}.png`, animations:'disabled'});
      }
    }
    mkdirSync('artifacts/ui-typography', {recursive: true});
    writeFileSync(`artifacts/ui-typography/${market}-inventory.json`,JSON.stringify(inventory,null,2));
    await testInfo.attach(`${market}-route-inventory`, {body: JSON.stringify(inventory,null,2), contentType: 'application/json'});
    expect(errors).toEqual([]);
  });

  for (const width of [390,768,1080,1440]) {
    test(`${market} UI-NAV-02 / UI-TYPE-02 visible hierarchy at ${width}`, async ({page}) => {
      await page.setViewportSize({width,height: width === 1080 ? 680 : 900});
      await login(page,market);
      await page.goto(`/${market}/workbench/?view=contacts&space=team-eureka`);
      await expect(page.locator('.contacts-person-card').first()).toBeVisible();
      await expect(page.locator('.contacts-person strong').first()).toHaveCSS('font-size','14px');
      await expect(page.locator('.contacts-person-card p').first()).toHaveCSS('font-size','12px');
      await expect(page.locator('.contacts-tag').first()).toHaveCSS('font-size','11px');
      await expect(page.locator('.contacts-toolbar select').first()).toHaveCSS('font-size','12px');
      await expect(page.locator('.contacts-toolbar label').first()).toHaveCSS('font-size','12px');
      await expect(page.locator('.contacts-head h1')).toHaveCSS('font-size','22px');
      await expect(page.locator('.page-crumb')).toHaveCSS('font-size','16px');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path:`artifacts/ui-typography/${market}-contacts-${width}.png`});
      if (width === 1440) {
        const nav = page.locator('#ws-team-nav');
        for (const label of ['团队成员','设备查看','空间设置','开放API调用']) {
          await expect(nav.locator('.ws-nav-text', {hasText: label})).toBeVisible();
          await expect(nav.getByRole(label === '开放API调用' ? 'link' : 'button', {name:label,exact:true})).toHaveAttribute('title',new RegExp(label));
        }
        await page.locator('.collapse-btn').click();
        await expect(nav.locator('.ws-nav-text').first()).toBeHidden();
        await expect(nav.getByRole('button',{name:'团队成员',exact:true})).toBeVisible();
        await page.locator('.collapse-btn').click();
        await expect(nav.locator('.ws-nav-text').first()).toBeVisible();
        await nav.getByRole('button',{name:'设备查看',exact:true}).click();
        await expect(page.locator('.ws-page-head h1')).toHaveText('设备查看');
        await page.screenshot({path:`artifacts/ui-typography/${market}-team-navigation.png`});
        await page.setViewportSize({width:1080,height:680});
        await expect(nav.locator('.ws-nav-text').first()).toBeHidden();
        await page.setViewportSize({width:1440,height:900});
        await expect(nav.locator('.ws-nav-text').first()).toBeVisible();
      } else if (width > 760) {
        await expect(page.locator('#ws-team-nav .ws-nav-text').first()).toBeHidden();
        expect(await page.locator('.sidebar').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      } else {
        await page.getByRole('button',{name:'打开导航'}).click();
        await expect(page.locator('.mobile-nav-links').getByRole('button',{name:'团队成员'})).toBeVisible();
        await page.keyboard.press('Escape');
      }
    });
  }
}

for (const market of ['cn','global']) {
  test(`${market} detail tabs, account dialogs and member navigation`, async ({page}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({width:1440,height:900});
    await login(page,market);
    for (const [view, selector] of [
      ['contacts&id=john','.contacts-tabs.detail [role=tab]'],
      ['meeting&id=meeting-1','.md-tabs [role=tab]'],
      ['settings','.ex-settings-tabs [role=tab]'],
    ]) {
      await page.goto(`/${market}/workbench/?view=${view}`);
      await expect(page.locator('.app:not(.guest-app)')).toBeVisible();
      const tabs = page.locator(selector);
      await expect(tabs.first()).toBeVisible();
      for (let i=0; i<await tabs.count(); i++) {
        await tabs.nth(i).click();
        await expect(tabs.nth(i)).toHaveAttribute('aria-selected','true');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({path:`artifacts/ui-typography/${market}-${view.split('&')[0]}-tab-${i}.png`});
      }
    }
    await page.goto(`/${market}/workbench/?view=subscription`);
    await page.getByRole('button',{name:'我的订单',exact:true}).click();
    await expect(page.locator('.ex-dialog .ex-head h2')).toHaveCSS('font-size','18px');
    await page.screenshot({path:`artifacts/ui-typography/${market}-account-orders.png`});
    await page.keyboard.press('Escape');
    await page.goto(`/${market}/workbench/?view=home`);
    await page.locator('#user-card').click();
    await page.getByRole('button',{name:'充值',exact:true}).click();
    await expect(page.locator('.ex-dialog .ex-head h2')).toHaveCSS('font-size','18px');
    await page.screenshot({path:`artifacts/ui-typography/${market}-account-recharge.png`});
    await page.keyboard.press('Escape');
    await page.goto(`/${market}/workbench/?view=members&space=team-eureka&actor=kevin`);
    await expect(page.locator('#ws-team-nav .ws-nav-text').first()).toBeVisible();
    await expect(page.locator('#ws-team-nav').getByRole('button',{name:'设备查看',exact:true})).toHaveCount(0);
    await page.screenshot({path:`artifacts/ui-typography/${market}-member-navigation.png`});
  });
}
