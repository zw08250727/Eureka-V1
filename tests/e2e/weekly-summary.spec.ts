import {test,expect,type Page} from '@playwright/test';
import M from '../../src/features/spaces/model/core';
import type {WorkspaceFile} from '../../src/features/spaces/model/types';
test.use({timezoneId:'Asia/Shanghai'});
async function seed(page:Page,market:string,expired=false,emptyWeek=false){
  const state=M.seed(new Date('2026-10-20T04:00:00Z')),w=M.get(state,'team-eureka');
  w.name=`${market==='cn'?'百智':'EurekaMind'} 产品团队`;w.members.find(m=>m.id==='kevin')!.role='member';
  const file=(id:string,title:string,created:string,summary:string):WorkspaceFile=>({id,title,created,summary,owner:'zhang',shared:['kevin'],duration:20,updated:created,source:'网页录音',transcript:summary,deleted:false,size:'10 MB',creator:'张伟',status:'已总结',tags:[],detail:{}});
  w.files=[file('weekly-discussion','CRM接入方案评审','2026-10-13 10:00','本次记录确认需要先核对接口字段与范围。'),file('weekly-progress','项目进展同步','2026-10-14 10:00','协作各方记录了当前进展与待补充资料。'),file('weekly-review','阶段沟通复盘','2026-10-18 10:00','回顾已有进展，保留尚未解决的问题。'),{...file('weekly-private','内部未共享记录','2026-10-16 10:00','仅本人和管理员可查看。'),owner:'lin',shared:[],creator:'林晓'},file('weekly-next','本周尚未纳入的会议','2026-10-19 10:00','此记录属于下一期周总结。')];
  if(emptyWeek)w.files=[];
  if(expired)w.status='expired';
  await page.addInitScript(({market,state})=>{
    const prefix=`eureka:market:${market}:`;
    localStorage.setItem(prefix+'eureka:auth:v1',JSON.stringify({market,realm:`eureka-${market}`,identity:'weekly@example.com',provider:'email'}));
    if(!localStorage.getItem(prefix+'eureka:workspaces:v2'))localStorage.setItem(prefix+'eureka:workspaces:v2',JSON.stringify(state));
  },{market,state});
  await page.clock.setFixedTime(new Date('2026-10-20T12:00:00+08:00'));
}
for(const market of ['cn','global']) {
  test(`${market}: team overview typography uses the shared Chinese workbench font`,async({page})=>{
    await seed(page,market);await page.goto(`/${market}/workbench/?view=home&space=team-eureka`);
    const font=await page.locator('.team-overview').evaluate(el=>getComputedStyle(el).fontFamily);
    expect(font).toContain('MiSans');
    await expect(page.locator('.team-overview-actions button').first()).toHaveCSS('font-family',font);
  });
  test(`${market}: overview hides weekly actions when the selected week has no meetings`,async({page})=>{
    await seed(page,market,false,true);
    await page.goto(`/${market}/workbench/?view=home&space=team-eureka`);
    const area=page.getByRole('region',{name:'周度会议总结',exact:true});
    await expect(area).toContainText('该周暂无有权查看的会议记录');
    await expect(area.getByRole('button',{name:'查看详情',exact:true})).toHaveCount(0);
    await expect(area.getByRole('button',{name:'基于本周总结问 Agent',exact:true})).toHaveCount(0);
  });
  test(`${market}: weekly overview generalizes meeting types and detail exposes only that completed week`,async({page})=>{
    await seed(page,market);await page.setViewportSize({width:1440,height:960});
    await page.goto(`/${market}/workbench/?view=home&space=team-eureka`);
    const area=page.getByRole('region',{name:'周度会议总结',exact:true});
    await expect(page.locator('.team-overview-canvas')).toHaveCSS('height','280px');
    await expect(area).toContainText('10/12—10/18');
    await expect(area.getByRole('button',{name:'查看详情',exact:true})).toHaveCount(1);
    await expect(area.getByRole('button',{name:'基于本周总结问 Agent',exact:true})).toBeVisible();
    await expect(area).toContainText('CRM接入方案');
    await expect(area).toContainText('项目进展');
    await expect(area).toContainText('阶段沟通');
    expect(await area.locator('h3').allTextContents()).not.toContain('讨论与评审');
    await page.screenshot({path:`test-results/weekly-summary/${market}-overview.png`,animations:'disabled'});
    await area.getByRole('button',{name:'查看详情',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'周度会议总结详情'});
    await expect(dialog).toContainText('2026/10/12—2026/10/18');
    await expect(dialog).toContainText('本次记录确认需要先核对接口字段与范围');
    await expect(dialog.getByRole('link',{name:/CRM接入方案评审/})).toHaveAttribute('href',/view=meeting.*weekly-discussion/);
    await dialog.getByRole('button',{name:'全部议题',exact:true}).click();
    await expect(dialog).toContainText('项目进展同步');await expect(dialog).not.toContainText('本周尚未纳入的会议');
    await dialog.screenshot({path:`test-results/weekly-summary/${market}-detail.png`,animations:'disabled'});
    await dialog.getByRole('combobox',{name:'选择总结周'}).selectOption('2026-08-24');
    await expect(dialog).toContainText('该周暂无有权查看的会议记录');
    await dialog.getByRole('combobox',{name:'选择总结周'}).selectOption('2026-10-12');
    await dialog.getByRole('button',{name:'基于该周总结问 Agent',exact:true}).click();
    const agent=page.getByRole('complementary',{name:'Ask Agent',exact:true});
    await expect(agent).toBeVisible();await expect(agent.getByRole('textbox')).toHaveValue(/2026\/10\/12—2026\/10\/18/);
    await expect(agent).toContainText('已引用 4 场会议');
    await page.screenshot({path:`test-results/weekly-summary/${market}-agent.png`,animations:'disabled'});
  });
  test(`${market}: overview rolls to the next completed week on Monday and details fit 1126 and 390`,async({page})=>{
    await seed(page,market);await page.goto(`/${market}/workbench/?view=home&space=team-eureka`);
    const area=page.getByRole('region',{name:'周度会议总结',exact:true});
    await expect(area).toContainText('10/12—10/18');
    await page.clock.setFixedTime(new Date('2026-10-26T00:00:00+08:00'));
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(area).toContainText('10/19—10/25');
    await area.getByRole('button',{name:'查看详情',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'周度会议总结详情'});
    await expect(dialog).toContainText('本周尚未纳入的会议');
    await expect(dialog).not.toContainText('CRM接入方案评审');
    for(const width of [1126,390]){
      await page.setViewportSize({width,height:892});
      await expect(page.locator('.team-overview-canvas')).toHaveCSS('height',width<=760?'640px':'280px');
      const box=(await dialog.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.height).toBeLessThanOrEqual(868);
      await dialog.screenshot({path:`test-results/weekly-summary/${market}-detail-${width}.png`,animations:'disabled'});
    }
  });
  test(`${market}: ordinary members never receive private weekly sources and expired teams cannot open summaries`,async({page})=>{
    await seed(page,market);await page.goto(`/${market}/workbench/?view=home&space=team-eureka&actor=kevin&review=1`);
    const area=page.getByRole('region',{name:'周度会议总结',exact:true});
    await area.getByRole('button',{name:'查看详情',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'周度会议总结详情'});
    await expect(dialog).toContainText('CRM接入方案评审');await expect(dialog).not.toContainText('内部未共享记录');
    await dialog.getByRole('button',{name:'关闭周总结详情'}).click();
    await page.evaluate(m=>{const key=`eureka:market:${m}:eureka:workspaces:v2`;const data=JSON.parse(localStorage.getItem(key)!);data.spaces.find((w:{id:string})=>w.id==='team-eureka').status='expired';localStorage.setItem(key,JSON.stringify(data));},market);
    await page.reload();await expect(area).toContainText('周度总结暂不可用');
    await expect(area.getByRole('button')).toHaveCount(0);
  });
}
