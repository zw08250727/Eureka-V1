import { test, expect, type Page } from "@playwright/test";
const key="eureka:market:cn:eureka:workspaces:v2";
async function login(page:Page){
 await page.goto('/cn/');await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.getByRole("link", { name: "个人/团队版", exact: true }).click();await page.locator('#phone').fill('13800138000');await page.locator('#code').fill('111111');await page.locator('#terms').check();await page.locator('#submit').click();await expect(page.locator('.app')).toBeVisible();
}
async function recharge(page:Page, background='rgb(255, 255, 255)'){
 await page.locator('#user-card').click();const button=page.getByRole('dialog', { name: '我的账户', exact: true }).locator('.credit-recharge-cta');await expect(button).toHaveCSS('background-color',background);await button.click();await expect(page.getByRole('dialog')).toContainText('充值积分');
}
test('CN: yuan recharge, secondary CTA, payment retry, expiry and classified balance persist',async({page})=>{
 await login(page);await page.goto('/cn/workbench/?review=1');await recharge(page);
 const dialog=page.getByRole('dialog');
 for(const price of ['¥59.00','¥109.00','¥149.00'])await expect(dialog).toContainText(price);
 await expect(dialog).not.toContainText(/USD|PayPal|Credits/);
 await page.getByRole('button',{name:'确认充值',exact:true}).click();
 await expect(page.getByRole('tab',{name:'微信',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'支付宝',exact:true}).click();
 await page.getByRole('button',{name:'模拟支付失败',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('支付未完成');
 await page.getByRole('button',{name:'重试支付',exact:true}).click();
 await expect(dialog).toContainText('充值成功');await expect(dialog).toContainText('积分有效期至');
 const order=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).spaces.find((w:{id:string})=>w.id==='personal').creditOrders[0],key);
 expect(order.currency).toBe('CNY');expect(order.amount).toBe(149);expect(order.method).toBe('支付宝');expect(order.creditsExpireAt).toBeTruthy();
 await page.goto('/cn/workbench/?view=settings&id=credits');await expect(page.getByRole('tab',{name:'积分明细'})).toBeVisible();
 await expect(page.locator('.ex-settings-body')).toContainText('会员积分');await expect(page.locator('.ex-settings-body')).toContainText('15,000');
 await page.reload();await expect(page.locator('.ex-settings-body')).toContainText('15,000');
 await page.screenshot({path:'test-results/cn-billing/details.png',fullPage:true});
});
test('CN: professional single-purchase subscription changes only personal rights',async({page})=>{
 await login(page);await page.goto('/cn/workbench/?view=subscription');
 await expect(page.getByRole('group',{name:'计费周期'})).toContainText('¥199/年');await page.getByRole('group',{name:'会员档位'}).getByRole('button',{name:'卓越版',exact:true}).click();await expect(page.getByRole('group',{name:'计费周期'})).toContainText('¥599/年');await page.getByRole('group',{name:'会员档位'}).getByRole('button',{name:'专业版',exact:true}).click();
 await page.getByRole('button',{name:'立即升级 专业版',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('不自动续费');
 await page.getByRole('button',{name:'确认支付 ¥199.00',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('专业版 已生效');
 await page.getByRole('button',{name:'完成',exact:true}).click();await expect(page.locator('.ps-account')).toContainText('有效期至');
 await expect(page.getByRole('button',{name:'恢复自动续费'})).toHaveCount(0);
 await page.screenshot({path:'test-results/cn-billing/subscription.png',fullPage:true});
 await page.getByRole('button',{name:'权益对比',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('卓越版');await expect(page.getByRole('dialog')).toContainText('10000积分/月');
});
test('CN: ordinary team member cannot recharge; admin uses CNY without changing personal subscription',async({page})=>{
 await login(page);await page.goto('/cn/workbench/?space=team-eureka&actor=kevin');await page.locator('#user-card').click();await expect(page.getByRole('dialog', { name: '我的账户', exact: true }).locator('.credit-recharge-cta')).toBeDisabled();
 await page.goto('/cn/workbench/?space=team-eureka&actor=zhang');await recharge(page,'rgb(22, 93, 255)');await page.getByRole('button',{name:'确认充值',exact:true}).click();await page.getByRole('button',{name:'确认支付',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('充值成功');
 const state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);
 expect(state.spaces.find((w:{id:string})=>w.id==='team-eureka').creditOrders[0].currency).toBe('CNY');expect(state.spaces.find((w:{id:string})=>w.id==='personal').creditOrders).toBeUndefined();
});
for(const width of [390,768,1440])test(`CN recharge layout remains usable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await login(page);
 // The shared points popover provides recharge on every responsive layout.
 await page.locator('.cn-points-trigger').click();await page.getByRole('button',{name:'充值积分',exact:true}).click();
 await expect(page.getByRole('button',{name:'确认充值'})).toBeVisible();
 expect(await page.getByRole('dialog').evaluate(e=>e.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
 await page.screenshot({path:`test-results/cn-billing/recharge-${width}.png`,fullPage:true});
});
test('CN: failed local persistence cannot grant points or mark an unpaid order paid',async({page})=>{
 await login(page);await recharge(page);await page.getByRole('button',{name:'确认充值',exact:true}).click();
 const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.evaluate(k=>{const save=Storage.prototype.setItem;let fail=true;Storage.prototype.setItem=function(name,value){if(name===k&&fail){fail=false;throw Error('quota');}return save.call(this,name,value);};},key);
 await page.getByRole('button',{name:'确认支付',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('保存失败');
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
 await page.getByRole('button',{name:'确认支付',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('充值成功');
});
