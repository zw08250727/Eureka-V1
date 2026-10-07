import {expect,test} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const url='/prototype/prd/index.html';
const app='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
const key='eureka:prd:draft:v1';

test('PRD navigation, safe content, editing, persistence and published baseline are independent',async({page,context})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
  await expect(page.locator('.chapter')).toHaveCount(34);
  await page.locator('#search').fill('BILL-01');await expect(page.locator('#navigation')).toContainText('订阅、席位与账单');
  await page.locator('#navigation a[href="#billing"]').click();await expect(page).toHaveURL(/#billing$/);await expect(page.locator('#navigation a[href="#billing"]')).toHaveAttribute('aria-current','location');
  await page.locator('[data-edit=billing]').click();await page.locator('#edit-title').fill('订阅账单 · 已评审');
  await page.locator('#edit-body').fill('### 修订规则\n\n**下一账期生效**\n\n<script>window.compromised=true</script>\n\n| 字段 | 值 |\n| --- | --- |\n| 席位 | 6 |');
  await page.locator('#edit-notes').fill('评审通过 · 演示评审人');
  await expect(page.locator('.live-preview')).toContainText('下一账期生效');await expect(page.locator('.live-preview script')).toHaveCount(0);
  await page.locator('[data-editor=save]').click();await expect(page.locator('#save-status')).toContainText('本地修订');
  await page.reload();await expect(page.locator('#billing h2')).toHaveText('订阅账单 · 已评审');
  await expect(page.locator('#billing .review-note')).toContainText('评审通过');
  await page.locator('#published-view').click();await expect(page.locator('#billing h2')).toHaveText('订阅、席位与账单');
  await page.locator('#draft-view').click();await expect(page.locator('#billing h2')).toHaveText('订阅账单 · 已评审');
  await page.locator('[data-edit=billing]').click();await page.locator('#edit-body').fill('需要放弃的内容');await page.locator('[data-editor=cancel]').click();
  await page.locator('[data-dialog=discard]').click();await expect(page.locator('#billing')).not.toContainText('需要放弃的内容');
  const other=await context.browser()!.newContext();const clean=await other.newPage();await clean.goto('http://127.0.0.1:3100'+url);await expect(clean.locator('#billing h2')).toHaveText('订阅、席位与账单');await other.close();expect(errors).toEqual([]);
});

test('revision export/import is lossless, invalid input does not modify data and publishing is explicit',async({page})=>{
  await page.goto(url);await page.locator('[data-edit=overview]').click();await page.locator('#edit-summary').fill('导出与导入验证');await page.locator('[data-editor=save]').click();
  await page.locator('#export-button').click();const event=page.waitForEvent('download');await page.locator('#export-json').click();const d=await event;const data=JSON.parse(await readFile((await d.path())!,'utf8'));expect(data.sections[0].summary).toBe('导出与导入验证');
  await page.evaluate(()=>localStorage.removeItem('eureka:prd:draft:v1'));await page.reload();await expect(page.locator('#overview')).not.toContainText('导出与导入验证');
  await page.locator('#import-file').setInputFiles({name:'revision.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#confirm-import').click();await expect(page.locator('#overview')).toContainText('导出与导入验证');
  await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});await expect(page.locator('#toast')).toContainText('JSON 无法解析');await expect(page.locator('#overview')).toContainText('导出与导入验证');
  const malicious={...data,sections:[...data.sections,data.sections[0]]};await page.locator('#import-file').setInputFiles({name:'duplicate.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(malicious))});await expect(page.locator('#toast')).toContainText('重复');
  await page.locator('#publish-button').click();await expect(page.locator('#action-dialog')).toContainText('部署成功后');await expect(page.locator('#action-dialog a').first()).toHaveAttribute('href',/github.com\/zw08250727\/Eureka-V1\/edit\/develop/);
  const payloadDownload=page.waitForEvent('download');await page.locator('#download-publish').click();const payload=JSON.parse(await readFile((await (await payloadDownload).path())!,'utf8'));expect(payload.revision).not.toBe(data.revision);expect(payload.sections[0].summary).toBe('导出与导入验证');
});

test('unsaved inputs recover, concurrent tab saves cannot silently overwrite and storage failure retains text',async({page,context})=>{
  await page.goto(url);await page.locator('[data-edit=overview]').click();await page.locator('#edit-summary').fill('尚未保存的输入');page.on('dialog',d=>d.accept());await page.reload();
  await page.locator('[data-global=recover]').click();await expect(page.locator('#edit-summary')).toHaveValue('尚未保存的输入');await page.locator('[data-editor=save]').click();
  const second=await context.newPage();await second.goto(url);await page.locator('[data-edit=overview]').click();await page.locator('#edit-summary').fill('标签 A 的新输入');
  await second.locator('[data-edit=overview]').click();await second.locator('#edit-summary').fill('标签 B 已保存');await second.locator('[data-editor=save]').click();
  await page.locator('[data-editor=save]').click();await expect(page.locator('.chapter-edit-status')).toContainText('另一个标签页');await expect(page.locator('#edit-summary')).toHaveValue('标签 A 的新输入');
  expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).doc.sections[0].summary,key)).toBe('标签 B 已保存');
  await page.locator('[data-editor=cancel]').click();await page.locator('[data-dialog=discard]').click();await page.reload();await page.locator('[data-edit=overview]').click();await page.locator('#edit-summary').fill('存储满时保留');
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage full','QuotaExceededError');};});await page.locator('[data-editor=save]').click();await expect(page.locator('.chapter-edit-status')).toContainText('Storage full');await expect(page.locator('#edit-summary')).toHaveValue('存储满时保留');
});

