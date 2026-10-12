import { expect, test } from "@playwright/test";
const url = (view = "home", space = "personal") => `/workbench/?view=${view}&space=${space}&actor=zhang`;

test("review tools are separate from product actions and preserve perspective controls", async ({page}) => {
  await page.goto(url());
  await expect(page.locator('.topbar .team-review-tools')).toHaveCount(0);
  await expect(page.locator('.topbar .prd-review-entry')).toHaveCount(0);
  await expect(page.getByRole('combobox',{name:'评审视角'})).not.toBeVisible();
  await page.locator('.review-dock summary').click();
  await expect(page.getByRole('combobox',{name:'评审视角'})).toBeVisible();
  await expect(page.locator('.review-dock').getByRole('link',{name:/需求评审/})).toHaveAttribute('href',/prd\/index.html/);
});

test("settings support keyboard tabs, independent filters, draft retention and validation", async ({page}) => {
  await page.goto(url('settings'));
  await page.getByLabel('我的昵称').fill('   ');
  await page.getByRole('button',{name:'保存',exact:true}).click();
  await expect(page.locator('.ex-status[role=alert]')).toContainText('请填写昵称');
  await page.getByLabel('我的昵称').fill('新的昵称');
  const profile = page.getByRole('tab',{name:'个人信息',exact:true});
  await profile.focus(); await page.keyboard.press('End');
  await expect(page.getByRole('tab',{name:'录音转写时长',exact:true})).toBeFocused();
  await page.getByRole('tab',{name:'过期',exact:true}).click();
  await page.getByRole('tab',{name:'Credits 明细',exact:true}).click();
  await expect(page.getByRole('tab',{name:'全部',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#credits-history')).toContainText('暂无此类明细');
  await page.getByRole('tab',{name:'个人信息',exact:true}).click();
  await expect(page.getByLabel('我的昵称')).toHaveValue('新的昵称');
  await page.getByRole('button',{name:'保存',exact:true}).click();
  await expect(page.locator('.ex-status[role=status]')).toContainText('个人信息已保存');
  await page.reload();
  await expect(page.getByLabel('我的昵称')).toHaveValue('新的昵称');
});

test("payment feedback distinguishes failure, recovery, and Escape focus restoration", async ({page}) => {
  await page.goto(url());
  const trigger = page.locator('.topbar').getByRole('button',{name:/Credits/});
  await trigger.click();
  await page.getByRole('button',{name:'充值 Credits',exact:true}).click();
  await page.getByRole('button',{name:'确认充值',exact:true}).click();
  await page.getByRole('button',{name:'模拟支付失败',exact:true}).click();
  await expect(page.locator('.ex-status[role=alert]')).toContainText('支付未完成');
  await page.getByRole('button',{name:'重试模拟支付',exact:true}).click();
  await expect(page.locator('.ex-status[role=status]')).toContainText('支付成功');
  await expect(page.locator('.ex-status[role=alert]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

for (const width of [390,768,1440]) test(`account surfaces fit ${width}px and preserve mobile navigation`, async ({page}) => {
  await page.setViewportSize({width,height:900});
  for (const view of ['settings','subscription']) {
    await page.goto(url(view));
    await expect(page.locator('.review-dock')).toBeVisible();
    await expect.poll(() => page.locator('.main').evaluate(e => e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(2);
    if(view==='settings') {
      const field=page.getByLabel('我的昵称');await expect(field).toBeVisible();
      if(width>1000) expect((await page.locator('.ex-settings-body').boundingBox())!.width).toBeGreaterThan(700);
    }
  }
  if(width<761){
    await page.getByRole('button',{name:'打开导航',exact:true}).click();
    const menu=page.getByRole('dialog',{name:'工作台导航',exact:true});
    await expect(menu.getByRole('combobox',{name:'切换工作区'})).toBeVisible();
    await menu.getByRole('button',{name:'充值',exact:true}).click();
    await expect(menu).toHaveCount(0);
  }else{
    await page.locator('.topbar').getByRole('button',{name:/Credits/}).click();
    await page.getByRole('button',{name:'充值 Credits',exact:true}).click();
  }
  const dialog=page.getByRole('dialog',{name:'充值 Credits',exact:true});
  await expect(dialog).toBeVisible();
  const rect=(await dialog.boundingBox())!;expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(width);
  expect(await dialog.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(2);
  await page.waitForTimeout(200);
  await page.screenshot({path:`test-results/polish-recharge-${width}.png`});
});

test("home slots stay fixed after content growth and all panels fit on mobile",async({page})=>{
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:960});await page.goto(url());
    const overview=page.locator('#today-assets-grid');await expect(overview).toBeVisible();
    const before=(await overview.boundingBox())!;
    await overview.evaluate(e=>{for(const sel of ['.brief-todo-line','.daily-rhythm-events','.daily-inspiration>div']){const list=e.querySelector(sel);if(list?.firstElementChild)for(let i=0;i<25;i++)list.append(list.firstElementChild.cloneNode(true));}});
    expect((await overview.boundingBox())!.height).toBeCloseTo(before.height, 1);
    if(width===390){for(const selector of ['.daily-rhythm','.daily-records']){const rect=(await page.locator(selector).boundingBox())!;expect(rect.x+rect.width).toBeLessThanOrEqual(width);}}
  }
});

test("profile storage failure retains the draft without claiming success",async({page})=>{
  await page.goto(url('settings'));
  await page.getByLabel('我的昵称').fill('待重试的昵称');
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('eureka:profile:'))throw Error('quota');return original.call(this,key,value)};});
  await page.getByRole('button',{name:'保存',exact:true}).click();
  await expect(page.locator('.ex-status[role=alert]')).toContainText('保存失败');
  await expect(page.getByLabel('我的昵称')).toHaveValue('待重试的昵称');
  await expect(page.locator('.ex-status[role=status]')).toHaveCount(0);
});

test("reduced motion is respected by account dialogs",async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url());
  await page.locator('.topbar').getByRole('button',{name:/Credits/}).click();
  expect(await page.getByRole('dialog',{name:'Credits',exact:true}).evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
});
