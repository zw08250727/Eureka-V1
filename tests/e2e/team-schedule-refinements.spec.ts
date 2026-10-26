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
    const checkbox=confirm.getByRole('checkbox');
    const choice=checkbox.locator('xpath=..');
    const checkboxBox=(await checkbox.boundingBox())!;
    const copyBox=(await choice.locator('span').boundingBox())!;
    const dialogBox=(await confirm.boundingBox())!;
    expect(checkboxBox.width).toBeLessThan(24);
    expect(copyBox.width).toBeGreaterThan(dialogBox.width-120);
    expect(await confirm.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(2);
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
    await expect(revoke).toContainText('不再通过此日程共享获得查看权限');
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

  test(`${market}: calendar editor aligns place, participant, and team picker rows`,async({page})=>{
    await seed(page,market);await page.setViewportSize({width:1440,height:960});await page.goto(path(market));
    await page.locator('.pa-page-head [data-pa=edit]').click();
    const form=page.locator('#pa-edit-form');
    const locationBox=(await form.locator('[name=location]').boundingBox())!;
    const participantsBox=(await form.locator('[name=participants]').boundingBox())!;
    expect(Math.abs(locationBox.y-participantsBox.y)).toBeLessThan(2);
    const fields=form.locator('[data-calendar-schedule-fields]');
    const teamRow=form.locator('[data-calendar-team-participants]');
    await expect(fields).toBeVisible();
    await expect(teamRow).toBeVisible();
    const locationRadius=await form.locator('[name=location]').evaluate(el=>getComputedStyle(el).borderRadius);
    const memberSelect=teamRow.getByRole('combobox',{name:'选择团队参与人'});
    await expect(memberSelect).toHaveCSS('border-radius',locationRadius);
    await expect(teamRow.locator('small')).toHaveCSS('text-align','left');
    const locationHeight=(await form.locator('[name=location]').boundingBox())!.height;
    const memberSelectHeight=(await memberSelect.boundingBox())!.height;
    expect(Math.abs(locationHeight-memberSelectHeight)).toBeLessThan(2);
    const fieldsBox=(await fields.boundingBox())!,teamBox=(await teamRow.boundingBox())!;
    expect(Math.abs(fieldsBox.width-teamBox.width)).toBeLessThan(2);
    for(const width of [1440,1080,768,390]){
      await page.setViewportSize({width,height:892});
      expect(await form.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(2);
      expect(await fields.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(2);
      await page.screenshot({path:`test-results/calendar-editor-layout-${market}-team-${width}.png`,animations:'disabled'});
    }
  });

  test(`${market}: creating a team schedule keeps the sharing confirmation usable over the editor`,async({page})=>{
    await seed(page,market);
    await page.clock.setFixedTime(new Date('2026-10-19T09:00:00+08:00'));
    await page.setViewportSize({width:1216,height:1032});
    await page.goto(`/${market}/workbench/?view=calendar&space=team-eureka&actor=zhang`);
    await page.locator('.pa-page-head [data-pa=new-schedule]').click();
    const editor=page.locator('.pa-create-dialog');
    const form=editor.locator('#pa-edit-form');
    await form.locator('[name=title]').fill('新建团队日程共享验证');
    await form.getByRole('combobox',{name:'选择团队参与人'}).selectOption('kevin');
    await form.locator('button[type=submit]').click();
    const confirmation=page.getByRole('dialog',{name:'是否共享给参会人？'});
    await expect(confirmation).toBeVisible();
    await expect(confirmation.getByRole('checkbox',{name:/Kevin/})).toBeChecked();
    for(const width of [1216,390]) {
      await page.setViewportSize({width,height:844});
      const box=(await confirmation.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width).toBeLessThanOrEqual(width);
      expect(await confirmation.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(2);
      await confirmation.screenshot({path:`test-results/team-schedule-refinements/${market}-create-share-${width}.png`,animations:'disabled'});
    }
    await confirmation.getByRole('button',{name:'返回编辑'}).click();
    await expect(form.locator('[name=title]')).toHaveValue('新建团队日程共享验证');
    await expect(form.locator('[name=participants]')).toHaveValue(/Kevin/);
    await form.locator('button[type=submit]').click();
    await confirmation.getByRole('button',{name:'保存变更'}).click();
    const created=await page.evaluate(m=>JSON.parse(localStorage.getItem(`eureka:market:${m}:eureka:actions:team-eureka:zhang:v1`)!).records.find((r:{title:string})=>r.title==='新建团队日程共享验证'),market);
    expect(created?.participantIds).toEqual(['kevin']);
    expect(created?.sharedWith).toEqual(['kevin']);
  });
}