test('stale local versions require explicit merge and import does not silently publish',async({page})=>{
  await page.goto(url);await page.locator('[data-edit=overview]').click();await page.locator('#edit-summary').fill('旧基线的修改');await page.locator('[data-editor=save]').click();
  await page.route('**/prd/content.json',async route=>{const r=await route.fetch();const doc=await r.json();doc.revision='prd-new-base';doc.sections[1].summary='仓库新的里程碑说明';await route.fulfill({json:doc});});
  await page.reload();await expect(page.locator('#notices')).toContainText('仓库发布版已更新');await page.locator('#publish-button').click();await expect(page.locator('#action-dialog')).not.toBeVisible();await expect(page.locator('#toast')).toContainText('合并');
  await page.locator('[data-global=compare]').click();await expect(page.locator('#milestones')).toContainText('仓库新的里程碑说明');
  await page.locator('#draft-view').click();await page.locator('[data-edit=milestones]').click();await page.locator('#edit-summary').fill('仓库新的里程碑说明');await page.locator('[data-editor=save]').click();
  await page.locator('[data-global=rebase]').click();await page.locator('#confirm-rebase').click();await expect(page.locator('#notices')).not.toContainText('仓库发布版已更新');
  await page.locator('#publish-button').click();await expect(page.locator('#action-dialog')).toBeVisible();
});

test('PRD layout, deep links, screenshots and prototype review entry work',async({page})=>{
  await page.goto(url+'#agent');await expect(page.locator('#agent h2')).toBeInViewport();
  for(const [width,height] of [[1440,900],[1280,720],[390,844]]){
    await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    if(width===390){await page.locator('#nav-toggle').click();await expect(page.locator('#sidebar')).toBeInViewport();await page.locator('#search').fill('验收矩阵');await page.locator('#navigation a[href="#acceptance"]').click();await expect(page.locator('#acceptance h2')).toBeInViewport();}
  }
  await page.setViewportSize({width:1440,height:900});await page.goto(url+'#screens');
  for(const img of await page.locator('#screens img').all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);}
  await page.goto(app);const entry=page.locator('.prd-review-entry');await expect(entry).toBeVisible();const popup=page.waitForEvent('popup');await entry.click();const prd=await popup;await expect(prd.locator('.chapter')).toHaveCount(34);
});

test('capture current prototype illustrations for the PRD',async({page})=>{
  test.skip(!process.env.PRD_CAPTURE,'Run explicitly when refreshing PRD illustrations');
  const folder='src/prototype/prd/images';await mkdir(folder,{recursive:true});await page.setViewportSize({width:1440,height:900});await page.goto(app);await expect(page.locator('#meeting-list')).toBeVisible();await page.screenshot({path:`${folder}/home.png`});
  await page.locator('#view-panorama').click();await expect(page.locator('#md-content')).toBeVisible();await page.screenshot({path:`${folder}/meeting.png`});
  await page.locator('[data-contacts-entry]').click();await page.locator('.contacts-xiaozhi-entry').click();await expect(page.locator('#contacts-xiaozhi-rail')).toBeVisible();await page.screenshot({path:`${folder}/contacts.png`});
  await page.locator('#ws-switcher').click();await page.locator('#ws-menu [data-ws-action=switch][data-value=team-eureka]').click();await expect(page.locator('#ws-file-search')).toBeVisible();await expect(page.locator('#ws-toast')).toBeHidden();await page.screenshot({path:`${folder}/team.png`});
  await page.locator('#ws-history [data-ws-action=history][data-value=team-history-review]').click();await page.screenshot({path:`${folder}/team-history-agent.png`});
  await page.locator('[data-ws-action=page][data-value=billing]').filter({visible:true}).first().click();await expect(page.locator('.ws-plan-amount')).toBeVisible();await page.screenshot({path:`${folder}/billing.png`});
});
