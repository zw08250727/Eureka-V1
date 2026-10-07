import {test,expect,type Page} from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined,viewport:{width:1440,height:960}});
const app='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
const key='baizhi-v14-contacts';
async function contacts(page:Page){await page.goto(app);await page.locator('[data-contacts-entry]').click();}
async function add(page:Page,name:string){await page.locator('[data-contact-action=add]').click();await page.locator('[name=name]').fill(name);await page.locator('[data-contact-form=add] [type=submit]').click();}

test('contact creation, notes and followups persist with visible validation and correct context',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await contacts(page);
  await page.locator('#contacts-search').fill('Alice');await expect(page.locator('.contacts-person-card')).toHaveCount(1);
  await page.locator('.contacts-person-card').click();await page.locator('.contacts-xiaozhi-entry').click();
  await page.locator('[data-contact-action=ask][data-value="整理开放承诺"]').click();
  await expect(page.locator('.contacts-xiaozhi-answer')).toContainText('Alice Wang 暂无');
  await expect(page.locator('.contacts-xiaozhi-answer')).not.toContainText('德国经销商');
  await page.locator('[data-contact-action=list]').click();await page.locator('#contacts-search').fill('');
  await add(page,'流程核对联系人');await expect(page.locator('.contacts-toast')).toContainText('已保存');
  await add(page,'流程核对联系人');await expect(page.locator('.contacts-form-error')).toContainText('已存在');await page.keyboard.press('Escape');
  await expect(page.locator('.contacts-overlay')).toHaveCount(0);
  await page.locator('.contacts-person-card').filter({hasText:'流程核对联系人'}).click();
  await page.locator('[data-contact-action=note]').click();await page.locator('[name=text]').fill('   ');await page.locator('[data-contact-form=note] [type=submit]').click();
  await expect(page.locator('.contacts-form-error')).toContainText('不能为空');
  await page.locator('[name=text]').fill('下次确认交付范围');await page.locator('[data-contact-form=note] [type=submit]').click();
  await expect(page.locator('[data-contact-action=tab][data-value="记忆"]')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.contacts-main')).toContainText('下次确认交付范围');
  await page.locator('[data-contact-action=followup]').click();await page.locator('[name=title]').fill('   ');await page.locator('[data-contact-form=followup] [type=submit]').click();
  await expect(page.locator('.contacts-form-error')).toContainText('请填写任务标题');
  await page.locator('[name=title]').fill('确认验收时间');await page.locator('[name=description]').fill('先核对双方的交付范围');await page.locator('[data-contact-form=followup] [type=submit]').click();
  await expect(page.locator('.contacts-main')).toContainText('先核对双方的交付范围');
  await page.reload();await page.locator('[data-contacts-entry]').click();await page.locator('.contacts-person-card').filter({hasText:'流程核对联系人'}).click();await page.locator('[data-contact-action=tab][data-value="记忆"]').click();
  await expect(page.locator('.contacts-main')).toContainText('下次确认交付范围');await expect(page.locator('.contacts-main')).toContainText('确认验收时间');
  const record=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).personal,key);expect(record.tasks[0].contactId).toBe(record.contacts.find((p:{name:string})=>p.name==='流程核对联系人').id);
  if(process.env.AUDIT_CAPTURE){await page.screenshot({path:'src/prototype/prd/images/contact-detail.png'});await page.locator('[data-contact-action=note]').click();await page.locator('[name=text]').fill('沟通后补充确认结果');await page.screenshot({path:'src/prototype/prd/images/contact-note.png'});}
  expect(errors).toEqual([]);
});

test('contact storage failure preserves form and retries once; stale tab cannot overwrite',async({page,context})=>{
  await contacts(page);const second=await context.newPage();await contacts(second);
  await page.evaluate(k=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===k && sessionStorage.getItem('fail-save')==='yes')throw new DOMException('Full','QuotaExceededError');return original.call(this,name,value);};sessionStorage.setItem('fail-save','yes');},key);
  await add(page,'可恢复联系人');await expect(page.locator('.contacts-form-error')).toContainText('保存失败');await expect(page.locator('[name=name]')).toHaveValue('可恢复联系人');
  await page.evaluate(()=>sessionStorage.removeItem('fail-save'));await page.locator('[data-contact-form=add] [type=submit]').click();
  await expect(page.locator('.contacts-person-card').filter({hasText:'可恢复联系人'})).toHaveCount(1);
  await add(second,'旧页面联系人');await expect(second.locator('.contacts-form-error')).toContainText('其他页面更新');await expect(second.locator('[name=name]')).toHaveValue('旧页面联系人');
  const stored=await page.evaluate(k=>localStorage.getItem(k),key);expect(stored).toContain('可恢复联系人');expect(stored).not.toContain('旧页面联系人');await second.close();
});

test('concurrent personal uploads retain the latest record instead of overwriting it',async({page,context})=>{
  await page.goto(app);const second=await context.newPage();await second.goto(app);
  for(const [tab,name] of [[page,'先保存'],[second,'旧页面']] as const){await tab.locator('[data-audio-upload]').first().click();await tab.locator('#audio-upload-input').setInputFiles({name:name+'.wav',mimeType:'audio/wav',buffer:Buffer.from('demo')});}
  await page.locator('#audio-upload-submit').click();await second.locator('#audio-upload-submit').click();
  await expect(second.locator('#audio-upload-error')).toContainText('其他页面更新');await expect(second.locator('#audio-upload-file')).toContainText('旧页面.wav');
  await page.reload();await expect(page.locator('#meeting-list')).toContainText('先保存');await expect(page.locator('#meeting-list')).not.toContainText('旧页面');await second.close();
});

