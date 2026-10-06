import {expect,test,Page} from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const key='eureka:workspaces:v2';
const action=(p:Page,name:string)=>p.locator(`[data-ws-action="${name}"]`).filter({visible:true}).first();
const submit=(p:Page)=>p.locator('#ws-dialog button[type=submit]');
const state=(p:Page)=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)!).spaces.find((s:{id:string})=>s.id==='team-eureka'),key);
async function billing(p:Page){await p.locator('#ws-team-nav [data-value=billing]').click();}
async function order(p:Page,count:string){await action(p,'seats').click();await p.locator('#ws-dialog [name=seats]').fill(count);await submit(p).click();}
test.beforeEach(async({page})=>{await page.goto('/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1');await page.locator('#ws-switcher').click();await page.locator('#ws-menu [data-value=team-eureka]').click();await billing(page);});
test('seat checkout can resume, fail, retry and fulfill exactly once',async({page})=>{
  if(process.env.PRD_CAPTURE){await page.setViewportSize({width:1440,height:1000});await expect(page.locator('#ws-toast')).toBeHidden();await page.screenshot({path:'src/prototype/prd/images/billing.png'});}
  await order(page,'8');await expect(page.locator('#ws-dialog')).toContainText('确认加席订单');await expect(page.locator('.ws-seat-total')).toContainText('¥3,816.00');
  expect((await state(page)).seats).toBe(6);expect((await state(page)).invoices).toHaveLength(1);
  if(process.env.PRD_CAPTURE){await page.setViewportSize({width:1440,height:1000});await expect(page.locator('#ws-toast')).toBeHidden();await page.screenshot({path:'src/prototype/prd/images/seat-payment.png'});}
  const id=(await state(page)).seatOrders[0].id;await action(page,'close-dialog').click();await expect(page.locator('.ws-seat-pending')).toContainText('继续支付');
  await page.reload();await billing(page);await action(page,'seat-checkout').click();await action(page,'seat-pay-fail').click();await expect(page.locator('.ws-seat-payment-error')).toContainText('模拟支付失败');
  expect((await state(page)).seats).toBe(6);expect((await state(page)).seatOrders[0].id).toBe(id);expect((await state(page)).invoices).toHaveLength(1);
  await submit(page).click();await expect(page.locator('#ws-dialog')).toContainText('模拟支付成功');await expect(page.locator('#ws-dialog')).toContainText('总席位 8 个');
  const paid=await state(page);expect(paid.seats).toBe(8);expect(paid.invoices).toHaveLength(2);expect(paid.invoices[0].amount).toBe(3816);expect(paid.invoices[0].orderId).toBe(id);
  await action(page,'close-dialog').click();await expect(page.locator('.ws-seat-pending')).toHaveCount(0);await expect(page.locator('.ws-plan-amount')).toContainText('¥15,264.00');
  await page.reload();await billing(page);expect((await state(page)).invoices).toHaveLength(2);
  const download=page.waitForEvent('download');await action(page,'invoice').click();expect((await download).suggestedFilename()).toMatch(/INV.*\.txt/);
});
test('cancel and edit quantity leave capacity unchanged; monthly orders use monthly pricing',async({page})=>{
  await order(page,'8');await action(page,'seat-back').click();await page.locator('#ws-dialog [name=seats]').fill('9');await expect(page.locator('#ws-seat-estimate')).toContainText('¥5,724.00');await submit(page).click();
  expect((await state(page)).seatOrders.filter((o:{status:string})=>o.status==='pending')).toHaveLength(1);
  await page.locator('#ws-dialog [data-ws-action=seat-cancel]').click();expect((await state(page)).seats).toBe(6);expect((await state(page)).invoices).toHaveLength(1);await expect(page.locator('.ws-seat-pending')).toHaveCount(0);
  await action(page,'cycle').click();await action(page,'confirm').click();await action(page,'advance-cycle').click();await action(page,'confirm').click();
  await order(page,'8');await expect(page.locator('.ws-seat-total')).toContainText('¥398.00');await expect(page.locator('#ws-dialog')).toContainText('¥199.00 / 月');
  for(const [width,height] of [[1366,768],[390,844]]){await page.setViewportSize({width,height});await submit(page).scrollIntoViewIfNeeded();await expect(submit(page)).toBeInViewport({ratio:1});expect(await page.locator('#ws-dialog').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(2);}
  await submit(page).click();expect((await state(page)).seats).toBe(8);expect((await state(page)).invoices[0].amount).toBe(398);
});
test('storage failure keeps unpaid order retryable and stale subscription needs a new quote',async({page})=>{
  await order(page,'8');
  await page.evaluate(k=>{const save=Storage.prototype.setItem;let fail=true;Storage.prototype.setItem=function(name,value){if(name===k&&fail){fail=false;throw new Error('quota');}save.call(this,name,value);};},key);
  await submit(page).click();await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('存储空间不足');expect((await state(page)).seats).toBe(6);expect((await state(page)).invoices).toHaveLength(1);
  await submit(page).click();await expect(page.locator('#ws-dialog')).toContainText('模拟支付成功');await action(page,'close-dialog').click();
  await order(page,'9');
  await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)!);s.spaces.find((w:{id:string})=>w.id==='team-eureka').pendingCycle='month';localStorage.setItem(k,JSON.stringify(s));},key);
  await page.locator('#ws-dialog [data-ws-action=seat-cancel]').click();await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('其他页面更新');expect((await state(page)).pendingCycle).toBe('month');
  await submit(page).click();await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('其他页面更新');expect((await state(page)).seats).toBe(8);
  await page.reload();await billing(page);await action(page,'seat-checkout').click();await submit(page).click();await expect(page.locator('#ws-dialog')).toContainText('重新确认费用');expect((await state(page)).seats).toBe(8);
  await action(page,'seat-back').click();await submit(page).click();await submit(page).click();await expect(page.locator('#ws-dialog')).toContainText('模拟支付成功');expect((await state(page)).seats).toBe(9);
});
