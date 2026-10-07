import {test,expect,Page} from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const url='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
const key='eureka:workspaces:v2';
const act=(p:Page,name:string,value?:string)=>p.locator(`[data-ws-action="${name}"]${value?`[data-value="${value}"]`:''}`).filter({visible:true}).first();
async function team(p:Page,id='team-eureka'){await p.locator('#ws-switcher').click();await act(p,'switch',id).click();}
async function settings(p:Page){await act(p,'page','billing').click();await act(p,'page','settings').click();}
async function capture(p:Page,name:string){if(process.env.PRD_CAPTURE)await p.screenshot({path:`src/prototype/prd/images/${name}.png`});}
async function stored(p:Page){return p.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);}
test('ordinary member exits from members, preserves team balance and personal plan, and disappears after reload',async({page})=>{
 await page.goto(url);await page.locator('#ws-switcher').click();await capture(page,'workspace-menu');await page.locator('#ws-switcher').click();await team(page,'team-design');await act(page,'page','members').click();
 await expect(act(page,'dissolve')).toHaveCount(0);
 const before=await stored(page);await act(page,'leave').click();
 await expect(page.locator('#ws-dialog')).toContainText('不自动退款或减席');await expect(page.locator('#ws-dialog')).toContainText('不能带走');
 await capture(page,'team-leave-confirm');await act(page,'close-dialog').click();expect(await stored(page)).toEqual(before);
 await act(page,'leave').click();await page.locator('#ws-dialog [type=submit]').click();
 await expect(page.locator('#ws-switcher')).toContainText('个人工作空间');
 const after=await stored(page),oldTeam=before.spaces.find((s:{id:string})=>s.id==='team-design'),newTeam=after.spaces.find((s:{id:string})=>s.id==='team-design');
 expect(newTeam.seats).toBe(oldTeam.seats);expect(newTeam.credits).toEqual(oldTeam.credits);expect(newTeam.renew).toBe(oldTeam.renew);expect(newTeam.files).toEqual(oldTeam.files);
 expect(newTeam.members.find((m:{id:string})=>m.id==='zhang').status).toBe('removed');
 expect(after.spaces.find((s:{id:string})=>s.id==='personal')).toEqual(before.spaces.find((s:{id:string})=>s.id==='personal'));
 await page.reload();await page.locator('#ws-switcher').click();await expect(act(page,'switch','team-design')).toHaveCount(0);await expect(page.locator('#ws-menu')).not.toContainText('Team Unlimited');
});
test('last administrator is guided to assign another admin before leaving',async({page})=>{
 await page.goto(url);await team(page);await act(page,'page','members').click();await act(page,'member-role','lin').click();
 await page.locator('#ws-dialog [name=role]').selectOption('member');await page.locator('#ws-dialog [type=submit]').click();
 await act(page,'leave').click();await expect(page.locator('#ws-dialog')).toContainText('唯一管理员');await expect(page.locator('#ws-dialog [type=submit]')).toHaveCount(0);await capture(page,'team-leave-handover');
 await act(page,'exit-members').click();await act(page,'member-role','kevin').click();await page.locator('#ws-dialog [name=role]').selectOption('admin');await page.locator('#ws-dialog [type=submit]').click();
 await act(page,'leave').click();await page.locator('#ws-dialog [type=submit]').click();await expect(page.locator('#ws-switcher')).toContainText('个人工作空间');
});
test('dissolution confirms the exact name, freezes balances, revokes access across tabs and retains a downloadable receipt',async({page,context})=>{
 await page.setViewportSize({width:1366,height:900});await page.goto(url);await team(page);await page.locator('#ws-switcher').click();await capture(page,'workspace-switcher-team');await page.locator('#ws-switcher').click();await act(page,'page','members').click();await capture(page,'members');await settings(page);await capture(page,'team-lifecycle-settings');await capture(page,'team-settings');
 const second=await context.newPage();await second.goto(url);await expect(second.locator('#ws-switcher')).toContainText('产品团队');
 const before=await stored(page);await act(page,'dissolve').click();await capture(page,'team-dissolve-confirm');
 await page.locator('#ws-dialog [name=confirmName]').fill('错误团队');await page.locator('#ws-dialog [type=submit]').click();await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('名称不一致');expect(await stored(page)).toEqual(before);
 await page.locator('#ws-dialog [name=confirmName]').fill('EurekaMind 产品团队');await page.locator('#ws-dialog [type=submit]').click();
 await expect(page.locator('#ws-dialog')).toContainText('团队已解散');await expect(second.locator('#ws-switcher')).toContainText('个人工作空间');await capture(page,'team-dissolve-complete');
 const state=await stored(page),ended=state.spaces.find((s:{id:string})=>s.id==='team-eureka');expect(ended.status).toBe('dissolved');expect(ended.renew).toBe(false);expect(ended.closure.frozenCredits).toBe(37600);expect(ended.members.every((m:{status:string})=>m.status==='removed')).toBe(true);
 expect(ended.credits).toEqual(before.spaces.find((s:{id:string})=>s.id===ended.id).credits);
 const downloaded=page.waitForEvent('download');await act(page,'closure-receipt').click();expect((await downloaded).suggestedFilename()).toContain('解散结算记录');
 await act(page,'close-dialog').click();await page.reload();await page.locator('#user-card').click();await act(page,'page','billing').click();await expect(page.locator('#ws-view')).toContainText('团队解散结算记录');await expect(act(page,'closure-receipt')).toBeVisible();
 await page.locator('#ws-switcher').click();await expect(act(page,'switch','team-eureka')).toHaveCount(0);await expect(act(page,'switch','team-design')).toBeVisible();await second.close();
});
test('failed local persistence leaves the whole team intact and keeps the confirmation editable',async({page})=>{
 await page.goto(url);await team(page);await settings(page);await act(page,'dissolve').click();await page.locator('#ws-dialog [name=confirmName]').fill('EurekaMind 产品团队');const before=await stored(page);
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='eureka:workspaces:v2')throw new DOMException('Full','QuotaExceededError');return original.call(this,k,v);};});
 await page.locator('#ws-dialog [type=submit]').click();await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('存储空间不足');await expect(page.locator('#ws-dialog [name=confirmName]')).toHaveValue('EurekaMind 产品团队');expect(await stored(page)).toEqual(before);await expect(page.locator('#ws-switcher')).toContainText('产品团队');
});
test('stale confirmation rejects a changed team snapshot without overwriting it',async({page})=>{
 await page.goto(url);await team(page);await settings(page);await act(page,'dissolve').click();await page.locator('#ws-dialog [name=confirmName]').fill('EurekaMind 产品团队');
 await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)!);s.spaces.find((w:{id:string})=>w.id==='team-eureka').credits.total+=100;localStorage.setItem(k,JSON.stringify(s));},key);
 await page.locator('#ws-dialog [type=submit]').click();await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('其他页面更新');const s=await stored(page);expect(s.spaces.find((w:{id:string})=>w.id==='team-eureka').status).toBe('active');
});
test('expired teams can be dissolved and confirmation stays usable on small screens',async({page})=>{
 await page.goto(url);await team(page);await act(page,'page','billing').click();await act(page,'expire').click();await act(page,'confirm').click();await act(page,'page','settings').click();await act(page,'dissolve').click();
 for(const [width,height] of [[1280,650],[390,844]]){await page.setViewportSize({width,height});await page.locator('#ws-dialog [type=submit]').scrollIntoViewIfNeeded();await expect(page.locator('#ws-dialog [type=submit]')).toBeInViewport();expect(await page.locator('#ws-dialog').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(3);}
 await page.locator('#ws-dialog [name=confirmName]').fill('EurekaMind 产品团队');await page.locator('#ws-dialog [type=submit]').click();await expect(page.locator('#ws-dialog')).toContainText('团队已解散');
});
