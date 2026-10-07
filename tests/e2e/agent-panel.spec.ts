import {test,expect,Page} from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const url='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
async function inspect(page:Page,selector:string,name:string,width:number,height:number){
 await page.setViewportSize({width,height});const rail=page.locator(selector);await expect(rail).toBeVisible();const input=rail.locator('textarea').first();await input.focus();
 expect(await input.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none');expect(await input.evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('none');
 expect(await input.evaluate(el=>getComputedStyle(el).fontSize)).toBe('14px');
 const box=(await input.boundingBox())!;expect(box.y).toBeGreaterThan(0);expect(box.y+box.height).toBeLessThan(height);
 await expect(rail.getByRole('button',{name:'新建任务',exact:true})).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 await expect(rail.getByRole("combobox",{name:"回答模式"})).toHaveCount(0);
 const row=rail.locator(".agent-composer-toolbar,.pa-composer-tools,.ws-composer-tools,.xiaozhi-composer-foot").first();const send=row.locator("button").last();const first=row.locator("button,.xiaozhi-context").first();expect(Math.abs((await send.boundingBox())!.y-(await first.boundingBox())!.y)).toBeLessThan(3);
 if(process.env.PRD_CAPTURE && width!==1280){await expect(page.locator("#toast")).not.toHaveClass(/show/);await expect(page.locator("#ws-toast")).toBeHidden();await page.mouse.move(280,80);await page.screenshot({path:`src/prototype/prd/images/agent-unified-${name}-${width}.png`});}
}
for(const [width,height] of [[1440,900],[1280,650],[1080,680]])test(`Agent panels share readable composer and remain usable at ${width}`,async({page})=>{
 await page.setViewportSize({width:1440,height});await page.goto(url);await page.locator('#xiaozhi-entry').click();await inspect(page,'#xiaozhi-rail','home',width,height);
 await page.setViewportSize({width:1440,height});await page.locator('#history-task-list .history-row').first().click();await expect(page.locator('#agent-history-messages .user').first()).toBeInViewport();expect(await page.locator('#agent-history-messages').evaluate(el=>el.scrollTop)).toBe(0);await inspect(page,'#xiaozhi-rail','history',width,height);
 await page.locator('#xiaozhi-input').fill('继续整理行动项');await page.locator('#xiaozhi-input').press('Enter');await expect(page.locator('#agent-history-messages')).toContainText('继续整理行动项');
 await page.setViewportSize({width:1440,height});await page.locator('#todos-entry').click();await page.locator('#personal-actions [data-pa=agent]').click();await inspect(page,'#pa-agent','calendar',width,height);await page.locator('#pa-prompt').fill('汇总今天安排');await page.locator('#pa-prompt').press('Enter');await expect(page.locator('#pa-agent .pa-message')).toHaveCount(1);
 await page.setViewportSize({width:1440,height});await page.locator('[data-contacts-entry]').click();await page.locator('.contacts-xiaozhi-entry').click();await inspect(page,'#contacts-xiaozhi-rail','contacts',width,height);const ci=page.locator('[data-contact-xiaozhi-input]');await ci.fill('准备下次沟通');await ci.press('Enter');await expect(ci).toHaveValue('');
 await page.setViewportSize({width:1440,height});await page.locator('#ws-switcher').click();await page.locator('#ws-menu [data-value=team-eureka]').click();await page.locator('#ws-history [data-ws-action=history]').first().click();await inspect(page,'.ws-agent','team',width,height);
});
