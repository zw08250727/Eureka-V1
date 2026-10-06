import {expect,test,Page} from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const url='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
const act=(p:Page,n:string,v?:string)=>p.locator(`[data-ws-action="${n}"]${v?`[data-value="${v}"]`:''}`).filter({visible:true}).first();
const md=(p:Page,n:string)=>p.locator(`[data-md-action="${n}"]`).filter({visible:true}).first();
async function switchTo(p:Page,id:string){await p.locator('#ws-switcher').click();await p.locator(`#ws-menu [data-ws-action=switch][data-value="${id}"]`).click();}
test.beforeEach(async({page})=>{await page.goto(url);await switchTo(page,'team-eureka');});
test('team recording home has full columns, custom filters and no personal flash assets',async({page})=>{
  await page.clock.setFixedTime(new Date('2026-10-07T12:00:00Z'));
  await expect(page.locator('#ws-team-nav')).not.toContainText('团队文件');
  await expect(page.locator('#ws-view')).not.toContainText(/今日日程|待办清单|全部闪念|今日记账|帮我安排/);
  await expect(page.locator('.ws-meeting-intelligence')).toContainText('会议洞察');
  const headings=await page.locator('.ws-recording-table th').allTextContents();
  for(const label of ['文件名','文件大小','创建人','文件来源','标签','录音时长','文件状态','录音时间','更新时间','创建成员','操作'])expect(headings.join(',')).toContain(label);
  await expect(page.locator('.ws-recording-table tbody tr')).toHaveCount(10);
  await act(page,'list-next').click();await expect(page.locator('.ws-recording-table tbody tr')).toHaveCount(1);
  await page.locator('#ws-meeting-source-trigger').click();await page.getByRole('option',{name:'W2',exact:true}).click();
  await expect(page.locator('.ws-recording-table tbody tr')).toHaveCount(1);await expect(page.locator('.ws-recording-table')).toContainText('星海试点复盘');
  await page.getByRole('button',{name:'清除来源筛选',exact:true}).filter({visible:true}).click();
  await page.locator('#ws-meeting-date-trigger').click();await page.getByRole('button',{name:'2026年10月6日',exact:true}).click();
  await expect(page.locator('.ws-recording-table tbody tr')).toHaveCount(5);
  await page.getByRole('button',{name:'清除录音日期',exact:true}).filter({visible:true}).click();
  await page.getByRole('searchbox',{name:'搜索团队会议'}).fill('不存在的会议');await expect(page.locator('#ws-view')).toContainText('没有符合条件');
  await page.getByRole('searchbox',{name:'搜索团队会议'}).fill('');
  await act(page,'meeting-prompt').click();await expect(page.locator('.ws-composer textarea')).toHaveValue('生成团队会议简报');
});
test('team recordings reuse six tabs, inline editing, player, sharing, export and recycle',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await act(page,'file','team-review').click();await expect(page.getByRole('tab')).toHaveCount(6);await expect(md(page,'feedback')).toBeDisabled();
  await md(page,'edit').click();await page.getByRole('textbox',{name:'编辑正文'}).fill('团队迭代专属结论');await md(page,'save-inline').click();
  await expect(page.locator('#md-content .md-prose')).toContainText('团队迭代专属结论');
  await page.getByRole('tab',{name:'转译文本',exact:true}).click();await expect(page.locator('#md-content')).toContainText('今天先确认');
  for(const name of ['实时翻译','思维导图','图文摘要','逐字稿']){await page.getByRole('tab',{name,exact:true}).click();if(await md(page,'generate').count())await md(page,'generate').click();await expect(page.locator('#md-content')).not.toBeEmpty();}
  await md(page,'play').click();await expect(page.getByRole('button',{name:'暂停录音',exact:true})).toBeVisible();await md(page,'play').click();
  await page.getByRole('combobox',{name:'播放倍速'}).selectOption('1.5');
  await md(page,'ask').click();await page.locator('#md-agent-host textarea').fill('总结当前会议');await page.locator('#md-agent-host button[type=submit]').click();
  await expect(page.locator('#md-agent-host .ws-chat-answer')).toContainText('团队产品周会');
  await act(page,'agent-close').click();await expect(page.locator('#md-agent-host')).toBeHidden();
  await md(page,'export').click();await md(page,'export-next').click();const download=page.waitForEvent('download');await md(page,'download').click();expect((await download).suggestedFilename()).toMatch(/\.txt$/);
  await md(page,'share').click();await page.locator('#ws-dialog [value=kevin]').check();await page.locator('#ws-dialog button[type=submit]').click();
  await md(page,'delete').click();await act(page,'confirm').click();await act(page,'recycle').click();await expect(page.locator('.ws-recording-table')).toContainText('团队产品周会');await act(page,'restore','team-review').click();
  await act(page,'recycle').click();await act(page,'file','team-review').click();await expect(page.locator('#md-content .md-prose')).toContainText('团队迭代专属结论');
  await switchTo(page,'personal');await expect(page.locator('#meeting-list')).not.toContainText('团队迭代专属');expect(errors).toEqual([]);
});
test('team contacts reuse all relationship tabs, notes, followups and scoped Agent',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('[data-contacts-entry]').click();
  await expect(page.locator('.contacts-person-card')).toHaveCount(4);await expect(page.locator('#contacts-root')).not.toContainText('John Chen');
  await page.locator('[data-contact-action=person][data-value=c-team-1]').click();
  for(const name of ['概览','时间线','承诺','主题','记忆']){await page.getByRole('tab',{name,exact:true}).click();await expect(page.locator('.contacts-main')).not.toContainText('德国经销商');}
  await page.locator('[data-contact-action=note]').click();await page.locator('[data-contact-form=note] textarea').fill('仅团队空间的客户补充信息');await page.locator('[data-contact-form=note] button[type=submit]').click();
  await expect(page.locator('.contacts-main')).toContainText('仅团队空间');
  await page.locator('[data-contact-action=followup]').first().click();await page.locator('[data-contact-form=followup] [name=title]').fill('确认试点反馈');await page.locator('[data-contact-form=followup] button[type=submit]').click();await expect(page.locator('.contacts-main')).toContainText('确认试点反馈');
  await page.locator('.contacts-xiaozhi-entry').click();await page.locator('[data-contact-action=ask]').filter({hasText:'准备下一次'}).click();await expect(page.locator('.contacts-xiaozhi-answer')).toContainText('陈明');await expect(page.locator('.contacts-xiaozhi-answer')).not.toContainText('德国经销商');
  for(const [width,height] of [[1920,1080],[1366,768],[1280,650]]){await page.setViewportSize({width,height});await expect(page.locator('[data-contact-xiaozhi-input]')).toBeInViewport({ratio:1});expect(await page.locator('.main').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(3);}
  await switchTo(page,'team-design');await page.locator('[data-contacts-entry]').click();await expect(page.locator('.contacts-person-card')).toHaveCount(0);
  await switchTo(page,'personal');await page.locator('[data-contacts-entry]').click();await expect(page.locator('#contacts-root')).toContainText('John Chen');await expect(page.locator('#contacts-root')).not.toContainText('仅团队空间');expect(errors).toEqual([]);
});
test('team recording pause, resume, mark and finish save to the originating workspace',async({page})=>{
  await act(page,'record').click();await page.locator('#ws-dialog [name=title]').fill('团队录音链路验证');await page.locator('#ws-dialog button[type=submit]').click();
  await page.locator('#recording-pause').click();await expect(page.locator('#recording-live-state')).toContainText('已暂停');await page.locator('#recording-pause').click();
  await page.locator('#recording-mark').click();await page.locator('#recording-finish').click();await page.locator('#recording-back-home').click();await expect(page.locator('#ws-view')).toContainText('团队录音链路验证');
  await page.reload();await expect(page.locator('#ws-view')).toContainText('团队录音链路验证');
  await switchTo(page,'personal');await expect(page.locator('#meeting-list')).not.toContainText('团队录音链路验证');
});
test('recording save failure retains the session and retry creates one recording',async({page})=>{
  await act(page,'record').click();await page.locator('#ws-dialog [name=title]').fill('保存失败重试会议');await page.locator('#ws-dialog button[type=submit]').click();
  await page.evaluate(()=>{const original=Storage.prototype.setItem;let fails=true;Storage.prototype.setItem=function(key,value){if(key==='eureka:workspaces:v2'&&fails){fails=false;throw new Error('quota');}original.call(this,key,value);};});
  await page.locator('#recording-finish').click();await expect(page.locator('#ws-toast')).toContainText('存储空间不足');await expect(page.locator('#recording-live-state')).toContainText('录音中');
  await page.locator('#recording-finish').click();await expect(page.locator('#recording-live-state')).toContainText('已结束');await page.locator('#recording-back-home').click();
  await page.getByRole('searchbox',{name:'搜索团队会议'}).fill('保存失败重试会议');await expect(page.locator('.ws-recording-table tbody tr')).toHaveCount(1);
});
test('meeting Agent remains reachable at laptop sizes and history restores the selected task',async({page})=>{
  await act(page,'file','team-review').click();await md(page,'ask').click();
  for(const [width,height] of [[1920,1080],[1366,768],[1280,650]]){await page.setViewportSize({width,height});await expect(page.locator('#md-agent-host textarea')).toBeInViewport({ratio:1});await expect(page.locator('#md-agent-host [aria-label="收起 Agent"]')).toBeInViewport({ratio:1});}
  await page.locator('#md-agent-host textarea').fill('继续团队会议决策整理');await page.locator('#md-agent-host button[type=submit]').click();await page.locator('#home-entry').click();
  await page.locator('#ws-history button').filter({hasText:'继续团队会议决策整理'}).click();await expect(page.locator('#ws-view .ws-chat-user')).toHaveText('继续团队会议决策整理');await expect(page.locator('#ws-view .ws-composer textarea')).toBeInViewport({ratio:1});
});
