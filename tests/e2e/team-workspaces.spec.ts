import {expect,test,Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const url='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
const action=(page:Page,name:string,value?:string)=>page.locator(`[data-ws-action="${name}"]${value?`[data-value="${value}"]`:''}`).filter({visible:true}).first();
async function switchTo(page:Page,id:string){await page.locator('#ws-switcher').click();await page.locator(`#ws-menu [data-ws-action=switch][data-value="${id}"]`).click();}
async function section(page:Page,value:string){await page.locator('#ws-switcher').click();await page.locator(`#ws-menu [data-ws-action=page][data-value="${value}"]`).click();}
test.beforeEach(async({page})=>{await page.goto(url);});
test('one account switches isolated workspaces, private files stay private and sharing is explicit',async({page})=>{
  await expect(page.locator('#meeting-list .home-meeting-row')).toHaveCount(20);
  await switchTo(page,'team-eureka');
  await expect(page.locator('#ws-view')).toContainText('团队产品周会');
  await expect(page.locator('#ws-view')).not.toContainText('林晓的个人绩效沟通');
  await action(page,'file','team-review').click();
  await action(page,'edit').click();await page.locator('#ws-editor').fill('团队专属纪要，不应进入个人空间');await action(page,'save-edit').click();
  await action(page,'share').click();await page.locator('#ws-dialog input[value=kevin]').check();await page.locator('#ws-dialog button[type=submit]').click();
  await page.locator('#ws-actor').selectOption('kevin');
  await expect(page.locator('#ws-team-nav')).not.toContainText('空间管理');
  await expect(page.locator('#ws-view')).toContainText('团队产品周会');
  await action(page,'file','team-review').click();await expect(action(page,'edit')).toHaveCount(0);await expect(page.locator('.ws-prose')).toContainText('团队专属纪要');
  await switchTo(page,'team-design');await expect(page.locator('#ws-view')).not.toContainText('团队产品周会');
  await switchTo(page,'personal');await expect(page.locator('#ws-view')).toBeHidden();await expect(page.locator('#meeting-list')).not.toContainText('团队专属');
  await section(page,'files');await expect(page.locator('#ws-view')).toContainText('三季度产品复盘会议');
});
test('creation has failed-payment retry, idempotent success, invitation acceptance and persisted team',async({page})=>{
  await page.locator('#ws-switcher').click();await action(page,'plan').click();
  await expect(page.locator('#ws-dialog')).toContainText('每席位独立 Unlimited');
  await action(page,'setup').click();await page.locator('#ws-dialog [name=name]').fill('迭代验证团队');await page.locator('#ws-dialog [name=seats]').fill('2');
  await page.locator('#ws-dialog button[type=submit]').click();await action(page,'payment-fail').click();await expect(page.locator('.ws-form-error').filter({visible:true})).toContainText('未创建');
  await action(page,'payment').click();await expect(page.locator('#ws-dialog')).toContainText('团队已准备好');await page.locator('#ws-dialog [data-ws-action=invite]').click();
  await page.locator('#ws-dialog [name=emails]').fill('teammate@example.com');await page.locator('#ws-dialog button[type=submit]').click();
  await expect(page.locator('#ws-view')).toContainText('待接受');await action(page,'member-accept').click();await expect(page.locator('#ws-view')).toContainText('已加入');
  await page.reload();await expect(page.locator('#ws-switcher')).toContainText('迭代验证团队');
  await action(page,'page','members').click();await expect(page.locator('#ws-view')).toContainText('teammate@example.com');
});
test('seats, billing, credits and readonly subscription states are functional',async({page})=>{
  await switchTo(page,'team-eureka');await action(page,'page','billing').click();
  await action(page,'seats').click();await page.locator('#ws-dialog [name=seats]').fill('4');await page.locator('#ws-dialog button[type=submit]').click();
  await expect(page.locator('#ws-view')).toContainText('下周期调整为 4 席位');await action(page,'cancel-reduction').click();
  await action(page,'seats').click();await page.locator('#ws-dialog [name=seats]').fill('8');await page.locator('#ws-dialog button[type=submit]').click();await expect(page.locator('#ws-view')).toContainText('增加 2 席位');
  await action(page,'billing-info').click();await page.locator('#ws-dialog [name=company]').fill('测试公司');await page.locator('#ws-dialog button[type=submit]').click();await expect(page.locator('#ws-view')).toContainText('测试公司');
  const bill=page.waitForEvent('download');await action(page,'invoice').click();expect((await bill).suggestedFilename()).toMatch(/\.txt$/);
  await action(page,'page','credits').click();await action(page,'topup').click();await page.locator('#ws-dialog button[type=submit]').click();await expect(page.locator('.ws-credit-summary')).toContainText('47,600');
  await section(page,'files');await action(page,'agent').click();await page.locator('.ws-composer textarea').fill('整理工作');await page.locator('.ws-composer button[type=submit]').click();await expect(page.locator('.ws-chat-answer')).toContainText('已授权资料');
  await section(page,'billing');await action(page,'expire').click();await action(page,'confirm').click();await expect(page.locator('.ws-readonly')).toBeVisible();
  await section(page,'files');await action(page,'record').click();await expect(page.locator('#ws-toast')).toContainText('只读');await expect(page.locator('#ws-dialog')).not.toBeVisible();
  await section(page,'billing');await action(page,'renew').click();await action(page,'confirm').click();await expect(page.locator('.ws-readonly')).toHaveCount(0);
});
test('device bindings do not follow workspace switching and exported notes import as private copies',async({page})=>{
  await switchTo(page,'team-eureka');await action(page,'page','devices').click();await action(page,'bind').click();await expect(page.locator('#ws-dialog')).toContainText('个人工作空间');await page.locator('#ws-dialog button[type=submit]').click();
  await action(page,'sync','dev-personal').click();await section(page,'files');await expect(page.locator('#ws-view')).toContainText('我的 Eureka Note · 新录音');
  const downloaded=page.waitForEvent('download');await action(page,'export','team-review').click();const downloadedFile=await downloaded;const exported=JSON.parse(await readFile((await downloadedFile.path())!,'utf8'));expect(exported.format).toBe('eureka-note-v1');
  await switchTo(page,'team-design');await section(page,'files');await action(page,'import').click();await page.locator('#ws-dialog input[type=file]').setInputFiles({name:'team-note.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await page.locator('#ws-dialog button[type=submit]').click();
  await expect(page.locator('.ws-page-head')).toContainText('团队产品周会');await expect(page.locator('.ws-note-footer')).toContainText('仅自己可见');
  await switchTo(page,'personal');await section(page,'devices');await expect(page.locator('#ws-view')).not.toContainText('我的 Eureka Note');
});
test('incoming team invitation joins as member without changing personal plan',async({page})=>{
  await page.locator('#ws-switcher').click();await action(page,'invites').click();await action(page,'join').click();
  await expect(page.locator('#ws-switcher')).toContainText('增长研究小组');await expect(page.locator('#ws-team-nav')).not.toContainText('空间管理');
  await section(page,'billing');await expect(page.locator('#ws-view')).toContainText('Team Unlimited');await expect(action(page,'seats')).toHaveCount(0);
  await switchTo(page,'personal');await section(page,'billing');await expect(page.locator('#ws-view')).toContainText('Pro');
});
test('Agent and management fit common viewports without page overflow',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await switchTo(page,'team-eureka');await action(page,'agent').click();
  for(const [width,height] of [[1920,1080],[1366,768],[1280,650],[390,844]]){
    await page.setViewportSize({width,height});await expect(page.locator('.ws-composer textarea')).toBeInViewport({ratio:1});await expect(page.locator('.ws-agent button[aria-label="收起 Agent"]')).toBeInViewport({ratio:1});
    expect(await page.locator('.main').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThan(3);
  }
  await action(page,'agent-close').click();expect(errors).toEqual([]);
});
test('member device requests, admin fulfillment and next-cycle seat reduction work end to end',async({page})=>{
  await switchTo(page,'team-eureka');await page.locator('#ws-actor').selectOption('kevin');await action(page,'page','devices').click();
  await action(page,'request-device').click();await page.locator('#ws-dialog [name=reason]').fill('客户拜访录音');await page.locator('#ws-dialog button[type=submit]').click();await expect(page.locator('#ws-view')).toContainText('待处理');
  await page.locator('#ws-actor').selectOption('zhang');await action(page,'page','devices').click();await action(page,'fulfill-device').click();await page.locator('#ws-dialog [data-ws-action=confirm]').click();await expect(page.locator('#ws-view')).toContainText('Kevin的 Eureka Note');
  await section(page,'billing');await action(page,'seats').click();await page.locator('#ws-dialog [name=seats]').fill('4');await page.locator('#ws-dialog button[type=submit]').click();
  await action(page,'cycle').click();await page.locator('#ws-dialog [data-ws-action=confirm]').click();await expect(page.locator('#ws-view')).toContainText('下周期改为 月付');
  await action(page,'advance-cycle').click();await page.locator('#ws-dialog [data-ws-action=confirm]').click();await expect(page.locator('#ws-view')).toContainText('模拟续费 · 4 席位');await expect(page.locator('.ws-plan-amount')).toContainText('796.00');
});
