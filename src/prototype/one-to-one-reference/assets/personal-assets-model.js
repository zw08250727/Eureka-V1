/* Personal schedule/reminder repository. Local prototype; no remote notification service. */
(function (root) {
  'use strict';
  const KEY='eureka:personal-actions:v1', clone=v=>JSON.parse(JSON.stringify(v));
  const reminders=[['none','不提醒'],['0','开始时'],['5','提前 5 分钟'],['15','提前 15 分钟'],['30','提前 30 分钟'],['60','提前 1 小时'],['120','提前 2 小时'],['1440','提前 1 天']];
  const sources={capture:'闪念提取',manual:'手动创建',agent:'Agent 创建'};
  const stamp=()=>new Date().toISOString(), id=()=>globalThis.crypto?.randomUUID?.()||'action-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  function validDate(v){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v||''))return false;const d=new Date(v+':00+08:00');return Number.isFinite(+d)&&new Date(+d+8*3600000).toISOString().slice(0,16)===v;}
  function validate(r){
    if(!['schedule','todo'].includes(r.type))throw Error('记录类型无效');
    if(!r.title?.trim()||r.title.trim().length>200)throw Error('请填写 1–200 字的标题');
    if(!validDate(r.start))throw Error(r.type==='schedule'?'请选择有效的开始时间':'请选择有效的截止时间');
    if(r.type==='schedule'&&(!validDate(r.end)||r.end<=r.start))throw Error('结束时间必须晚于开始时间');
    if((r.notes||'').length>2000)throw Error('备注不能超过 2000 字');
    if(!reminders.some(([v])=>v===r.reminder))throw Error('请选择有效的提醒时间');
    if(!sources[r.source])throw Error('创建来源无效');
    if((r.location||'').length>300||(r.participants||'').length>300)throw Error('地点和参与人各不能超过 300 字');
  }
  function create(storage, seeds=[]){
    let raw=storage.getItem(KEY), state=raw?JSON.parse(raw):{version:1,records:clone(seeds),meetings:[],sessions:[],settings:{notifications:false}};
    if(state.version!==1||!Array.isArray(state.records)||!Array.isArray(state.meetings)||!Array.isArray(state.sessions))throw Error('个人记录无法读取，请保留浏览器数据并重试');
    function mutate(fn){if(storage.getItem(KEY)!==raw)throw Error('另一页面已更新，请刷新后重试；当前输入仍保留');const next=clone(state);const result=fn(next);const json=JSON.stringify(next);try{storage.setItem(KEY,json);}catch{throw Error('保存失败，浏览器存储不可用或已满；请保留当前输入');}state=next;raw=json;return clone(result??next);}
    return { snapshot:()=>clone(state), seedCalendar(records){if(state.calendarDemoVersion)return;return mutate(s=>{for(const r of records)if(!s.records.some(x=>x.id===r.id)){validate(r);s.records.push(clone(r));}s.calendarDemoVersion=1;});}, reload(){raw=storage.getItem(KEY);if(raw)state=JSON.parse(raw);return clone(state);},
      save(input){return mutate(s=>{const old=s.records.find(r=>r.id===input.id);const r={reminder:'none',notes:'',location:'',participants:'',links:[],done:false,...clone(input),id:input.id||id(),source:old?.source||input.source||'manual',created:old?.created||stamp(),updated:stamp()};validate(r);if(old&&((input.revision||0)!==(old.revision||0)||input.updated!==old.updated))throw Error('这条记录已更新，请重新打开后编辑');r.revision=(old?.revision||0)+1;r.title=r.title.trim();if(old)s.records[s.records.indexOf(old)]=r;else s.records.unshift(r);return r;});},
      settings(patch){return mutate(s=>Object.assign(s.settings,patch));},
      session(session){return mutate(s=>{const old=s.sessions.find(x=>x.id===session.id);if(old)Object.assign(old,session);else s.sessions.push(session);return session;});},
      confirm(sessionId,input){return mutate(s=>{const session=s.sessions.find(x=>x.id===sessionId);if(!session)throw Error('会话不存在，请重新生成草稿');if(session.recordId)return s.records.find(r=>r.id===session.recordId);const r={reminder:'none',notes:'',links:[],done:false,location:'',participants:'',...clone(input),id:id(),type:input.type||'schedule',source:'agent',sessionId,created:stamp(),updated:stamp()};validate(r);r.title=r.title.trim();s.records.unshift(r);session.recordId=r.id;return r;});},
      recording(assetId,title,seconds){return mutate(s=>{const r=s.records.find(x=>x.id===assetId);if(!r)throw Error('关联日程不存在');const meeting={id:id(),title,created:stamp(),seconds,source:'网页录音',assetId};s.meetings.push(meeting);r.links.push(meeting.id);r.updated=stamp();return meeting;});}
    };
  }
  function parse(prompt, now=new Date()){
    const local=new Date(+now+8*3600000), day=local.toISOString().slice(0,10);
    let date=prompt.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if(!date){const offset=prompt.includes('后天')?2:prompt.includes('明天')?1:prompt.includes('今天')?0:null;if(offset!==null)date=new Date(Date.parse(day+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);}
    const times=[...prompt.matchAll(/(\d{1,2})[:：](\d{2})/g)].map(m=>{let h=Number(m[1]);if(/下午|晚上/.test(prompt.slice(0,m.index))&&h<12)h+=12;return String(h).padStart(2,'0')+':'+m[2];});
    if(!times.length){const match=prompt.match(/(上午|下午|晚上)?\s*(\d{1,2})[点时](半|\d{1,2}分)?/);if(match){let h=Number(match[2]);if(/下午|晚上/.test(match[1]||'')&&h<12)h+=12;times.push(String(h).padStart(2,'0')+':'+(match[3]==='半'?'30':String(parseInt(match[3])||0).padStart(2,'0')));}}
    const start=date&&times[0]?date+'T'+times[0]:'';
    let end=date&&times[1]?date+'T'+times[1]:'';
    if(start&&!end&&validDate(start))end=new Date(Date.parse(start+':00+08:00')+8*3600000+30*60000).toISOString().slice(0,16);
    const title=prompt.match(/[「“"]([^」”"]+)[」”"]/)?.[1]||prompt.replace(/\d{4}-\d{2}-\d{2}|今天|明天|后天|\d{1,2}[:：]\d{2}|(上午|下午|晚上)?\s*\d{1,2}[点时](半|\d{1,2}分)?|帮我|请|创建|安排|一个|日程|到|至/g,'').replace(/^[\s，,：:—-]+|[\s，,。]+$/g,'').trim();
    return {type:'schedule',title:title.slice(0,200),start,end,source:'agent',reminder:'15',notes:'',location:'',participants:'',links:[],done:false};
  }
  const today=()=>new Date(Date.now()+8*3600000).toISOString().slice(0,10);
  const shiftDay=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
  function range(day,mode){const d=new Date(day+'T12:00:00Z');if(!Number.isFinite(+d))throw Error('日期无效');if(mode==='day')return [day];const first=mode==='week'?shiftDay(day,-((d.getUTCDay()+6)%7)):day.slice(0,7)+'-01';const start=mode==='month'?shiftDay(first,-((new Date(first+'T12:00:00Z').getUTCDay()+6)%7)):first;return Array.from({length:mode==='month'?42:7},(_,i)=>shiftDay(start,i));}
  const onDay=(r,day)=>r.type==='todo'?r.start.slice(0,10)===day:r.start<shiftDay(day,1)+'T00:00'&&r.end>day+'T00:00';
  const api={today,shiftDay,range,onDay,KEY,create,validate,validDate,parse,reminders,sources,id};if(typeof module!=='undefined')module.exports=api;else root.PersonalAssetsModel=api;
})(typeof window!=='undefined'?window:globalThis);
