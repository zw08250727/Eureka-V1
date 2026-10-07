import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const url='/prototype/prd/index.html';

test('hierarchical numbering stays stable through search, editing and Markdown export',async({page})=>{
  await page.goto(url);
  await expect(page.locator('.nav-intro .version')).toHaveText('V1.1');
  await expect(page.locator('.nav-group')).toHaveText(['一：产品定义','二：业务模型','三：个人工作台','四：团队版','五：交付约束','六：评审与验收']);
  await expect(page.locator('#navigation a[href="#overview"]')).toHaveText('1.1文档说明与决策摘要');
  await expect(page.locator('#navigation a[href="#objects"]')).toHaveText('2.1业务对象');
  const headings=await page.locator('.chapter').evaluateAll(chapters=>chapters.map(chapter=>({number:chapter.querySelector('.chapter-number')!.textContent,headings:Array.from(chapter.querySelectorAll('.prose h3')).map(h=>h.textContent)})));
  for(const chapter of headings){
    expect(chapter.headings.length).toBeGreaterThan(0);
    chapter.headings.forEach((heading,index)=>expect(heading).toMatch(new RegExp('^'+chapter.number!.replaceAll('.','\\.')+'\\.'+(index+1)+' ')));
  }
  await page.locator('#search').fill('2.1');
  await expect(page.locator('#navigation a[href="#objects"] span')).toHaveText('2.1');
  await page.locator('#search').fill('');
  await page.locator('[data-edit=objects]').click();
  await page.locator('#edit-body').fill('### 对象\n- 一条规则。\n### 2.1.2 关系\n- 第二条规则。');
  await expect(page.locator('.live-preview h3')).toHaveText(['业务对象','2.1.1 对象','2.1.2 关系']);
  await page.locator('[data-editor=save]').click();
  await page.reload();
  await expect(page.locator('#objects .prose h3')).toHaveText(['2.1.1 对象','2.1.2 关系']);
  await page.locator('#export-button').click();
  const downloadEvent=page.waitForEvent('download');
  await page.locator('#export-md').click();
  const markdown=await readFile((await (await downloadEvent).path())!,'utf8');
  expect(markdown).toContain('## 一：产品定义\n\n### 1.1 文档说明与决策摘要');
  expect(markdown).toContain('## 二：业务模型\n\n### 2.1 业务对象');
  expect(markdown).toContain('#### 2.1.1 对象\n- 一条规则。\n#### 2.1.2 关系');
  expect(markdown).not.toContain('2.1.2 2.1.2');
});

test('scope excludes retired flows and Agent business details while retaining window UI',async({page})=>{
  await page.goto(url);
  await expect(page.locator('#journeys .flow-svg')).toHaveCount(4);
  for(const text of ['F-01','F-02','F-07','个人日程与待办闭环'])await expect(page.locator('#journeys')).not.toContainText(text);
  const boundary=page.locator('#milestones .rule-block').filter({has:page.getByRole('heading',{name:'1.2.3 参考与边界',exact:true})});
  for(const topic of ['登录与注册','WiseNote PC','Agentplatform','调用逻辑','运行状态与计费','历史任务调用','自动任务','窗口自适应'])await expect(boundary).toContainText(topic);
  await expect(page.locator('#auth')).toContainText('真实认证服务仍为范围外事项');
  await expect(page.locator('#auth')).toContainText('团队共识');
  await expect(page.locator('#agent')).toContainText('1.2.3「参考与边界」');
  await expect(page.locator('#acceptance tbody tr').filter({hasText:'登录注册界面'})).toHaveCount(1);
  await expect(page.locator('#agent .prose table,#agent .prose .flow-svg')).toHaveCount(0);
  await expect(page.locator('#meeting-detail .prose li')).toHaveText(['参考 WiseNote PC 的会议详情页和核心功能。']);
  await expect(page.locator('#meeting-detail .prose table,#meeting-detail .prose figure')).toHaveCount(0);
  await expect(page.locator('#agent-process')).toContainText('300–760px');
  await expect(page.locator('#agent-process')).toContainText('24px');
  await expect(page.locator('#agent-process')).toContainText('小窗口与窄屏');
  await expect(page.locator('#thoughts')).toContainText('跨日');
  await expect(page.locator('#settings')).toContainText('保存失败整批回滚');
  const doc=JSON.parse(await readFile('src/prototype/prd/content.json','utf8'));
  const all=doc.sections.map((s:{body:string})=>s.body).join('\n');
  const defined=new Set(doc.sections.find((s:{id:string})=>s.id==='acceptance').body.match(/AC-\d+/g));
  for(const reference of all.match(/AC-[A-Z0-9]+/g)||[])expect(defined.has(reference)).toBe(true);
});

test('key flowcharts are compact on desktop and scroll inside narrow screens',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(url+'#journeys');
  const figures=page.locator('#journeys .flow-figure');
  for(const figure of await figures.all()){
    const box=await figure.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(620);
    expect(box!.width).toBeGreaterThan(400);
  }
  await page.locator('#journeys').screenshot({path:'/tmp/eureka-prd-journeys.png'});
  await page.locator('#objects h2').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/eureka-prd-outline.png'});
  await page.setViewportSize({width:390,height:844});
  await figures.first().scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  const scroll=figures.first().locator('.flow-scroll');
  expect(await scroll.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
  await page.screenshot({path:'/tmp/eureka-prd-flow-mobile.png',animations:'disabled'});
});
