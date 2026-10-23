import {test,expect} from '@playwright/test';
import './market-context';
import {buildSchedulePrompt} from '../../src/features/personal/schedule-prompts';
import {scheduleAssistCopy} from '../../src/features/personal/schedule-context';
import {expectedSchedulePrompts} from '../fixtures/schedule-prompts';
import type {ActionRecord} from '../../src/features/workbench/model/types';
const record:ActionRecord={id:'prompt',type:'schedule',title:'日辰集团需求沟通',start:'2026-10-20T14:00',end:'2026-10-20T15:00',done:false,source:'manual',notes:'核实范围',participants:'李明',location:'线上',reminder:'none',created:'',updated:'',links:['visible','hidden']};
test('three shortened prompts match approved copy exactly and keep the buttons',()=>{
  expect(scheduleAssistCopy.before.button).toBe('准备这场日程');expect(scheduleAssistCopy.during.button).toBe('查看相关上下文');expect(scheduleAssistCopy.after.button).toBe('回顾这场日程');
  for(const phase of ['before','during','after'] as const) {
    expect(buildSchedulePrompt(record,phase,[])).toBe(expectedSchedulePrompts[phase]);
  }
});
test('unscheduled fallback retains six fields and excludes deleted linked meetings',()=>{
  const prompt=buildSchedulePrompt(record,'unscheduled',[{id:'visible',title:'已有会议',created:'2026-10-19',summary:'',transcript:''},{id:'hidden',title:'已删除会议',created:'2026-10-19',summary:'',transcript:'',deleted:true}]);
  for(const text of ['日程标题：日辰集团需求沟通','日程时间：2026-10-20 14:00—2026-10-20 15:00','地点：线上','参与人：李明','我的备注：核实范围','已关联会议：已有会议'])expect(prompt).toContain(text);
  expect(prompt).not.toContain('已删除会议');expect(prompt).not.toContain('{{');
});