test('settings save failure retains the last saved language and summary state',async({page})=>{
  await page.goto(app);await page.locator('#user-card').click();await page.locator('#ws-menu [data-ws-action=settings]').click();
  const language=page.locator('[data-settings-language=asr]'),toggle=page.locator('[data-settings-action=toggle-summary]');
  await language.selectOption('en');await toggle.click();await expect(toggle).toHaveAttribute('aria-checked','false');
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='eureka:personal-actions:v1')throw new DOMException('Full','QuotaExceededError');return original.call(this,k,v);};});
  await language.selectOption('zh-Hans');await expect(language).toHaveValue('en');await expect(page.locator('#toast')).toContainText('保存失败');
  await toggle.click();await expect(toggle).toHaveAttribute('aria-checked','false');await expect(page.locator('[data-settings-summary-copy]')).toHaveText('已关闭自动摘要');
  await page.reload();await page.locator('#user-card').click();await page.locator('#ws-menu [data-ws-action=settings]').click();await expect(language).toHaveValue('en');await expect(toggle).toHaveAttribute('aria-checked','false');
});

test('team opening resumes the confirmed draft, rejects stale tabs and fulfils once',async({page,context})=>{
  const create=async(tab:Page)=>{await tab.locator('#ws-switcher').click();await tab.locator('#ws-menu [data-ws-action=plan]').click();};
  const order=async(tab:Page,name:string)=>{await create(tab);await tab.locator('[data-ws-action=setup]').click();await tab.locator('#ws-dialog [name=name]').fill(name);await tab.locator('#ws-dialog [type=submit]').click();};
  await page.goto(app);await order(page,'恢复开通团队');
  await page.locator('[data-ws-action=payment-fail]').click();await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('未创建空间');
  const draft=await page.evaluate(()=>localStorage.getItem('eureka:team-setup:v1'));await page.reload();await create(page);await expect(page.locator('#ws-dialog')).toContainText('恢复开通团队');
  expect(await page.evaluate(()=>localStorage.getItem('eureka:team-setup:v1'))).toBe(draft);
  const second=await context.newPage();await second.goto(app);await create(second);await second.locator('[data-ws-action=setup]').click();await second.locator('#ws-dialog [name=name]').fill('已更新团队');await second.locator('#ws-dialog [type=submit]').click();
  await page.locator('[data-ws-action=payment]').click();await expect(page.locator('#ws-dialog .ws-form-error')).toContainText('其他页面更新');
  await second.locator('[data-ws-action=payment]').click();await expect(second.locator('#ws-dialog')).toContainText('团队已准备好');
  const state=await second.evaluate(()=>JSON.parse(localStorage.getItem('eureka:workspaces:v2')!));expect(state.spaces.filter((s:{name:string})=>s.name==='已更新团队')).toHaveLength(1);expect(state.orders.filter((o:{id:string})=>o.id===JSON.parse(draft!).orderId)).toHaveLength(1);
  expect(await second.evaluate(()=>localStorage.getItem('eureka:team-setup:v1'))).toBeNull();
  await second.locator('[data-ws-action=close-dialog]').first().click();await order(second,'取消的团队');await second.locator('[data-ws-action=cancel-setup]').click();await second.reload();
  expect(await second.evaluate(()=>localStorage.getItem('eureka:team-setup:v1'))).toBeNull();expect(await second.evaluate(()=>localStorage.getItem('eureka:workspaces:v2'))).not.toContain('取消的团队');await second.close();
});

test('PRD rule illustrations open alongside rules, adapt to small screens and print in full',async({page})=>{
  await page.goto('/prototype/prd/index.html#settings');await expect(page.locator('.chapter')).toHaveCount(35);
  await expect(page.locator('.prose h3').filter({hasText:'对应界面与交互'})).toHaveCount(0);
  const button=page.locator('#settings .rule-image-button').first();await button.click();
  const panel=page.locator('#reference-panel');await expect(panel).toBeVisible();await expect(page.locator('body')).toHaveClass(/reference-open/);
  await expect(page.locator('#reference-title')).toContainText('账号与套餐');
  await expect(page.locator('#reference-image')).toHaveAttribute('src',/team-personal-settings/);
  await expect(page.locator('.rule-selected h3')).toBeInViewport();
  await panel.locator('[data-reference=zoom]').click();await expect(panel).toHaveClass(/zoomed/);
  await page.screenshot({path:'/tmp/eureka-prd-compare.png'});await page.keyboard.press('Escape');await expect(panel).not.toBeVisible();await expect(button).toBeFocused();
  await page.setViewportSize({width:390,height:844});await button.click();await expect(panel).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({path:'/tmp/eureka-prd-compare-mobile.png'});
  await panel.locator('[data-reference=close]').click();await expect(button).toBeFocused();
  await page.emulateMedia({media:'print'});await expect(page.locator('#settings .rule-image-button img').first()).toBeVisible();
});
