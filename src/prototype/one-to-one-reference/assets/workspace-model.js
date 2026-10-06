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
  const visible = (w,uid=SELF) => { access(w,uid); return w.files.filter(f=>!f.deleted&&(f.owner===uid||f.shared.includes(uid))); };
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
    duration=Number(duration);if(!Number.isFinite(duration)||duration<0||duration>1440)duration=0;const f=file(id('file'),title.slice(0,150),uid,[],duration);f.created=stamp();f.source=source;if(summary!=null)f.summary=String(summary).slice(0,100000);if(transcript!=null)f.transcript=String(transcript).slice(0,100000);w.files.unshift(f);log(w,`创建私有文件：${f.title}`,uid);return f;
  }
  function edit(w,fid,patch,uid=SELF) {writable(w);const f=getFile(w,fid,uid);if(f.owner!==uid)fail('仅文件所有者可以编辑');if(patch.title!=null){if(!String(patch.title).trim())fail('文件名称不能为空');f.title=String(patch.title).trim().slice(0,150);}['summary','transcript'].forEach(k=>{if(patch[k]!=null)f[k]=String(patch[k]).slice(0,100000);});log(w,`编辑文件：${f.title}`,uid);return f;}
  function share(w,fid,users,uid=SELF) {writable(w);const f=getFile(w,fid,uid);if(f.owner!==uid)fail('仅文件所有者可以管理分享');if(users.some(u=>!member(w,u)||u===uid))fail('只能邀请当前空间内的有效成员');f.shared=[...new Set(users)];log(w,`更新文件访问权限：${f.title}`,uid);}
  function trash(w,fid,restore=false,uid=SELF) {writable(w);const f=w.files.find(f=>f.id===fid&&f.owner===uid)||fail('只有文件所有者可以操作');f.deleted=!restore;log(w,`${restore?'恢复':'移入回收站'}：${f.title}`,uid);}
  function exportFile(w,fid,uid=SELF) {return {format:'eureka-note-v1',title:getFile(w,fid,uid).title,summary:getFile(w,fid,uid).summary,transcript:getFile(w,fid,uid).transcript,duration:getFile(w,fid,uid).duration};}
  function importFile(w,data,uid=SELF) {if(data?.demo===true&&typeof data.title==='string'&&typeof data.content==='string')data={format:'eureka-note-v1',title:data.title,summary:data.type==='summary'?data.content:'',transcript:data.type==='summary'?'':data.content};if(!data||data.format!=='eureka-note-v1'||typeof data.title!=='string'||typeof data.summary!=='string'||typeof data.transcript!=='string')fail('请选择 EurekaMind 导出的 JSON 文件');return addFile(w,{...data,source:'手动导入'},uid);}
  function bind(s,did,wid,uid=SELF) {const d=s.devices.find(d=>d.id===did)||fail('设备不存在');if(d.user!==uid)fail('只能绑定自己的设备');const w=get(s,wid);access(w,uid);writable(w);d.spaceId=wid;log(w,`模拟 App 重新绑定设备：${d.name}`,uid);}
  function sync(s,did,uid=SELF) {const d=s.devices.find(d=>d.id===did)||fail('设备不存在');if(d.user!==uid)fail('只能同步自己的设备');if(!d.spaceId)fail('设备尚未绑定工作空间');const w=get(s,d.spaceId);const f=addFile(w,{title:`${d.name} · 新录音`,source:d.model,duration:12},uid);d.lastSync=stamp();return {space:w,file:f};}
  function ask(w,prompt,fid,uid=SELF) {access(w,uid);writable(w);prompt=String(prompt).trim();if(!prompt)fail('请输入问题');if(w.credits.total-w.credits.used<200)fail('AI 积分不足，请联系管理员补充');const files=fid?[getFile(w,fid,uid)]:visible(w,uid);const names=files.slice(0,3).map(f=>f.title);const answer=names.length?`已基于${names.map(n=>'「'+n+'」').join('、')}整理下一步：\n\n1. 确认当前方案的负责人和交付范围。\n2. 汇总仍待回应的客户问题。\n3. 在下一次例会前同步行动清单。\n\n引用 ${names.length} 份已授权资料；此结果为本地模拟。`:'当前空间没有可引用的文件。可以先录音或导入资料，再继续这个任务。';if(!names.length)return {answer,cost:0};w.credits.used+=200;w.credits.logs.unshift({id:id('usage'),user:uid,task:prompt.slice(0,80),amount:200,time:stamp()});w.threads.unshift({id:id('chat'),user:uid,prompt,answer,time:stamp(),files:files.map(f=>f.id)});return {answer,cost:200};}
  function acceptInvite(s,iid) {const i=s.invitations.find(i=>i.id===iid&&i.status==='pending')||fail('邀请已失效或已处理');const w=baseTeam(id('team'),i.teamName,[person('wang','王晨','wang.chen@eureka.example','admin'),person(SELF,s.account.name,s.account.email)],3);w.files=[file(id('file'),'欢迎加入 · 研究项目说明','wang',[SELF])];s.spaces.push(w);i.status='accepted';s.activeId=w.id;return w;}
  function load(storage) {try {const s=JSON.parse(storage.getItem(KEY));if(s?.version===2&&Array.isArray(s.spaces)&&s.spaces.some(w=>w.id==='personal'))return s;}catch{/* recover demo state */}return seed();}
  global.WorkspaceModel={KEY,SELF,id,clone,seed,get,member,admin,usedSeats,writable,govern,visible,getFile,price,create,invite,memberAction,seats,advanceCycle,addFile,edit,share,trash,exportFile,importFile,bind,sync,ask,acceptInvite,load,log};
})(typeof window==='undefined'?globalThis:window);
