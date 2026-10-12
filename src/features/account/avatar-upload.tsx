/* eslint-disable @next/next/no-img-element -- Local avatar preview. */
"use client";
import {useEffect,useId,useRef,useState} from 'react';
export function AvatarUpload({value,name,onChange,onError}:{value:string;name:string;onChange:(value:string)=>void;onError:(message:string)=>void}){
  const input=useRef<HTMLInputElement>(null),generation=useRef(0),hint=useId();
  const [busy,setBusy]=useState(false);
  useEffect(()=>()=>{generation.current++},[]);
  async function load(file?:File){
    if(!file)return;
    const ticket=++generation.current;
    onError('');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){setBusy(false);onError('请选择不超过 2 MB 的 JPG、PNG 或 WebP 图片');return}
    setBusy(true);
    try{
      const source=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('读取失败'));reader.readAsDataURL(file)});
      const image=new Image();image.src=source;await image.decode();
      if(!image.naturalWidth||!image.naturalHeight)throw Error('无效图片');
      // Store a small preview instead of filling browser storage with the original file.
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
      const context=canvas.getContext('2d');if(!context)throw Error('图片处理失败');
      const side=Math.min(image.naturalWidth,image.naturalHeight);
      context.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,256,256);
      if(ticket===generation.current)onChange(canvas.toDataURL('image/png'));
    }catch{if(ticket===generation.current)onError('图片无法读取，请更换一张有效图片后重试')}
    finally{if(ticket===generation.current)setBusy(false)}
  }
  return <div className="wide ex-avatar-upload" aria-busy={busy}>
    <button type="button" className="ex-avatar-preview" aria-label="更换头像" aria-describedby={hint} disabled={busy} onClick={()=>input.current?.click()}>
      {value?<img src={value} alt="当前头像"/>:<span>{name.trim()[0]||'我'}</span>}
      <span className="ex-avatar-camera" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M8 5 9.5 3h5L16 5h4v15H4V5h4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6"/></svg></span>
    </button>
    <div className="ex-avatar-copy"><strong>个人头像</strong><p id={hint}>JPG、PNG 或 WebP，最大 2 MB</p><div className="ex-avatar-actions"><button type="button" className="ex-button" disabled={busy} onClick={()=>input.current?.click()}>{busy?'正在处理…':value?'重新上传':'上传头像'}</button>{value&&<button type="button" className="ex-button ex-avatar-remove" disabled={busy} onClick={()=>{generation.current++;onChange('');onError('')}}>移除</button>}</div><span role="status" className="ex-avatar-hint">{value?'预览已更新，保存后生效':'让协作伙伴更容易认出你'}</span></div>
    <input ref={input} type="file" hidden aria-label="选择头像文件" accept="image/jpeg,image/png,image/webp" onChange={event=>{const file=event.target.files?.[0];event.target.value='';void load(file)}}/>
  </div>;
}
