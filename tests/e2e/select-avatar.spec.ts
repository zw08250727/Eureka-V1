import {expect,test} from '@playwright/test';
const url=(view='settings',space='personal')=>`/workbench/?view=${view}&space=${space}&actor=zhang`;
test('shared select supports pointer, keyboard, typeahead, dismiss and saving',async({page})=>{
 await page.goto(url());const identity=page.getByLabel('社会身份');await identity.click();
 const list=page.locator('.ui-select-popup:popover-open');await expect(list).toBeVisible();await expect(list.getByRole('option',{name:'职工',exact:true})).toHaveAttribute('aria-selected','true');
 await list.getByRole('option',{name:'学生',exact:true}).click();await expect(identity).toHaveValue('学生');await expect(list).toHaveCount(0);
 await identity.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(identity).toHaveValue('其他');
 await identity.click();await page.keyboard.press('Escape');await expect(identity).toBeFocused();await expect(list).toHaveCount(0);
 await identity.click();await page.getByRole('heading',{name:'让大家更好地认识你'}).click();await expect(list).toHaveCount(0);
 await page.getByRole('button',{name:'保存',exact:true}).click();await page.reload();await expect(identity).toHaveValue('其他');
});
for(const width of [390,768,1440])test(`dropdown stays in viewport and above dialogs at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:700});await page.goto(url());
 const field=page.getByLabel('所在领域');await field.scrollIntoViewIfNeeded();await field.click();const list=page.locator('.ui-select-popup:popover-open');await expect(list).toBeVisible();
 const box=(await list.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(700);
 await list.getByRole('option',{name:'媒体',exact:true}).click();await expect(field).toHaveValue('媒体');
 await page.goto(url('subscription'));await page.locator('[data-ws-action="personal-buy"]').click();const pay=page.getByRole('dialog',{name:'确认个人订阅'});await pay.getByLabel('模拟支付方式').click();await expect(list).toBeVisible();await list.getByRole('option',{name:'Apple Pay（模拟）'}).click();await expect(pay.getByLabel('模拟支付方式')).toHaveValue('Apple Pay（模拟）');
 await pay.getByLabel('模拟支付方式').click();await page.keyboard.press('Escape');await expect(pay).toBeVisible();await expect(list).toHaveCount(0);await page.keyboard.press('Escape');await expect(pay).toHaveCount(0);
});
test('avatar preview validates images, saves, reloads and removes without a visible native input',async({page})=>{
 await page.goto(url());const input=page.getByLabel('选择头像文件');await expect(input).toBeHidden();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'上传头像',exact:true}).click();await (await chooser).setFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('not an image')});
 await expect(page.locator('.ex-status[role=alert]')).toContainText('图片无法读取');
 await input.setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(2*1024*1024+1)});await expect(page.locator('.ex-status[role=alert]')).toContainText('2 MB');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 await input.setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:png});await expect(page.getByAltText('当前头像')).toBeVisible();
 await page.getByRole('button',{name:'保存',exact:true}).click();await page.reload();await expect(page.getByAltText('当前头像')).toBeVisible();await page.getByRole('button',{name:'移除',exact:true}).click();await expect(page.getByAltText('当前头像')).toHaveCount(0);await page.getByRole('button',{name:'保存',exact:true}).click();await page.reload();await expect(page.getByAltText('当前头像')).toHaveCount(0);
});
test('team meeting member filter uses same surface and preserves filter behavior',async({page})=>{
 await page.goto(url('home','team-eureka'));await page.getByLabel('团队成员',{exact:true}).click();await page.locator('.ui-select-popup:popover-open').getByRole('option',{name:/林晓/}).click();await expect(page.getByLabel('团队成员',{exact:true})).toHaveValue('lin');
 await expect(page.locator('.ws-recording-table tbody tr').first()).toContainText('林晓');
});
