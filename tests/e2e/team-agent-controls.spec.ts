import {test,expect,Page} from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const url='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
async function team(page:Page){await page.goto(url);await page.locator('#ws-switcher').click();await page.locator('#ws-menu [data-value=team-eureka]').click();}
const action=(p:Page,a:string)=>p.locator(`[data-ws-action="${a}"]`).filter({visible:true}).first();
test('own history deletion persists and automatic tasks can be configured and run',async({page})=>{
  await team(page);await expect(page.locator('#ws-history [data-ws-action=history]')).toHaveCount(1);
  await expect(page.locator('#ws-history')).not.toContainText('林晓');await expect(page.locator('#ws-history')).not.toContainText('Kevin');
  await action(page,'history').click();await page.locator('.ws-composer textarea').fill('继续分析');await page.locator('.ws-composer [type=submit]').click();
  await expect(page.locator('.ws-chat-user')).toHaveCount(2);await expect(page.locator('#ws-history [data-ws-action=history]')).toHaveCount(1);
  const row=page.locator('.ws-history-row').filter({has:page.locator('[data-ws-action=history]')});await row.hover();await action(page,'history-delete').click();await action(page,'confirm').click();
  await expect(page.locator('.ws-agent')).toHaveCount(0);await page.reload();await expect(page.locator('#ws-history [data-ws-action=history]')).toHaveCount(0);
  await page.locator('#ws-history [data-value=scheduled]').click();await expect(page.locator('#ws-history [data-ws-action=auto-task]')).toHaveCount(2);
  await action(page,'auto-task').click();await action(page,'auto-toggle').click();await expect(action(page,'auto-run')).toBeDisabled();await action(page,'auto-toggle').click();
  await page.locator('#ws-dialog [name=title]').fill('每周会议决策整理');await page.locator('#ws-dialog [type=submit]').click();
  await action(page,'auto-task').click();await action(page,'auto-run').click();await expect(page.locator('.ws-agent-history-context')).toContainText('每周会议决策整理');await expect(page.locator('.ws-chat-answer')).toContainText('本地模拟');
  await page.reload();await expect(page.locator('#ws-history')).toContainText('每周会议决策整理');
  await page.locator('#ws-actor').selectOption('lin');await expect(page.locator('#ws-history')).not.toContainText('每周会议决策整理');await expect(page.locator('#ws-history [data-ws-action=history]')).toHaveCount(2);
});
test('composer tools, borderless focus and responsive pointer/keyboard resizing',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:900});await team(page);await action(page,'agent').click();
  const input=page.locator('.ws-composer textarea');await input.focus();expect(await input.evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('none');
  await expect(page.locator('.ws-composer [type=submit]')).toBeDisabled();await action(page,'agent-sources').click();
  await page.locator('#ws-dialog input[value=team-demo-design]').check();await page.locator('#ws-dialog input[name=appData]').check();await page.locator('#ws-dialog [type=submit]').click();
  await action(page,'agent-web').click();await input.fill('梳理这场会议的决策');await input.press('Enter');
  await expect(page.locator('.ws-chat-answer')).toContainText('未连接外部搜索');await expect(page.locator('.ws-chat-answer')).toContainText('已引用会议应用数据');
  const rail=page.locator('#ws-view .ws-agent'),handle=rail.getByRole('separator');const before=(await rail.boundingBox())!;const h=(await handle.boundingBox())!;
  await page.mouse.move(h.x+4,h.y+150);await page.mouse.down();await page.mouse.move(h.x-130,h.y+150,{steps:12});await page.mouse.up();expect((await rail.boundingBox())!.width).toBeGreaterThan(before.width+100);
  await handle.focus();await handle.press('ArrowRight');expect((await rail.boundingBox())!.width).toBeLessThan(before.width+130);
  for(const width of [1920,1280,900,640]){await page.setViewportSize({width,height:760});await expect(input).toBeInViewport({ratio:1});await expect(page.locator('.ws-composer [type=submit]')).toBeInViewport({ratio:1});expect(await page.locator('.main').evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThan(3);}
  await page.setViewportSize({width:1440,height:900});await page.reload();await action(page,'history').click();expect((await rail.boundingBox())!.width).toBeGreaterThan(440);
  if(process.env.PRD_CAPTURE){await expect(page.locator('#ws-toast')).toBeHidden();await page.screenshot({path:'src/prototype/prd/images/team-history-agent.png'});await page.locator('#ws-history [data-value=scheduled]').click();await action(page,'auto-task').click();await page.screenshot({path:'src/prototype/prd/images/team-automatic-task.png'});}
  expect(errors).toEqual([]);
});
test('personal and meeting detail Agent panels share resizing',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto(url);await page.locator('#xiaozhi-entry').click();const personal=page.locator('#xiaozhi-rail');const before=(await personal.boundingBox())!.width;
  await personal.getByRole('separator').focus();await personal.getByRole('separator').press('ArrowLeft');await expect.poll(async()=>(await personal.boundingBox())!.width).toBeGreaterThan(before);
  await page.locator('#ws-switcher').click();await page.locator('#ws-menu [data-value=team-eureka]').click();await page.locator('[data-ws-action=file][data-value=team-demo-pilot]').first().click();await page.locator('[data-md-action=ask]').click();
  const rail=page.locator('#md-agent-host .ws-agent'),width=(await rail.boundingBox())!.width;await rail.getByRole('separator').focus();await rail.getByRole('separator').press('ArrowLeft');expect((await rail.boundingBox())!.width).toBeGreaterThan(width);await expect(rail.locator('textarea')).toBeInViewport({ratio:1});
});
