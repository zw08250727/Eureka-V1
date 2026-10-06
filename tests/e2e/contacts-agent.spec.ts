import {expect,test} from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL || undefined});
const url='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
test.beforeEach(async ({page})=>{
  await page.goto(url);
  await page.locator('[data-contacts-entry]').click();
});
test('contacts and Agent fill the workspace without reserved blank space or overlap',async ({page})=>{
  const view=page.locator('[data-main-view=contacts]');
  const rail=page.locator('#contacts-xiaozhi-rail');
  for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1280,650],[1024,768],[390,844]]){
    await page.setViewportSize({width,height});
    const before=(await view.boundingBox())!;
    await page.locator('.contacts-xiaozhi-entry').click();
    await expect(rail).toBeVisible();
    await expect(rail.locator('[data-contact-xiaozhi-input]')).toBeInViewport({ratio:1});
    await expect(rail.locator('[data-contact-action=send-xiaozhi]')).toBeInViewport({ratio:1});
    await expect.poll(async()=>{
      const box=(await view.boundingBox())!;
      return Math.round(height-box.y-box.height);
    }).toBe(16);
    const after=(await view.boundingBox())!, chat=(await rail.boundingBox())!;
    expect(after.width).toBeCloseTo(before.width,0);
    expect(Math.abs(chat.x+chat.width-after.x-after.width)).toBeLessThan(3);
    if(width>1000){
      const content=(await page.locator('.contacts-content').boundingBox())!;
      expect(content.x+content.width).toBeLessThanOrEqual(chat.x+1);
    }
    const mainHeight=await page.locator('.main').evaluate(el=>el.scrollHeight-el.clientHeight);
    expect(mainHeight).toBeLessThanOrEqual(2);
    await rail.locator('[data-contact-action=toggle-xiaozhi]').click();
    await expect(rail).toBeHidden();
  }
});
test('list and detail scroll independently; Agent draft survives searching and collapsing',async ({page})=>{
  await page.setViewportSize({width:1366,height:650});
  await page.locator('.contacts-xiaozhi-entry').click();
  const input=page.locator('[data-contact-xiaozhi-input]');
  await input.fill('帮我准备下一次沟通');
  await page.locator('#contacts-search').fill('John');
  await expect(input).toHaveValue('帮我准备下一次沟通');
  await page.locator('#contacts-xiaozhi-rail [data-contact-action=toggle-xiaozhi]').click();
  await page.locator('.contacts-xiaozhi-entry').click();
  await expect(input).toHaveValue('帮我准备下一次沟通');
  await page.locator('[data-contact-action=send-xiaozhi]').click();
  await expect(page.locator('.contacts-xiaozhi-answer')).toContainText('德国经销商名单');
  await expect(input).toHaveValue('');
  await page.locator('.contacts-person-card').first().click();
  await expect(page.locator('.contacts-profile')).toContainText('John Chen');
  await page.locator('.contacts-content').evaluate(el=>{el.scrollTop=el.scrollHeight});
  await expect(input).toBeInViewport({ratio:1});
  await expect(page.locator('#contacts-xiaozhi-rail [data-contact-action=toggle-xiaozhi]')).toBeInViewport({ratio:1});
  await page.locator('#contacts-xiaozhi-rail [data-contact-action=toggle-xiaozhi]').click();
  await expect(page.locator('.contacts-profile')).toContainText('John Chen');
});
