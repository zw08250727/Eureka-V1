/* Shared audio upload interaction. Only demo metadata is persisted; audio never leaves the browser. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), KEY='eureka:audio-uploads:v1';
  const formats=['m4a','mp3','wav','opus','flac','aac'];
  const note='音频已加入会议列表，等待转写处理。本地演示仅保存文件信息，未上传原音频，也未生成真实转写或总结。';
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let uploads=[],selected=null,context=null,trigger=null,busy=false,loadError=false;
  let savedUploads=null;
  try{savedUploads=localStorage.getItem(KEY);const value=JSON.parse(savedUploads||'[]');if(!Array.isArray(value)||value.some(f=>!f||typeof f.id!=='string'||!f.id.startsWith('upload-')||!['title','name','size','created'].every(k=>typeof f[k]==='string')||!Number.isFinite(Date.parse(f.created))))throw Error();uploads=value;}catch{loadError=true;}
  const time=iso=>new Date(iso).toLocaleString('sv-SE').slice(0,16);
  const size=n=>n<1024?n+' B':n<1024*1024?(n/1024).toFixed(1)+' KB':(n/1024/1024).toFixed(1)+' MB';
  function persist(next){if(loadError)throw Error('上传记录无法读取，请先保留浏览器数据并联系维护者。');if(localStorage.getItem(KEY)!==savedUploads)throw Error('上传记录已在其他页面更新，请刷新后重试。');const serialized=JSON.stringify(next);localStorage.setItem(KEY,serialized);savedUploads=serialized;uploads=next;}
  function change(id,patch){try{persist(uploads.map(f=>f.id===id?{...f,...patch}:f));return true;}catch{showToast('保存失败，现有录音未改变。请检查浏览器存储空间后重试。');return false;}}
  function rowFor(f){
    const row=document.createElement('div');row.className='meeting-row home-meeting-row';row.setAttribute('role','button');row.tabIndex=0;
    Object.assign(row.dataset,{meetingId:f.id,meeting:f.title,view:'my',source:'文件上传',recordingDate:time(f.created).slice(0,10),meetingCreator:'张伟',meetingDepartment:'',uploadNote:note,meta:time(f.created)+' · 文件上传 · 待处理'});
    row.innerHTML=`<span class="home-meeting-title"><i><svg class="icon"><use href="#ico-mic"/></svg></i><span><strong>${esc(f.title)}</strong><small>${esc(f.name)}</small></span></span><span class="home-meeting-size">${esc(f.size)}</span><span class="meeting-creator">张伟</span><span>文件上传</span><span class="home-meeting-tag">上传录音</span><span>待识别</span><span class="home-meeting-status"><i></i>待处理</span><span class="home-meeting-time">${time(f.created)}</span><span class="home-meeting-updated">${time(f.created)}</span><span class="meeting-row-actions"><button type="button" data-meeting-action="tag">编辑标签</button><button type="button" class="meeting-delete" data-meeting-action="delete" aria-label="删除会议"><svg class="icon"><use href="#ico-trash"/></svg></button></span>`;
    row.addEventListener('click',e=>{if(!e.target.closest('[data-meeting-action]'))window.MeetingDetail.open(row.dataset.meeting);});
    return row;
  }
  function restore(){
    for(const f of [...uploads].reverse()){
      const row=rowFor(f);
      assetStore.addMeeting({id:f.id,name:f.title,size:f.size,source:'文件上传',recordingAt:time(f.created),space:'personal',folder:'我的会议'});
      if(f.deleted){assetStore.deleteMeeting(f.id,f.deletedAt);meetingRowsById.set(f.id,{row,parent:$('#meeting-list'),nextSibling:null});}
      else $('#meeting-list').prepend(row);
    }
    filterMeetings();
  }
  const dialog=document.createElement('dialog');dialog.id='audio-upload-dialog';dialog.className='audio-upload-dialog';dialog.setAttribute('aria-labelledby','audio-upload-title');document.body.append(dialog);
  function choose(file){
    selected=null;$('#audio-upload-file').textContent='尚未选择文件';$('#audio-upload-error').textContent='';$('#audio-upload-submit').disabled=true;
    if(!file)return;
    const ext=file.name.split('.').pop().toLowerCase();
    if(!formats.includes(ext)){$('#audio-upload-error').textContent='暂不支持此格式，请选择 m4a、mp3、wav、opus、flac 或 aac 音频。';$('#audio-upload-file').textContent='请选择支持的音频文件';return;}
    if(!file.size){$('#audio-upload-error').textContent='文件为空，请重新选择。';return;}
    selected=file;$('#audio-upload-file').textContent=file.name+' · '+size(file.size);$('#audio-upload-submit').disabled=false;
  }
  function open(button){
    try{context=window.EurekaSpaces.uploadContext();}catch(e){showToast(e.message);return;}
    trigger=button;selected=null;busy=false;
    dialog.innerHTML=`<header><div><h2 id="audio-upload-title">上传录音</h2><p>添加已有音频，继续整理会议内容。</p></div><button type="button" data-upload-close aria-label="关闭上传">×</button></header><div class="audio-upload-body"><div class="audio-upload-target">保存到 <strong>${esc(context.name)}</strong>${context.type==='team'?' · 团队成员可查看':' · 仅自己可见'}</div><button type="button" id="audio-upload-drop"><svg class="icon"><use href="#ico-upload"/></svg><strong>点击选择文件，或拖放到这里</strong><span>m4a、mp3、wav、opus、flac、aac</span></button><input id="audio-upload-input" type="file" accept="${formats.map(f=>'.'+f).join(',')}" hidden><div id="audio-upload-file" aria-live="polite">尚未选择文件</div><p id="audio-upload-error" role="alert"></p><p class="audio-upload-demo">本地演示仅保存文件信息，原音频不会上传。录音进入会议列表后显示为“待处理”。</p></div><footer><button type="button" data-upload-close>取消</button><button type="button" id="audio-upload-submit" disabled>上传</button></footer>`;
    const input=$('#audio-upload-input'),drop=$('#audio-upload-drop');
    drop.onclick=()=>{input.value='';input.click();};input.onchange=()=>choose(input.files[0]);
    drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');if(e.dataTransfer.files.length!==1){selected=null;$('#audio-upload-submit').disabled=true;$('#audio-upload-error').textContent='每次请选择一个音频文件。';return;}choose(e.dataTransfer.files[0]);};
    $('#audio-upload-submit').onclick=()=>{
      if(busy||!selected)return;busy=true;$('#audio-upload-submit').disabled=true;
      try{
        const now=window.EurekaSpaces.uploadContext();if(now.id!==context.id||now.actor!==context.actor)throw Error('工作空间已改变，请关闭并重新上传。');
        const f={id:'upload-'+crypto.randomUUID(),title:selected.name.replace(/\.[^.]+$/,'').slice(0,150)||'上传录音',name:selected.name,size:size(selected.size),created:new Date().toISOString(),note};
        if(context.type==='team')window.EurekaSpaces.uploadAudio(f,context);
        else{
          persist([f,...uploads]);const row=rowFor(f);$('#meeting-list').prepend(row);
          showMainView('home',{silent:true});$('#meeting-search').value='';$('#meeting-source-filter').value='all';$('#meeting-date-filter').value='';document.dispatchEvent(new Event('meeting-filters-reset'));filterMeetings();
        }
        dialog.close();showToast('已添加到当前空间的会议列表，等待转写处理');
      }catch(e){$('#audio-upload-error').textContent=e.name==='QuotaExceededError'?'浏览器存储空间不足，请清理后重试。':e.message;busy=false;$('#audio-upload-submit').disabled=false;}
    };
    dialog.showModal();
  }
  dialog.addEventListener('dragover',e=>e.preventDefault());dialog.addEventListener('drop',e=>e.preventDefault());
  dialog.addEventListener('click',e=>{if(e.target.closest('[data-upload-close]')&&!busy)dialog.close();});dialog.addEventListener('close',()=>{selected=null;context=null;trigger?.focus({preventScroll:true});});
  document.addEventListener('click',e=>{const button=e.target.closest('[data-audio-upload]');if(button)open(button);});
  window.RecordingUpload={owns:id=>uploads.some(f=>f.id===id),trash:(id,deleted)=>change(id,{deleted,deletedAt:deleted?new Date().toISOString():null}),purge(id){try{persist(uploads.filter(f=>f.id!==id));return true;}catch{showToast('删除未保存，请重试');return false;}}};
  const source=$('#meeting-source-filter');source.add(new Option('文件上传','文件上传'));restore();
})();
