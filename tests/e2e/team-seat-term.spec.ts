import {test,expect,Page} from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const url='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
const act=(p:Page,n:string,v?:string)=>p.locator(`[data-ws-action="${n}"]${v?`[data-value="${v}"]`:''}`).filter({visible:true}).first();
test('members inherit the team period and expiry pauses every effective seat',async({page})=>{
 await page.goto(url);await page.locator('#ws-switcher').click();await act(page,'switch','team-eureka').click();await act(page,'page','billing').click();
 await expect(page.locator('.ws-team-term')).toContainText('当前周期截止：2027-10-06');await expect(page.locator('.ws-team-term')).toContainText('续费成功后统一延长');
 await act(page,'page','members').click();await expect(page.locator('tr').filter({hasText:'Alice'})).toContainText('待加入生效');
 await act(page,'member-accept','alice').click();const row=page.locator('tr').filter({hasText:'Alice'});await expect(row).toContainText('Unlimited');await expect(row).toContainText('2027-10-06');
 if(process.env.PRD_CAPTURE)await page.screenshot({path:'src/prototype/prd/images/team-seat-terms.png'});
 await page.locator('#user-card').click();await act(page,'settings').click();await expect(page.locator('.settings-usage')).toContainText('当前周期截止：2027-10-06');await expect(page.locator('.settings-usage')).toContainText('随团队订阅统一到期');
 await page.locator('[data-settings-close]').click();await act(page,'page','billing').click();await act(page,'renew').click();await act(page,'confirm').click();await expect(page.locator('.ws-team-term')).toContainText('已关闭自动续费');
 await act(page,'advance-cycle').click();await act(page,'confirm').click();await act(page,'page','members').click();await expect(row).toContainText('权益已暂停');await expect(row).toContainText('2027-10-06');await expect(page.locator('tr').filter({hasText:'张伟'})).toContainText('权益已暂停');
 await page.reload();await act(page,'page','members').click();await expect(row).toContainText('权益已暂停');
 await act(page,'page','billing').click();await act(page,'renew').click();await act(page,'confirm').click();await expect(page.locator('.ws-team-term')).toContainText('2028-10-06');await act(page,'page','members').click();await expect(row).toContainText('Unlimited');await expect(row).toContainText('2028-10-06');
});
