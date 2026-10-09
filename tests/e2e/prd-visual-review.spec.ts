import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const url='/prototype/prd/index.html';
const key='eureka:prd:draft:v1';

test('compact cover, top controls, requested content and functional illustrations',async({page})=>{
  test.setTimeout(60000);
  await page.setViewportSize({width:1440,height:1000});await page.goto(url);
  await expect(page.locator('.chapter')).toHaveCount(35);
  await expect(page.locator('.cover-meta')).toContainText('创建人张伟');
  expect(await page.locator('.cover-slogan').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(16);
  await expect(page.locator('#reset-button,.document-map,.cover-bottom,#evidence,#reference,#review')).toHaveCount(0);
  for(const id of ['draft-view','published-view','print-button','import-button','export-button','publish-button'])await expect(page.locator('.toolbar #'+id)).toBeVisible();
  await expect(page.locator('#market')).not.toContainText('需求机会');await expect(page.locator('#market tbody tr')).toHaveCount(1);await expect(page.locator('#market tbody')).toContainText('Plaud Workspace');
  await expect(page.locator('#milestones')).toContainText('Plaud 的账号、工作空间、席位和设备关系是参考；EurekaMind 的视觉、首页、Agent Credits 共享池和演示价格为自身设计。');
  await expect(page.locator('.flow-error[role=alert]')).toHaveCount(0);await expect(page.locator('.flow-svg')).toHaveCount(4);
  for(const id of ['home','thoughts','recording','meeting-list','agent-process','workspaces','team-create','members','team-files','billing','credits','settings'])expect(await page.locator('#'+id+' img').count()).toBeGreaterThan(0);
  await expect(page.locator("#contacts img,#devices img")).toHaveCount(0); // Retired illustrations must not present obsolete permissions.
  // Load every image URL once without relying on scrolling all long sections.
  const imageResults=await page.locator('.prose img').evaluateAll(async imgs=>Promise.all([...new Set(imgs.map(img=>(img as HTMLImageElement).src))].map(src=>new Promise<{src:string,loaded:boolean}>(resolve=>{const img=new Image();img.onload=()=>resolve({src,loaded:img.naturalWidth>0});img.onerror=()=>resolve({src,loaded:false});img.src=src;}))));
  expect(imageResults.filter(r=>!r.loaded)).toEqual([]);
  await page.screenshot({path:'/tmp/eureka-prd-cover.png'});
  await page.locator('#team-create .flow-figure').scrollIntoViewIfNeeded();await page.locator('#team-create .flow-figure').screenshot({path:'/tmp/eureka-prd-flow.png'});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/eureka-prd-mobile.png',animations:'disabled'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await expect(page.locator('#print-button')).toBeInViewport();
  await page.emulateMedia({media:'print'});await expect(page.locator('.toolbar')).toBeHidden();await expect(page.locator('#team-create .flow-svg')).toBeVisible();await expect(page.locator('#team-create img').first()).toBeVisible();
});

test('legacy drafts retain edits without restoring retired chapters',async({page})=>{
  const doc=JSON.parse(await readFile('src/prototype/prd/content.json','utf8'));
  doc.sections[0].summary='保留旧工作稿评审意见';
  for(const id of ['evidence','reference','review'])doc.sections.push({...doc.sections[0],id,title:'已移除旧章节'});
  const raw=JSON.stringify({stamp:'legacy-37',savedAt:'2026-10-06T12:00:00Z',baseDigest:'old',doc});
  await page.addInitScript(({key,raw})=>{if(!localStorage.getItem(key))localStorage.setItem(key,raw);},{key,raw});
  await page.goto(url+'#reference');await expect(page).toHaveURL(/#overview$/);await expect(page.locator('.chapter')).toHaveCount(35);await expect(page.locator('#overview')).toContainText('保留旧工作稿评审意见');
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(raw);
  await expect(page.locator('#notices')).toContainText('仓库发布版已更新');
  await page.locator('#published-view').click();await expect(page.locator('#overview')).not.toContainText('保留旧工作稿评审意见');
  await page.locator('#draft-view').click();await page.locator('[data-edit=overview]').click();await page.locator('#edit-summary').fill('合并后保留的评审意见');await page.locator('[data-editor=save]').click();
  expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).doc.sections.length,key)).toBe(35);
  await page.reload();await expect(page.locator('#overview')).toContainText('合并后保留的评审意见');
});

test('editable flowcharts render safely, report malformed JSON and survive saving',async({page})=>{
  await page.goto(url);await page.locator('[data-edit=journeys]').click();
  const graph={title:'评审流程',nodes:[{id:'a',label:'<script>bad</script>',x:0,y:0},{id:'b',label:'确认结论',x:1,y:0}],edges:[['a','b','通过']]};
  await page.locator('#edit-body').fill('```flow\n'+JSON.stringify(graph)+'\n```');await expect(page.locator('.live-preview svg')).toHaveCount(1);await expect(page.locator('.live-preview script')).toHaveCount(0);await expect(page.locator('.live-preview .flow-node text').first()).toContainText('<script>bad</script>');
  await page.locator('#edit-body').fill('```flow\n{invalid}\n```');await expect(page.locator('.live-preview [role=alert]')).toContainText('流程图暂时无法渲染');
  await page.locator('#edit-body').fill('```flow\n'+JSON.stringify(graph)+'\n```');await page.locator('[data-editor=save]').click();await page.reload();await expect(page.locator('#journeys .flow-svg')).toHaveCount(1);
});
