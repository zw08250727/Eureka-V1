import {test,expect} from '@playwright/test';
import './market-context';
import {completedSummaryWeeks,buildWeeklyMeetingSummary} from '../../src/features/spaces/model/weekly-summary';
import {M} from '../../src/features/spaces/model/store';
import type {WorkspaceFile} from '../../src/features/spaces/model/types';
const now=new Date('2026-10-20T12:00:00');
function file(id:string,created:string,title='项目同步'):WorkspaceFile{return{id,created,title,owner:'zhang',shared:[],duration:20,updated:created,source:'网页录音',summary:'原始会议确认还需补充资料。',transcript:'',deleted:false,size:'10 MB',creator:'张伟',status:'已总结',tags:[],detail:{}};}

test('default week is last complete Monday-Sunday, including exact Monday and year boundaries',()=>{
  const week=completedSummaryWeeks(now)[0];expect(week.key).toBe('2026-10-12');
  expect(week.end).toEqual(new Date('2026-10-19T00:00:00'));
  expect(completedSummaryWeeks(new Date('2026-10-25T23:59:59'))[0].key).toBe('2026-10-12');
  expect(completedSummaryWeeks(new Date('2026-10-26T00:00:00'))[0].key).toBe('2026-10-19');
  expect(completedSummaryWeeks(new Date('2027-01-04T00:00:00'))[0].key).toBe('2026-12-28');
});
test('weekly sources use a half-open interval, deduplicate and exclude deleted or non-meeting files',()=>{
  const week=completedSummaryWeeks(now)[0];
  const report=buildWeeklyMeetingSummary([
    file('start','2026-10-12T00:00:00'),file('end','2026-10-18T23:59:59'),file('next','2026-10-19T00:00:00'),
    file('old','2026-10-11T23:59:59'),{...file('deleted','2026-10-14T12:00:00'),deleted:true},
    {...file('note','2026-10-14T12:00:00'),source:'笔记'},file('start','2026-10-12T00:00:00')],week,now);
  expect(report.sources.map(s=>s.id)).toEqual(['end','start']);expect(report.creators).toBe(1);
  expect(()=>buildWeeklyMeetingSummary([],completedSummaryWeeks(new Date('2026-10-27'))[0],now)).toThrow('完整自然周');
});
test('weekly topics come from meeting titles and only source-backed observations enter details',()=>{
  expect(buildWeeklyMeetingSummary([file('a','2026-10-13','CRM试点方案评审')],completedSummaryWeeks(now)[0],now).groups[0].title).toBe('CRM试点方案');
  expect(buildWeeklyMeetingSummary([file('b','2026-10-13','医院服务访谈')],completedSummaryWeeks(now)[0],now).groups[0].title).toBe('医院服务');
  const source=file('c','2026-10-13T10:00:00','项目进展同步');
  source.detail={briefFacts:[{quote:'还需补充资料',kind:'gap',status:'open'},{quote:'所有人已达成一致',kind:'consensus',status:'resolved'}]};
  const report=buildWeeklyMeetingSummary([source],completedSummaryWeeks(now)[0],now);
  expect(report.groups[0].title).toBe('项目进展');expect(report.sources[0].observations).toHaveLength(1);
  expect(report.groups[0].description).not.toContain('所有人已达成一致');
});
test('weekly aggregation only sees files from the existing permission filter',()=>{
  const w=M.get(M.seed(now),'team-eureka');w.members.find(m=>m.id==='kevin')!.role='member';
  w.files=[{...file('shared','2026-10-13T10:00:00'),shared:['kevin']},file('private','2026-10-13T11:00:00')];
  const report=buildWeeklyMeetingSummary(M.visible(w,'kevin'),completedSummaryWeeks(now)[0],now);
  expect(report.sources.map(s=>s.id)).toEqual(['shared']);
});
