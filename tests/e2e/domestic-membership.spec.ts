import { test, expect, type Page } from "@playwright/test";
const key="eureka:market:cn:eureka:workspaces:v2";
async function login(page:Page){await page.goto('/cn/');await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.getByRole("button", {name:"个人/团队版",exact:true}).click();await page.locator('#phone').fill('13800138000');await page.locator('#code').fill('111111');await page.locator('#terms').check();await page.locator('#submit').click();await expect(page.locator('.app')).toBeVisible();}
for (const width of [390, 768, 1440]) test(`CN personal subscription layout and time packs at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await login(page);
  await page.goto('/cn/workbench/?view=subscription');
  const membership = page.getByRole('region', { name: '个人订阅', exact: true });
  const account = page.getByRole('region', { name: '个人账号与转写额度', exact: true });
  const tiers = page.getByRole('group', { name: '会员档位', exact: true });
  const cycles = page.getByRole('group', { name: '计费周期', exact: true });
  await expect(membership.getByRole('heading', { name: '个人订阅', exact: true })).toBeVisible();
  await expect(membership.getByRole('navigation', { name: '订阅服务' }).getByRole('button')).toHaveCount(3);
  const accountName = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{"account":{"name":"张伟"}}').account.name, key);
  await expect(account.getByRole('heading')).toContainText(accountName);
  await expect(account.locator('.ws-mini-avatar')).toHaveText(accountName[0]);
  await expect(account.getByRole('progressbar', { name: '剩余转写时长' })).toHaveAttribute('max', '300');
  await expect(cycles.getByRole('button')).toHaveCount(2);
  await expect(cycles.getByRole('button', { name: '按年', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(membership.locator('[data-ws-action="personal-buy"]')).toHaveCount(1);
  await expect(membership.locator('.ps-plan-footer').getByRole('button', { name: '恢复购买', exact: true })).toBeVisible();

  // CN-MEMBER-01: both tiers retain their verified prices and all 16 benefits.
  for (const plan of [
    { name: '专业版', month: 50, year: 199, minutes: '3000分钟/月录音转写时长', credits: '5000Credits/月', storage: '50G的PC端知识库容量' },
    { name: '卓越版', month: 100, year: 599, minutes: '无限录音转写时长', credits: '10000Credits/月', storage: '200G的PC端知识库容量' },
  ]) {
    await tiers.getByRole('button', { name: plan.name, exact: true }).click();
    await expect(tiers.getByRole('button', { name: plan.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    const benefits = page.getByRole('region', { name: `${plan.name}完整权益`, exact: true });
    await expect(benefits.getByRole('listitem')).toHaveCount(16);
    for (const text of [plan.minutes, plan.credits, plan.storage, '16种语言+27种方言录音识别', '16种语言+27种方言转写翻译', '闪念笔记（硬件W2专享）', 'PC端AI PPT生成', 'PC端AI 编辑器']) {
      await expect(benefits).toContainText(text);
    }
    await expect(cycles.getByRole('button', { name: '按月', exact: true }).locator('.cn-member-total')).toHaveText(`¥${plan.month}/月`);
    await expect(cycles.getByRole('button', { name: '按年', exact: true }).locator('.cn-member-total')).toHaveText(`¥${plan.year}/年`);
    await cycles.getByRole('button', { name: '按月', exact: true }).click();
    await expect(cycles.getByRole('button', { name: '按月', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(membership.getByRole('button', { name: `立即升级 ${plan.name}`, exact: true })).toBeEnabled();
    await cycles.getByRole('button', { name: '按年', exact: true }).click();
  }

  if (width === 1440) {
    const title = await membership.getByRole('heading', { name: '个人订阅', exact: true }).boundingBox();
    const services = await membership.getByRole('navigation', { name: '订阅服务' }).boundingBox();
    expect(services!.x).toBeGreaterThan(title!.x + title!.width);
    const identity = await account.locator('.cn-member-identity').boundingBox();
    const quota = await account.locator('.cn-member-quota').boundingBox();
    expect(quota!.x).toBeGreaterThan(identity!.x);
    expect(Math.abs(quota!.y + quota!.height / 2 - identity!.y - identity!.height / 2)).toBeLessThan(2);
    const month = await cycles.getByRole('button', { name: '按月', exact: true }).boundingBox();
    const year = await cycles.getByRole('button', { name: '按年', exact: true }).boundingBox();
    expect(Math.abs(month!.y - year!.y)).toBeLessThan(2);
    expect(year!.x).toBeGreaterThan(month!.x + month!.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({ path: `test-results/cn-membership/member-${width}.png`, fullPage: true });
  await page.getByRole('tab', { name: '加时包', exact: true }).click();
  await expect(page.locator('.cn-time-options button')).toHaveCount(3);
  // CN-TIME-01: each existing pack still drives the single purchase action.
  for (const pack of [{ minutes: 120, amount: 5 }, { minutes: 1000, amount: 39 }, { minutes: 2000, amount: 69 }]) {
    await page.locator('.cn-time-options button').filter({ hasText: `${pack.minutes} 分钟` }).click();
    await expect(page.getByRole('button', { name: `购买 ${pack.minutes} 分钟 · ¥${pack.amount}`, exact: true })).toBeVisible();
  }
  await expect(page.locator('.cn-time-packs')).toContainText('有效期2年');
  const rect = await membership.boundingBox();
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(page.getByRole('tab', { name: '加时包', exact: true })).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.screenshot({ path: `test-results/cn-membership/time-${width}.png`, fullPage: true });
});
test('CN time orders resume from account orders and persist personal entitlement without changing team',async({page})=>{
 await login(page);await page.locator('#user-card').click();await page.getByRole('button',{name:'立即签到',exact:true}).click();await page.goto('/cn/workbench/?view=subscription');
 const teamBefore=await page.evaluate(k=>{const w=JSON.parse(localStorage.getItem(k)!).spaces.find((w:{id:string})=>w.id==='team-eureka');return JSON.stringify({credits:w.credits,cycle:w.cycle,seats:w.seats,nextDate:w.nextDate,status:w.status,invoices:w.invoices,timeOrders:w.timeOrders});},key);
 await page.getByRole('tab',{name:'加时包',exact:true}).click();await page.getByRole('button',{name:'购买 2000 分钟 · ¥69',exact:true}).click();
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'我的订单',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('2000 分钟加时包');
 await page.getByRole('button',{name:'继续支付',exact:true}).click();await page.getByRole('button',{name:'确认支付 ¥69.00',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'加时包已到账'})).toContainText('有效期至');await page.getByRole('button',{name:'完成',exact:true}).click();await page.keyboard.press('Escape');await page.reload();
 await expect(page.locator('.cn-member-account')).toContainText('2,000 分钟');
 expect(await page.evaluate(k=>{const w=JSON.parse(localStorage.getItem(k)!).spaces.find((w:{id:string})=>w.id==='team-eureka');return JSON.stringify({credits:w.credits,cycle:w.cycle,seats:w.seats,nextDate:w.nextDate,status:w.status,invoices:w.invoices,timeOrders:w.timeOrders});},key)).toBe(teamBefore);
});
test('CN account card retains sign-in progress, real accumulated awards, task/recharge routes and upgrade',async({page})=>{
 await login(page);await page.locator('#user-card').click();const menu=page.getByRole('dialog',{name:'我的账户',exact:true});
 await expect(menu).toContainText('本月签到 0/15 次，累计 0 Credits');await menu.screenshot({path:'test-results/cn-membership/account-card-ready.png'});await menu.getByRole('button',{name:'立即签到',exact:true}).click();
 await expect(menu).toContainText('本月签到 1/15 次，累计 1,000 Credits');await expect(menu.getByRole('button',{name:'明日再来',exact:true})).toBeDisabled();
 await expect(menu.getByRole('button',{name:'升级',exact:true})).toBeVisible();await expect(menu).toContainText('当前可用Credits');
 await page.mouse.move(600,400);
 await expect(menu.getByRole('button',{name:'明日再来',exact:true})).toHaveCSS('background-image','none');
 await page.screenshot({path:'test-results/cn-membership/account-card.png'});
 await menu.getByRole('button',{name:'赚Credits',exact:true}).click();await expect(page.locator('.ex-task')).not.toHaveCount(0);await page.keyboard.press('Escape');
 await page.locator('#user-card').click();await menu.getByRole('button',{name:'充值',exact:true}).click();await expect(page.getByRole('button',{name:'确认充值',exact:true})).toBeVisible();
});
test('CN excellent checkout applies 10000 points and unlimited minutes with full comparison matrix',async({page})=>{
 await login(page);await page.goto('/cn/workbench/?view=subscription');await page.getByRole('group',{name:'会员档位',exact:true}).getByRole('button',{name:'卓越版',exact:true}).click();await page.getByRole('button',{name:'立即升级 卓越版',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('10,000');await expect(page.getByRole('dialog')).toContainText('无限录音转写时长');await page.getByRole('button',{name:'确认支付 ¥599.00',exact:true}).click();await page.getByRole('button',{name:'完成',exact:true}).click();
 await expect(page.locator('.cn-member-account')).toContainText('卓越版');await expect(page.locator('.cn-member-account')).toContainText('无限时长');
 await expect(page.getByRole('progressbar',{name:'剩余转写时长'})).toHaveAttribute('aria-valuetext','无限录音转写时长');
 await expect(page.getByRole('button',{name:'当前套餐',exact:true})).toBeDisabled();
 await page.getByRole('group',{name:'会员档位',exact:true}).getByRole('button',{name:'专业版',exact:true}).click();
 await expect(page.getByRole('button',{name:'已享卓越版权益',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'恢复购买',exact:true}).click();
 await expect(page.getByText('已恢复有效个人订阅',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'权益对比',exact:true}).click();await expect(page.locator('.ex-table tbody tr')).toHaveCount(16);await expect(page.getByRole('dialog')).toContainText('标准版（购卡赠送）');
});
