const assert=require('node:assert/strict');
require('../assets/workspace-model.js');
const M=globalThis.WorkspaceModel;
const s=M.seed(),w=M.get(s,'team-eureka'),other=M.get(s,'team-design');
assert.equal(M.visible(w).length,11);
assert(!M.visible(w).some(f=>f.id==='team-private'));
assert.throws(()=>M.getFile(w,'team-private'),/访问权限/);
assert.throws(()=>M.edit(w,'team-customer',{summary:'override'}),/所有者/);
assert.throws(()=>M.invite(w,'guest@example.com','member','kevin'),/管理员/);
assert.throws(()=>M.invite(w,'not-email'),/有效/);
assert.throws(()=>M.invite(w,'a@example.com,b@example.com,c@example.com'),/不足/);
assert.equal(M.usedSeats(w),4);
const [inv]=M.invite(w,'guest@example.com');assert.equal(M.usedSeats(w),5);
assert.throws(()=>M.invite(w,'guest@example.com'),/已加入/);
M.memberAction(s,w,inv.id,'accept');assert.equal(inv.status,'active');
M.memberAction(s,w,inv.id,'remove');assert.equal(M.usedSeats(w),4);assert.equal(w.seats,6);
M.seats(w,4);assert.equal(w.seats,6);assert.equal(w.pendingSeats,4);
assert.throws(()=>M.invite(w,'blocked@example.com'),/不足/);
M.seats(w,8);assert.equal(w.seats,8);assert.equal(w.pendingSeats,null);
assert.throws(()=>M.seats(w,3),/4–50/);
const own=M.addFile(w,{title:'新记录'});assert.deepEqual(own.shared,[]);
M.share(w,own.id,['kevin']);assert(M.visible(w,'kevin').some(f=>f.id===own.id));
M.share(w,own.id,[]);assert(!M.visible(w,'kevin').some(f=>f.id===own.id));
assert.throws(()=>M.share(w,own.id,['outsider']),/有效成员/);
const exported=M.exportFile(w,own.id);const imported=M.importFile(other,exported);
assert.notEqual(imported.id,own.id);assert.equal(imported.owner,M.SELF);assert.deepEqual(imported.shared,[]);
M.edit(other,imported.id,{summary:'changed'});assert.notEqual(own.summary,imported.summary);
M.trash(w,own.id);assert(!M.visible(w).includes(own));M.trash(w,own.id,true);assert(M.visible(w).includes(own));
const device=s.devices.find(d=>d.id==='dev-personal');s.activeId=w.id;
assert.equal(M.sync(s,device.id).space.id,'personal');
M.bind(s,device.id,w.id);s.activeId='personal';assert.equal(M.sync(s,device.id).space.id,w.id);
assert.throws(()=>M.bind(s,'dev-team','personal'),/自己的设备/);
const credits=w.credits.used;M.ask(w,'整理任务',own.id);assert.equal(w.credits.used,credits+200);assert.equal(M.get(s,'personal').credits.used,0);
assert.throws(()=>M.ask(w,'私有文件','team-private'),/访问权限/);
w.credits.total=w.credits.used;assert.throws(()=>M.ask(w,'分析'),/不足/);
w.status='expired';assert(M.visible(w).length);assert.throws(()=>M.addFile(w,{title:'no'}),/只读/);assert.throws(()=>M.invite(w,'again@example.com'),/只读/);assert.throws(()=>M.ask(w,'分析'),/只读/);
const created=M.create(s,{name:'测试团队',country:'中国',cycle:'month',seats:2,orderId:'idem-1'});
assert.equal(created.files.length,0);assert.equal(created.members.length,1);assert.equal(M.create(s,{name:'测试团队',country:'中国',cycle:'month',seats:2,orderId:'idem-1'}).id,created.id);
assert.throws(()=>M.memberAction(s,created,M.SELF,'role','member'),/至少/);
const joined=M.acceptInvite(s,'invite-growth');assert.equal(M.admin(joined),false);assert.equal(M.visible(joined).length,1);
assert.throws(()=>M.acceptInvite(s,'invite-growth'),/已处理/);
// Manual device entry must retain serial precision and enforce workspace/member boundaries.
const registry=M.seed(),team=M.get(registry,'team-eureka');
const register=(patch={},actor=M.SELF)=>M.registerDevice(registry,team.id,{serial:'474204126010000027',model:'W2',user:'kevin',...patch},actor);
const registered=register();
assert.equal(registered.serial,'474204126010000027');assert.equal(registered.user,'kevin');
assert.equal(registered.spaceId,team.id);assert.equal(registered.lastSync,null);assert.equal(registered.registeredBy,M.SELF);
assert.throws(()=>register(),/已录入/);
assert.throws(()=>register({serial:474204126010000027}),/文本/);
for(const serial of ['', '123 456', '<script>', 'A'.repeat(65)])assert.throws(()=>register({serial}),/SN 码/);
for(const model of ['', '  ', 'A'.repeat(41)])assert.throws(()=>register({serial:'new-sn',model}),/设备型号/);
for(const user of ['alice','outsider',''])assert.throws(()=>register({serial:'new-sn',user}),/有效成员/);
assert.throws(()=>register({serial:'new-sn',user:'lin'},'kevin'),/管理员/);
assert.throws(()=>register({serial:'new-sn'},'alice'),/访问权限/);
const leading=register({serial:' 00000474204126010000027 ',model:' W2 ',user:'kevin'},'kevin');
assert.equal(leading.serial,'00000474204126010000027');assert.equal(leading.model,'W2');
register({serial:'ek-new-device',user:'kevin'},'kevin');
assert.throws(()=>register({serial:' EK-NEW-DEVICE '}),/已录入/);
assert.throws(()=>M.registerDevice(registry,'personal',{serial:registered.serial,model:'W2',user:M.SELF}),/已录入/);
registry.activeId='personal';const synced=M.sync(registry,registered.id,'kevin');
assert.equal(synced.space.id,team.id);assert.equal(synced.file.owner,'kevin');assert.deepEqual(synced.file.shared,[]);
assert.throws(()=>M.sync(registry,registered.id,M.SELF),/自己的设备/);
assert(M.visible(team).some(f=>f.id===synced.file.id));assert(M.teamRecording(team,synced.file));
team.status='expired';assert.throws(()=>register({serial:'another-device'}),/只读/);team.status='active';
M.memberAction(registry,team,'kevin','remove');assert.equal(registered.spaceId,null);
assert.throws(()=>register({serial:'another-device'}),/有效成员/);
assert.throws(()=>register(),/有效成员/);
assert.equal(registry.devices.length,5);
console.log('PASS: workspace isolation, privacy, roles, seats, manual device registration, binding, credits, lifecycle and idempotent creation.');
// Recording workbench migration and shared-component writes stay tenant-scoped.
const parity=M.seed(),pw=M.get(parity,'team-eureka');
M.saveDetail(pw,'team-review',{summary:'我的团队修改',tags:['已评审'],template:'项目评审',generated:{mindmap:true}});
M.enrich(parity);assert.equal(pw.files.length,12);assert.equal(M.getFile(pw,'team-review').summary,'我的团队修改');
assert.equal(M.getFile(pw,'team-review').detail.template,'项目评审');assert.equal(pw.contacts.length,4);
assert.throws(()=>M.saveDetail(pw,'team-customer',{summary:'越权'}),/所有者/);
const contactData={contacts:M.clone(pw.contacts),notes:{'c-team-1':[{text:'试点备注'}]},tasks:[]};M.saveContacts(pw,contactData);
assert.equal(pw.contactNotes['c-team-1'][0].text,'试点备注');assert.equal(M.get(parity,'team-design').contacts.length,0);
const contactCredits=pw.credits.used;const contactAnswer=M.askContact(pw,'准备沟通','c-team-1');assert(contactAnswer.includes('陈明'));assert(!contactAnswer.includes('德国经销商'));assert.equal(pw.credits.used,contactCredits+200);
pw.status='expired';assert.throws(()=>M.saveContacts(pw,contactData),/只读/);assert.throws(()=>M.saveDetail(pw,'team-review',{summary:'no'}),/只读/);pw.status='active';
M.trash(pw,'team-review');M.get(parity,'team-eureka').files.find(f=>f.id==='team-review').deletedAt='2020-01-01';assert.throws(()=>M.trash(pw,'team-review',true),/30 天/);M.purge(pw,'team-review');assert(!pw.files.some(f=>f.id==='team-review'));M.enrich(parity);assert(!pw.files.some(f=>f.id==='team-review'));
console.log('PASS: recording workbench migration, complete detail writes, contact context and recycle permissions.');
const intel=M.get(M.seed(),'team-eureka');
assert(M.ask(intel,'生成团队会议简报').answer.includes('星海试点'));
assert(M.ask(intel,'对比会议中的关键决策').answer.startsWith('会议决策对照'));
assert(M.ask(intel,'梳理客户反馈').answer.startsWith('客户反馈摘要'));
assert(intel.threads.every(t=>!t.files.includes('team-private')));

