/* Shared quick preview/editor. Full action pages remain behind the explicit Details action. */
(() => {
  'use strict';
  const A=window.PersonalAssets,M=window.PersonalAssetsModel,$=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button=(a,t,primary=false)=>`<button type="button" class="th-btn ${primary?'primary':''}" data-ap="${a}">${t}</button>`;
  const dialog=document.createElement('dialog');dialog.id='action-quick-dialog';dialog.className='th-dialog ap-dialog';document.body.append(dialog);
  const guard=document.createElement('dialog');guard.className='th-dialog ap-guard';guard.setAttribute('aria-label','保留记录修改');guard.innerHTML='<h2>保留这次修改？</h2><p>还有未保存的内容。</p><footer>'+button('discard','放弃修改')+button('continue','继续编辑',true)+'</footer>';document.body.append(guard);
  let draft=null,baseline='',editing=false,detailsAction=null,returnFocus=null;
  const record=id=>A.snapshot().records.find(r=>r.id===id);
  const values=()=>({...draft,...Object.fromEntries(new FormData($('#ap-edit-form')))});
  const dirty=()=>editing&&JSON.stringify(values())!==baseline;
  const local=v=>String(v||'').replace('T',' ').slice(0,16);
  function close(){if(dirty()){guard.showModal();return;}finish();}
  function finish(){editing=false;dialog.close();guard.close();const target=returnFocus?.isConnected?returnFocus:document.querySelector(`#thought-workspace:not([hidden]) [data-th=edit][data-id="${CSS.escape(draft?.id||'')}"],#personal-actions:not([hidden]) [data-pa=quick-edit][data-id="${CSS.escape(draft?.id||'')}"]`);target?.focus?.({preventScroll:true});}
  function show(){if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();}}
  function header(title){return `<header><h2>${esc(title)}</h2><button type="button" class="th-btn th-close" data-ap="close" aria-label="关闭记录弹窗">×</button></header>`;}
  function preview(id,onDetails){if(document.body.dataset.wsType==='team')return;draft=record(id);if(!draft)return showToast('记录已不可用');editing=false;detailsAction=onDetails||(()=>A.open(id));renderPreview();show();}
  function renderPreview(){const r=draft;dialog.setAttribute('aria-label',r.type==='todo'?'待办预览':'日程预览');dialog.innerHTML=header(r.title)+`<div class="ap-meta"><span class="th-type">${r.type==='todo'?'待办':'日程'}</span><span>${M.sources[r.source]}</span>${r.type==='todo'?`<span>${r.done?'已完成':'待完成'}</span>`:''}</div><dl class="ap-summary"><div><dt>${r.type==='todo'?'截止时间':'日程时间'}</dt><dd>${local(r.start)}${r.type==='schedule'?' — '+local(r.end):''}</dd></div>${r.type==='schedule'?`<div><dt>地点</dt><dd>${esc(r.location)||'未设置'}</dd></div><div><dt>参与人</dt><dd>${esc(r.participants)||'未设置'}</dd></div>`:''}<div><dt>提醒</dt><dd>${M.reminders.find(([v])=>v===r.reminder)?.[1]||'不提醒'}</dd></div><div><dt>备注</dt><dd>${esc(r.notes)||'暂无备注'}</dd></div></dl>${r.capture?`<details class="th-original"><summary>原始捕获</summary><p>${esc(r.capture)}</p></details>`:''}<footer>${r.type==='todo'?button('toggle',r.done?'重新打开待办':'标记完成'):''}${button('details','详情')}${button('edit','编辑',true)}</footer>`;}
  function edit(id){if(document.body.dataset.wsType==='team')return;draft=record(id);if(!draft)return showToast('记录已不可用');editing=true;dialog.setAttribute('aria-label',draft.type==='todo'?'编辑待办':'编辑日程');dialog.innerHTML=header(draft.type==='todo'?'编辑待办':'编辑日程')+`<form id="ap-edit-form">${A.formFields(draft)}<p class="th-error" role="alert" hidden></p><footer>${button('close','取消')}<button type="submit" class="th-btn primary">保存</button></footer></form>`;baseline=JSON.stringify(values());show();$('[name=title]',dialog).focus();}
  dialog.addEventListener('submit',e=>{e.preventDefault();try{A.saveRecord(values());finish();showToast('已保存');}catch(err){const el=$('.th-error',dialog);el.hidden=false;el.textContent=err.message;}});
  function handle(a){if(a==='close')return close();if(a==='discard')return finish();if(a==='continue')return guard.close();if(a==='edit')return edit(draft.id);if(a==='details'){const go=detailsAction;finish();return go?.();}if(a==='toggle'){A.toggle(draft.id);draft=record(draft.id);renderPreview();}}
  for(const el of [dialog,guard])el.addEventListener('click',e=>{const b=e.target.closest('[data-ap]');if(b)handle(b.dataset.ap);});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue='';}});
  window.addEventListener('storage',e=>{if(e.key!==M.KEY||!dialog.open)return;if(editing){const el=$('.th-error',dialog);el.hidden=false;el.textContent='另一页面已更新，请保留输入后重新打开记录';}else{draft=record(draft.id);if(draft)renderPreview();else finish();}});
  window.PersonalActionPopup={preview,edit};
})();
