import {test,expect} from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const url='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
test('calendar Agent stays aligned, fills the viewport and uses the common composer controls',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto(url);await page.locator('#todos-entry').click();
  const main=page.locator('.main'),root=page.locator('#personal-actions'),rail=page.locator('#pa-agent');
  const before=(await root.boundingBox())!.y;
  await root.locator('[data-pa=agent]').click();
  await expect(rail).toBeVisible();expect((await root.boundingBox())!.y).toBe(before);
  const input=rail.locator('#pa-prompt'),send=rail.getByRole('button',{name:'发送问题'});
  await expect(send).toBeDisabled();await expect(rail.getByRole('button',{name:'引用日程与待办'})).toBeVisible();await expect(rail.getByRole('button',{name:'联网搜索'})).toBeVisible();
  for(const height of [1000,1400,650]){
    await page.setViewportSize({width:1440,height});
    await expect.poll(async()=>{const r=(await rail.boundingBox())!,c=(await page.locator('.pa-content').boundingBox())!;return Math.abs(r.y-c.y);}).toBeLessThan(2);
    await expect.poll(async()=>{const r=(await rail.boundingBox())!,m=(await main.boundingBox())!;return Math.abs(m.y+m.height-r.y-r.height-16);}).toBeLessThan(2);
    await expect(input).toBeInViewport({ratio:1});await expect(send).toBeInViewport({ratio:1});
    expect(await main.evaluate(el=>el.scrollTop)).toBe(0);
  }
  await page.setViewportSize({width:1440,height:1000});await input.focus();expect(await input.evaluate(el=>getComputedStyle(el).borderWidth)).toBe('0px');expect(await input.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none');expect(await input.evaluate(el=>getComputedStyle(el).resize)).toBe('none');
  if(process.env.PRD_CAPTURE)await page.screenshot({path:'src/prototype/prd/images/personal-calendar-agent.png'});
  await rail.getByRole('button',{name:'引用日程与待办'}).click();const dialog=page.locator('.pa-dialog');await dialog.locator('[name=agentSources][value=calendar-todo-demo]').check();await dialog.getByRole('button',{name:'确认引用'}).click();await expect(rail.locator('#pa-agent-scope')).toContainText('1 条');
  await rail.getByRole('button',{name:'联网搜索'}).click();await input.fill('整理所选待办');await expect(send).toBeEnabled();await input.press('Enter');
  await expect(rail.locator('#pa-agent-result')).toContainText('准备客户 Demo 环境');await expect(rail.locator('#pa-agent-result')).not.toContainText('产品方案评审');await expect(rail.locator('#pa-agent-result')).toContainText('未连接外部搜索');await expect(input).toHaveValue('');await expect(send).toBeDisabled();
  await input.fill('还有哪些安排？');await input.press('Shift+Enter');await expect(rail.locator('.pa-message')).toHaveCount(1);await input.press('Enter');await expect(rail.locator('.pa-message')).toHaveCount(2);expect(await main.evaluate(el=>el.scrollTop)).toBe(0);
  const y=(await rail.boundingBox())!.y;await page.locator('.pa-content').evaluate(el=>el.scrollTop=300);expect((await rail.boundingBox())!.y).toBe(y);await expect(input).toBeInViewport({ratio:1});
  for(const width of [1280,1024,390]){await page.setViewportSize({width,height:844});await expect(input).toBeInViewport({ratio:1});await expect(send).toBeInViewport({ratio:1});await expect(rail.getByRole('button',{name:'收起 Ask Agent'})).toBeInViewport({ratio:1});expect(await root.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(2);}
  await rail.getByRole('button',{name:'收起 Ask Agent'}).click();await expect(rail).toBeHidden();await expect(root.locator('.pa-calendar')).toBeVisible();
});
