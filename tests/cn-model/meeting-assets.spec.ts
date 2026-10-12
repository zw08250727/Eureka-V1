import { test, expect } from '@playwright/test';
import './market-context';
import { meetingAudioSource } from '../../src/features/meetings/audio-source';
import { contentOptions, getExportContent } from '../../src/features/meetings/export-content';
import { updateSummary, summaryView } from '../../src/features/meetings/summaries';
import type { MeetingDetail } from '../../src/features/meetings/types';
const record = (): MeetingDetail => ({id:'meeting-1',title:'资产归属测试',summary:'默认总结',transcript:'原始转写',verbatim:'',source:'网页录音',created:'2026-10-12',duration:1,template:'通用',language:'中文',detail:'标准',speakers:['张伟'],tags:[],customer:'',project:'',location:'',updated:'',generated:{},feedback:0});
test('missing or deleted audio never inherits an unrelated fixture; snapshots preserve explicit original resource',()=>{
 expect(meetingAudioSource(record())).toMatch(/meeting-demo\.wav$/);
 expect(meetingAudioSource({...record(),id:'new-upload-1'})).toBe('');
 expect(meetingAudioSource({...record(),deleteSourceAudio:true})).toBe('');
 expect(meetingAudioSource({...record(),audioUrl:'javascript:alert(1)'})).toBe('');
 const r={...record(),id:'new-upload-1',audioUrl:'/assets/recordings/original.wav'};
 expect(getExportContent(r,'audio').audioUrl).toBe(r.audioUrl);
 expect(contentOptions({...r,deleteSourceAudio:true}).find(o=>o.kind==='audio')?.enabled).toBe(false);
 expect(contentOptions({...r,deleteSourceAudio:true}).find(o=>o.kind==='summary')?.enabled).toBe(true);
});
test('editing and deleting a secondary summary keeps default compatibility text and independent selected content',()=>{
 const r={...record(),summaries:[{id:'default',title:'默认总结',text:'默认正文',source:'default' as const},{id:'new',title:'新总结',text:'新正文',source:'agent_generated' as const}]};
 const next={...r,...updateSummary(r,'new',{summary:'编辑后的新正文',summaryHtml:'<p>编辑后的新正文</p>'})};
 expect(next.summary).toBe('默认正文');expect(summaryView(next,'new').summary).toBe('编辑后的新正文');
 const remaining=[next.summaries![0]];const deleted={...next,...updateSummary(next,'new',{summaries:remaining,summary:remaining[0].text})};
 expect(deleted.summaries).toHaveLength(1);expect(deleted.summary).toBe('默认正文');
});
test('generated mindmap availability and exports follow the bound source after selecting an empty summary',()=>{
 const r={...record(),summary:'',generated:{mindmap:true,mindmapSourceText:'## 已绑定来源\n- 原始事项',mindmapSourceId:'source-a',mindmapSourceTitle:'总结A'}};
 expect(contentOptions(r).find(o=>o.kind==='mindmap')?.enabled).toBe(true);
 expect(getExportContent(r,'mindmap').sourceMarkdown).toContain('已绑定来源');
 expect(contentOptions(r).find(o=>o.kind==='summary')?.enabled).toBe(false);
});
