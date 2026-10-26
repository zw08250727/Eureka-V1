import {test,expect,type Page} from '@playwright/test';
import {expectedSchedulePrompts} from '../fixtures/schedule-prompts';
test.use({timezoneId:'Asia/Shanghai'});

async function seed(page:Page,market:string) {
  await page.addInitScript(m => {
    localStorage.setItem(`eureka:market:${m}:eureka:auth:v1`,JSON.stringify({market:m,realm:`eureka-${m}`,identity:'schedule@example.com',provider:'email'}));
    const key=`eureka:market:${m}:eureka:personal-actions:v1`;
    if(localStorage.getItem(key)) return;
    const record={id:'schedule-assist-test',type:'schedule',title:'今天下午2点跟日辰集团的需求沟通',start:'2026-10-19T14:00',end:'2026-10-19T15:00',done:false,source:'manual',notes:'核对试点范围与验收标准',participants:'日辰集团业务负责人',location:'线上会议',reminder:'none',created:'2026-10-18T08:00',updated:'seed',revision:0,links:['related-meeting']};
    localStorage.setItem(key,JSON.stringify({version:1,records:[record,{...record,id:'related-todo',type:'todo',title:'日辰集团报价跟进',end:'',notes:'确认试点报价'}],meetings:[{id:'related-meeting',title:'日辰集团需求初访',created:'2026-10-17T09:00',seconds:120,summary:'先确认试点范围，再安排报价。',transcript:'日辰集团希望先开展小范围试点。'}],sessions:[],settings:{},demoWeekDays:['2026-10-08','2026-10-09','2026-10-10','2026-10-11','2026-10-12','2026-10-13','2026-10-14']}));
  },market);
}

