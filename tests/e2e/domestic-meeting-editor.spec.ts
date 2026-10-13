import { test, expect, type Locator, type Page } from '@playwright/test';
import M from '../../src/features/spaces/model/core';

const workspaceKey = 'eureka:market:cn:eureka:workspaces:v2';
const detailsKey = 'eureka:market:cn:eureka:meeting-details:v1';
const personalUrl = '/cn/workbench/?view=meeting&space=personal&id=meeting-1';
const teamUrl = '/cn/workbench/?view=meeting&space=team-eureka&id=team-review&actor=zhang';
const summary = '这是重点内容，其余保持原样。\n第二段用于验证会议编辑。';
const summaryHtml = '<p>这是重点内容，其余保持原样。</p><p>第二段用于验证会议编辑。</p>';
const editor = (page: Page) => page.getByRole('textbox', { name: '编辑正文', exact: true });
const toolbar = (page: Page) => page.getByRole('toolbar', { name: '正文格式', exact: true });
const prose = (page: Page) => page.locator('#md-content .cn-markdown');

// Public editor source: index-DbMJdQBd.js → AddToAIChat-CsRNTvlH.js.
// All meeting text below is synthetic; no production meeting body is used.
test.beforeEach(async ({ page }) => {
  await page.goto('/cn/');
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).last().click();
  await page.getByRole("button", {name:"个人/团队版",exact:true}).click();
  await page.locator('#phone').fill('13800138000');
  await page.locator('#code').fill('111111');
  await page.locator('#terms').check();
  await page.locator('#submit').click();
  await expect(page.locator('.app')).toBeVisible();
  const state = M.seed();
  const team = M.get(state, 'team-eureka');
  M.share(team, 'team-review', ['kevin'], 'zhang', []);
  team.files.find(file => file.id === 'team-review')!.detail = { summary, summaryHtml };
  await page.evaluate(({ state, workspaceKey, detailsKey, summary, summaryHtml }) => {
    localStorage.setItem(workspaceKey, JSON.stringify(state));
    localStorage.setItem(detailsKey, JSON.stringify({ 'meeting-1': { summary, summaryHtml } }));
  }, { state, workspaceKey, detailsKey, summary, summaryHtml });
  await page.goto(personalUrl);
  await expect(prose(page)).toContainText('这是重点内容');
});

async function enterEditor(page: Page) {
  await page.locator('#md-content').getByRole('button', { name: '编辑', exact: true }).click();
  await expect(editor(page)).toBeVisible();
}

async function selectText(body: Locator, text: string) {
  await body.evaluate((root, text) => {
    (root as HTMLElement).focus();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const start = node.textContent!.indexOf(text);
      if (start < 0) continue;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + text.length);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    throw new Error(`Cannot select fixture text: ${text}`);
  }, text);
}

async function textStyle(body: Locator, text: string) {
  return body.evaluate((root, text) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent?.includes(text)) continue;
      const style = getComputedStyle(node.parentElement!);
      return { weight: Number(style.fontWeight), size: style.fontSize, family: style.fontFamily };
    }
    throw new Error(`Missing fixture text: ${text}`);
  }, text);
}

async function chooseFormat(page: Page, label: string, option: string) {
  // Exercise the real popup, including the saved editor selection across focus changes.
  await toolbar(page).getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('listbox', { name: '可选项', exact: true }).getByRole('option', { name: option, exact: true }).click();
}

