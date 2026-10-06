/* Local-only account/workspace simulation. No payment, email or remote AI calls. */
(function (global) {
  'use strict';
  const KEY = 'eureka:workspaces:v2';
  const SELF = 'zhang';
  const clone = x => JSON.parse(JSON.stringify(x));
  const id = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const stamp = () => new Date().toISOString();
  const price = cycle => cycle === 'year' ? 159 * 12 : 199;
  const fail = message => { throw new Error(message); };
  const person = (uid,name,email,role='member',status='active') => ({id:uid,name,email,role,status,joined:'2026-10-01'});
  const file = (uid,title,owner,shared=[],duration=32) => ({id:uid,title,owner,shared,duration,created:'2026-10-06 10:30',source:'网页录音',summary:`本次会议围绕「${title}」展开，明确本阶段目标、交付范围与协作分工。\n\n下一步：补齐客户反馈，确认方案负责人，并在下次例会跟进交付进度。`,transcript:'00:00 张伟：今天先确认目标与交付范围。\n02:15 林晓：建议优先处理客户反馈，再安排下一轮演示。\n05:40 Kevin：我来补充执行计划，周五一起确认。',deleted:false});
  const baseTeam = (uid,name,members,seats=5) => ({id:uid,type:'team',name,country:'中国',members,seats,cycle:'year',status:'active',renew:true,nextDate:'2027-10-06',pendingSeats:null,files:[],contacts:[],threads:[],credits:{total:50000,used:0,logs:[]},billing:{company:name,email:'finance@eureka.example',taxId:'',method:'Visa ···· 4242'},invoices:[],audit:[],security:{externalSharing:false}});
  function seed() {
    const a = baseTeam('team-eureka','EurekaMind 产品团队',[person(SELF,'张伟','zhang.wei@eureka.example','admin'),person('lin','林晓','lin.xiao@eureka.example','admin'),person('kevin','Kevin','kevin@eureka.example'),person('alice','Alice','alice@eureka.example','member','pending')],6);
    a.files=[file('team-review','团队产品周会 · 十月路线图',SELF),file('team-customer','客户共创访谈 · 交付流程','lin',[SELF]),file('team-private','林晓的个人绩效沟通','lin'),file('team-market','海外市场验证方案','kevin',[SELF],46)];
    a.contacts=[{id:'c-team-1',name:'陈明',company:'星海科技',role:'客户成功负责人',summary:'周五确认试点验收标准，需准备最新交付方案。'},{id:'c-team-2',name:'李悦',company:'远山资本',role:'投资经理',summary:'已共享产品进展，等待下一轮演示时间。'}];
    a.credits.used=12400; a.credits.logs=[{id:'usage-1',user:SELF,task:'十月产品周会行动项',amount:200,time:'2026-10-06 09:35'},{id:'usage-2',user:'lin',task:'历史 AI 使用',amount:12200,time:'2026-10-05 17:20'}];
    a.invoices=[{id:'INV-20261006-001',date:'2026-10-06',amount:price('year')*6,label:'Team 年付 · 6 席位',status:'已支付'}];
    a.audit=[{time:'2026-10-06 09:00',actor:'张伟',action:'邀请 Alice 加入团队'}];
    const b = baseTeam('team-design','设计共创空间',[person('lin','林晓','lin.xiao@eureka.example','admin'),person(SELF,'张伟','zhang.wei@eureka.example')],3);
    b.files=[file('design-file','设计评审 · 新版工作台','lin',[SELF]),file('design-own','我的设计调研笔记',SELF)];
    return {version:2,account:{id:SELF,name:'张伟',email:'zhang.wei@eureka.example'},activeId:'personal',spaces:[{id:'personal',type:'personal',name:'个人工作空间',plan:'Pro',files:[],threads:[],members:[person(SELF,'张伟','zhang.wei@eureka.example','admin')],credits:{total:3000,used:0,logs:[]}},a,b],devices:[{id:'dev-personal',name:'我的 Eureka Note',serial:'EK-N-20260018',model:'Note',spaceId:'personal',user:SELF,lastSync:'2026-10-06 09:32'},{id:'dev-team',name:'产品团队录音卡',serial:'EK-N-20260026',model:'Note Pro',spaceId:a.id,user:'lin',lastSync:'2026-10-06 10:15'}],invitations:[{id:'invite-growth',teamName:'增长研究小组',admin:'王晨',email:'zhang.wei@eureka.example',status:'pending'}],orders:[]};
  }
  const get = (s,uid=s.activeId) => s.spaces.find(w=>w.id===uid) || fail('工作空间不存在');
  const member = (w,uid=SELF) => w.members.find(m=>m.id===uid && m.status==='active');
  const admin = (w,uid=SELF) => member(w,uid)?.role==='admin';
  const usedSeats = w => w.members.filter(m=>m.status!=='removed').length;
  const writable = w => { if(w.type==='team' && w.status!=='active') fail('工作空间处于只读状态，请恢复订阅后再操作'); };
  const govern = (w,uid=SELF) => { if(!admin(w,uid)) fail('仅管理员可执行此操作'); };
  const access = (w,uid=SELF) => { if(!member(w,uid)) fail('你没有此工作空间的访问权限'); };
  const log = (w,action,uid=SELF) => { if(w.type==='team')w.audit.unshift({time:stamp(),actor:member(w,uid)?.name||uid,action}); };
  const teamRecording = (w,f) => w.type==='team'&&f.visibility==='team'&&f.recordedWorkspaceId===w.id;
  const visible = (w,uid=SELF) => { access(w,uid); return w.files.filter(f=>!f.deleted&&(teamRecording(w,f)||f.owner===uid||f.shared.includes(uid))); };
  const getFile = (w,fid,uid=SELF) => visible(w,uid).find(f=>f.id===fid) || fail('文件不存在或未获得访问权限');
  function create(s,{name,country,cycle,seats,orderId}) {
    name=String(name||'').trim(); seats=Number(seats);
    if(!name||name.length>40)fail('请输入 1–40 字的工作空间名称');
    if(!country)fail('请选择国家或地区');
    if(!['year','month'].includes(cycle)||!Number.isInteger(seats)||seats<2||seats>50)fail('请选择 2–50 个席位及有效计费周期');
    const done=s.orders.find(o=>o.id===orderId); if(done)return get(s,done.spaceId);
    const w=baseTeam(id('team'),name,[person(SELF,s.account.name,s.account.email,'admin')],seats);
    w.country=country;w.cycle=cycle;w.nextDate=cycle==='year'?'2027-10-06':'2026-11-06';
    const invoice={id:id('INV'),date:stamp(),amount:price(cycle)*seats,label:`Team ${cycle==='year'?'年付':'月付'} · ${seats} 席位`,status:'已支付'};
    w.invoices.push(invoice);s.spaces.push(w);s.orders.push({id:orderId,spaceId:w.id});s.activeId=w.id;log(w,'创建工作空间并开通 Team');return w;
  }
  function invite(w,emails,role='member',actor=SELF) {
    govern(w,actor);writable(w);
    if(!['admin','member'].includes(role))fail('请选择有效角色');
    const list=[...new Set(String(emails).split(/[,，;；\s]+/).filter(Boolean).map(v=>v.toLowerCase()))];
    if(!list.length||list.some(v=>!/^\S+@\S+\.\S+$/.test(v)))fail('请填写有效的邮箱，可用逗号分隔');
    if(list.some(email=>w.members.some(m=>m.email.toLowerCase()===email&&m.status!=='removed')))fail('部分邮箱已加入或已被邀请，请移除重复邮箱');
    if(usedSeats(w)+list.length>Math.min(w.seats,w.pendingSeats??w.seats))fail('可用席位不足，请先增加席位或取消已安排的减席');
    const added=list.map(email=>person(id('member'),email.split('@')[0],email,role,'pending'));w.members.push(...added);log(w,`邀请 ${list.length} 位成员`,actor);return added;
  }
  function memberAction(s,w,mid,action,value,actor=SELF) {
    govern(w,actor);writable(w);const m=w.members.find(m=>m.id===mid&&m.status!=='removed')||fail('成员不存在');
    if(action==='role'&&!['admin','member'].includes(value))fail('角色无效');
    if(m.role==='admin'&&m.status==='active'&&(action==='remove'||action==='role'&&value!=='admin')&&w.members.filter(m=>m.role==='admin'&&m.status==='active').length<=1)fail('必须至少保留一位管理员');
    if(action==='remove') { if(mid===actor)fail('请使用退出工作空间入口');m.status='removed';s.devices.filter(d=>d.spaceId===w.id&&d.user===mid).forEach(d=>{d.spaceId=null;}); }
    else if(action==='role')m.role=value;
    else if(action==='accept') {if(m.status!=='pending')fail('此邀请已处理');m.status='active';}
    else if(action==='resend') {if(m.status!=='pending')fail('仅待接受的邀请可以重发');m.sentAt=stamp();}
    else fail('操作无效');
    log(w,`${{remove:'移除',role:'调整角色',accept:'模拟接受邀请',resend:'重发邀请'}[action]}：${m.name}`,actor);
  }
  function seats(w,count,actor=SELF) {
    govern(w,actor);writable(w);count=Number(count);
    if(!Number.isInteger(count)||count<Math.max(2,usedSeats(w))||count>50)fail(`席位须为 ${Math.max(2,usedSeats(w))}–50，待接受邀请也占用席位`);
    if(count<w.seats)w.pendingSeats=count;
    else {if(count>w.seats)w.invoices.unshift({id:id('INV'),date:stamp(),amount:(count-w.seats)*price(w.cycle),label:`增加 ${count-w.seats} 席位（演示整周期计费）`,status:'已支付'});w.seats=count;w.pendingSeats=null;}
    log(w,`调整席位至 ${count}`,actor);
  }
  function advanceCycle(w,actor=SELF) {
    govern(w,actor);
    if(!w.renew){w.status='expired';log(w,'账期结束，空间进入只读',actor);return;}
    if(w.pendingSeats!=null){if(w.pendingSeats<usedSeats(w))fail('当前成员数量超过计划席位，请先调整成员');w.seats=w.pendingSeats;w.pendingSeats=null;}
    if(w.pendingCycle){w.cycle=w.pendingCycle;w.pendingCycle=null;}
    w.status='active';
    const next=new Date(w.nextDate+'T12:00:00Z');if(w.cycle==='year')next.setUTCFullYear(next.getUTCFullYear()+1);else next.setUTCMonth(next.getUTCMonth()+1);
    const paidOn=w.nextDate;w.nextDate=next.toISOString().slice(0,10);
    w.invoices.unshift({id:id('INV'),date:paidOn,amount:w.seats*price(w.cycle),label:`模拟续费 · ${w.seats} 席位`,status:'已支付'});log(w,'模拟进入下一账期',actor);
  }
  function addFile(w,{title,summary,transcript,source='网页录音',duration=0},uid=SELF) {
    access(w,uid);writable(w);title=String(title||'').trim();if(!title)fail('请输入文件名称');
    duration=Number(duration);if(!Number.isFinite(duration)||duration<0||duration>1440)duration=0;const f=file(id('file'),title.slice(0,150),uid,[],duration);f.created=stamp();f.source=source;if(summary!=null)f.summary=String(summary).slice(0,100000);if(transcript!=null)f.transcript=String(transcript).slice(0,100000);f.size=(duration*.82).toFixed(1)+' MB';f.creator=member(w,uid)?.name||uid;f.tags=['会议记录'];f.status='已总结';f.updated=f.created;f.detail={};w.files.unshift(f);log(w,`创建私有文件：${f.title}`,uid);return f;
  }
  function edit(w,fid,patch,uid=SELF) {writable(w);const f=getFile(w,fid,uid);if(f.owner!==uid)fail('仅文件所有者可以编辑');if(patch.title!=null){if(!String(patch.title).trim())fail('文件名称不能为空');f.title=String(patch.title).trim().slice(0,150);}['summary','transcript'].forEach(k=>{if(patch[k]!=null)f[k]=String(patch[k]).slice(0,100000);});log(w,`编辑文件：${f.title}`,uid);return f;}
  function share(w,fid,users,uid=SELF) {writable(w);const f=getFile(w,fid,uid);if(teamRecording(w,f))fail('团队设备录音已向团队成员开放，无需分享');if(f.owner!==uid)fail('仅文件所有者可以管理分享');if(users.some(u=>!member(w,u)||u===uid))fail('只能邀请当前空间内的有效成员');f.shared=[...new Set(users)];log(w,`更新文件访问权限：${f.title}`,uid);}
  function trash(w,fid,restore=false,uid=SELF) {access(w,uid);writable(w);const f=w.files.find(f=>f.id===fid&&f.owner===uid)||fail('只有文件所有者可以操作');if(restore&&f.deletedAt&&Date.now()-new Date(f.deletedAt).getTime()>=30*86400000)fail('录音已超过 30 天恢复期限');f.deleted=!restore;f.deletedAt=restore?null:stamp();log(w,`${restore?'恢复':'移入回收站'}：${f.title}`,uid);}
  function exportFile(w,fid,uid=SELF) {return {format:'eureka-note-v1',title:getFile(w,fid,uid).title,summary:getFile(w,fid,uid).summary,transcript:getFile(w,fid,uid).transcript,duration:getFile(w,fid,uid).duration};}
  function importFile(w,data,uid=SELF) {if(data?.demo===true&&typeof data.title==='string'&&typeof data.content==='string')data={format:'eureka-note-v1',title:data.title,summary:data.type==='summary'?data.content:'',transcript:data.type==='summary'?'':data.content};if(!data||data.format!=='eureka-note-v1'||typeof data.title!=='string'||typeof data.summary!=='string'||typeof data.transcript!=='string')fail('请选择 EurekaMind 导出的 JSON 文件');return addFile(w,{...data,source:'手动导入'},uid);}
  function registerDevice(s,wid,{serial,model,user},uid=SELF) {
    const w=get(s,wid);access(w,uid);writable(w);
    if(user!==uid&&!admin(w,uid))fail('仅管理员可以为其他成员录入设备');
    const owner=member(w,user)||fail('请选择当前空间内已加入的有效成员');
    // SN is an identifier: preserve long numeric values and leading zeroes as text.
    if(typeof serial!=='string')fail('请以文本填写 SN 码');
    serial=serial.trim().toUpperCase();model=String(model||'').trim();
    if(!/^[A-Z0-9-]{1,64}$/.test(serial))fail('SN 码须为 1–64 位字母、数字或短横线');
    if(!model||model.length>40)fail('请填写 1–40 字的设备型号');
    if(s.devices.some(d=>String(d.serial).trim().toUpperCase()===serial))fail('该 SN 码已录入，请勿重复添加；已有设备请使用绑定入口');
    const d={id:id('device'),name:`${owner.name}的 ${model}`,serial,model,spaceId:wid,user,createdAt:stamp(),registeredBy:uid,registrationMethod:'manual',lastSync:null};
    s.devices.push(d);log(w,`录入设备 ${serial} · ${model}，绑定成员：${owner.name}`,uid);return d;
  }
  function bind(s,did,wid,uid=SELF) {const d=s.devices.find(d=>d.id===did)||fail('设备不存在');if(d.user!==uid)fail('只能绑定自己的设备');const w=get(s,wid);access(w,uid);writable(w);d.spaceId=wid;log(w,`模拟 App 重新绑定设备：${d.name}`,uid);}
  function sync(s,did,uid=SELF) {const d=s.devices.find(d=>d.id===did)||fail('设备不存在');if(d.user!==uid)fail('只能同步自己的设备');if(!d.spaceId)fail('设备尚未绑定工作空间');const w=get(s,d.spaceId);const f=addFile(w,{title:`${d.name} · 新录音`,source:d.model,duration:12},uid);f.deviceId=d.id;f.origin='device';f.recordedWorkspaceId=w.id;f.visibility=w.type==='team'?'team':'private';d.lastSync=stamp();if(w.type==='team')log(w,`团队设备录音自动进入会议：${f.title}`,uid);return {space:w,file:f};}
  // Cross-meeting signals are derived only from currently readable summaries.
  // These rules model the experience; they are not a remote AI inference service.
  function insights(w,uid=SELF) {
    const files=visible(w,uid).filter(f=>f.status==='已总结');
    const evidence=pattern=>files.flatMap(f=>{
      const quote=String(f.summary||'').split(/(?<=[。！？])|\n/).map(x=>x.trim()).find(x=>pattern.test(x));
      return quote?[{fileId:f.id,title:f.title,owner:f.owner,created:f.created,quote}]:[];
    });
    const rules=[
      {id:'delivery-risk',topic:'星海试点',kind:'risk',label:'交付预警',title:'客户承诺与研发排期相差 5 天',description:'渠道已承诺 10 月 12 日交付，研发计划 10 月 17 日完成联调；试点验收可能受到影响。',impact:'涉及客户预期与试点验收，需要销售、研发共同核实。',next:'核实 10 月 12 日承诺的交付范围，确认是否依赖 10 月 17 日的联调结果，再统一对外口径。',patterns:[/星海.*10 月 12 日.*交付/,/星海.*10 月 17 日.*联调/]},
      {id:'ownership-gap',topic:'星海试点',kind:'gap',label:'协作断点',title:'验收标准已明确，异常处理仍未对齐',description:'客户把同步失败重试列为验收条件，交付评审仍未明确异常处理流程。',impact:'客户要求已进入团队视野，但交付闭环尚缺一环。',next:'对照客户验收条件与交付检查表，确认同步异常的处理流程、负责人和验收证据。',patterns:[/星海.*同步失败重试.*验收/,/尚待确认设备同步异常.*处理流程/]},
      {id:'customer-pattern',topic:'跨会议追溯',kind:'opportunity',label:'需求共识',title:'跨会议追溯，正在成为共同需求',description:'客户共创与用户访谈都指向同一价值：从结论找到原始讨论，并延续上下文。',impact:'跨成员收集的反馈汇成产品方向，可作为路线图优先级的依据。',next:'把两场会议的原始需求对照整理，区分客户明确要求与产品推断，形成待评审的优先级建议。',patterns:[/客户共创.*会议纪要可追溯/,/用户访谈.*跨会议检索与上下文延续/]}
    ];
    const items=rules.flatMap(r=>{
      const groups=r.patterns.map(evidence);if(groups.some(g=>!g.length))return [];
      const sources=[...new Map(groups.flat().map(e=>[e.fileId,e])).values()];
      if(sources.length<2||new Set(sources.map(e=>e.owner)).size<2)return [];
      return [{...r,patterns:undefined,sources}];
    });
    // Related observations form one narrative topic, not one UI slot per category.
    const topics=new Map();for(const item of items){const group=topics.get(item.topic)||[];group.push(item);topics.set(item.topic,group);}
    const findings=[...topics.values()].map(group=>group.length===1?group[0]:({...group[0],title:'星海试点的交付承诺与验收准备尚未对齐',description:group.map(i=>i.description).join(''),impact:group.map(i=>i.impact).join(''),next:group.map(i=>i.next).join(''),sources:[...new Map(group.flatMap(i=>i.sources).map(e=>[e.fileId,e])).values()]}));
    return {items:findings,meetings:files.length,members:new Set(files.map(f=>f.owner)).size};
  }
  function history(w,uid=SELF) {
    const ids=new Set(visible(w,uid).map(f=>f.id));
    return (w.threads||[]).filter(t=>!t.contactId&&(t.user===uid||t.visibility==='team')&&(t.files||[]).every(fid=>ids.has(fid))).slice().sort((a,b)=>new Date(String(b.time).replace(' ','T')).getTime()-new Date(String(a.time).replace(' ','T')).getTime());
  }
  function getThread(w,tid,uid=SELF) {return history(w,uid).find(t=>t.id===tid)||fail('会话已失效或无权访问，请选择其他会话');}
  function conversation(w,tid,uid=SELF) {
    const list=[],seen=new Set();let current=getThread(w,tid,uid);
    while(current&&!seen.has(current.id)&&list.length<20){list.unshift(current);seen.add(current.id);current=current.parentThreadId?history(w,uid).find(t=>t.id===current.parentThreadId):null;}
    return list;
  }
  function ask(w,prompt,fid,uid=SELF,historyId=null) {
    access(w,uid);writable(w);prompt=String(prompt).trim();if(!prompt)fail('请输入问题');
    const previous=historyId?getThread(w,historyId,uid):null;
    const insight=!previous&&!fid&&insights(w,uid).items.find(i=>prompt.includes(i.title));
    if(!previous&&!fid&&!insight&&/星海试点的交付承诺与验收准备尚未对齐|客户承诺与研发排期相差 5 天|验收标准已明确，异常处理仍未对齐|跨会议追溯，正在成为共同需求/.test(prompt))return {answer:'该团队线索的来源或内容已变化，当前依据不足，请返回首页查看最新线索。本次未扣积分。',cost:0};
    let files=previous?(previous.files||[]).map(fid=>getFile(w,fid,uid)):insight?insight.sources.map(e=>getFile(w,e.fileId,uid)):fid?[getFile(w,fid,uid)]:visible(w,uid);
    if(!previous&&!fid&&!insight&&/客户|反馈/.test(prompt))files=files.filter(f=>/客户|访谈|试点|验收/.test(f.title));
    if(!previous&&!insight)files=files.slice().sort((a,b)=>String(b.created).localeCompare(String(a.created))).slice(0,3);
    if(!files.length)return {answer:'当前没有可引用的相关会议。请先录音、导入纪要，或调整问题。',cost:0};
    if(w.credits.total-w.credits.used<200)fail('AI 积分不足，请联系管理员补充');
    const excerpts=files.map((f,i)=>`${i+1}. 「${f.title}」\n${f.summary.split('\n').filter(Boolean)[0].slice(0,300)}`).join('\n\n');
    const label=/对比|决策/.test(prompt)?'会议决策对照':/客户|反馈/.test(prompt)?'客户反馈摘要':/简报|总结/.test(prompt)?'团队会议简报':'会议上下文与下一步';
    const next=/对比|决策/.test(prompt)?'以上按来源并列展示会议结论；未在纪要中明确的差异与负责人，需要回到原录音确认。':/客户|反馈/.test(prompt)?'建议在下次沟通前，逐项确认客户提出的问题、对应方案和验收口径。':'建议围绕上述结论，确认负责人、交付范围与仍待澄清的问题。';
    const answer=previous?`接续「${previous.title||previous.prompt}」\n\n关于「${prompt}」，仍基于原会话的 ${files.length} 场会议：\n\n${excerpts}\n\n${next}\n\n本地模拟 · 未通知成员或创建任务。`:insight?`${insight.label}\n${insight.title}\n\n${insight.description}\n\n会议依据\n${insight.sources.map(e=>`「${e.title}」 · ${w.members.find(m=>m.id===e.owner)?.name||e.owner}\n${e.quote}`).join("\n\n")}\n\n建议核实\n${insight.next}\n\n以上为跨会议线索，不代表已确认风险或已通知成员。仅引用当前授权资料；本地模拟。`:`${label}\n\n${excerpts}\n\n${next}\n\n引用 ${files.length} 份已授权资料；此结果为本地模拟。`;
    w.credits.used+=200;w.credits.logs.unshift({id:id('usage'),user:uid,task:prompt.slice(0,80),amount:200,time:stamp()});
    const thread={id:id('chat'),user:uid,prompt,answer,time:stamp(),files:files.map(f=>f.id),visibility:'private',...(previous?{parentThreadId:previous.id}: {})};
    w.threads.unshift(thread);return {answer,cost:200,threadId:thread.id};
  }
  function acceptInvite(s,iid) {const i=s.invitations.find(i=>i.id===iid&&i.status==='pending')||fail('邀请已失效或已处理');const w=baseTeam(id('team'),i.teamName,[person('wang','王晨','wang.chen@eureka.example','admin'),person(SELF,s.account.name,s.account.email)],3);w.files=[file(id('file'),'欢迎加入 · 研究项目说明','wang',[SELF])];s.spaces.push(w);i.status='accepted';s.activeId=w.id;return w;}
  // Versioned, additive migration: never replace user recordings or edited contacts.
  function enrich(s) {
    for (const w of s.spaces.filter(w=>w.type==='team')) {
      if (!w.recordingWorkbenchVersion) {
        if (w.id==='team-eureka') {
          const demos=[['delivery','交付验收标准评审','lin',38,'合并录音','交付评审'],['pilot','星海试点复盘',SELF,42,'W2','客户复盘'],['research','语音记录用户访谈','kevin',27,'M1','用户研究'],['planning','研发迭代排期确认',SELF,35,'网页录音','研发排期'],['sales','渠道合作沟通','lin',51,'W1','商务沟通'],['design','录音详情交互评审',SELF,29,'W-PEN','设计评审'],['launch','产品发布准备会','kevin',44,'合并录音','产品发布'],['retro','团队协作复盘',SELF,32,'网页录音','团队复盘']];
          demos.forEach(([key,title,owner,duration,source,tag],i)=>{const fid='team-demo-'+key;if(!w.files.some(f=>f.id===fid))w.files.push({...file(fid,title,owner,owner===SELF?[]:[SELF],duration),source,tags:[tag],created:`2026-10-${String(6-Math.floor(i/2)).padStart(2,'0')} ${i%2?'16:00':'09:30'}`});});
          const people=[['c-team-3','周宁','云帆制造','数字化负责人','确认设备接入与试点扩容计划。'],['c-team-4','王珊','启明渠道','合作伙伴经理','下周一起复核渠道演示材料。']];
          for(const [id,name,company,role,summary] of people)if(!w.contacts.some(c=>c.id===id))w.contacts.push({id,name,company,role,summary});
        }
        w.recordingWorkbenchVersion=1;
      }
      w.contactNotes ||= {};w.contactTasks ||= [];
      w.contacts.forEach((c,i)=>{const defaults={initials:c.name.slice(0,2),region:'中国',email:'',tag:i%2?'待回复':'需关注',count:6+i,recent:'2 天前',themes:['产品试点','交付方案'],commitments:[[c.summary,'2026/10/09','待跟进']],myCommitments:[['准备下一轮演示资料','2026/10/08','进行中']],timeline:[['方案沟通','2026/10/06 · 团队会议',c.summary]],memories:[c.summary],inferences:[]};for(const [k,v]of Object.entries(defaults))if(c[k]==null)c[k]=v;});
      const summaries={
        'team-review':'十月路线图以录音归档、会议检索和团队协作为主线。评审确认先完善共享权限与会议详情，再验证团队使用链路；由产品和研发共同确认交付范围。',
        'team-customer':'客户共创中明确了三个验收重点：会议纪要可追溯、负责人可识别、分享范围可控。客户成功团队将在下一轮试点前提供验收清单。',
        'team-market':'海外渠道访谈集中反馈多语言转写、设备同步与会议导出的需求。市场侧将先验证两个试点场景，再决定是否扩大投放。',
        'team-demo-pilot':'星海试点已完成首轮会议记录验证。客户最关注交付范围与验收口径，建议在扩大试点前补齐共享权限说明和验收清单。',
        'team-demo-delivery':'验收评审统一了会议检索、录音导出和成员共享的检查口径。尚待确认设备同步异常的处理流程，交付团队将补充失败重试案例。',
        'team-demo-research':'用户访谈发现，跨会议检索与上下文延续比文件夹分类更重要。受访者希望保留录音原文入口，并在会议页面直接继续提问。',
        'team-demo-planning':'研发确认先完成团队录音索引与权限校验，再接入异步转写。测试将重点覆盖切换空间、撤回分享与网络异常后的恢复。',
        'team-demo-sales':'渠道合作方希望通过真实客户会议演示产品价值。双方约定先统一演示脚本与试点范围，报价将在交付范围确认后讨论。',
        'team-demo-design':'交互评审确认会议正文采用原位编辑，导出、分享、删除直接展示。Agent 在当前页面展开，桌面小屏必须保留可见输入区。',
        'team-demo-launch':'发布准备会确认演示材料需包含录音、纪要与团队共享完整链路。设备素材与成员邀请说明仍待复核。',
        'team-demo-retro':'团队复盘认为信息重复录入是主要协作成本。后续以会议上下文复用为重点，减少孤立模块和无来源的自动建议。'
      };
      for(const f of w.files)if(summaries[f.id]&&f.summary===`本次会议围绕「${f.title}」展开，明确本阶段目标、交付范围与协作分工。\n\n下一步：补齐客户反馈，确认方案负责人，并在下次例会跟进交付进度。`)f.summary=summaries[f.id];
      if(w.id==='team-eureka'&&!w.teamInsightsVersion){
        const additions={
          'team-demo-pilot':'星海试点复盘再次确认，同步失败重试属于客户验收条件。',
          'team-demo-sales':'星海渠道合作中承诺 10 月 12 日交付设备同步与失败重试能力，客户将据此安排试点验收。',
          'team-demo-planning':'星海试点所需的设备同步与失败重试能力预计 10 月 17 日完成联调，之后才能进入验收。',
          'team-customer':'星海客户明确要求把同步失败重试纳入试点验收条件。'
        };
        for(const [fid,extra] of Object.entries(additions)){
          const f=w.files.find(f=>f.id===fid);
          // Preserve every user-authored edit; enrich only unchanged demo text.
          if(f&&f.summary===summaries[fid])f.summary+='\n\n'+extra;
        }
        w.teamInsightsVersion=1;
      }
      if(w.id==='team-eureka'&&!w.teamDeviceVisibilityVersion){
        // Only known device demo recordings are migrated; never infer ownership from arbitrary text.
        for(const fid of ['team-demo-pilot','team-demo-research','team-demo-sales','team-demo-design']){
          const f=w.files.find(f=>f.id===fid);if(f){f.origin='device';f.recordedWorkspaceId=w.id;f.visibility='team';}
        }
        w.teamDeviceVisibilityVersion=1;
      }
      if(w.id==='team-eureka'&&!w.memberHistoryVersion){
        const demos=[
          ['delivery','lin','星海试点交付对齐','梳理星海试点里客户承诺与验收准备的关键问题。',['team-demo-sales','team-demo-pilot'],'2026-10-07 09:40','渠道沟通承诺 10 月 12 日交付；试点复盘强调同步失败重试属于验收条件。下一步应由渠道与交付共同确认演示范围、重试案例和验收清单。'],
          ['research','kevin','用户访谈中的高频需求','把用户访谈和交互评审串起来，找出值得优先解决的问题。',['team-demo-research','team-demo-design'],'2026-10-07 09:05','两场讨论都强调上下文连续性：用户希望从结论回到录音原文，并继续追问；交互评审确认 Agent 在当前页面展开，小屏也应保留输入区。建议优先验证会议内追问与原位编辑链路。'],
          ['review',SELF,'会议工作台体验复盘','汇总试点复盘和交互评审，整理下一轮体验验证重点。',['team-demo-pilot','team-demo-design'],'2026-10-06 17:20','试点关注交付与验收口径，交互评审关注正文编辑与页面内 Agent。下一轮验证可以覆盖：会议正文原位编辑、设备同步异常重试、小屏连续提问。上述建议尚未创建任务。'],
          ['partner','lin','渠道演示沟通准备','根据渠道合作沟通，整理下一次演示前需要确认的内容。',['team-demo-sales'],'2026-10-06 16:10','先统一真实客户会议的演示脚本与试点范围，再确认设备同步、失败重试能力的交付承诺。报价应在交付范围确认后讨论。']
        ];
        for(const [key,user,title,prompt,files,time,answer] of demos){
          const tid='team-history-'+key;
          // Shared sample conversations only cite known team-visible device recordings.
          if(!w.threads.some(t=>t.id===tid)&&files.every(fid=>w.files.some(f=>f.id===fid&&!f.deleted&&teamRecording(w,f))))w.threads.push({id:tid,user,title,prompt,answer:answer+'\n\n本地模拟 · 基于团队会议记录，未连接 AI 服务。',files,time,visibility:'team',demo:true});
        }
        w.memberHistoryVersion=1;
      }
      w.files.forEach((f,i)=>{const defaults={size:(f.duration*0.82).toFixed(1)+' MB',creator:w.members.find(m=>m.id===f.owner)?.name||'已移除成员',status:'已总结',tags:['会议记录'],updated:f.created,detail:{}};for(const [k,v]of Object.entries(defaults))if(f[k]==null)f[k]=v;});
    }
    return s;
  }
  function saveDetail(w,fid,patch,uid=SELF) {
    const f=edit(w,fid,patch,uid);
    const allowed=['template','language','detail','speakers','tags','customer','project','location','updated','generated','feedback','verbatim','summaryHtml','verbatimHtml','customerType','projectType'];
    f.detail ||= {};for(const k of allowed)if(patch[k]!=null)f.detail[k]=clone(patch[k]);
    if(patch.tags)f.tags=clone(patch.tags);f.updated=stamp();return f;
  }
  function purge(w,fid,uid=SELF) { access(w,uid);writable(w);const f=w.files.find(f=>f.id===fid&&f.owner===uid&&f.deleted)||fail('只能永久删除自己的回收站录音');w.files=w.files.filter(x=>x!==f);log(w,'永久删除回收站录音',uid); }
  function saveContacts(w,data,uid=SELF) {access(w,uid);writable(w);w.contacts=clone(data.contacts);w.contactNotes=clone(data.notes);w.contactTasks=clone(data.tasks);log(w,'更新联系人关系与跟进',uid);}
  function askContact(w,prompt,cid,uid=SELF) {
    access(w,uid);writable(w);const c=w.contacts.find(c=>c.id===cid)||fail('请先选择联系人');
    if(w.credits.total-w.credits.used<200)fail('AI 积分不足，请联系管理员补充');
    const answer=`基于${c.name}的团队联系人记录：\n\n${c.summary}\n\n开放承诺：${(c.commitments||[]).map(x=>x[0]).join('；')||'暂无'}。\n下一步：确认负责人和截止时间，在沟通后更新备注与跟进任务。\n\n仅引用当前联系人；本地模拟，未连接 AI 服务。`;
    w.credits.used+=200;w.credits.logs.unshift({id:id('usage'),user:uid,task:prompt.slice(0,80),amount:200,time:stamp()});w.threads.unshift({id:id('chat'),user:uid,prompt,answer,time:stamp(),contactId:cid,files:[]});return answer;
  }
  function load(storage) {try {const s=JSON.parse(storage.getItem(KEY));if(s?.version===2&&Array.isArray(s.spaces)&&s.spaces.some(w=>w.id==='personal'))return enrich(s);}catch{/* recover demo state */}return enrich(seed());}
  global.WorkspaceModel={KEY,SELF,id,clone,seed:()=>enrich(seed()),enrich,insights,history,getThread,conversation,saveDetail,saveContacts,askContact,purge,get,member,admin,usedSeats,writable,govern,teamRecording,visible,getFile,price,create,invite,memberAction,seats,advanceCycle,addFile,edit,share,trash,exportFile,importFile,registerDevice,bind,sync,ask,acceptInvite,load,log};
})(typeof window==='undefined'?globalThis:window);
