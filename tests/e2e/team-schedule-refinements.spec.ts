import {test,expect,type Page} from '@playwright/test';
import M from '../../src/features/spaces/model/core';

async function seed(page:Page,market:string){
  const state=M.seed();
  const team=M.get(state,'team-eureka');team.name=`${market==='cn'?'百智':'EurekaMind'} 产品团队`;
  team.members.find(m=>m.id==='kevin')!.role='member';
  await page.addInitScript(({market,state})=>{
    const prefix=`eureka:market:${market}:`;
    localStorage.setItem(prefix+'eureka:auth:v1',JSON.stringify({market,realm:`eureka-${market}`,identity:'schedule-ui@example.com',provider:'email'}));
    if(!localStorage.getItem(prefix+'eureka:workspaces:v2'))localStorage.setItem(prefix+'eureka:workspaces:v2',JSON.stringify(state));
    const key=prefix+'eureka:actions:team-eureka:zhang:v1';
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,records:[{id:'team-schedule-ui',type:'schedule',title:'参与人共享验证',start:'2026-10-19T14:00',end:'2026-10-19T15:00',done:false,source:'manual',notes:'核对需求范围',reminder:'none',location:'线上会议',participants:'张伟',ownerId:'zhang',sharedWith:[],revision:1,created:'2026-10-18T08:00',updated:'seed',links:[]}],meetings:[],sessions:[],settings:{}}));
  },{market,state});
}
const path=(market:string)=>`/${market}/workbench/?view=calendar&space=team-eureka&actor=zhang&id=team-schedule-ui`;
async function stored(page:Page,market:string){return page.evaluate(m=>JSON.parse(localStorage.getItem(`eureka:market:${m}:eureka:actions:team-eureka:zhang:v1`)!).records.find((r:{id:string})=>r.id==='team-schedule-ui'),market);}

