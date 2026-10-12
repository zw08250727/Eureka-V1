import {expect,test} from '@playwright/test';
test.use({reducedMotion:'reduce'});
const url=(space='personal',actor='zhang')=>`/workbench/?view=contacts&space=${space}&actor=${actor}`;
test('search shares the toolbar with visible filters and reset restores the list',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto(url());
 const toolbar=page.getByRole('region',{name:'搜索与筛选联系人'});
 await expect(toolbar.getByLabel('筛选主体类型')).toBeVisible();
 await expect(page.locator('#contacts-filter-panel')).toHaveCount(0);
 const search=(await page.getByRole('searchbox',{name:'搜索客户'}).boundingBox())!,filter=(await page.getByLabel('筛选主体类型').boundingBox())!;
 expect(Math.abs(search.y+search.height/2-filter.y-filter.height/2)).toBeLessThan(3);
 await page.getByLabel('筛选主体类型').click();
 await page.locator('.ui-select-popup:popover-open').getByRole('option',{name:'企业',exact:true}).click();
 await expect(page.locator('.contacts-person-card')).toHaveCount(2);
 await page.getByLabel('创建开始日期').fill('2027-01-01');await expect(page.locator('.contacts-person-card')).toHaveCount(0);
 await page.getByRole('searchbox',{name:'搜索客户'}).fill('不存在');
 await page.getByLabel('按创建时间排序').selectOption('asc');
 await toolbar.getByRole('button',{name:'重置',exact:true}).click();
 await expect(page.locator('.contacts-person-card')).toHaveCount(8);
 await expect(page.getByRole('searchbox',{name:'搜索客户'})).toHaveValue('');
 await expect(page.getByLabel('按创建时间排序')).toHaveValue('desc');
});
test('CRM guide routes administrators and guides members without importing data',async({page})=>{
 await page.goto(url('team-eureka'));await page.getByRole('button',{name:'导入 CRM',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'导入 CRM 客户'});
 await expect(dialog).toContainText('尚未连接或拉取 CRM 数据');
 await dialog.getByRole('button',{name:'前往连接器 ↗',exact:true}).click();
 await expect(page).toHaveURL(/view=connectors.*space=team-eureka.*actor=zhang/);
 await page.goto(url('team-eureka','kevin'));await expect(page.locator('.contacts-person-card').first()).toBeVisible();const count=await page.locator('.contacts-person-card').count();
 await page.getByRole('button',{name:'导入 CRM',exact:true}).click();
 await expect(dialog).toContainText('请联系团队管理员：张伟');await expect(dialog.getByRole('button',{name:/前往连接器/})).toHaveCount(0);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}}));
 await dialog.getByRole('button',{name:'复制对接说明'}).click();await expect(dialog.getByRole('alert')).toContainText('复制失败');
 await expect(dialog.getByLabel('CRM 对接说明')).toContainText('不跨成员合并');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}));
 await dialog.getByRole('button',{name:'复制对接说明'}).click();await expect(dialog.getByRole('status')).toContainText('已复制');
 await dialog.getByRole('button',{name:'知道了'}).click();expect(await page.locator('.contacts-person-card').count()).toBe(count);
});
for(const width of [390,768,1080,1440])test(`contacts toolbar and CRM guide fit ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===1080?680:900});await page.goto(url());
 await expect(page.getByRole('button',{name:'导入 CRM',exact:true})).toBeVisible();
 await expect.poll(()=>page.locator('.main').evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(2);
 await page.screenshot({path:`test-results/contacts-toolbar-${width}.png`});
 for(const name of ['筛选主体类型','筛选客户来源','创建开始日期','创建结束日期','按创建时间排序']){
  const field=page.getByLabel(name);await expect(field).toBeVisible();const rect=(await field.boundingBox())!;expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(width);
 }
 await page.getByRole('button',{name:'导入 CRM',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'导入 CRM 客户'});await expect(dialog).toBeVisible();
 expect(await dialog.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(2);
 await page.screenshot({path:`test-results/contacts-crm-${width}.png`});
});
