import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const summaries = [
  {id:'default',title:'项目概览',text:'## 交付计划\n\n- 确认验收范围',source:'default'},
  {id:'second',title:'后续行动',text:'## 行动清单\n\n- 准备演示材料',source:'agent_generated'},
];
async function login(page:Page,market:string) {
  await page.goto(`/${market}/`);
  await page.getByRole('button',{name:'登录 / 注册',exact:true}).last().click();
  if(market==='cn') {
    await page.getByRole('link',{name:'个人/团队版',exact:true}).click();
    await page.getByRole('button',{name:'邮箱',exact:true}).click();
  }
  await page.locator('#email').fill('parity@example.com');
  await page.locator('#code').fill('123456');
  await page.locator('#terms').check();
  await page.locator('#submit').click();
  await expect(page.locator('.app')).toBeVisible();
}
for (const market of ['cn','global']) {
  const key=`eureka:market:${market}:eureka:meeting-details:v1`;
  const url=`/${market}/workbench/?view=meeting&space=personal&id=meeting-1`;
  test(`${market}: short recording, sparse transcript and translation have distinct surfaces`,async({page})=>{
    await login(page,market);
    await page.evaluate(({key})=>localStorage.setItem(key,JSON.stringify({'meeting-1':{summary:'',transcript:'',contentState:{viewType:2}}})),{key});
    await page.goto(url);
    await expect(page.getByRole('tablist',{name:'录音详情内容'})).toHaveCount(0);
    await expect(page.getByRole('region',{name:'录音内容'})).toContainText('本次录音较短');
    await page.evaluate(({key})=>localStorage.setItem(key,JSON.stringify({'meeting-1':{summary:'',segments:[{at:0,speaker:0,text:'请确认设备已连接。',en:''}],contentState:{viewType:3}}})),{key});
    await page.reload();
    await expect(page.locator('.cn-transcript')).toContainText('请确认设备已连接');
    await expect(page.getByRole('tablist',{name:'录音详情内容'})).toHaveCount(0);
    await expect(page.getByRole('switch',{name:'仅查看重点标记'})).toHaveCount(0);
    await page.evaluate(({key})=>localStorage.setItem(key,JSON.stringify({'meeting-1':{summary:'## 总结\n\n设备连接完成。',segments:[{at:0,speaker:0,text:'设备连接完成。',en:'Device connected.'}]}})),{key});
    await page.reload();
    await page.getByRole('tab',{name:'实时翻译',exact:true}).click();
    await expect(page.locator('#md-content')).toContainText('Device connected.');
    await expect(page.getByRole('button',{name:/编辑发言人/})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'复制实时翻译全文'})).toBeVisible();
    for(const state of [{recordingStatus:25,kind:'processing',label:'AI总结中'},{recordingStatus:16,kind:'failed',label:'总结失败'}]) {
      await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify({'meeting-1':{summary:'',transcript:'',contentState:{recordingStatus:state.recordingStatus}}})),{key,state});
      await page.reload();
      await expect(page.locator('.md-summary-ready')).toHaveText(state.label);
      await expect(page.locator(`[data-content-state="${state.kind}"]`)).toBeVisible();
    }

  });
  test(`${market}: named summaries export and share independently; full editor preserves formatting`,async({page})=>{
    await login(page,market);
    await page.evaluate(({key,summaries})=>localStorage.setItem(key,JSON.stringify({'meeting-1':{summaries}})),{key,summaries});
    await page.goto(url);
    await page.getByRole('button',{name:'编辑',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'文档编辑',exact:true});
    await expect(editor.getByRole('heading',{name:'行动清单'})).toBeVisible();
    await editor.getByRole('textbox',{name:'文档标题'}).fill('交付行动');
    await editor.getByRole('textbox',{name:'编辑正文'}).fill('完成演示并复核验收标准。');
    await editor.getByRole('button',{name:'保存',exact:true}).click();
    await expect(editor).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('combobox',{name:'全部总结'})).toHaveValue('second');
    await page.locator('.md-top-actions').getByRole('button',{name:'导出',exact:true}).click();
    await page.getByRole('radio',{name:/导出智能总结-项目概览/}).check();
    await page.getByRole('button',{name:'下一步'}).click();
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name:'下载',exact:true}).click();
    const result=await download;
    expect(await readFile((await result.path())!,'utf8')).toContain('确认验收范围');
    await page.locator('.md-top-actions').getByRole('button',{name:'分享',exact:true}).click();
    await page.locator('#md-share-all').uncheck();
    await page.getByRole('button',{name:'智能总结-交付行动',exact:true}).click();
    await expect(page.getByRole('button',{name:'智能总结-项目概览',exact:true})).toHaveAttribute('aria-pressed','false');
    await page.getByRole('button',{name:'生成分享链接',exact:true}).click();
    const stored=await page.evaluate((market)=>JSON.parse(localStorage.getItem(`eureka:market:${market}:eureka:meeting-share-links:v1`)! ).links[0],market);
    expect(stored.market).toBe(market);
    expect(stored.contents).toHaveLength(1);
    expect(stored.contents[0].label).toBe('智能总结-交付行动');
    const other=market==='cn'?'global':'cn';
    expect(await page.evaluate(other=>localStorage.getItem(`eureka:market:${other}:eureka:meeting-share-links:v1`),other)).toBeNull();
  });
  for(const width of [390,768,1080,1440])test(`${market}: meeting and editor width ${width}`,async({page})=>{
    await login(page,market);
    await page.setViewportSize({width,height:960});
    await page.goto(url);
    await expect(page.locator('.meeting-detail-ui')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
    await page.screenshot({path:`test-results/meeting-parity/${market}-${width}.png`,fullPage:true,animations:"disabled"});
    await page.getByRole('button',{name:'编辑',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'文档编辑'});
    await expect(editor).toBeVisible();
    await expect(editor).toHaveCSS("opacity","1");
    await expect(editor).not.toHaveCSS("background-color","rgba(0, 0, 0, 0)");
    expect(await editor.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
    await page.screenshot({path:`test-results/meeting-parity/${market}-editor-${width}.png`,fullPage:true,animations:"disabled"});
  });
}