for(const market of ['cn','global']){
  test(`${market}: source-filter arrows never overflow search fields, member filters match and shared overview copy is role-neutral`,async({page})=>{
    await seed(page,market);await page.setViewportSize({width:1440,height:960});
    await page.goto(`/${market}/workbench/?view=home&space=personal`);
    await expect(page.locator('#meeting-search')).toBeVisible();
    await expect(page.locator('#meeting-toolbar .mf-control .ui-select-chevron')).toHaveCount(0);
    await expect(page.locator('label.meeting-search svg')).toHaveCount(1);
    await page.goto(`/${market}/workbench/?view=home&space=team-eureka`);
    await expect(page.locator('#ws-file-search')).toBeVisible();
    await expect(page.locator('.ws-meeting-tools .mf-control .ui-select-chevron')).toHaveCount(0);
    await expect(page.locator('.team-private-column h2')).toContainText('团队共享');
    await expect(page.locator('.team-private-column h2')).toContainText('成员日程与待办');
    await expect(page.locator('.team-private-column h2')).not.toContainText('管理员');
    const radius=await page.locator('#ws-meeting-status').evaluate(el=>getComputedStyle(el).borderRadius);
    await expect(page.locator('#ws-meeting-member')).toHaveCSS('border-radius',radius);
    await page.screenshot({path:`test-results/team-schedule-refinements/${market}-home.png`,animations:'disabled'});
    await page.goto(`/${market}/workbench/?view=contacts&space=team-eureka`);
    const source=page.getByRole('combobox',{name:'筛选客户来源'}),member=page.getByRole('combobox',{name:'筛选所属成员'});
    await expect(member).toHaveCSS('border-radius',await source.evaluate(el=>getComputedStyle(el).borderRadius));
  });

  test(`${market}: detail sharing is a toolbar button and related meetings show creators without summaries`,async({page})=>{
    await seed(page,market);await page.setViewportSize({width:1440,height:960});await page.goto(path(market));
    const share=page.locator('.pa-page-head > div:nth-child(2) [data-asset-sharing=button]');
    await expect(share).toHaveText('共享');
    expect((await share.boundingBox())!.height).toBeGreaterThanOrEqual(36);
    await share.click();await expect(page.getByRole('dialog',{name:'共享日程',exact:true})).toBeVisible();
    await page.getByRole('dialog').getByRole('button',{name:'取消',exact:true}).click();
    await page.locator('[data-pa=links]').click();const dialog=page.getByRole('dialog',{name:'关联会议',exact:true});
    await expect(dialog.getByRole('heading',{name:'关联会议',exact:true})).toBeVisible();
    await expect(dialog.locator('details')).toHaveCount(0);
    await expect(dialog).not.toContainText('展开总结');
    await expect(dialog).toContainText('会议创建人：');
    await expect(dialog.locator('.pa-meeting-choice').first().locator('small')).toHaveCount(1);
    await expect(dialog.locator('.pa-meeting-choice').first().locator('small')).toContainText(/网页录音.*会议创建人/);
    await dialog.screenshot({path:`test-results/team-schedule-refinements/${market}-meeting-links.png`,animations:'disabled'});
    await dialog.getByRole('checkbox').first().check();await dialog.getByRole('button',{name:'确认关联',exact:true}).click();
    await expect(page.locator('.pa-linked').first()).toContainText('会议创建人：');
    await page.screenshot({path:`test-results/team-schedule-refinements/${market}-detail.png`,animations:'disabled'});
    for (const width of [1126,390]) {
      await page.setViewportSize({width,height:892});await share.scrollIntoViewIfNeeded();
      const box=(await share.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
      await page.screenshot({path:`test-results/team-schedule-refinements/${market}-detail-${width}.png`,animations:'disabled'});
    }
  });

  test(`${market}: selecting a team participant saves and shares only after confirmation`,async({page})=>{
    await seed(page,market);await page.setViewportSize({width:1440,height:960});await page.goto(path(market));
    await page.locator('.pa-page-head [data-pa=edit]').click();
    await page.locator('#pa-edit-form [name=participants]').fill('外部联系人李先生');
    await page.getByRole('combobox',{name:'选择团队参与人'}).selectOption('kevin');
    await expect(page.locator('#pa-edit-form [name=participants]')).toHaveValue('外部联系人李先生、Kevin');
    await page.locator('#pa-edit-form button[type=submit]').click();
    const confirm=page.getByRole('dialog',{name:'是否共享给参会人？'});
    await expect(confirm).toContainText('Kevin');expect((await stored(page,market)).sharedWith).toEqual([]);
    await confirm.screenshot({path:`test-results/team-schedule-refinements/${market}-participant-share.png`,animations:'disabled'});
    await confirm.getByRole('button',{name:'保存变更',exact:true}).click();
    await expect(page.locator('#pa-edit-form')).toHaveCount(0);
    const record=await stored(page,market);expect(record.participantIds).toEqual(['kevin']);expect(record.sharedWith).toEqual(['kevin']);
    await page.reload();await page.locator('.pa-page-head [data-pa=edit]').click();
    await expect(page.locator('#pa-edit-form [name=participants]')).toHaveValue('外部联系人李先生、Kevin');
    await page.locator('#pa-edit-form button[type=submit]').click();
    await expect(page.getByRole('dialog',{name:'是否共享给参会人？'})).toHaveCount(0);
    await page.locator('.pa-page-head [data-pa=edit]').click();
    await page.getByRole('button',{name:'移除参与人 Kevin'}).click();
    await page.locator('#pa-edit-form button[type=submit]').click();
    const revoke=page.getByRole('dialog',{name:'是否撤销参会人共享？'});
    await expect(revoke.getByRole('checkbox',{name:/撤销已移除参会人的访问权限：Kevin/})).toBeChecked();
    await revoke.getByRole('button',{name:'保存变更'}).click();
    expect((await stored(page,market)).participantIds).toEqual([]);
    expect((await stored(page,market)).sharedWith).toEqual([]);
  });

  test(`${market}: return to edit preserves input and save-only never grants permission`,async({page})=>{
    await seed(page,market);await page.goto(path(market));await page.locator('.pa-page-head [data-pa=edit]').click();
    await page.getByRole('combobox',{name:'选择团队参与人'}).selectOption('kevin');
    await page.locator('#pa-edit-form button[type=submit]').click();const confirm=page.getByRole('dialog',{name:'是否共享给参会人？'});
    await confirm.getByRole('button',{name:'返回编辑',exact:true}).click();
    await expect(page.locator('#pa-edit-form [name=participants]')).toHaveValue('张伟、Kevin');
    await page.setViewportSize({width:390,height:844});
    await page.locator('#pa-edit-form button[type=submit]').click();
    const box=(await confirm.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
    await confirm.screenshot({path:`test-results/team-schedule-refinements/${market}-participant-mobile.png`,animations:'disabled'});
    await confirm.getByRole('checkbox',{name:/将此日程共享给新增参会人：Kevin/}).uncheck();
    await confirm.getByRole('button',{name:'保存变更',exact:true}).click();
    const record=await stored(page,market);expect(record.participantIds).toEqual(['kevin']);expect(record.sharedWith).toEqual([]);
  });
}
