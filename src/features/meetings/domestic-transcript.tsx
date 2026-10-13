"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import type { MeetingDetail, TranscriptSegment } from "./types";
import { linesFor } from "./content";
import { MdDialog, MdButton, clockTime } from "./reference-ui";
// Ported from MeetingSpeakerEditDialog and meeting-record-transcript-content.
export function DomesticTranscript({r,readonly,seek,onSave,time,translation=false,compact=false}: {r:MeetingDetail;readonly:boolean;seek:(n:number)=>void;onSave:(patch:Partial<MeetingDetail>)=>void;time:number;translation?:boolean;compact?:boolean}) {
  const segments=linesFor(r), [only,setOnly]=useState(false), [speaker,setSpeaker]=useState<number|null>(null), [name,setName]=useState(""), [scope,setScope]=useState("current"), [error,setError]=useState(""), [selection,setSelection]=useState<{index:number;start:number;end:number}|null>(null);
  const [copyState,setCopyState]=useState("");
  const host=useRef<HTMLDivElement>(null),manualScroll=useRef<ReturnType<typeof setTimeout>|null>(null),previousActive=useRef<number|null>(null);
  const activeIndex=segments.findIndex((s,i)=>time>=s.at && time<(segments[i+1]?.at ?? Infinity));
  useEffect(()=>{if(previousActive.current!==null && previousActive.current!==activeIndex && !manualScroll.current)host.current?.querySelector(`[data-segment="${activeIndex}"]`)?.scrollIntoView({block:"nearest",behavior:"auto"});previousActive.current=activeIndex;},[activeIndex]);
  const pauseFollowing=()=>{if(manualScroll.current)clearTimeout(manualScroll.current);manualScroll.current=setTimeout(()=>{manualScroll.current=null;},5000);};
  useEffect(()=>()=>{if(manualScroll.current)clearTimeout(manualScroll.current);},[]);
  const selected= speaker===null?null:segments[speaker];
  const save=(next:TranscriptSegment[])=>{try{onSave({segments:next});setError("");setSelection(null);}catch(e){setError((e as Error).message);}};
  const mark=(index:number,start:number,end:number)=>save(segments.map((s,i)=>{
    if(i!==index)return s;
    const ranges=[...(s.highlights||[]),{start,end}].sort((a,b)=>a.start-b.start),merged:{start:number;end:number}[]=[];
    for(const range of ranges){const last=merged.at(-1);if(last && range.start<=last.end)last.end=Math.max(last.end,range.end);else merged.push({...range});}
    return {...s,highlights:merged};
  }));
  const unmark=(index:number)=>save(segments.map((s,i)=>{
    if(i!==index)return s;
    if(selection?.index!==index)return {...s,highlights:[]};
    return {...s,highlights:(s.highlights||[]).flatMap(range=>range.end<=selection.start || range.start>=selection.end ? [range] : [...(range.start<selection.start?[{start:range.start,end:selection.start}]:[]),...(range.end>selection.end?[{start:selection.end,end:range.end}]:[])])};
  }));
  return <div className="cn-transcript" ref={host} onWheel={pauseFollowing} onTouchMove={pauseFollowing}>
    {translation && <div className="md-panel-tools"><small>以下实时翻译结果，仅供参考</small><button className="md-btn" onClick={async()=>{try{await navigator.clipboard.writeText(segments.filter(s=>s.en.trim()).map(s=>s.en).join("\n\n"));setCopyState("已复制实时翻译全文");}catch{setCopyState("复制失败，请选中文本手动复制");}}}>复制实时翻译全文</button></div>}
    {copyState && <p role="status">{copyState}</p>}
    {!translation && !compact && <label className="cn-mark-filter"><input type="checkbox" role="switch" checked={only} onChange={e=>setOnly(e.target.checked)}/>仅查看重点标记</label>}
    {error && <p role="alert">{error}</p>}
    {only && !segments.some(s=>s.highlights?.length) && <p className="cn-transcript-empty">暂无重点标记</p>}
    {(!segments.length || (translation && !segments.some(s=>s.en.trim()))) && <p className="cn-transcript-empty">{translation ? "暂无实时翻译内容" : "暂无转译文本"}</p>}
    {segments.map((line,index)=>{
      if((only && !line.highlights?.length) || (translation && !line.en.trim()))return null;
      const active=time>=line.at && time<(segments[index+1]?.at ?? Infinity), text=translation?line.en:line.text;
      const ranges=(line.highlights||[]).slice().sort((a,b)=>a.start-b.start);
      const pieces: {text:string;marked:boolean}[]=[];let last=0;
      for(const range of ranges){if(range.start<last)continue;pieces.push({text:text.slice(last,range.start),marked:false},{text:text.slice(range.start,range.end),marked:true});last=range.end;}pieces.push({text:text.slice(last),marked:false});
      return <article className={`md-speech ${active?'cn-speech-active':''}`} key={index} data-segment={index}>
        <div className="md-speech-head">{!translation && <button className="md-speaker" disabled={readonly} aria-label={`编辑发言人 ${index+1}`} onClick={()=>{setSpeaker(index);setName(line.speakerName||r.speakers[line.speaker]||'发言人');setScope('current');setError('');}}>{line.speakerName||r.speakers[line.speaker]||'发言人'}</button>}<button aria-label={`播放第 ${index+1} 段`} onClick={()=>seek(line.at)}><time>{translation && Number.isFinite(Date.parse(r.created)) ? new Date(Date.parse(r.created)+line.at*1000).toLocaleTimeString("zh-CN",{hour12:false}) : clockTime(line.at)}</time></button></div>
        <p tabIndex={0} role="button" aria-label={`播放文本第 ${index+1} 段`} onKeyDown={e=>{if(e.key==='Enter')seek(line.at);}} onClick={()=>{if(!window.getSelection()?.toString())seek(line.at);}} onMouseUp={e=>{
          const s=window.getSelection();if(readonly || translation || !s?.rangeCount || s.isCollapsed)return;const range=s.getRangeAt(0);if(!e.currentTarget.contains(range.startContainer)||!e.currentTarget.contains(range.endContainer))return;const before=range.cloneRange();before.selectNodeContents(e.currentTarget);before.setEnd(range.startContainer,range.startOffset);setSelection({index,start:before.toString().length,end:before.toString().length+range.toString().length});
        }}>{translation?text:pieces.map((p,i)=>p.marked?<mark key={i}>{p.text}</mark>:<Fragment key={i}>{p.text}</Fragment>)}</p>
        {!readonly && !translation && <div className="cn-transcript-actions">{selection?.index===index?<button onClick={()=>mark(index,selection.start,selection.end)}>划重点</button>:<button onClick={()=>mark(index,0,line.text.length)} disabled={!!line.highlights?.length}>标记整段</button>}{!!line.highlights?.length && <button onClick={()=>unmark(index)}>取消重点</button>}</div>}
      </article>;
    })}
    {selected && speaker!==null && <MdDialog title="编辑发言人" onClose={()=>setSpeaker(null)} footer={<MdButton className="md-btn md-primary" disabled={readonly||!name.trim()||name.trim().length>16} onClick={()=>{
      try{const nextName=name.trim();if(!nextName||nextName.length>16)throw Error('发言人名称应为1–16个字');
        const previous=selected.speakerName||r.speakers[selected.speaker];
        onSave({segments:segments.map((s,i)=>(scope==='all'?s.speaker===selected.speaker && (s.speakerName||r.speakers[s.speaker])===previous:i===speaker)?{...s,speakerName:nextName}:s)});setSpeaker(null);
      }catch(e){setError((e as Error).message);}
    }}>确认修改</MdButton>}>
      <label className="md-field"><span>发言人名称</span><input autoFocus aria-label="发言人名称" maxLength={16} value={name} onChange={e=>setName(e.target.value)}/></label><p>应用范围</p>{[['current','仅应用到本段落','只修改当前选中的段落'],['all','应用至当前会议全部段落','修改所有相同发言人的段落']].map(([value,label,description])=><label className="md-choice" key={value}><input type="radio" name="speaker-scope" value={value} checked={scope===value} onChange={()=>setScope(value)}/><span><strong>{label}</strong><small>{description}</small></span></label>)}{error&&<p role="alert">{error}</p>}
    </MdDialog>}
  </div>;
}