for(const market of ['cn','global']) {
  test(`${market}: wide guide uses isolated branding, verified QR targets and device assets`,async({page})=>{
    await seed(page,market);
    await page.goto(`/${market}/workbench/?view=thoughts&id=inspiration`);
    await page.locator('[data-th=new]').click();
    const guide=page.getByRole('dialog',{name:'绑定设备，开始记录闪念'});
    const download=market==='cn'?'https://www.100wiser.com/wisenote':'https://eurekamind.ai/download';
    await expect(guide.getByRole('link',{name:'下载 App'})).toHaveAttribute('href',download);
    await expect(guide.getByRole('link',{name:'购买设备'})).toHaveAttribute('href',market==='cn'?download:'https://eurekamind.ai/shop');
    await expect(guide.locator('[data-qr-url]')).toHaveAttribute('data-qr-url',download);
    await expect(guide).not.toContainText(market==='cn'?/Eureka\s*Mind/i:'百智');
    for(const img of await guide.locator('img').all()) await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0);
    if(market==='cn') await expect(guide.getByAltText('百智 录音设备')).toHaveAttribute('src','/brand/wisenote-device.png');
    for(const [width,height] of [[1440,900],[1080,680],[390,844]]) {
      await page.setViewportSize({width,height});
      const box=(await guide.boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(width);
      expect(box.height).toBeLessThanOrEqual(height-20);
      if(width>600) expect(box.width).toBeGreaterThan(box.height);
      const cards=guide.locator('section');
      expect((await cards.nth(1).boundingBox())!.x).toBeGreaterThan((await cards.first().boundingBox())!.x);
      await guide.screenshot({path:`test-results/schedule-assist/${market}-guide-${width}.png`,animations:'disabled'});
    }
    await page.keyboard.press('Escape');
    await expect(guide).toHaveCount(0);
    await expect(page.locator('[data-th=new]')).toBeFocused();
  });
  for(const [phase,time,label] of [['before','13:00','准备这场日程'],['during','14:30','查看相关上下文'],['after','15:00','回顾这场日程']]) {
    test(`${market}: ${phase} opens contextual Agent for manual, capture and Agent schedules`,async({page})=>{
      await seed(page,market);
      await page.clock.setFixedTime(new Date(`2026-10-19T${time}:00+08:00`));
      await page.setViewportSize({width:1440,height:960});
      for(const source of ['manual','capture','agent']) {
        await page.goto(`/${market}/workbench/?view=calendar&id=schedule-assist-test`);
        if(source!=='manual') {
          await page.evaluate(({market,source})=>{const key=`eureka:market:${market}:eureka:personal-actions:v1`;const data=JSON.parse(localStorage.getItem(key)!);data.records[0].source=source;localStorage.setItem(key,JSON.stringify(data));},{market,source});
          await page.reload();
        }
        const entry=page.getByRole('button',{name:label,exact:true});
        await expect(entry).toBeVisible();
        if(phase==='during') {
          await expect(page.locator('.pa-page-head [data-pa=schedule-assist]')).toHaveCount(0);
          await expect(page.locator('.pa-detail-main > [data-schedule-phase=during]')).toBeVisible();
        } else await expect(page.locator(`.pa-detail-main > [data-schedule-phase=${phase}]`)).toBeVisible();
        await entry.click();
        await expect(page.locator('#pa-agent')).toBeVisible();
        await expect(page.locator('#pa-prompt')).toHaveValue(expectedSchedulePrompts[phase as keyof typeof expectedSchedulePrompts]);
        await expect(page.locator('[data-schedule-brief]')).toContainText('今天下午2点跟日辰集团的需求沟通');
        await expect(page.locator('[data-schedule-brief]')).toContainText('日辰集团需求初访');
        await expect(page.locator('[data-schedule-brief]')).toContainText('日辰集团报价跟进');
        await expect(page.locator('#pa-agent [data-pa=agent-web]')).toHaveAttribute('aria-pressed','true');
        await expect(page.locator('#pa-agent-result .pa-message')).toHaveCount(0);
        if(source==='manual') await page.screenshot({path:`test-results/schedule-assist/${market}-${phase}-context.png`,animations:'disabled'});
        await page.locator('#pa-agent').getByRole('button',{name:'发送问题',exact:true}).click();
        await expect(page.locator('[data-schedule-answer]')).toContainText('日辰集团需求初访');
        await expect(page.locator('#pa-agent-form')).toHaveCount(0);
        expect(await page.evaluate(m=>JSON.parse(localStorage.getItem(`eureka:market:${m}:eureka:personal-actions:v1`)!).records.length,market)).toBe(2);
      }
      await page.setViewportSize({width:390,height:844});
      await expect(page.locator('#pa-prompt')).toBeVisible();
      await page.screenshot({path:`test-results/schedule-assist/${market}-${phase}-mobile.png`,animations:'disabled'});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    });
  }

  test(`${market}: calendar editor layout aligns place and participants`,async({page})=>{
    await seed(page,market);
    await page.setViewportSize({width:1440,height:960});
    await page.goto(`/${market}/workbench/?view=calendar&id=schedule-assist-test`);
    await page.locator('.pa-page-head [data-pa=edit]').click();
    const form=page.locator('#pa-edit-form');
    const location=form.locator('[name=location]');
    const participants=form.locator('[name=participants]');
    const locationBox=(await location.boundingBox())!;
    const participantsBox=(await participants.boundingBox())!;
    expect(Math.abs(locationBox.y-participantsBox.y)).toBeLessThan(2);
    await page.setViewportSize({width:1216,height:1032});
    await participants.focus();
    const reviewWidthLocation=(await location.boundingBox())!,reviewWidthParticipants=(await participants.boundingBox())!;
    expect(Math.abs(reviewWidthLocation.y-reviewWidthParticipants.y),`1216px: location=${reviewWidthLocation.y}, participants=${reviewWidthParticipants.y}`).toBeLessThan(2);
    await expect(form.locator('[data-calendar-team-participants]')).toHaveCount(0);
    const layout=form.locator('[data-calendar-editor-layout]');
    await expect(layout).toBeVisible();
    const hint=form.locator('[data-calendar-time-hint]');
    await expect(hint).toBeVisible();
    for(const width of [1440,1080,768,390]){
      await page.setViewportSize({width,height:900});
      expect(await layout.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(2);
      const layoutBox=(await layout.boundingBox())!,hintBox=(await hint.boundingBox())!;
      expect(Math.abs(layoutBox.x-hintBox.x)).toBeLessThan(2);
      expect(hintBox.width).toBeGreaterThan(layoutBox.width-4);
      await page.screenshot({path:`test-results/calendar-editor-layout-${market}-schedule-${width}.png`,animations:'disabled'});
    }
  });

  test(`${market}: todo editor hint spans the responsive field grid`,async({page})=>{
    await seed(page,market);
    await page.goto(`/${market}/workbench/?view=calendar&space=personal`);
    await page.locator('.pa-page-head [data-pa=new-todo]').click();
    const form=page.locator('#pa-edit-form');
    const layout=form.locator('[data-calendar-editor-layout]');
    const hint=form.locator('[data-calendar-time-hint]');
    await expect(layout).toBeVisible();
    await expect(hint).toBeVisible();
    for(const width of [1440,1080,768,390]){
      await page.setViewportSize({width,height:900});
      expect(await layout.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThan(2);
      const layoutBox=(await layout.boundingBox())!,hintBox=(await hint.boundingBox())!;
      expect(Math.abs(layoutBox.x-hintBox.x)).toBeLessThan(2);
      expect(hintBox.width).toBeGreaterThan(layoutBox.width-4);
      await page.screenshot({path:`test-results/calendar-editor-layout-${market}-todo-${width}.png`,animations:'disabled'});
    }
  });

  test(`${market}: discard action aligns with unsaved form footer`,async({page})=>{
    await seed(page,market);
    await page.goto(`/${market}/workbench/?view=calendar&space=personal`);
    await page.locator('.pa-page-head [data-pa=new-schedule]').click();
    const editor=page.locator('.pa-create-dialog');
    await editor.locator('#pa-edit-form [name=title]').fill('待确认的日程');
    await editor.locator('header [data-pa=cancel-create]').click();
    const guard=page.getByRole('dialog',{name:'保留这次修改？'});
    const footer=guard.locator('form.pa-modal-form footer');
    const discard=footer.locator('[data-pa=discard]');
    const cancel=footer.locator('[data-pa=modal-cancel]');
    await expect(discard).toBeVisible();
    await expect(cancel).toBeVisible();
    const discardBox=(await discard.boundingBox())!,cancelBox=(await cancel.boundingBox())!;
    expect(discardBox.width).toBeLessThan(200);
    expect(Math.abs(discardBox.y-cancelBox.y)).toBeLessThan(4);
    expect(discardBox.x).toBeLessThan(cancelBox.x);
    await guard.screenshot({path:`test-results/calendar-unsaved-guard-${market}.png`,animations:'disabled'});
  });
}