// Cross-member insight evidence, permissions, migration and contextual analysis.
{
  const state=M.seed(),team=M.get(state,'team-eureka');
  const report=M.insights(team);assert.equal(report.items.length,2);assert.equal(report.members,3);
  for(const item of report.items){
    assert(new Set(item.sources.map(e=>e.owner)).size>=2);
    for(const e of item.sources){assert(M.getFile(team,e.fileId).summary.includes(e.quote));assert.notEqual(e.fileId,'team-private');}
  }
  const risk=report.items.find(i=>i.id==='delivery-risk');
  const balance=team.credits.used;
  const response=M.ask(team,risk.title);assert(response.answer.includes('10 月 12 日'));assert(response.answer.includes('10 月 17 日'));
  assert.equal(team.credits.used,balance+200);assert.deepEqual(new Set(team.threads[0].files),new Set(risk.sources.map(e=>e.fileId)));
  assert(response.answer.includes('星海试点复盘'));
  const sales=team.files.find(f=>f.id==='team-demo-sales');assert.throws(()=>M.share(team,sales.id,[],'lin'),/无需分享/);sales.deleted=true;
  const used=team.credits.used;assert.equal(M.ask(team,risk.title).cost,0);assert.equal(team.credits.used,used);
  assert(!M.insights(team).items.some(i=>i.id==='delivery-risk'));
  sales.deleted=true;assert(!M.insights(team).items.some(i=>i.id==='delivery-risk'));sales.deleted=false;
  const planning=team.files.find(f=>f.id==='team-demo-planning');planning.summary='排期已调整，无旧日期。';assert(!M.insights(team).items.some(i=>i.id==='delivery-risk'));
  delete team.teamInsightsVersion;M.enrich(state);assert.equal(planning.summary,'排期已调整，无旧日期。');
  const count=sales.summary.match(/10 月 12 日/g).length;M.enrich(state);assert.equal(sales.summary.match(/10 月 12 日/g).length,count);
  assert.equal(M.insights(M.get(state,'team-design')).items.length,0);
  assert.throws(()=>M.insights(team,'outsider'),/访问权限/);
}

