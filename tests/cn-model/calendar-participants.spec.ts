import {test,expect} from '@playwright/test';
import './market-context';
import {createActions} from '../../src/features/personal/store';
import {createWorkspaceStore,M} from '../../src/features/spaces/model/store';
import {participantSharingCandidates,participantSharingRevocations} from '../../src/features/personal/calendar-participants';
import type {ActionRecord} from '../../src/features/workbench/model/types';

const now=()=>new Date('2026-10-19T04:00:00Z');
const record=():ActionRecord=>({id:'participant-schedule',type:'schedule',title:'参与人共享验证',start:'2026-10-19T14:00',end:'2026-10-19T15:00',done:false,source:'manual',notes:'',reminder:'none',location:'',participants:'外部联系人',created:'',updated:'',links:[]});
function fixture(){
  const data=new Map<string,string>();
  const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}} as Storage;
  const ws=createWorkspaceStore(storage,now);ws.change(s=>{M.get(s,'team-eureka').members.find(m=>m.id==='kevin')!.role='member';});
  return {storage,ws,repo:createActions(storage,now,'zhang','team-eureka')};
}
test.beforeEach(()=>Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent(){}}}));
test.afterEach(()=>Reflect.deleteProperty(globalThis,'window'));
test('only explicit new team selections suggest sharing; manual names and existing permissions never imply grants',()=>{
  const {ws}=fixture(),w=M.get(ws.read(),'team-eureka'),r=record();
  expect(participantSharingCandidates({...r,participants:'Kevin'},w,'zhang')).toHaveLength(0);
  expect(participantSharingCandidates({...r,participantIds:['zhang']},w,'zhang')).toHaveLength(0);
  expect(participantSharingCandidates({...r,participantIds:['kevin']},w,'zhang').map(m=>m.id)).toEqual(['kevin']);
  expect(participantSharingCandidates({...r,participantIds:['kevin'],sharedWith:['kevin']},w,'zhang')).toHaveLength(0);
  expect(participantSharingCandidates({...r,participantIds:['kevin']},w,'zhang',{...r,participantIds:['kevin']})).toHaveLength(0);
});
test('save alone preserves participation without sharing; save and share persists both and keeps existing grants',()=>{
  const {storage,repo}=fixture();
  let r=repo.save({...record(),participants:'Kevin、外部联系人',participantIds:['kevin']});
  expect(r.sharedWith).toEqual([]);
  expect(createActions(storage,now,'kevin','team-eureka').read().records.some(x=>x.id===r.id)).toBe(false);
  repo.share(r.id,['lin']);
  r=repo.read().records.find(x=>x.id===r.id)!;
  repo.save({...r,title:'保存并共享成功'},{participantShareIds:['kevin']});
  const saved=createActions(storage,now,'zhang','team-eureka').read().records.find(x=>x.id===r.id)!;
  expect(saved.sharedWith?.sort()).toEqual(['kevin','lin']);
  expect(saved.participantIds).toEqual(['kevin']);
  expect(createActions(storage,now,'kevin','team-eureka').read().records.some(x=>x.id===r.id)).toBe(true);
});
test('removing a previously shared participant can revoke access atomically, or keep the existing grant',()=>{
  const {storage,repo,ws}=fixture(),w=M.get(ws.read(),'team-eureka');
  const base=repo.save({...record(),participants:'Kevin',participantIds:['kevin']},{participantShareIds:['kevin']});
  const next={...base,participants:'',participantIds:[]};
  expect(participantSharingRevocations(next,w,'zhang',base).map(m=>m.id)).toEqual(['kevin']);
  const kept=repo.save(next);
  expect(kept.sharedWith).toEqual(['kevin']);
  const revoked=repo.save({...kept,participantIds:['kevin'],participants:'Kevin'});
  const removed=repo.save({...revoked,participantIds:[],participants:''},{participantRevokeIds:['kevin']});
  expect(removed.sharedWith).toEqual([]);
  expect(createActions(storage,now,'kevin','team-eureka').read().records.some(x=>x.id===base.id)).toBe(false);
});
test('failed write and stale revision cannot partially save schedule or grant access',()=>{
  const {storage,repo}=fixture();const original=repo.save(record());
  const failing=Object.create(storage) as Storage;failing.setItem=()=>{throw Error('quota');};
  expect(()=>createActions(failing,now,'zhang','team-eureka').save({...original,title:'不应保存',participantIds:['kevin']},{participantShareIds:['kevin']})).toThrow('保存失败');
  expect(createActions(storage,now,'zhang','team-eureka').read().records.find(r=>r.id===original.id)?.sharedWith).toEqual([]);
  repo.save({...original,title:'另一个编辑版本'});
  expect(()=>repo.save({...original,participantIds:['kevin']},{participantShareIds:['kevin']})).toThrow('记录已更新');
});
test('recheck rejects removed recipients, non-selected members, expired teams and delegation by administrators',()=>{
  const {storage,repo,ws}=fixture();const original=repo.save(record());
  expect(()=>repo.save(original,{participantShareIds:['kevin']})).toThrow('已选择');
  const other=createActions(storage,now,'kevin','team-eureka').save({...record(),id:'other-owned'});
  expect(()=>createActions(storage,now,'zhang','team-eureka').save({...other,ownerId:'kevin',participantIds:['lin']},{participantShareIds:['lin']})).toThrow('创建者本人');
  ws.reload();ws.change(s=>{M.get(s,'team-eureka').members.find(m=>m.id==='kevin')!.status='removed';});
  expect(()=>createActions(storage,now,'zhang','team-eureka').save({...original,participantIds:['kevin']},{participantShareIds:['kevin']})).toThrow('已离开团队');
  ws.change(s=>{M.get(s,'team-eureka').status='expired';});
  expect(()=>createActions(storage,now,'zhang','team-eureka').save(original)).toThrow();
  expect(()=>createActions(storage,now).save({...record(),participantIds:['kevin']},{participantShareIds:['kevin']})).toThrow('个人日程');
});
