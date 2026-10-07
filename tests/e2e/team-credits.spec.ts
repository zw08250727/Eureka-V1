import {expect,test,Page} from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined,viewport:{width:1440,height:900}});
const url='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
const action=(p:Page,n:string,v?:string)=>p.locator(`[data-ws-action="${n}"]${v?`[data-value="${v}"]`:''}`).filter({visible:true}).first();
const submit=(p:Page)=>p.locator('#ws-dialog button[type=submit]').click();
async function credits(p:Page){await action(p,'page','billing').click();await action(p,'page','credits').click();}
async function state(p:Page){return p.evaluate(()=>JSON.parse(localStorage.getItem('eureka:workspaces:v2')!).spaces.find((w:{id:string})=>w.id==='team-eureka'));}
async function capture(p:Page,name:string){if(process.env.PRD_CAPTURE){await expect(p.locator('#ws-toast')).toBeHidden();await p.screenshot({path:`src/prototype/prd/images/${name}.png`});}}
test.beforeEach(async({page})=>{await page.goto(url);await page.locator('#ws-switcher').click();await action(page,'switch','team-eureka').click();await credits(page);});
test('Credits checkout survives refresh, retry fulfills once, receipt downloads and cancellation is safe',async({page})=>{
  await expect(page.locator('.ws-credit-summary')).toContainText('37,600');
  await expect(page.locator('#ws-view')).not.toContainText('每次 Agent 分析');
  await expect(page.locator('.ws-credit-usage thead th')).toHaveCount(4);await expect(page.locator('.ws-credit-usage')).not.toContainText('输入 tokens');await expect(page.locator('.ws-credit-usage')).not.toContainText('输出 tokens');
  await capture(page,'credits');
  await action(page,'topup').click();await submit(page);await expect(page.locator('#ws-dialog')).toContainText('确认 Credits 订单');await capture(page,'credits-checkout');
  const pending=await state(page);expect(pending.creditOrders[0].status).toBe('pending');expect(pending.credits.total).toBe(50000);
  await action(page,'credit-pay-fail').click();await expect(page.locator('#ws-dialog')).toContainText('未扣款、未增加 Credits');
  await page.reload();await credits(page);await action(page,'credit-checkout').click();await submit(page);await expect(page.locator('#ws-dialog')).toContainText('Credits 已到账');await capture(page,'credits-success');
  const paid=await state(page);expect(paid.credits.total).toBe(60000);expect(paid.creditOrders[0].id).toBe(pending.creditOrders[0].id);expect(paid.invoices.length).toBe(pending.invoices.length+1);
  const download=page.waitForEvent('download');await page.locator('#ws-dialog [data-ws-action=invoice]').click();expect((await download).suggestedFilename()).toMatch(/\.txt$/);
  await action(page,'close-dialog').click();await action(page,'credit-checkout').click();await expect(page.locator('#ws-dialog')).toContainText('Credits 已到账');expect((await state(page)).credits.total).toBe(60000);await action(page,'close-dialog').click();
  await action(page,'topup').click();await page.locator('[name=packId][value=credits-50k]').check();await submit(page);await expect(page.locator('#ws-dialog')).toContainText('¥450.00');
  await page.locator('#ws-dialog [data-ws-action=credit-cancel]').click();await action(page,'confirm').click();await expect(page.locator('.ws-credit-orders')).toContainText('已取消');expect((await state(page)).credits.total).toBe(60000);
});
test('Token usage varies, preserves personal balance and shares the team pool across members',async({page})=>{
  const initial=await state(page);await page.locator('#home-entry').click();await action(page,'agent').click();
  await page.locator('.ws-composer textarea').fill('整理关键结论');await page.locator('.ws-composer button[type=submit]').click();
  await expect(page.locator('.ws-agent-usage')).toContainText('Credits（模拟）');
  const first=await state(page),a=first.credits.logs[0];expect(a.amount).toBe((a.inputTokens+2*a.outputTokens)/1000);expect(a.amount).not.toBe(200);
  await action(page,'agent-close').click();await page.locator('#ws-actor').selectOption('kevin');await action(page,'agent').click();
  await page.locator('.ws-composer textarea').fill('请整理会议里的全部讨论，特别关注试点验收。'.repeat(20));await page.locator('.ws-composer button[type=submit]').click();
  const second=await state(page),b=second.credits.logs[0];expect(b.user).toBe('kevin');expect(b.amount).not.toBe(a.amount);expect(Math.round(second.credits.used*1000)).toBe(Math.round(initial.credits.used*1000)+Math.round(a.amount*1000)+Math.round(b.amount*1000));
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('eureka:workspaces:v2')!).spaces.find((w:{id:string})=>w.id==='personal').credits.used)).toBe(0);
  await expect(page.locator('#ws-team-nav')).not.toContainText('空间管理');
});
test('Payment rolls back on storage failure and refuses stale quotes without fake success',async({page})=>{
  await action(page,'topup').click();await submit(page);const before=await state(page);
  await page.evaluate(()=>{const orig=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='eureka:workspaces:v2')throw new Error('quota');return orig.call(this,key,value);};});
  await submit(page);await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('存储空间不足');expect((await state(page)).credits.total).toBe(before.credits.total);expect((await state(page)).creditOrders[0].status).toBe('pending');
  await page.reload();await credits(page);await action(page,'credit-checkout').click();
  await page.evaluate(()=>{const key='eureka:workspaces:v2',data=JSON.parse(localStorage.getItem(key)!);data.spaces.find((w:{id:string})=>w.id==='team-eureka').name='其他页面修改';localStorage.setItem(key,JSON.stringify(data));});
  await submit(page);await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('其他页面更新');expect((await state(page)).credits.total).toBe(before.credits.total);
});
test('Return to packages cancels prior order and checkout fits narrow screens',async({page})=>{
  await action(page,'topup').click();await submit(page);await action(page,'credit-back').click();await page.locator('[name=packId][value=credits-50k]').check();await submit(page);
  const data=await state(page);expect(data.creditOrders[0].amount).toBe(450);expect(data.creditOrders[1].status).toBe('cancelled');
  for(const width of [1280,768,390]){await page.setViewportSize({width,height:844});const dialog=page.locator('#ws-dialog');expect(await dialog.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(3);await page.locator('#ws-dialog button[type=submit]').scrollIntoViewIfNeeded();await expect(page.locator('#ws-dialog button[type=submit]')).toBeInViewport();}
});
