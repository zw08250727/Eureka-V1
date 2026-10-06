(function () {
  'use strict';
  const KEY='eureka:prd:draft:v1', PENDING='eureka:prd:editor:v1';
  const $=s=>document.querySelector(s), clone=x=>JSON.parse(JSON.stringify(x));
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let baseline, working, local=null, expected=null, publishedView=false, editor=null, observer, imported=null, toastTimer;
  const digest=o=>{let h=2166136261;for(const c of JSON.stringify(o)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return String(h>>>0);};
  const uid=()=>`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  function inline(text) {
    return escape(text).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  }
  function markdown(source) {
    const lines=source.replace(/\r/g,'').split('\n');let out='',i=0;
    const cells=l=>l.trim().replace(/^\||\|$/g,'').split('|').map(s=>s.trim());
    while(i<lines.length){const line=lines[i].trim();
      if(!line){i++;continue;}
      if(line==='```flow'){
        i++;const block=[];while(i<lines.length&&lines[i].trim()!=='```')block.push(lines[i++]);if(i<lines.length)i++;
        out+=window.PRDFlow.render(block.join('\n'));continue;
      }
      const picture=line.match(/^!\[([^\]]*)\]\((images\/[\w.-]+\.(?:png|jpg|webp))\)$/);
      if(picture){const size=baseline?.imageSizes?.[picture[2]]||[1440,900];out+=`<figure><a href="${picture[2]}" target="_blank" rel="noopener"><img src="${picture[2]}" alt="${escape(picture[1])}" loading="lazy" width="${Number(size[0])||1440}" height="${Number(size[1])||900}"></a><figcaption>${escape(picture[1])}</figcaption></figure>`;i++;continue;}
      if(/^#{1,4}\s/.test(line)){out+=`<h3>${inline(line.replace(/^#{1,4}\s+/,''))}</h3>`;i++;continue;}
      if(line.startsWith('|')&&/^\s*\|?[\s:|-]+\|\s*$/.test(lines[i+1]||'')){
        const head=cells(line);i+=2;out+='<div class="table-wrap" tabindex="0" role="region" aria-label="需求规则表格"><table><thead><tr>'+head.map(c=>`<th scope="col">${inline(c)}</th>`).join('')+'</tr></thead><tbody>';
        while(i<lines.length&&lines[i].trim().startsWith('|')){const row=cells(lines[i++]);out+='<tr>'+head.map((_,j)=>`<td>${inline(row[j]||'')}</td>`).join('')+'</tr>';}
        out+='</tbody></table></div>';continue;
      }
      if(/^(?:[-*]|\d+\.)\s/.test(line)){const ordered=/^\d/.test(line),tag=ordered?'ol':'ul',re=ordered?/^\d+\.\s/:/^[-*]\s/;out+=`<${tag}>`;while(i<lines.length&&re.test(lines[i].trim()))out+=`<li>${inline(lines[i++].trim().replace(re,''))}</li>`;out+=`</${tag}>`;continue;}
      if(line.startsWith('> ')){out+=`<blockquote>${inline(line.slice(2))}</blockquote>`;i++;continue;}
      let para=lines[i++];while(i<lines.length&&lines[i].trim()&&!/^(?:#{1,4}\s|[-*]\s|\d+\.\s|\||!\[|```|> )/.test(lines[i].trim()))para+=' '+lines[i++].trim();
      out+=`<p>${inline(para)}</p>`;
    }return out;
  }
  function valid(doc){
    if(!doc||doc.schemaVersion!==1||doc.documentId!=='eurekamind-product-prd'||!Array.isArray(doc.sections)||doc.sections.length<1||doc.sections.length>100)throw Error('文档格式不匹配，请选择本网站导出的修订 JSON。');
    for(const key of ['title','version','revision','updatedAt','referenceStatus'])if(typeof doc[key]!=='string'||doc[key].length>500)throw Error('文档版本信息缺失或超长。');
    const ids=new Set();for(const s of doc.sections){if(!s||typeof s.id!=='string'||!/^[a-z][a-z0-9-]{0,60}$/.test(s.id)||ids.has(s.id))throw Error('章节 ID 无效或重复。');ids.add(s.id);for(const key of ['title','summary','group','body','reviewNotes'])if(typeof s[key]!=='string'||s[key].length>(key==='body'?120000:10000))throw Error('章节字段缺失或内容超过限制。');if(!s.title.trim()||!s.body.trim())throw Error('章节标题和正文不能为空。');}
    if(baseline&&baseline.sections.map(s=>s.id).join()!==doc.sections.map(s=>s.id).join()){
      const removed=new Set(['evidence','reference','review']), retained=doc.sections.filter(s=>!removed.has(s.id));
      if(retained.map(s=>s.id).join()!==baseline.sections.map(s=>s.id).join())throw Error('章节结构与当前发布版不一致，请先通过仓库合并结构变更。');
      doc=clone(doc);doc.sections=retained;
    }
    return doc;
  }
  function notify(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
  function storage(){const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null;}
  function changed(s){return JSON.stringify(s)!==JSON.stringify(baseline.sections.find(b=>b.id===s.id));}
  function activeDoc(){return publishedView?baseline:working;}
  function status(){
    const n=working.sections.filter(changed).length, el=$('#save-status');el.classList.toggle('local',!!n&&!publishedView);
    el.textContent=publishedView?'仓库发布版':n?`本地修订 · ${n} 章`:'与发布版一致';
    $('#draft-view').setAttribute('aria-pressed',String(!publishedView));$('#published-view').setAttribute('aria-pressed',String(publishedView));
    $('#meta-version').textContent=`V${baseline.version} · ${baseline.updatedAt}`;$('#meta-count').textContent=`${baseline.sections.length} 个章节`;

  }
  function notices(){
    const host=$('#notices');host.replaceChildren();
    if(local&&local.baseDigest!==digest(baseline)){
      const n=document.createElement('div');n.className='notice';n.innerHTML='<span>仓库发布版已更新。当前本地稿基于旧版本，请对照后合并，发布前需确认新基线。</span><div><button data-global="compare">查看发布版</button><button data-global="rebase">确认已完成合并</button></div>';host.append(n);
    }
    if(local){const n=document.createElement('div');n.className='notice';n.style.background='#f0f6fc';n.style.borderColor='#d7e3ef';n.style.color='#657f98';n.textContent=`当前修改仅保存在此浏览器。上次本地保存：${new Date(local.savedAt).toLocaleString('zh-CN')}。全员生效需提交仓库并成功部署。`;host.append(n);}
    try{if(!editor&&sessionStorage.getItem(PENDING)){const n=document.createElement('div');n.className='notice';n.innerHTML='<span>发现未完成的章节编辑，可继续恢复。</span><button data-global="recover">恢复编辑</button>';host.append(n);}}catch{/* editing still works without storage */}
  }
  function navigation(){
    const q=$('#search').value.trim().toLowerCase();let group='';
    const matched=activeDoc().sections.filter(s=>!q||`${s.title} ${s.summary} ${s.body} ${s.reviewNotes}`.toLowerCase().includes(q));
    $('#navigation').innerHTML=matched.map(s=>{let html='';if(s.group!==group){group=s.group;html=`<div class="nav-group">${escape(group)}</div>`;}const idx=baseline.sections.findIndex(v=>v.id===s.id)+1;return html+`<a class="nav-link" href="#${s.id}"><span>${String(idx).padStart(2,'0')}</span>${escape(s.title)}</a>`;}).join('');
    $('#search-info').textContent=q?`${matched.length} 个匹配章节`:`${baseline.sections.length} 个章节 · 点击跳转`;
    highlight(location.hash.slice(1)||'overview');
  }
  function highlight(id){for(const a of document.querySelectorAll('.nav-link')){if(a.hash===`#${id}`)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}}
  function chapter(s,i){return `<article class="chapter" id="${s.id}" aria-labelledby="title-${s.id}"><div class="chapter-header"><div><div class="chapter-overline">${String(i+1).padStart(2,'0')} / ${escape(s.group)}${!publishedView&&changed(s)?'<span class="local-marker">本地修订</span>':''}</div><h2 id="title-${s.id}">${escape(s.title)}</h2></div><div class="chapter-tools"><button data-link="${s.id}" aria-label="复制${escape(s.title)}章节链接">↗ 链接</button><button data-edit="${s.id}">编辑</button></div></div><p class="chapter-summary">${escape(s.summary)}</p><div class="prose">${markdown(s.body)}</div><details class="review-note ${s.reviewNotes?'has-note':''}" ${s.reviewNotes?'open':''}><summary>${s.reviewNotes?'评审记录':'添加评审结论：点击本章「编辑」'}</summary><p>${escape(s.reviewNotes||'尚未填写。建议记录结论、确认人、日期与影响范围。')}</p></details></article>`;}
  function render(){
    $('#sections').innerHTML=activeDoc().sections.map(chapter).join('');navigation();status();notices();
    if(observer)observer.disconnect();observer=new IntersectionObserver(followReading,{rootMargin:'-90px 0px -65% 0px',threshold:0});document.querySelectorAll('.chapter').forEach(el=>observer.observe(el));
  }
  function followReading(){
    const line=$('.toolbar').getBoundingClientRect().bottom+60;
    let current=null;for(const section of document.querySelectorAll('.chapter')){if(section.getBoundingClientRect().top<=line)current=section;else break;}
    if(current)highlight(current.id);
  }
  function safeHash(){const aliases={evidence:'milestones',reference:'overview',review:'overview'};if(aliases[location.hash.slice(1)])history.replaceState(null,'','#'+aliases[location.hash.slice(1)]);const id=location.hash.slice(1);if(activeDoc().sections.some(s=>s.id===id))document.getElementById(id)?.scrollIntoView();}
  function dialog(title,html){$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;$('#action-dialog').showModal();}
  function closeDialog(){$('#action-dialog').close();}
  async function copy(text){try{await navigator.clipboard.writeText(text);notify('已复制');return true;}catch{if(!$('#action-dialog').open)dialog('复制内容','<p>浏览器未允许自动复制，可手动复制下方内容。</p>');const area=document.createElement('textarea');area.className='fallback-copy';area.value=text;area.setAttribute('aria-label','请手动复制内容');$('#dialog-body').append(area);area.focus();area.select();notify('浏览器限制自动复制，请手动复制选中内容');return false;}}
  function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportDoc(includeEditor=false){const doc=clone(working);if(includeEditor&&editor){const s=values();Object.assign(doc.sections.find(x=>x.id===editor.id),s);}return doc;}
  function saveDoc(next,baseDigest=local?.baseDigest||digest(baseline)){
    const latest=storage();if((latest?.stamp||null)!==expected)throw Error('另一个标签页已修改本地稿。请先导出当前内容，再载入最新本地稿，避免覆盖。');
    const entry={stamp:uid(),savedAt:new Date().toISOString(),baseDigest,doc:valid(next)};
    localStorage.setItem(KEY,JSON.stringify(entry));local=entry;expected=entry.stamp;working=clone(next);
  }
  function values(){return {title:$('#edit-title').value.trim(),summary:$('#edit-summary').value.trim(),body:$('#edit-body').value,reviewNotes:$('#edit-notes').value};}
  function pending(){if(!editor)return;try{sessionStorage.setItem(PENDING,JSON.stringify({id:editor.id,values:values(),base:editor.initial,baseDigest:editor.baseDigest}));$('.chapter-edit-status').textContent='未保存输入已暂存，可刷新恢复';}catch{$('.chapter-edit-status').textContent='浏览器无法暂存，请复制或导出后离开';}}
  function preview(){const v=values();$('.live-preview').innerHTML=`<h3>${escape(v.title)}</h3><p>${escape(v.summary)}</p>${markdown(v.body)}`;pending();}
  function finishEditor(){editor=null;try{sessionStorage.removeItem(PENDING);}catch{}render();}
  function edit(id,recovered){
    if(editor){notify('请先保存或退出当前章节编辑');document.getElementById(editor.id).scrollIntoView();return;}
    if(publishedView){publishedView=false;render();}
    const s=working.sections.find(v=>v.id===id);if(!s)return;
    editor={id,initial:recovered?.base||JSON.stringify(s),baseDigest:recovered?.baseDigest||digest(baseline)};
    const v=recovered?.values||s, el=document.getElementById(id);el.classList.add('editing');
    el.querySelector('.chapter-tools').hidden=true;el.querySelector('.prose').hidden=true;el.querySelector('.review-note').hidden=true;
    el.insertAdjacentHTML('beforeend',`<div class="editor"><div class="editor-fields"><label>章节标题<input id="edit-title" maxlength="180" value="${escape(v.title)}"></label><label>章节摘要<input id="edit-summary" maxlength="1000" value="${escape(v.summary)}"></label><label>正文 · Markdown（图片、flow 流程图、标题、表格、列表）<textarea id="edit-body" spellcheck="false">${escape(v.body)}</textarea></label><label>评审记录 · 结论 / 确认人 / 日期<textarea class="notes-input" id="edit-notes">${escape(v.reviewNotes)}</textarea></label></div><details open><summary>实时预览</summary><div class="live-preview prose"></div></details><span class="chapter-edit-status" role="status"></span><div class="editor-actions"><small>保存只在当前浏览器生效，发布需提交仓库。</small><button data-editor="cancel">退出编辑</button><button data-editor="export">导出当前内容</button><button data-editor="save" class="primary">保存本地</button></div></div>`);
    el.querySelectorAll('input,textarea').forEach(input=>input.addEventListener('input',preview));preview();notices();el.scrollIntoView();$('#edit-title').focus({preventScroll:true});
  }
  function cancelEdit(){const current=JSON.stringify({...working.sections.find(s=>s.id===editor.id),...values()});if(current===editor.initial){finishEditor();return;}dialog('退出本次编辑？','<p>未保存的输入将被丢弃，已保存的本地修订保留。</p><div class="dialog-actions"><button data-dialog="close">继续编辑</button><button data-dialog="discard">放弃未保存修改</button></div>');}
  function saveEdit(){
    try{
      const s=values();if(!s.title||!s.body.trim())throw Error('标题和正文不能为空。');
      if(editor.baseDigest!==digest(baseline))throw Error('发布基线已变化，请导出当前内容后，与发布版合并。');
      if(JSON.stringify(working.sections.find(s=>s.id===editor.id))!==editor.initial)throw Error('恢复的编辑基于旧章节，请先导出当前内容后重新编辑，避免覆盖。');
      const next=clone(working);Object.assign(next.sections.find(v=>v.id===editor.id),s);saveDoc(next);const id=editor.id;finishEditor();document.getElementById(id).scrollIntoView();notify('已保存本地修订；尚未发布到仓库');
    }catch(e){$('.chapter-edit-status').textContent=e.message;notify(e.message);}
  }
  function guarded(action){if(editor){notify('请先保存或退出当前编辑，再切换版本或发布。');document.getElementById(editor.id).scrollIntoView();return;}action();}
  function publish(){guarded(()=>{
    if(local&&local.baseDigest!==digest(baseline)){notify('请先对照发布版完成合并并确认新基线');return;}
    const doc=exportDoc();doc.revision=`prd-${new Date().toISOString().replace(/\D/g,'').slice(0,14)}`;doc.updatedAt=new Date().toISOString().slice(0,10);
    const payload=JSON.stringify(doc,null,2)+'\n';
    dialog('将修订发布给所有人',`<p>当前站点是静态网站。以下操作通过 GitHub 提交文档，<strong>部署成功后</strong>才会对所有访问者生效。</p><ol class="publish-steps"><li>复制完整发布内容，或下载 content.json。</li><li>用有仓库权限的账号打开 GitHub 编辑页，全选替换文件内容。</li><li>提交到 develop；受保护时创建分支和 PR，合入后触发部署。</li><li>在 Actions 确认 Pages 成功，刷新本页并切到「仓库发布版」核对版本。</li></ol><div class="dialog-callout">不会向浏览器索取或存储 GitHub Token。没有写权限时，将导出的修订交给仓库维护者。复制内容不等于已发布。</div><p class="dialog-code">src/prototype/prd/content.json<br>待发布版本：${escape(doc.revision)}</p><div class="dialog-actions"><button id="copy-publish" class="primary">1. 复制发布内容</button><a href="https://github.com/zw08250727/Eureka-V1/edit/develop/src/prototype/prd/content.json" target="_blank" rel="noopener">2. 打开 GitHub 编辑页 ↗</a><button id="download-publish">下载 content.json</button><a href="https://github.com/zw08250727/Eureka-V1/actions/workflows/pages.yml" target="_blank" rel="noopener">查看部署状态 ↗</a></div>`);
    $('#copy-publish').onclick=()=>copy(payload);$('#download-publish').onclick=()=>download('content.json',payload,'application/json');
  });}
  function exportMenu(){dialog('导出需求文档','<p>导出当前工作稿，包含本地修订和评审记录。编辑未保存时，JSON 也会包含当前输入。</p><div class="dialog-actions"><button id="export-json" class="primary">修订 JSON</button><button id="export-md">阅读版 Markdown</button></div>');$('#export-json').onclick=()=>{download('eurekamind-prd-revision.json',JSON.stringify(exportDoc(true),null,2),'application/json');closeDialog();};$('#export-md').onclick=()=>{const d=exportDoc(true);download('EurekaMind-产品需求文档.md',`# ${d.title}\n\n版本 ${d.version} · ${d.revision}\n\n`+d.sections.map((s,i)=>`## ${String(i+1).padStart(2,'0')} ${s.title}\n\n${s.summary}\n\n${s.body}${s.reviewNotes?'\n\n### 评审记录\n\n'+s.reviewNotes:''}`).join('\n\n---\n\n'),'text/markdown;charset=utf-8');closeDialog();};}
  async function importFile(file){
    try{if(!file)return;if(file.size>2000000)throw Error('文件超过 2 MB，请检查是否为 PRD 修订 JSON。');imported=valid(JSON.parse(await file.text()));const count=imported.sections.filter((s,i)=>JSON.stringify(s)!==JSON.stringify(working.sections[i])).length;
      dialog('导入修订预览',`<p>文件：${escape(file.name)}</p><p>${imported.sections.length} 个章节，${count} 个章节与当前工作稿不同。导入会替换当前本地稿，<strong>不会修改仓库发布版</strong>。</p><p class="dialog-callout">请先导出重要修订。${imported.revision!==baseline.revision?'该文件版本与当前发布版不同，导入后需对照并确认合并。':'当前结构与发布版一致。'}</p><div class="dialog-actions"><button data-dialog="close">取消</button><button id="confirm-import" class="primary">确认导入为本地稿</button></div>`);
      $('#confirm-import').onclick=()=>{try{saveDoc(clone(imported),imported.revision===baseline.revision?digest(baseline):'imported-version');publishedView=false;closeDialog();render();notify('修订已导入本地，尚未发布');}catch(e){notify(e.message);}};
    }catch(e){notify(e instanceof SyntaxError?'JSON 无法解析，当前文档未改变。':e.message);}finally{$('#import-file').value='';}
  }
  function closeNav(){document.body.classList.remove('nav-open');$('#nav-backdrop').hidden=true;$('#nav-toggle').setAttribute('aria-expanded','false');}
  async function start(){
    try{
      const response=await fetch('content.json',{cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);baseline=valid(await response.json());working=clone(baseline);
      try{const saved=storage();if(saved){const compatible=valid(saved.doc);local=saved;expected=saved.stamp;working=clone(compatible);}}catch{notify('本地草稿无法读取，已展示发布版；未删除原存储，可导出或检查后恢复。');}
      $('#load-state').hidden=true;$('#doc-content').hidden=false;render();requestAnimationFrame(safeHash);
      $('#search').oninput=navigation;
      $('#navigation').addEventListener('click',e=>{if(e.target.closest('a'))closeNav();});
      $('#sections').onclick=e=>{const editButton=e.target.closest('[data-edit]'),link=e.target.closest('[data-link]'),action=e.target.closest('[data-editor]');if(editButton)edit(editButton.dataset.edit);if(link){const url=new URL(location.href);url.hash=link.dataset.link;copy(url.href);}if(action){if(action.dataset.editor==='save')saveEdit();if(action.dataset.editor==='cancel')cancelEdit();if(action.dataset.editor==='export')download('eurekamind-prd-unsaved.json',JSON.stringify(exportDoc(true),null,2),'application/json');}};
      $('#draft-view').onclick=()=>guarded(()=>{publishedView=false;render();safeHash();});$('#published-view').onclick=()=>guarded(()=>{publishedView=true;render();safeHash();});
      $('#export-button').onclick=exportMenu;$('#publish-button').onclick=publish;$('#print-button').onclick=()=>guarded(async()=>{const images=[...document.querySelectorAll('.prose img')];images.forEach(img=>img.loading='eager');await Promise.allSettled(images.map(img=>img.decode()));window.print();});
      $('#import-button').onclick=()=>guarded(()=>$('#import-file').click());$('#import-file').onchange=e=>importFile(e.target.files[0]);
      $('#dialog-close').onclick=closeDialog;
      $('#dialog-body').onclick=e=>{const a=e.target.closest('[data-dialog]');if(!a)return;const action=a.dataset.dialog;if(action==='close')closeDialog();if(action==='discard'){closeDialog();finishEditor();}};
      $('#notices').onclick=e=>{const a=e.target.closest('[data-global]');if(!a)return;const action=a.dataset.global;
        if(action==='compare')$('#published-view').click();
        if(action==='recover'){try{const p=JSON.parse(sessionStorage.getItem(PENDING));if(p&&working.sections.some(s=>s.id===p.id)&&p.values)edit(p.id,p);}catch{notify('暂存编辑无法恢复，请检查浏览器存储。');}}
        if(action==='rebase')guarded(()=>{dialog('确认已完成版本合并？','<p>请先逐章对照仓库发布版。此操作仅标记当前工作稿已包含需要保留的线上变更，不会自动合并冲突或发布。</p><div class="dialog-actions"><button data-dialog="close">继续对照</button><button id="confirm-rebase">已核对，采用新基线</button></div>');$('#confirm-rebase').onclick=()=>{try{working.revision=baseline.revision;saveDoc(working,digest(baseline));closeDialog();render();notify('已记录新基线，仍为本地稿');}catch(err){notify(err.message);}};});
        if(action==='reload-local')guarded(()=>location.reload());
      };
      $('#nav-toggle').onclick=()=>{const open=!document.body.classList.contains('nav-open');document.body.classList.toggle('nav-open',open);$('#nav-backdrop').hidden=!open;$('#nav-toggle').setAttribute('aria-expanded',String(open));};$('#nav-backdrop').onclick=closeNav;
      addEventListener('hashchange',()=>highlight(location.hash.slice(1)));
      let scrollPending=false;addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(()=>{scrollPending=false;followReading();});}},{passive:true});
      addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();if(innerWidth<=800)$('#nav-toggle').click();$('#search').focus();}if(e.key==='Escape')closeNav();});
      addEventListener('beforeunload',e=>{if(editor){e.preventDefault();e.returnValue='';}});
      addEventListener('storage',e=>{if(e.key===KEY){const n=document.createElement('div');n.className='notice';n.innerHTML='<span>另一个标签页修改了本地稿。为避免覆盖，先导出当前修改，再载入最新稿。</span><button data-global="reload-local">载入最新稿</button>';$('#notices').prepend(n);}});
    }catch(e){$('#load-state').innerHTML=`文档加载失败：${escape(e.message)}<br><button id="retry">重新载入</button>`;$('#retry').onclick=()=>location.reload();}
  }
  start();
})();
