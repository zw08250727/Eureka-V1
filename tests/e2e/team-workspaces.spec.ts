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
  await page.locator('[data-md-action=edit]').click();await page.getByRole('textbox',{name:'编辑正文'}).fill('团队专属纪要，不应进入个人空间');await page.locator('[data-md-action=save-inline]').click();
  await page.locator('[data-md-action=share]').click();await page.locator('#ws-dialog input[value=kevin]').check();await page.locator('#ws-dialog button[type=submit]').click();
  await page.locator('#home-entry').click();await page.locator('#ws-actor').selectOption('kevin');
  await expect(page.locator('#ws-team-nav')).not.toContainText('空间管理');
  await expect(page.locator('#ws-view')).toContainText('团队产品周会');
  await action(page,'file','team-review').click();await expect(page.locator('[data-md-action=edit]')).toBeDisabled();await expect(page.locator('#md-content .md-prose')).toContainText('团队专属纪要');
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
  await action(page,'seats').click();await page.locator('#ws-dialog [name=seats]').fill('8');await page.locator('#ws-dialog button[type=submit]').click();await expect(page.locator('#ws-dialog')).toContainText('确认加席订单');await page.locator('#ws-dialog button[type=submit]').click();await expect(page.locator('#ws-dialog')).toContainText('模拟支付成功');await action(page,'close-dialog').click();await expect(page.locator('#ws-view')).toContainText('增加 2 席位');
  await action(page,'billing-info').click();await page.locator('#ws-dialog [name=company]').fill('测试公司');await page.locator('#ws-dialog button[type=submit]').click();await expect(page.locator('#ws-view')).toContainText('测试公司');
  const bill=page.waitForEvent('download');await action(page,'invoice').click();expect((await bill).suggestedFilename()).toMatch(/\.txt$/);
  await action(page,'page','credits').click();await action(page,'topup').click();await page.locator('#ws-dialog button[type=submit]').click();await page.locator('#ws-dialog button[type=submit]').click();await expect(page.locator('#ws-dialog')).toContainText('Credits 已到账');await action(page,'close-dialog').click();await expect(page.locator('.ws-credit-summary')).toContainText('47,600');
  await section(page,'files');await action(page,'agent').click();await page.locator('.ws-composer textarea').fill('整理工作');await page.locator('.ws-composer button[type=submit]').click();await expect(page.locator('.ws-chat-answer')).toContainText('已授权资料');
  await section(page,'billing');await action(page,'expire').click();await action(page,'confirm').click();await expect(page.locator('.ws-readonly')).toBeVisible();
  await section(page,'files');await action(page,'record').click();await expect(page.locator('#ws-toast')).toContainText('只读');await expect(page.locator('#ws-dialog')).not.toBeVisible();
  await section(page,'billing');await action(page,'renew').click();await action(page,'confirm').click();await expect(page.locator('.ws-readonly')).toHaveCount(0);
});
test('device bindings stay fixed, detail export remains and audio upload rejects legacy note JSON',async({page})=>{
  await switchTo(page,'team-eureka');await action(page,'page','devices').click();await action(page,'bind').click();await expect(page.locator('#ws-dialog')).toContainText('已经有设备？');await expect(page.locator('#ws-dialog [type=submit]')).toHaveCount(0);await page.keyboard.press('Escape');await section(page,'files');
  await action(page,'file','team-review').click();await page.locator('[data-md-action=export]').click();await page.locator('[data-md-action=export-next]').click();await page.locator('[name=md-format][value=json]').check();const downloaded=page.waitForEvent('download');await page.locator('[data-md-action=download]').click();const downloadedFile=await downloaded;const exported=JSON.parse(await readFile((await downloadedFile.path())!,'utf8'));expect(exported.demo).toBe(true);
  await switchTo(page,'team-design');await section(page,'files');await expect(page.locator('[data-ws-action="import"]')).toHaveCount(0);
  await page.locator('.ws-team-home-head [data-audio-upload]').click();await page.locator('#audio-upload-input').setInputFiles({name:'team-note.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await expect(page.locator('#audio-upload-error')).toContainText('暂不支持');await expect(page.locator('#audio-upload-submit')).toBeDisabled();await page.keyboard.press('Escape');
  await switchTo(page,'personal');await section(page,'devices');await expect(page.locator('#ws-view')).toContainText('我的 Eureka Note');
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
test('admin manually registers a device for a member and next-cycle seat reduction works',async({page})=>{
  await switchTo(page,'team-eureka');await action(page,'page','devices').click();
  await expect(page.locator('#ws-view')).not.toContainText('设备申请');
  await action(page,'register-device').click();
  await expect(page.locator('#ws-dialog [name=user] option')).toHaveCount(3);
  await page.getByLabel('SN 码',{exact:true}).fill('474204126010000027');
  await page.getByLabel('设备型号',{exact:true}).fill('W2');
  await page.getByRole('combobox',{name:'绑定成员',exact:true}).selectOption('kevin');
  await page.getByRole('button',{name:'保存并绑定',exact:true}).click();
  const row=page.locator('#ws-view tr').filter({hasText:'474204126010000027'});
  await expect(row).toContainText('Kevin的 W2');await expect(row).toContainText('尚未同步');
  await expect(row.locator('[data-ws-action=sync]')).toHaveCount(0);
  await action(page,'register-device').click();await page.getByLabel('SN 码',{exact:true}).fill('474204126010000027');
  await page.getByLabel('设备型号',{exact:true}).fill('W2');await page.getByRole('button',{name:'保存并绑定',exact:true}).click();
  await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('已录入');
  await page.getByLabel('SN 码',{exact:true}).fill('SN INVALID');await page.getByRole('button',{name:'保存并绑定',exact:true}).click();
  await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('SN 码须为');
  await page.locator('#ws-dialog [data-ws-action=close-dialog]').last().click();
  await page.reload();await action(page,'page','devices').click();await expect(row).toContainText('474204126010000027');
  await page.locator('#ws-actor').selectOption('kevin');await action(page,'page','devices').click();
  await row.locator('[data-ws-action=sync]').click();
  await section(page,'files');await expect(page.locator('#ws-view')).toContainText('Kevin的 W2 · 新录音');
  await page.locator('#ws-actor').selectOption('zhang');await section(page,'files');
  await expect(page.locator('#ws-view')).toContainText('Kevin的 W2 · 新录音');
  await page.locator('.ws-recording-table [data-ws-action=file]').filter({hasText:'Kevin的 W2 · 新录音'}).click();await expect(page.locator('[data-md-action=share]')).toHaveCount(0);await expect(page.locator('[data-md-action=edit]')).toBeDisabled();await page.locator('[data-md-action=ask]').click();await page.locator('#md-agent-host textarea').fill('总结设备录音');await page.locator('#md-agent-host button[type=submit]').click();await expect(page.locator('#md-agent-host .ws-chat-answer')).toContainText('Kevin的 W2');await page.locator('#home-entry').click();
  await section(page,'billing');await action(page,'seats').click();await page.locator('#ws-dialog [name=seats]').fill('4');await page.locator('#ws-dialog button[type=submit]').click();
  await action(page,'cycle').click();await page.locator('#ws-dialog [data-ws-action=confirm]').click();await expect(page.locator('#ws-view')).toContainText('下周期改为 月付');
  await action(page,'advance-cycle').click();await page.locator('#ws-dialog [data-ws-action=confirm]').click();await expect(page.locator('#ws-view')).toContainText('模拟续费 · 4 席位');await expect(page.locator('.ws-plan-amount')).toContainText('796.00');
});

test('device entry keeps drafts on storage conflict and failure, and members can only bind themselves',async({page})=>{
  await switchTo(page,'team-eureka');await page.locator('#ws-actor').selectOption('kevin');await action(page,'page','devices').click();
  await action(page,'register-device').click();await expect(page.locator('#ws-dialog [name=user] option')).toHaveCount(1);
  await page.getByLabel('SN 码',{exact:true}).fill('00000474204126010000027');await page.getByLabel('设备型号',{exact:true}).fill('W2');
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='eureka:workspaces:v2')throw new Error('quota');original.call(this,key,value);};});
  await page.getByRole('button',{name:'保存并绑定',exact:true}).click();await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('存储空间不足');
  await expect(page.getByLabel('SN 码',{exact:true})).toHaveValue('00000474204126010000027');
  await page.reload();await action(page,'page','devices').click();await expect(page.locator('#ws-view')).not.toContainText('00000474204126010000027');
  await action(page,'register-device').click();await page.getByLabel('SN 码',{exact:true}).fill('00000474204126010000027');await page.getByLabel('设备型号',{exact:true}).fill('W2');
  await page.evaluate(()=>{const key='eureka:workspaces:v2',data=JSON.parse(localStorage.getItem(key)!);data.spaces.find((w:{id:string})=>w.id==='team-eureka').members.find((m:{id:string})=>m.id==='kevin').status='removed';localStorage.setItem(key,JSON.stringify(data));});
  await page.getByRole('button',{name:'保存并绑定',exact:true}).click();await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('数据已更新');
  await expect(page.getByLabel('SN 码',{exact:true})).toHaveValue('00000474204126010000027');
});