// Team-bound device recordings are team-owned context without per-recipient sharing.
{
  const state=M.seed(),team=M.get(state,'team-eureka'),personal=M.get(state,'personal');
  const d=state.devices.find(d=>d.id==='dev-personal');
  const old=M.sync(state,d.id).file;assert(!M.teamRecording(personal,old));
  M.bind(state,d.id,team.id);state.activeId='personal';const {file:record}=M.sync(state,d.id);
  assert.equal(record.deviceId,d.id);assert.equal(record.recordedWorkspaceId,team.id);assert.equal(record.visibility,'team');assert.deepEqual(record.shared,[]);
  assert(M.getFile(team,record.id,'kevin'));assert(M.ask(team,'总结团队设备会议',record.id,'kevin').answer.includes(record.title));
  assert.throws(()=>M.getFile(team,record.id,'alice'),/访问权限/);assert.throws(()=>M.getFile(M.get(state,'team-design'),record.id),/访问权限/);
  assert.throws(()=>M.edit(team,record.id,{summary:'unauthorized'},'kevin'),/所有者/);assert.throws(()=>M.share(team,record.id,[]),/无需分享/);
  M.memberAction(state,team,'alice','accept');assert(M.getFile(team,record.id,'alice'));
  M.trash(team,record.id);assert.throws(()=>M.getFile(team,record.id,'kevin'),/访问权限/);M.trash(team,record.id,true);assert(M.getFile(team,record.id,'kevin'));
  M.bind(state,d.id,'personal');assert(M.getFile(team,record.id,'kevin'));const next=M.sync(state,d.id).file;assert(!team.files.some(f=>f.id===next.id));
  M.memberAction(state,team,'kevin','remove');assert.throws(()=>M.getFile(team,record.id,'kevin'),/访问权限/);
  assert.equal(personal.files.find(f=>f.id===old.id).visibility,'private');
}
