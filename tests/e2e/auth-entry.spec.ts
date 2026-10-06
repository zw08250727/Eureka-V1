import { expect, test } from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL || undefined});
const authUrl='/prototype/auth-shell.html';
const homePath='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';

for(const mode of ['login','register']) {
  test(`${mode} enters home directly and refresh stays on home`,async ({page})=>{
    const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto(authUrl);
    if(mode==='register')await page.getByRole('button',{name:'立即注册',exact:true}).click();
    const navigations:string[]=[];
    page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push(frame.url())});
    // Enter submits the same form as clicking its button, without another step.
    await page.locator('#code').press('Enter');
    await expect(page).toHaveURL(new RegExp(homePath.replaceAll('?','\\?')));
    await expect(page.locator('[data-main-view="home"]')).toBeVisible();
    await expect(page.locator('#recent-meeting-title')).toHaveText('我的会议');
    await expect(page.locator('#edition-gate')).toBeHidden();
    await expect(page.locator('iframe')).toHaveCount(0);
    expect(navigations).toHaveLength(1);
    await page.reload();
    await expect(page.locator('#home-entry')).toHaveAttribute('aria-current','page');
    expect(errors).toEqual([]);
  });
}

test('validation blocks invalid submission and successful entry has immediate feedback',async ({page})=>{
  await page.goto(authUrl);
  await page.locator('#terms').uncheck(); await page.locator('#submit').click();
  await expect(page.locator('#status')).toContainText('请先同意');
  await page.locator('#terms').check(); await page.locator('#email').fill('bad-email');
  await page.locator('#submit').click(); await expect(page.locator('#status')).toContainText('有效的邮箱');
  await page.locator('#email').fill('demo@example.com'); await page.locator('#code').clear();
  await page.locator('#submit').click(); await expect(page.locator('#status')).toContainText('请输入邮箱验证码');
  await page.locator('#code').fill('123456');
  // Observe the same submit event before the browser replaces the document.
  await page.evaluate(()=>document.addEventListener('submit',()=>{
    sessionStorage.setItem('auth-test-feedback',JSON.stringify({
      disabled:(document.getElementById('submit') as HTMLButtonElement).disabled,
      text:document.getElementById('submit')!.textContent,
      busy:document.getElementById('auth-form')!.getAttribute('aria-busy'),
    }));
  },{once:true}));
  await page.locator('#submit').click();
  await expect(page.locator('#recent-meeting-title')).toHaveText('我的会议');
  const feedback=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('auth-test-feedback')!));
  expect(feedback).toEqual({disabled:true,text:'正在进入首页…',busy:'true'});
});

for(const provider of ['google','apple']) {
  test(`simulated ${provider} sign-in enters home without hanging`,async ({page})=>{
    await page.goto(authUrl);
    await page.locator(`#${provider}`).click();
    await expect(page.locator('#recent-meeting-title')).toHaveText('我的会议');
    await expect(page.locator('#edition-gate')).toBeHidden();
  });
}

for(const entry of ['/','/prototype/index.html']) {
  test(`${entry} embeds only one page through sign-in and home`,async ({page})=>{
    await page.goto(entry);
    const shell=page.frameLocator('iframe');
    await shell.locator('#submit').click();
    await expect(shell.locator('#recent-meeting-title')).toHaveText('我的会议');
    await expect(shell.locator('iframe')).toHaveCount(0);
    await expect(shell.locator('#home-entry')).toHaveAttribute('aria-current','page');
  });
}
