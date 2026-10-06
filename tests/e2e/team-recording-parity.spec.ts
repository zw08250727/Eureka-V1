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
  await expect(page.locator('.ws-meeting-intelligence')).toContainText('Agent 团队简报');
  const headings=await page.locator('.ws-recording-table th').allTextContents();
  for(const label of ['文件名','文件大小','创建人','文件来源','标签','录音时长','文件状态','录音时间','更新时间','操作'])expect(headings.join(',')).toContain(label);
  expect(headings).not.toContain('创建成员');await expect(page.locator('.ws-recording-table [data-ws-action=export], .ws-recording-table [data-ws-action=share]')).toHaveCount(0);
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
  await act(page,'meeting-prompt').click();await expect(page.locator('.ws-composer textarea')).toHaveValue('星海试点的交付承诺与验收准备尚未对齐');
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
test('team hides contacts while personal contacts remain available',async({page})=>{
  await expect(page.locator('[data-contacts-entry]')).toBeHidden();
  await page.evaluate(()=>{(window as unknown as {EurekaSpaces:{open:(page:string)=>void}}).EurekaSpaces.open('contacts');});
  await expect(page.locator('#ws-view')).toBeVisible();await expect(page.locator('#contacts-root')).toBeHidden();
  await switchTo(page,'team-design');await expect(page.locator('[data-contacts-entry]')).toBeHidden();
  await switchTo(page,'personal');await expect(page.locator('[data-contacts-entry]')).toBeVisible();
  await page.locator('[data-contacts-entry]').click();await expect(page.locator('#contacts-root')).toContainText('John Chen');
  await page.locator('.contacts-xiaozhi-entry').click();await expect(page.locator('#contacts-xiaozhi-rail')).toBeVisible();
});
test('member history opens in place with ownership, preserves context and survives reload',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.locator('#ws-history [data-ws-action=history]')).toHaveCount(4);
  await expect(page.locator('#ws-history')).toContainText('林晓');await expect(page.locator('#ws-history')).toContainText('Kevin');await expect(page.locator('#ws-history')).toContainText('张伟');
  const item=page.locator('#ws-history [data-value=team-history-research]');await item.click();
  await expect(item).toHaveAttribute('aria-current','true');await expect(page.locator('.ws-agent-history-context')).toContainText('Kevin');
  await expect(page.locator('.ws-chat-user')).toHaveText('把用户访谈和交互评审串起来，找出值得优先解决的问题。');
  await expect(page.locator('.ws-chat-answer')).toContainText('上下文连续性');
  if(process.env.PRD_CAPTURE){await page.setViewportSize({width:1440,height:900});await expect(page.locator('#ws-toast')).toBeHidden();await page.screenshot({path:'src/prototype/prd/images/team-history-agent.png'});}
  for(const [width,height] of [[1920,1080],[1366,768],[1280,650]]){await page.setViewportSize({width,height});await expect(page.locator('.ws-composer textarea')).toBeInViewport({ratio:1});await expect(page.locator('[aria-label="收起 Agent"]')).toBeInViewport({ratio:1});expect(await page.locator('.main').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(3);}
  await page.locator('.ws-composer textarea').fill('补充下一轮验证重点');await page.locator('.ws-composer button[type=submit]').click();
  await expect(page.locator('.ws-chat-user')).toHaveCount(2);await expect(page.locator('.ws-chat-answer').last()).toContainText('语音记录用户访谈');await expect(page.locator('.ws-chat-answer').last()).not.toContainText('星海试点');
  await expect(page.locator('.ws-agent-history-context .ws-history-owner')).toHaveText('张伟');
  await expect(page.locator('#ws-history [data-value=team-history-research] .ws-history-owner')).toHaveText('Kevin');
  await act(page,'agent-close').click();await page.reload();await page.locator('#ws-history button').filter({hasText:'补充下一轮验证重点'}).click();await expect(page.locator('.ws-chat-user')).toHaveCount(2);
  await page.locator('#ws-actor').selectOption('lin');await expect(page.locator('#ws-history')).not.toContainText('补充下一轮验证重点');await expect(page.locator('#ws-history')).toContainText('用户访谈中的高频需求');
  await switchTo(page,'team-design');await expect(page.locator('#ws-history')).toContainText('暂无会话');
  await switchTo(page,'personal');await expect(page.locator('#ws-history')).toBeEmpty();await expect(page.locator('[data-contacts-entry]')).toBeVisible();expect(errors).toEqual([]);
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

test('team intelligence has one dated heading and one contextual Agent action per insight',async({page})=>{
  await page.clock.setFixedTime(new Date('2026-10-07T12:00:00Z'));await page.reload();
  await expect(page.locator('.ws-home-date')).toHaveText('10月7日 · 星期三');
  await expect(page.locator('.ws-team-home-head h1')).toHaveText('让分散的讨论，成为共同的判断。');
  await expect(page.locator('.ws-team-intelligence h2')).toHaveCount(0);
  await expect(page.locator('.ws-brief-finding')).toHaveCount(2);
  await expect(page.locator('.ws-team-home-head p')).toHaveCount(0);
  await expect(page.locator('.ws-team-intelligence')).not.toContainText(/交付预警|协作断点|需求共识|待核实|待评审|查看依据|分析影响|评估需求/);
  await expect(page.locator('.ws-brief-finding button')).toHaveCount(2);
  await expect(page.locator('.ws-brief-paragraph > .ws-brief-attribution')).toHaveCount(2);
  await expect(page.locator('.ws-brief-attribution').first()).toHaveCSS('display','inline');
  if(process.env.PRD_CAPTURE){await page.setViewportSize({width:1440,height:900});await expect(page.locator('#ws-toast')).toBeHidden();await page.screenshot({path:'src/prototype/prd/images/team.png'});}
  await page.locator('.ws-brief-finding[data-insight-id=delivery-risk] button').click();
  await expect(page.locator('#ws-dialog')).not.toBeVisible();await expect(page.locator('.ws-layout')).toHaveClass(/with-agent/);
  await expect(page.locator('.ws-composer textarea')).toHaveValue('星海试点的交付承诺与验收准备尚未对齐');
  await expect(page.locator('.ws-agent-insight-context')).toContainText('渠道合作沟通');
  await expect(page.locator('.ws-agent-insight-context')).toContainText('研发迭代排期确认');
  if(process.env.PRD_CAPTURE)await page.screenshot({path:'src/prototype/prd/images/team-insight-agent.png'});
  await page.locator('.ws-composer button[type=submit]').click();await expect(page.locator('#ws-view .ws-chat-answer').last()).toContainText('会议依据');await expect(page.locator('#ws-view .ws-chat-answer').last()).toContainText('10 月 17 日');
  await page.locator('.ws-composer textarea').fill('具体需要哪些人对齐？');await page.locator('.ws-composer button[type=submit]').click();await expect(page.locator('#ws-view .ws-chat-answer').last()).toContainText('渠道合作沟通');
  await act(page,'agent-close').click();await expect(page.locator('.ws-layout')).not.toHaveClass(/with-agent/);
  await page.locator('.ws-brief-finding[data-insight-id=customer-pattern] button').click();await expect(page.locator('.ws-agent-insight-context')).toContainText('跨会议追溯');
  await page.locator('.ws-agent-insight-sources [data-value=team-demo-research]').click();await expect(page.locator('#meeting-detail-root')).toContainText('语音记录用户访谈');
  await page.locator('#home-entry').click();
  for(const [width,height] of [[1920,1080],[1366,768],[1280,650]]){
    await page.setViewportSize({width,height});expect(await page.locator('.main').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(3);
    await page.locator('.ws-brief-finding button').first().click();await expect(page.locator('.ws-composer textarea')).toBeInViewport({ratio:1});await act(page,'agent-close').click();
  }
  await page.evaluate(()=>{const key='eureka:workspaces:v2',s=JSON.parse(localStorage.getItem(key)!);s.spaces.find((w:{id:string})=>w.id==='team-eureka').files.find((f:{id:string})=>f.id==='team-demo-sales').deleted=true;localStorage.setItem(key,JSON.stringify(s));});
  await page.reload();await expect(page.locator('.ws-brief-finding[data-insight-id=delivery-risk]')).toHaveCount(0);await expect(page.locator('.ws-brief-finding[data-insight-id=ownership-gap]')).toHaveCount(1);
  await switchTo(page,'team-design');await expect(page.locator('.ws-insight-empty')).toContainText('暂时没有形成新的跨会议发现');await expect(page.locator('#ws-view')).not.toContainText('相差 5 天');
});