test('manual device form fits a laptop and phone and stores leading zeroes',async({page})=>{
  await switchTo(page,'team-eureka');await page.locator('#ws-actor').selectOption('kevin');await action(page,'page','devices').click();
  await action(page,'register-device').click();
  for(const [width,height] of [[1366,768],[390,844]]){
    await page.setViewportSize({width,height});await expect(page.getByRole('button',{name:'保存并绑定',exact:true})).toBeInViewport({ratio:1});
    expect(await page.locator('#ws-dialog').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(3);
  }
  await page.getByLabel('SN 码',{exact:true}).fill('00000474204126010000027');await page.getByLabel('设备型号',{exact:true}).fill('W2');
  await page.getByRole('button',{name:'保存并绑定',exact:true}).click();
  await expect(page.locator('#ws-view')).toContainText('00000474204126010000027');
  await page.setViewportSize({width:1366,height:768});await page.screenshot({path:'/tmp/eureka-manual-device-list.png'});
  await action(page,'register-device').click();await page.screenshot({path:'/tmp/eureka-manual-device-form.png'});
});


test('device binding guide routes to app and shop without changing device ownership',async({page,context})=>{
  await page.setViewportSize({width:1440,height:900});await switchTo(page,'team-eureka');await section(page,'devices');
  const snapshot=()=>page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('eureka:workspaces:v2')!).devices));const before=await snapshot();
  await action(page,'bind').click();const guide=page.locator('#ws-dialog');await expect(guide).toContainText('已经有设备？');await expect(guide).toContainText('还没有设备？');await expect(guide.locator('select,[type=submit]')).toHaveCount(0);
  for(const image of await guide.locator('img').all())await expect.poll(()=>image.evaluate(e=>(e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  if(process.env.PRD_CAPTURE)await page.screenshot({path:'src/prototype/prd/images/device-binding-guide.png'});
  for(const [name,url] of [['下载 App','https://eurekamind.ai/download'],['购买设备','https://eurekamind.ai/shop']]){
    const link=guide.getByRole('link',{name});await expect(link).toHaveAttribute('href',url);await context.route(url,route=>route.fulfill({body:'External destination preview'}));const opened=page.waitForEvent('popup');await link.click();const popup=await opened;await popup.waitForLoadState();expect(popup.url()).toBe(url);await popup.close();expect(await snapshot()).toBe(before);
  }
  await page.keyboard.press('Escape');await expect(guide).not.toBeVisible();expect(await snapshot()).toBe(before);
  await switchTo(page,'personal');await section(page,'devices');await action(page,'bind').click();await expect(guide).toContainText('个人工作空间');await page.keyboard.press('Escape');
  await page.evaluate(()=>{const k='eureka:workspaces:v2',d=JSON.parse(localStorage.getItem(k)!);d.devices=[];localStorage.setItem(k,JSON.stringify(d));});await page.reload();await section(page,'devices');await action(page,'bind').click();await expect(guide).toContainText('下载 App');await expect(guide.locator('[name=serial]')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});await guide.getByRole('link',{name:'购买设备'}).scrollIntoViewIfNeeded();await expect(guide.getByRole('link',{name:'购买设备'})).toBeInViewport({ratio:1});expect(await guide.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThan(2);await page.keyboard.press('Escape');
});
