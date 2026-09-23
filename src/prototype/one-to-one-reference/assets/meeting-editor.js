(() => {
  'use strict';
  const key = 'eureka:meeting-details:v1';
  const params = new URLSearchParams(location.search), id = params.get('meeting'), field = params.get('type') === 'verbatim' ? 'verbatim':'summary';
  const $ = selector => document.querySelector(selector);
  let initial, dirty = false, selection = '', textRange;
  function read() { const data = JSON.parse(localStorage.getItem(key) || '{}'); return data && typeof data === 'object' ? data : {}; }
  try { initial = read()[id]; } catch { /* Render a recoverable empty state. */ }
  if (!initial) { $('#editor-shell').innerHTML = '<main class="editor-error"><h1>未找到会议内容</h1><p>请返回工作台，从会议详情重新打开编辑器。</p><a href="team-only-app.html?edition=personal&personal=1">返回工作台</a></main>'; return; }
  function clean(value) {
    const template = document.createElement('template'); template.innerHTML = value;
    const allowed = new Set(['B','STRONG','I','EM','U','BR','P','DIV','FONT','H2','H3','UL','OL','LI']);
    const walk = node => [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE || ['SCRIPT','STYLE','IFRAME','OBJECT'].includes(child.tagName)) { child.remove(); return; }
      walk(child);
      if (!allowed.has(child.tagName)) child.replaceWith(...child.childNodes);
      else [...child.attributes].forEach(a=>{
        const keep = child.tagName === 'FONT' && ((a.name === 'size' && /^[1-7]$/.test(a.value)) || (a.name === 'face' && ['sans-serif','serif','monospace'].includes(a.value)));
        if (!keep) child.removeAttribute(a.name);
      });
    });
    walk(template.content); return template.innerHTML;
  }
  $('#editor-title').value = initial.title;
  $('#editor-heading').textContent = initial.title;
  $('#editor-attachment').textContent = `${initial.title}.md`;
  if (initial[`${field}Html`]) $('#editor-body').innerHTML = clean(initial[`${field}Html`]);
  else $('#editor-body').textContent = initial[field] || '';
  $('.editor-main').hidden = false; $('#editor-save').disabled = false;
  const changed = () => { dirty = true; $('#editor-status').textContent = '有未保存的修改'; };
  $('#editor-title').addEventListener('input',changed); $('#editor-body').addEventListener('input',changed);
  $('#editor-body').addEventListener('paste', e=>{ e.preventDefault(); document.execCommand('insertText',false,e.clipboardData.getData('text/plain')); });
  $('.md-editor-toolbar').addEventListener('mousedown', e=>{ if (e.target.closest('button')) e.preventDefault(); });
  $('.md-editor-toolbar').addEventListener('click', e=>{
    const button = e.target.closest('[data-command]'); if (!button) return;
    document.execCommand(button.dataset.command,false); changed();
  });
  document.addEventListener('selectionchange',()=>{
    const selected = window.getSelection();
    if (selected?.rangeCount && $('#editor-body').contains(selected.anchorNode)) textRange = selected.getRangeAt(0).cloneRange();
  });
  const formatSelect = (selector,command) => $(selector).addEventListener('change',e=>{
    $('#editor-body').focus(); if (textRange) { const selected = window.getSelection(); selected.removeAllRanges(); selected.addRange(textRange); }
    document.execCommand(command,false,e.target.value); changed();
  });
  formatSelect('#editor-block','formatBlock'); formatSelect('#editor-font-size','fontSize'); formatSelect('#editor-font-family','fontName');
  $('#editor-body').addEventListener('mouseup',()=>{ selection = window.getSelection()?.toString() || ''; });
  $('#editor-ask').addEventListener('click',()=>{ $('#editor-instruction').value = selection ? `请整理以下内容：\n${selection}`:'请整理本次会议的行动项'; $('#editor-instruction').focus(); });
  $('#editor-generate').addEventListener('click',()=>{
    $('#editor-answer').replaceChildren();
    const p = document.createElement('p'); p.textContent = '演示建议\n产品：补齐方案与验收标准。\n研发：确认排期与技术依赖。\n客户成功：汇总试用反馈。';
    const button = document.createElement('button'); button.textContent = '插入到正文';
    button.onclick = ()=>{ $('#editor-body').append(document.createTextNode('\n\n'+p.textContent)); changed(); };
    $('#editor-answer').append(p,button);
  });
  function save() {
    const title = $('#editor-title').value.trim(), text = $('#editor-body').innerText.trim();
    if (!title || !text) { $('#editor-status').textContent = '标题和正文不能为空'; return; }
    try {
      const data = read(), latest = data[id];
      if (!latest) throw new Error('missing');
      // Detect concurrent changes before overwriting this document's edited field.
      if (latest[field] !== initial[field] || latest.title !== initial.title) { $('#editor-status').textContent = '此会议已在其他页面更新，请刷新后再编辑。'; return; }
      data[id] = {...latest,title,[field]:text,[`${field}Html`]:clean($('#editor-body').innerHTML),updated:new Date().toLocaleString('zh-CN',{hour12:false})};
      localStorage.setItem(key,JSON.stringify(data)); initial = data[id]; dirty = false;
      $('#editor-heading').textContent = title; $('#editor-status').textContent = '已保存并同步到会议详情';
    } catch { $('#editor-status').textContent = '保存失败，请检查浏览器存储空间后重试。'; }
  }
  $('#editor-save').addEventListener('click',save);
  $('#editor-return').addEventListener('click',()=>{ if (dirty && !confirm('有未保存的修改，确定离开？')) return; dirty=false; window.close(); });
  window.addEventListener('beforeunload',e=>{ if (dirty) { e.preventDefault(); e.returnValue=''; } });
  document.addEventListener('keydown',e=>{ if ((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s') { e.preventDefault(); save(); } });
})();