for (const scope of ['personal', 'team'] as const) {
  test(`CN ${scope}: selected bold, heading, exact font size and font survive save/reload`, async ({ page }, testInfo) => {
    if (scope === 'team') await page.goto(teamUrl);
    await enterEditor(page);
    for (const label of ['粗体', '斜体', '下划线', '删除线', '无序列表', '有序列表', '清除格式', '撤销', '重做']) {
      await expect(toolbar(page).getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    for (const label of ['正文与标题', '字号', '字体', '对齐方式']) {
      await expect(toolbar(page).getByRole('combobox', { name: label, exact: true })).toBeVisible();
    }
    await selectText(editor(page), '重点内容');
    await toolbar(page).getByRole('button', { name: '粗体', exact: true }).click();
    expect((await textStyle(editor(page), '重点内容')).weight).toBeGreaterThanOrEqual(600);
    expect((await textStyle(editor(page), '其余保持原样')).weight).toBeLessThan(600);

    await selectText(editor(page), '重点内容');
    await chooseFormat(page, '正文与标题', '标题 2');
    await expect(editor(page).locator('h2')).toHaveText('这是重点内容，其余保持原样。');
    await selectText(editor(page), '重点内容');
    await chooseFormat(page, '字号', '36px');
    expect((await textStyle(editor(page), '重点内容')).size).toBe('36px');
    await selectText(editor(page), '重点内容');
    await chooseFormat(page, '字体', 'Georgia');
    expect((await textStyle(editor(page), '重点内容')).family).toContain('Georgia');
    expect((await textStyle(editor(page), '第二段')).size).not.toBe('36px');

    await page.getByRole('button', { name: '保存', exact: true }).click();
    await expect(editor(page)).toHaveCount(0);
    await page.reload();
    await expect(prose(page).locator('h2')).toHaveText('这是重点内容，其余保持原样。');
    expect((await textStyle(prose(page), '重点内容')).size).toBe('36px');
    expect((await textStyle(prose(page), '重点内容')).family).toContain('Georgia');
    await enterEditor(page);
    await expect(editor(page).locator('b, strong')).toContainText('重点内容');
    expect((await textStyle(editor(page), '重点内容')).size).toBe('36px');
    await page.screenshot({ path: testInfo.outputPath(`${scope}-formatted.png`), fullPage: true });
  });
}

test('CN Chinese IME commit is one undo step and supports keyboard/button redo', async ({ page }) => {
  await enterEditor(page);
  await editor(page).press('ControlOrMeta+End');
  const before = await editor(page).innerText();
  const cdp = await page.context().newCDPSession(page);
  try {
    // Chromium's real composition pipeline, not synthetic events or DOM assignment.
    await cdp.send('Input.imeSetComposition', { text: '中', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.imeSetComposition', { text: '中文输入已确认', selectionStart: 7, selectionEnd: 7 });
    await cdp.send('Input.insertText', { text: '中文输入已确认' });
  } finally {
    await cdp.detach();
  }
  await expect(editor(page)).toContainText('中文输入已确认');
  const committed = await editor(page).innerText();
  await toolbar(page).getByRole('button', { name: '撤销', exact: true }).click();
  await expect(editor(page)).toHaveText(before, { useInnerText: true });
  await editor(page).press('ControlOrMeta+Shift+z');
  await expect(editor(page)).toHaveText(committed, { useInnerText: true });
  await editor(page).press('ControlOrMeta+z');
  await expect(editor(page)).toHaveText(before, { useInnerText: true });
  await toolbar(page).getByRole('button', { name: '重做', exact: true }).click();
  await expect(editor(page)).toHaveText(committed, { useInnerText: true });
});

test('CN discard confirmation preserves draft when cancelled and discards only when confirmed', async ({ page }) => {
  const original = await prose(page).innerText();
  await enterEditor(page);
  await editor(page).fill('尚未保存的中文修改');
  await page.getByRole('button', { name: '退出编辑', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '放弃未保存的修改？', exact: true });
  await expect(dialog).toContainText('当前修改尚未保存');
  await dialog.getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(editor(page)).toHaveText('尚未保存的中文修改');
  await page.getByRole('button', { name: '退出编辑', exact: true }).click();
  await dialog.getByRole('button', { name: '放弃修改', exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  await expect(prose(page)).toHaveText(original, { useInnerText: true });
  await page.reload();
  await expect(prose(page)).toHaveText(original, { useInnerText: true });
  await enterEditor(page);
  await expect(editor(page)).not.toContainText('尚未保存的中文修改');
});

test('CN blank save keeps editor open and undo recovers the unsaved Chinese draft', async ({ page }) => {
  await enterEditor(page);
  await editor(page).fill('保存失败前的草稿');
  await editor(page).fill('');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.locator('.cn-inline-edit-status')).toHaveText('正文不能为空');
  await expect(editor(page)).toBeVisible();
  await toolbar(page).getByRole('button', { name: '撤销', exact: true }).click();
  await expect(editor(page)).toHaveText('保存失败前的草稿');
});

test('CN read-only shared team recording hides the rich editor and disables entry', async ({ page }, testInfo) => {
  await page.goto('/cn/workbench/?view=meeting&space=team-eureka&id=team-review&actor=kevin');
  await expect(prose(page)).toContainText('这是重点内容');
  await expect(page.locator('#md-content').getByRole('button', { name: '编辑', exact: true })).toBeDisabled();
  await expect(editor(page)).toHaveCount(0);
  await expect(toolbar(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: '保存', exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('readonly-team.png'), fullPage: true });
});

test('CN editor colors and safe links survive while unsafe links from stored rich text are stripped',async({page})=>{
  await enterEditor(page);
  await selectText(editor(page),'重点内容');
  await toolbar(page).getByLabel('文字颜色',{exact:true}).fill('#165dff');
  await selectText(editor(page),'重点内容');
  await toolbar(page).getByRole('button',{name:'应用文字背景色',exact:true}).click();
  await selectText(editor(page),'重点内容');
  await toolbar(page).getByRole('button',{name:'插入链接',exact:true}).click();
  const link=page.getByRole('dialog',{name:'插入链接',exact:true});
  await link.getByRole('textbox',{name:'链接地址'}).fill('javascript:alert(1)');
  await link.getByRole('button',{name:'插入',exact:true}).click();
  await expect(link.getByRole('alert')).toContainText('有效');
  await link.getByRole('textbox',{name:'链接地址'}).fill('https://example.com/meeting');
  await link.getByRole('button',{name:'插入',exact:true}).click();
  await expect(editor(page).getByRole('link',{name:'重点内容'})).toHaveAttribute('href','https://example.com/meeting');
  await page.getByRole('button',{name:'保存',exact:true}).click();
  await page.reload();
  await expect(prose(page).getByRole('link',{name:'重点内容'})).toHaveAttribute('href','https://example.com/meeting');
  expect(await prose(page).evaluate(el=>[...el.querySelectorAll('[style]')].some(node=>(node as HTMLElement).style.color==='rgb(22, 93, 255)'))).toBeTruthy();
  expect(await prose(page).innerHTML()).toContain('background-color: rgb(255, 242, 172)');
  await page.evaluate(detailsKey=>localStorage.setItem(detailsKey,JSON.stringify({'meeting-1':{summary:'示例正文',summaryHtml:'<p>安全内容<a href="javascript:alert(1)" onclick="alert(1)">危险链接</a><span style="background:url(https://example.com/track);position:fixed">文字</span><iframe src="https://example.com"></iframe></p>'}})),detailsKey);
  await page.reload();
  await expect(prose(page)).toContainText('危险链接');
  await expect(prose(page).locator('a,iframe,[onclick]')).toHaveCount(0);
  expect(await prose(page).innerHTML()).not.toContain('url(');
});
