/* Single-record capture library, with links to the canonical schedule/todo details. */
(() => {
  'use strict';
  const M=window.ThoughtsModel,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons={inspiration:'spark',ledger:'book',other:'file',todo:'task',schedule:'clock'},names={...M.types,todo:'待办',schedule:'日程'};
  const icon=n=>`<svg class="icon" aria-hidden="true"><use href="#ico-${n}"/></svg>`;
  const btn=(action,label,cls='',id='')=>`<button type="button" class="th-btn ${cls}" data-th="${action}" data-id="${esc(id)}" ${cls==='th-close'?'aria-label="关闭闪念详情"':''}>${label}</button>`;
  const personal=()=>document.body.dataset.wsType!=='team';
  const seeds=[];
  for(const type of Object.keys(M.types))for(const f of thoughtArchiveData[type].files)for(const [i,e] of f.entries.entries()){
    const amount=Number(e.detail.match(/¥([\d.]+)/)?.[1]||0);seeds.push({...e,id:e.assetId||`capture-${type}-${f.month}-${i}`,type,source:'capture',capture:e.detail,detail:type==='ledger'?e.detail.replace(/(?:收入|支出)\s*¥[\d.]+/g,'').replace(/^[ ·]+|[ ·]+$/g,''):e.detail,amount,direction:e.detail.includes('收入')?'income':'expense',revision:0});
  }
  for(const r of todayAssetRecords.filter(r=>M.types[r.type]))if(!seeds.some(e=>e.id===r.id))seeds.push({...r,date:r.createdDate||r.transactionDate,source:'capture',capture:r.detail,revision:0});
  let repo;try{repo=M.create(localStorage,seeds);}catch(e){showToast(e.message);return;}
  let from='',to='',order='desc',limit=40,selected=null,editing=false,baseline='',draft=null,focusReturn=null;
  const workspace=$('#thought-workspace'),toolbar=$('#thought-toolbar'),search=$('#thought-file-search');
  search.placeholder='搜索标题、内容或金额';search.setAttribute('aria-label','搜索闪念');
  $('#thought-month-select').closest('label').hidden=true;
  const controls=document.createElement('div');controls.className='th-filters';controls.innerHTML=`<label>记录日期<input id="th-from" type="date" aria-label="记录开始日期"></label><span>至</span><label><span class="sr-only">结束日期</span><input id="th-to" type="date" aria-label="记录结束日期"></label><select id="th-order" aria-label="排序方式"><option value="desc">最新记录优先</option><option value="asc">最早记录优先</option></select>${btn('clear','重置','plain')}`;
  $('.thought-category-rail',workspace).after(controls);
  const categoryRail=$('.thought-category-rail',workspace);for(const type of ['all','inspiration','ledger','other','schedule','todo'])categoryRail.append($(`[data-thought-category="${type}"]`));
  toolbar.insertAdjacentHTML('beforeend',btn('calendar',icon('clock')+'日程与待办')+btn('new','＋ 记录闪念','primary')+btn('ask','<span class="ws-agent-mark">'+icon('spark')+'</span>Ask Agent','th-ask'));
  const dialog=document.createElement('dialog');dialog.id='thought-record-dialog';dialog.className='th-dialog';dialog.setAttribute('aria-label','闪念详情');document.body.append(dialog);
  const guardDialog=document.createElement('dialog');guardDialog.className='th-dialog th-guard';guardDialog.setAttribute('aria-label','保留闪念修改');guardDialog.innerHTML='<h2>保留这次修改？</h2><p>还有未保存的内容，你可以继续编辑，或放弃后关闭。</p><footer>'+btn('discard','放弃修改')+btn('continue','继续编辑','primary')+'</footer>';document.body.append(guardDialog);
  const money=r=>`${r.direction==='income'?'收入':'支出'} ¥${Number(r.amount||0).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const localStamp=v=>/Z$|[+-]\d\d:\d\d$/.test(v||'')?new Date(Date.parse(v)+8*3600000).toISOString().slice(0,16):String(v||'').slice(0,16);
  function all(){return [...repo.snapshot().records,...(window.PersonalAssets?.snapshot().records||[]).map(r=>{const time=localStamp(r.created||r.start);return {...r,date:time.slice(0,10),time:time.slice(11,16),detail:[r.notes,r.capture,r.location,r.participants].filter((v,i,a)=>v&&!a.slice(0,i).some(prior=>prior?.includes(v))).join(' · '),action:true};})];}
  const record=id=>all().find(r=>r.id===id);
  function filtered(){const keyword=search.value.trim().toLowerCase();return all().filter(r=>(activeThoughtCategory==='all'||r.type===activeThoughtCategory)&&(!from||r.date>=from)&&(!to||r.date<=to)&&`${r.title} ${r.detail} ${names[r.type]} ${r.type==='ledger'?money(r):''} ${r.start||''} ${r.end||''}`.toLowerCase().includes(keyword)).sort((a,b)=>order==='desc'?(b.date+b.time).localeCompare(a.date+a.time):(a.date+a.time).localeCompare(b.date+b.time));}
  function render(){
    const rows=filtered(),allRows=all(),valid=!from||!to||from<=to;
    for(const type of ['all',...Object.keys(names)]){const el=$(`[data-thought-category="${type}"] em`);if(el)el.textContent=type==='all'?allRows.length:allRows.filter(r=>r.type===type).length;}
    $('.thought-file-table-head').hidden=true;
    $('#thought-category-heading').textContent=activeThoughtCategory==='all'?'全部记录':names[activeThoughtCategory];
    $('#thought-category-description').textContent=`${rows.length} 条记录 · 按记录时间${order==='desc'?'倒序':'正序'}排列`;
    $('.thought-file-pane-head').querySelector('.th-handoff')?.remove();
    $('.thought-file-pane-head').insertAdjacentHTML('beforeend','<span class="th-handoff">日程与待办沿用已有详情，无需重复整理</span>');
    const groups=new Map();for(const r of rows.slice(0,limit)){if(!groups.has(r.date))groups.set(r.date,[]);groups.get(r.date).push(r);}
    $('#thought-file-list').innerHTML=!valid?'<p class="th-empty" role="alert">开始日期不能晚于结束日期，请调整日期范围。</p>':!rows.length?'<div class="th-empty"><h3>没有匹配的记录</h3><p>换个关键词或日期范围试试。</p>'+btn('clear','清除筛选')+'</div>':[...groups].map(([day,entries])=>`<section class="th-day"><h3>${day===todayKey?'今天':day===yesterdayKey?'昨天':day}<span>${day===todayKey||day===yesterdayKey?day+' · ':''}${entries.length} 条</span></h3>${entries.map(r=>`<article class="th-row ${r.type}"><button type="button" class="th-open" data-thought-record="${esc(r.id)}"><span class="th-mark">${icon(icons[r.type])}</span><span class="th-copy"><span class="th-line"><strong>${esc(r.title)}</strong><span class="th-type">${names[r.type]}</span>${r.type==='ledger'?`<b class="th-money ${r.direction==='income'?'income':''}">${money(r)}</b>`:r.type==='todo'?`<span class="th-status">${r.done?'已完成':'待完成'}</span>`:''}</span><span class="th-summary">${esc(r.detail)||'暂无补充内容'}</span><span class="th-meta">${esc(r.time)} · ${r.source==='manual'?'手动创建':r.source==='agent'?'Agent 创建':'闪念提取'}${r.action?`<span>${r.type==='todo'?'截止':'日程'} ${esc(r.start.replace('T',' '))}${r.type==='schedule'?' — '+esc(r.end.replace('T',' ')):''}</span>`:''}</span></span><span class="th-row-arrow">${icon('chevron')}</span></button>${btn('edit',r.action?'打开详情':'编辑','th-row-edit',r.id)}</article>`).join('')}</section>`).join('')+(rows.length>limit?`<div class="th-more">${btn('more',`加载更多（还有 ${rows.length-limit} 条）`)}</div>`:'');
    $('#thought-preview').hidden=true;
  }
  function sync(){
    const rows=repo.snapshot().records;
    for(let i=todayAssetRecords.length-1;i>=0;i--)if(M.types[todayAssetRecords[i].type])todayAssetRecords.splice(i,1);
    for(const r of rows)todayAssetRecords.push({...r,createdDate:r.date,transactionDate:r.date,amount:Number(r.amount||0)});
    renderTodayAssets();render();
  }
  function open(id){if(!personal())return;const r=record(id);if(!r)return showToast('这条记录已不可用');if(r.action){const filters={category:activeThoughtCategory,query:search.value,from,to,order,limit,scroll:$('.main').scrollTop};return window.PersonalAssets.open(r.id,()=>{showMainView('home',{silent:true});$('[data-meeting-view="thought"]').click();$(`[data-thought-category="${filters.category}"]`).click();search.value=filters.query;from=filters.from;to=filters.to;order=filters.order;limit=filters.limit;render();$('.main').scrollTop=filters.scroll;});}
    selected=r.id;editing=false;focusReturn=document.activeElement;renderDetail(r);if(!dialog.open)dialog.showModal();
  }
  function renderDetail(r){dialog.setAttribute('aria-label','闪念详情');dialog.innerHTML=`<header><div><span class="th-type">${names[r.type]}</span><h2>${esc(r.title)}</h2></div>${btn('close',icon('x'),'th-close')}</header><div class="th-detail-meta">${r.date} ${r.time} · ${r.source==='manual'?'手动创建':'闪念提取'}${r.updated?' · 已编辑':''}</div>${r.type==='ledger'?`<div class="th-detail-money">${money(r)}</div>`:''}<p class="th-detail-content">${esc(r.detail)||'暂无补充内容'}</p>${r.capture?`<details class="th-original"><summary>原始捕获</summary><p>${esc(r.capture)}</p></details>`:''}<footer>${btn('close','关闭')}${btn('edit','编辑','primary',r.id)}</footer>`;}
  function fields(r){return `<label>标题<input name="title" maxlength="200" required value="${esc(r.title)}" placeholder="记下一个想法"></label><div class="th-form-grid"><label>分类<select name="type">${Object.entries(M.types).map(([v,t])=>`<option value="${v}" ${r.type===v?'selected':''}>${t}</option>`).join('')}</select></label><label>记录日期<input name="date" type="date" required value="${esc(r.date)}"></label><label>时间<input name="time" type="time" required value="${esc(r.time)}"></label></div><div class="th-form-grid th-ledger-fields" ${r.type==='ledger'?'':'hidden'}><label>收支<select name="direction"><option value="expense" ${r.direction!=='income'?'selected':''}>支出</option><option value="income" ${r.direction==='income'?'selected':''}>收入</option></select></label><label>金额（人民币）<input name="amount" type="number" min="0.01" max="999999999" step="0.01" value="${r.amount||''}"></label></div><label>内容<textarea name="detail" rows="5" maxlength="5000" placeholder="补充想法、消费场景或需要记住的细节">${esc(r.detail)}</textarea></label>`;}
  const formValue=()=>({...draft,...Object.fromEntries(new FormData($('#th-edit-form')))});
  function edit(id=selected){if(!personal())return;const r=id?record(id):null;if(r?.action)return open(id);selected=r?.id||null;draft=r?{...r}:{type:M.types[activeThoughtCategory]?activeThoughtCategory:'inspiration',title:'',detail:'',date:todayKey,time:localStamp(new Date().toISOString()).slice(11,16),direction:'expense',amount:''};editing=true;focusReturn=document.activeElement;dialog.setAttribute('aria-label',r?'编辑闪念':'记录闪念');dialog.innerHTML=`<header><h2>${r?'编辑闪念':'记录闪念'}</h2>${btn('close',icon('x'),'th-close')}</header><form id="th-edit-form">${fields(draft)}<p class="th-error" role="alert" hidden></p><footer>${btn('close','取消')}<button type="submit" class="th-btn primary">保存</button></footer></form>`;baseline=JSON.stringify(formValue());if(!dialog.open)dialog.showModal();$('[name=title]',dialog).focus();}
  function close(){if(editing&&JSON.stringify(formValue())!==baseline){guardDialog.showModal();return;}finishClose();}
  function finishClose(){editing=false;dialog.close();guardDialog.close();focusReturn?.focus?.({preventScroll:true});}
  function save(){try{const r=repo.save(formValue());editing=false;selected=r.id;sync();renderDetail(r);showToast('闪念已保存');}catch(e){const el=$('.th-error',dialog);el.hidden=false;el.textContent=e.message;}}
  function clear(){search.value='';from='';to='';$('#th-from').value='';$('#th-to').value='';limit=40;render();}
  function ask(){const records=filtered();if(!records.length)return showToast('当前没有可引用的记录');leaveHistorySession();widgetAiContext={type:'thoughts',records:records.map(r=>({...r,detail:r.action?`${r.detail} · ${r.type==='todo'?'截止':'日程'} ${r.start}`:r.type==='ledger'?`${money(r)} · ${r.detail}`:r.detail}))};xiaozhiInput.value='请回顾当前筛选的闪念，提炼主题、关联线索和需要跟进的事项。';let context=$('#xiaozhi-widget-context');if(!context){context=document.createElement('button');context.type='button';context.id='xiaozhi-widget-context';$('.xiaozhi-context',xiaozhiRail).append(context);context.addEventListener('click',()=>{context.classList.toggle('selected');updateXiaozhiComposer();});}context.textContent=`${records.length} 条闪念`;context.classList.add('selected');context.setAttribute('aria-label',`引用 ${records.length} 条闪念`);setXiaozhiExpanded(true);updateXiaozhiComposer();$('#xiaozhi-context-hint').textContent=`已引用当前筛选的 ${records.length} 条记录`;xiaozhiInput.focus({preventScroll:true});}
  function handle(a,id){if(!personal())return;if(a==='new')return edit(null);if(a==='edit')return edit(id||selected);if(a==='close')return close();if(a==='continue')return guardDialog.close();if(a==='discard')return finishClose();if(a==='calendar')return window.PersonalAssets.showList();if(a==='clear')return clear();if(a==='more'){limit+=40;return render();}if(a==='ask')return ask();}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-th]');if(b){e.preventDefault();handle(b.dataset.th,b.dataset.id);}},false);
  $('#thought-file-list').addEventListener('click',e=>{const b=e.target.closest('[data-thought-record]');if(b){e.stopImmediatePropagation();open(b.dataset.thoughtRecord);}},true);
  dialog.addEventListener('submit',e=>{e.preventDefault();save();});dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('change',e=>{if(e.target.name==='type')$('.th-ledger-fields',dialog).hidden=e.target.value!=='ledger';});
  for(const id of ['th-from','th-to','th-order'])$('#'+id).addEventListener('change',()=>{from=$('#th-from').value;to=$('#th-to').value;order=$('#th-order').value;limit=40;render();});
  search.addEventListener('input',()=>{limit=40;render();});
  window.addEventListener('beforeunload',e=>{if(editing&&JSON.stringify(formValue())!==baseline){e.preventDefault();e.returnValue='';}});
  window.addEventListener('storage',e=>{if(e.key!==M.KEY)return;try{if(editing){$('.th-error',dialog).hidden=false;$('.th-error',dialog).textContent='另一页面已更新，请保留输入，重新打开后编辑';return;}repo.reload();sync();if(dialog.open&&selected)renderDetail(record(selected));}catch(err){showToast(err.message);}});
  dialog.addEventListener('close',()=>{try{repo.reload();sync();}catch(err){showToast(err.message);}});
  window.ThoughtsUI={render,open,edit,openLegacy(type,file,day){const entry=file?.entries.find(e=>!day||e.date===day);const r=entry&&all().find(r=>r.id===entry.assetId||r.type===type&&r.title===entry.title&&r.date===entry.date);if(r)open(r.id);},snapshot:all};
  sync();
})();
