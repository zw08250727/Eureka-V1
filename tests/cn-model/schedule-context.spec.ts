import { test, expect } from '@playwright/test';
import './market-context';
import { schedulePhase, buildScheduleContext } from '../../src/features/personal/schedule-context';
import { readScheduleContext } from '../../src/features/personal/schedule-context-repository';
import { createWorkspaceStore, M } from '../../src/features/spaces/model/store';
import { createActions, type Contact } from '../../src/features/personal/store';
import type { ActionRecord } from '../../src/features/workbench/model/types';

const schedule = (source = 'manual'): ActionRecord => ({id:'schedule-richen',type:'schedule',title:'跟日辰集团的需求沟通',start:'2026-10-19T14:00',end:'2026-10-19T15:00',source,participants:'李明',location:'线上会议',notes:'确认试点范围',links:[],created:'2026-10-18T08:00',updated:'',done:false,reminder:'none'});
test('schedule phases use exact boundaries and never infer missing or cancelled dates', () => {
  const r = schedule(), start = new Date(r.start), end = new Date(r.end);
  expect(schedulePhase(r,new Date(+start-1))).toBe('before');
  expect(schedulePhase(r,start)).toBe('during');
  expect(schedulePhase(r,new Date(+end-1))).toBe('during');
  expect(schedulePhase(r,end)).toBe('after');
  expect(schedulePhase({...r,end:''})).toBe('unscheduled');
  expect(schedulePhase({...r,status:'canceled'},start)).toBe('unscheduled');
});
test('all schedule sources carry entities, completed todos, meeting evidence and grounded default prompts', () => {
  for (const source of ['manual','capture','agent','device','dingtalk','feishu','system']) {
    const r = schedule(source);
    const context = buildScheduleContext({record:r,actions:[r,{...r,id:'history',type:'todo',title:'日辰集团报价确认',done:true}],thoughts:[],contacts:[],meetings:[{id:'past-meeting',title:'日辰集团初访',created:'2026-10-18',summary:'确定先启动试点',transcript:''},{id:'deleted',title:'日辰集团已删除会议',created:'2026-10-18',summary:'不可见',transcript:'',deleted:true}],space:'personal',actor:'zhang',market:'cn',now:new Date('2026-10-19T13:00')});
    expect(context.entities).toContain('日辰集团');
    expect(context.assets.map(a=>a.id)).toEqual(['history','past-meeting']);
    expect(context.assets.find(a=>a.id==='history')?.text).toContain('已完成');
    expect(context.record).toEqual(r);
    expect(context.prompt).toContain('请根据当前日程信息，识别相关企业、机构、人物或产品，帮助我做好会前准备。');
    expect(context.prompt).toContain('未检索到的信息明确说明');
    expect(context.prompt).toContain('并标注来源与时间');
    expect(context.publicSearches[0].url).toContain('baidu.com');
  }
});
test('verified contact meeting references work without title keywords; explicit links survive unknown entities', () => {
  const record={...schedule(),title:'项目沟通',participants:'',notes:'',contactId:'contact',links:['linked']};
  const contact:Contact={id:'contact',name:'李明',company:'日辰集团',role:'业务经理',summary:'试点合作',initials:'李',tag:'客户',count:1,recent:'2026-10-18',region:'',email:'',themes:[],memories:[],inferences:[],interactions:[{id:'related',occurredAt:'2026-10-18',verifiedParticipation:true,sourceAvailable:true,themes:[]}]};
  const context=buildScheduleContext({record,actions:[record],thoughts:[],contacts:[contact],meetings:['related','linked','unrelated'].map(id=>({id,title:'沟通记录',created:'2026-10-18',summary:'记录原文',transcript:''})),space:'personal',actor:'zhang',market:'global'});
  expect(context.assets.filter(a=>a.kind==='会议').map(a=>a.id).sort()).toEqual(['linked','related']);
  expect(context.publicSearches[0].url).toContain('google.com');
});
test('context resolver enforces member visibility, expiry and removal on every call', async () => {
  const values=new Map<string,string>();
  const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}} as Storage;
  Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent(){}}});
  try {
    const repo=createWorkspaceStore(storage);
    repo.change(s=>{const w=M.get(s,'team-eureka');w.members.find(m=>m.id==='kevin')!.role='member';
      const file=w.files[0];
      w.files.push({...file,id:'visible',title:'日辰集团会议',owner:'kevin',shared:[],deleted:false,summary:'日辰集团已确认试点'});
      w.files.push({...file,id:'private',title:'日辰集团私有会议',owner:'zhang',shared:[],deleted:false});
    });
    createActions(storage,()=>new Date(),'kevin','team-eureka').save(schedule());
    const context=await readScheduleContext(storage,'cn','team-eureka','kevin',schedule().id);
    expect(context.assets.some(a=>a.id==='visible')).toBe(true);
    expect(context.assets.some(a=>a.id==='private')).toBe(false);
    repo.reload();repo.change(s=>{M.get(s,'team-eureka').status='expired';});
    await expect(readScheduleContext(storage,'cn','team-eureka','kevin',schedule().id)).rejects.toThrow();
    repo.change(s=>{const w=M.get(s,'team-eureka');w.status='active';w.members.find(m=>m.id==='kevin')!.status='removed';});
    await expect(readScheduleContext(storage,'cn','team-eureka','kevin',schedule().id)).rejects.toThrow('访问权限');
  } finally {Reflect.deleteProperty(globalThis,'window');}
});
