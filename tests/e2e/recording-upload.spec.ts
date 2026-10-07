import {test,expect,type Page} from '@playwright/test';
test.use({channel:process.env.PLAYWRIGHT_CHANNEL||undefined,viewport:{width:1440,height:1000}});
const app='/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1';
const file=(name:string,empty=false)=>({name,mimeType:'audio/wav',buffer:empty?Buffer.alloc(0):Buffer.alloc(256*1024)});
const team=(page:Page,id='team-eureka')=>page.locator(`#ws-menu [data-ws-action=switch][data-value=${id}]`).click();

test('personal upload validates six formats, persists, opens detail and survives recycle restore',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(app);
  await page.locator('.recording-command-actions [data-audio-upload]').click();
  await expect(page.locator('#audio-upload-input')).toHaveAttribute('accept','.m4a,.mp3,.wav,.opus,.flac,.aac');
  await page.locator('#audio-upload-input').setInputFiles(file('notes.pdf'));await expect(page.locator('#audio-upload-error')).toContainText('暂不支持');await expect(page.locator('#audio-upload-submit')).toBeDisabled();
  await page.locator('#audio-upload-input').setInputFiles(file('empty.wav',true));await expect(page.locator('#audio-upload-error')).toContainText('文件为空');
  for(const ext of ['m4a','mp3','wav','opus','flac','AAC']){await page.locator('#audio-upload-input').setInputFiles(file('客户回访.'+ext));await expect(page.locator('#audio-upload-submit')).toBeEnabled();}
  if(process.env.UPLOAD_CAPTURE)await page.screenshot({animations:'disabled',path:'src/prototype/prd/images/audio-upload.png'});
  await page.locator('#audio-upload-submit').click();const row=page.locator('#meeting-list [data-source="文件上传"]').filter({hasText:'客户回访'});await expect(row).toHaveCount(1);await expect(row).toContainText('待处理');
  await page.reload();await expect(row).toHaveCount(1);await row.click();await expect(page.locator('#md-content')).toContainText('未上传原音频');
  await page.locator('#home-entry').click();await row.locator('[data-meeting-action=delete]').click();await page.locator('#delete-confirm-submit').click();await expect(row).toHaveCount(0);
  await page.reload();await expect(row).toHaveCount(0);await page.locator('#recording-recycle-entry').click();const recycled=page.locator('[data-recycle-id]').filter({hasText:'客户回访'});await recycled.locator('[data-recycle-action=restore]').click();await page.locator('#home-entry').click();await expect(row).toHaveCount(1);await page.reload();await expect(row).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('team upload uses active space, replaces minute import entry, supports drag/drop and cancellation',async({page})=>{
  await page.goto(app);await page.locator('#ws-switcher').click();await team(page);
  await expect(page.getByRole('button',{name:'导入录音纪要',exact:true})).toHaveCount(0);
  const entry=page.locator('.ws-team-home-head [data-audio-upload]');await expect(entry).toBeVisible();
  if(process.env.UPLOAD_CAPTURE)await page.screenshot({animations:'disabled',path:'src/prototype/prd/images/team.png'});
  await entry.click();await expect(page.locator('.audio-upload-target')).toContainText('EurekaMind 产品团队');
  const dt=await page.evaluateHandle(()=>{const dt=new DataTransfer();dt.items.add(new File(['audio'],'团队上传测试.flac',{type:'audio/flac'}));return dt;});await page.locator('#audio-upload-drop').dispatchEvent('drop',{dataTransfer:dt});await expect(page.locator('#audio-upload-submit')).toBeEnabled();await page.locator('#audio-upload-submit').click();
  const row=page.locator('.ws-recording-table tbody tr').filter({hasText:'团队上传测试'});await expect(row).toHaveCount(1);await expect(row).toContainText('文件上传');await expect(row).toContainText('待处理');await row.locator('[data-ws-action=file]').click();await expect(page.locator('#md-content')).toContainText('未上传原音频');
  await page.locator('#home-entry').click();await page.reload();await expect(row).toHaveCount(1);
  await entry.click();await page.locator('#audio-upload-input').setInputFiles(file('不应保存.wav'));await page.keyboard.press('Escape');await expect(page.locator('.ws-recording-table')).not.toContainText('不应保存');
  await page.locator('#ws-switcher').click();await team(page,'personal');await expect(page.locator('#meeting-list')).not.toContainText('团队上传测试');
  if(process.env.UPLOAD_CAPTURE){await expect(page.locator('#ws-toast')).toBeHidden();await page.screenshot({animations:'disabled',path:'src/prototype/prd/images/home.png'});}
});

test('read-only team cannot upload; storage failure retains the selected file',async({page})=>{
  await page.goto(app);await page.locator('[data-audio-upload]').first().click();await page.locator('#audio-upload-input').setInputFiles(file('失败重试.mp3'));
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='eureka:audio-uploads:v1')throw new DOMException('Full','QuotaExceededError');return original.call(this,k,v);};});await page.locator('#audio-upload-submit').click();await expect(page.locator('#audio-upload-error')).toContainText('存储空间不足');await expect(page.locator('#audio-upload-file')).toContainText('失败重试.mp3');await expect(page.locator('#meeting-list')).not.toContainText('失败重试');
  await page.keyboard.press('Escape');await page.locator('#ws-switcher').click();await team(page);await page.evaluate(()=>{const key='eureka:workspaces:v2';const d=JSON.parse(localStorage.getItem(key)!);d.spaces.find((s:{id:string})=>s.id==='team-eureka').status='expired';localStorage.setItem(key,JSON.stringify(d));});await page.reload();await page.locator('.ws-team-home-head [data-audio-upload]').click();await expect(page.locator('#audio-upload-dialog')).not.toBeVisible();await expect(page.locator('#toast')).toContainText('只读');
});
