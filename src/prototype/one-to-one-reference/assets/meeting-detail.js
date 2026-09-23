/* Meeting detail prototype. All content and generation are local demonstration data. */
(() => {
  'use strict';
  const root = document.getElementById('meeting-detail-root');
  if (!root) return;
  const $ = (s, el = root) => el.querySelector(s);
  const $$ = (s, el = root) => [...el.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const icons = {
    file:'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h6', close:'M6 6l12 12M6 18L18 6',
    edit:'M16 3l5 5-12 12H4v-5zM13 6l5 5', library:'M3 4h18v16H3zM9 4v16',
    back:'M14 6l-6 6 6 6', more:'M5 12h.01M12 12h.01M19 12h.01',
    location:'M12 22s8-8 8-14a8 8 0 10-16 0c0 6 8 14 8 14zM9 8a3 3 0 106 0 3 3 0 10-6 0',
    spark:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z', copy:'M9 8h11v13H9zM5 16H3V3h12v2',
    clock:'M21 12a9 9 0 11-18 0 9 9 0 0118 0M12 7v5l3 2', download:'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',
    share:'M12 16V3M7 8l5-5 5 5M5 12v9h14v-9', trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
    play:'M8 4l12 8-12 8z', pause:'M8 4v16M16 4v16', plus:'M12 5v14M5 12h14',
  };
  const icon = name => `<svg class="md-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.file}"/></svg>`;
  const btn = (action, text, cls = 'md-btn', extra = '') => `<button type="button" class="${cls}" data-md-action="${action}" ${extra}>${text}</button>`;
  const ibtn = (action, name, label) => btn(action, icon(name), 'md-icon-btn', `aria-label="${label}" title="${label}"`);
  const tabs = [['summary','智能总结'],['transcript','转译文本'],['translation','实时翻译'],['mindmap','思维导图'],['visual','图文摘要'],['verbatim','逐字稿']];
  // Keep editor formatting without admitting scripts, links or pasted styles.
  function cleanHtml(value) {
    const template = document.createElement('template'); template.innerHTML = value;
    const allowed = new Set(['B','STRONG','I','EM','U','BR','P','DIV','FONT','H2','H3','UL','OL','LI']);
    const walk = node => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) continue;
        if (child.nodeType !== Node.ELEMENT_NODE) { child.remove(); continue; }
        if (['SCRIPT','STYLE','IFRAME','OBJECT'].includes(child.tagName)) { child.remove(); continue; }
        walk(child);
        if (!allowed.has(child.tagName)) child.replaceWith(...child.childNodes);
        else [...child.attributes].forEach(a => {
          const keep = child.tagName === 'FONT' && ((a.name === 'size' && /^[1-7]$/.test(a.value)) || (a.name === 'face' && ['sans-serif','serif','monospace'].includes(a.value)));
          if (!keep) child.removeAttribute(a.name);
        });
      }
    };
    walk(template.content); return template.innerHTML;
  }
  const storageKey = 'eureka:meeting-details:v1';
  let saved = {};
  try { const value = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (value && typeof value === 'object' && !Array.isArray(value)) saved = value; } catch { /* Start in memory if storage is unavailable. */ }
  const records = new Map();
  const editDrafts = new Map();
  const editKey = () => `${current.id}/${activeTab}`;
  let current, activeTab = 'summary', expanded = false, score = 0, query = '', mapZoom = 1;
  const audioUrl = new URL('assets/meeting-demo.wav', document.baseURI).href;
  const audio = new Audio();
  audio.preload = 'auto';
  // Blob playback supports seeking even on static hosts without byte-range responses.
  fetch(audioUrl).then(response => { if (!response.ok) throw new Error('audio'); return response.blob(); }).then(blob => { audio.src = URL.createObjectURL(blob); }).catch(() => { audio.src = audioUrl; });
  const toast = text => { if (typeof showToast === 'function') showToast(text); };
  const rows = () => [...document.querySelectorAll('#meeting-list .home-meeting-row')];
  const linesFor = r => [
    { at:0, speaker:0, text:`这是「${r.title}」的演示转译。我们先确认本次讨论的范围，重点看产品交付和客户试用反馈。`, en:`This is a demonstration transcript for “${r.title}”. Let's review product delivery and customer feedback.` },
    { at:7, speaker:1, text:'当前最需要明确的是排期、负责人，以及需求进入研发之前的统一标准。建议先解决影响核心流程的问题。', en:'We need to clarify the timeline, owners, and criteria for development. Issues affecting the core workflow should come first.' },
    { at:16, speaker:0, text:'客户沟通中的问题需要沉淀到知识库。请把反馈按优先级整理，下一次评审时一起确认。', en:'Customer feedback should be captured in the knowledge base and prioritized for the next review.' },
    { at:24, speaker:2, text:'我来汇总这次讨论的行动项。产品侧补齐方案，研发确认时间，客户成功团队跟进试用反馈，下周检查进展。', en:'I will summarize the action items. Product will refine the proposal, engineering will confirm the timeline, and customer success will follow up next week.' },
  ];
  const defaultSummary = title => `本次会议围绕「${title}」展开讨论，重点确认产品交付、客户反馈与后续协作安排。参会人对当前问题、需求优先级和排期进行了梳理，一致同意优先完善核心使用流程，并将客户试用反馈统一沉淀到知识库。\n\n后续由产品侧补齐方案与验收标准，研发侧确认实施排期，客户成功团队持续跟进试用情况；下周例会共同检查行动项进展。`;
  function record(row) {
    const id = row.dataset.meetingId;
    if (records.has(id)) return records.get(id);
    const cached = saved[id] && typeof saved[id] === 'object' ? saved[id] : {};
    row.dataset.meeting ||= row.querySelector('.home-meeting-title strong')?.textContent.trim() || '会议录音';
    const r = { id, row, title:row.dataset.meeting, meta:row.dataset.meta || '', source:row.dataset.source || '网页录音', date:row.dataset.recordingDate || '', status:row.querySelector('.home-meeting-status')?.textContent.trim() || '已总结', summary:defaultSummary(row.dataset.meeting), template:'通用', language:'中文（中国）', detail:'标准', speakers:['张伟','Kevin','Alice'], tags:[], customer:'', project:'', location:'', updated:'', generated:{}, feedback:0, images:[] };
    for (const key of ['title','summary','template','language','detail','customer','project','location','updated','verbatim','summaryHtml','verbatimHtml','customerType','projectType']) if (typeof cached[key] === 'string') r[key] = cached[key];
    r.meta = `${row.querySelector('.home-meeting-time')?.textContent.trim() || r.date} · ${[...row.children].find(el => /^\d+ 分钟$/.test(el.textContent.trim()))?.textContent.trim() || ''} · ${r.source}`;
    r.tags = (row.querySelector('.home-meeting-tag')?.textContent.trim() || '').split('、').filter(Boolean);
    if (Array.isArray(cached.speakers) && cached.speakers.every(x => typeof x === 'string')) r.speakers = cached.speakers.slice(0,20);
    if (Array.isArray(cached.tags)) r.tags = cached.tags.filter(x => typeof x === 'string').slice(0,10);
    if (cached.generated && typeof cached.generated === 'object') r.generated = cached.generated;
    if (Number.isInteger(cached.feedback) && cached.feedback >= 1 && cached.feedback <= 10) r.feedback = cached.feedback;
    records.set(id, r);
    syncRow(r);
    return r;
  }
  function syncRow(r) {
    r.row.dataset.meeting = r.title;
    const title = r.row.querySelector('.home-meeting-title strong');
    if (title) title.textContent = r.title;
    const tag = r.row.querySelector('.home-meeting-tag'); if (tag) { tag.textContent = r.tags.join('、') || '未添加'; tag.title = r.tags.join('、'); }
  }
  function save(r = current) {
    const { row, images, ...data } = r;
    void row; void images;
    saved[r.id] = data;
    syncRow(r);
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { toast('浏览器存储空间不足，本次修改仅保留到页面关闭。'); }
  }
  function allRecords() { return rows().map(record).filter(r => r.row.dataset.view === current?.row.dataset.view); }
  function library() {
    const all = allRecords();
    const filtered = all.filter(r => r.title.toLowerCase().includes(query.toLowerCase()));
    $('#md-library-count').textContent = `（共${all.length}个）`;
    $('#md-library-list').innerHTML = filtered.length ? filtered.map(r => `<button type="button" class="md-library-item" data-md-meeting="${esc(r.id)}" aria-current="${r.id === current.id}"><span class="md-file-icon">${icon('file')}</span><span class="md-library-copy"><strong>${esc(r.title)}</strong><small>${esc(r.meta || `${r.date} · ${r.source}`)}</small><em>${esc(r.status)}</em></span></button>`).join('') : '<p class="md-notice">没有找到相关录音</p>';
  }
  function fitWorkspace() {
    const frame = $('.md-frame');
    if (root.hidden || !frame) return;
    const main = document.querySelector('.main');
    const top = frame.getBoundingClientRect().top + (main?.scrollTop || 0);
    const value = `${top}px`;
    if (root.style.getPropertyValue('--md-frame-top') !== value) root.style.setProperty('--md-frame-top', value);
  }
  new ResizeObserver(fitWorkspace).observe(root);
  new ResizeObserver(fitWorkspace).observe(document.querySelector('.topbar'));
  window.addEventListener('resize', fitWorkspace);
  function open(title) {
    const row = rows().find(r => r.dataset.meeting === title) || rows().find(r => r.dataset.view === 'personal') || rows()[0];
    if (!row) return;
    audio.pause(); audio.currentTime = 0;
    current = record(row); activeTab = 'summary'; expanded = false; score = current.feedback; query = ''; mapZoom = 1;
    render();
    showMainView('note-detail', { silent:true });
  }
  function render() {
    root.innerHTML = `<div class="md-page-head"><div><h1>语音笔记</h1><p>统一管理语音转写内容，沉淀会议、闪念与结构化数据，持续积累可复用的知识资产。</p></div><div class="md-page-tools"><input class="md-search" id="md-search" type="search" placeholder="搜索语音笔记" aria-label="搜索语音笔记" value="${esc(query)}">${btn('ask','<span class="md-agent-mark"><svg class="icon" aria-hidden="true"><use href="#ico-spark"/></svg></span><strong>Ask Agent</strong><svg class="icon md-agent-expand" aria-hidden="true"><use href="#ico-expand"/></svg>','md-ask-agent','aria-label="Ask Agent"')}</div></div>
    <div class="md-frame"><aside class="md-library"><div class="md-library-head"><span>录音文件 <small id="md-library-count"></small></span>${ibtn('library','library','收起录音列表')}</div><div class="md-library-list" id="md-library-list"></div></aside>
    <section class="md-main"><header class="md-top">${ibtn('library','library','切换录音列表')}<div class="md-top-copy"><button class="md-title-button" type="button" data-md-action="rename" aria-label="编辑录音标题"><h1 id="note-detail-title">${esc(current.title)}</h1>${icon('edit')}</button><div class="md-top-meta"><p id="note-detail-meta">${esc(current.meta || `${current.date} · ${current.source}`)} · <span style="color:#25b47b">${esc(current.status)}</span></p><button type="button" data-md-action="info">${icon('location')} ${esc(current.location || '添加位置')}</button></div></div>
    <div class="md-top-actions" role="group" aria-label="会议操作">${btn('export',`${icon('download')} 导出`)}${btn('share',`${icon('share')} 分享`)}${btn('delete',`${icon('trash')} 删除`,'md-btn md-delete-btn')}${ibtn('close','close','关闭会议详情')}</div></header>
    <div class="md-scroll"><section class="md-info"><div class="md-info-line"><button type="button" data-md-action="participants">参会人 <span>${esc(current.speakers.join('、'))}</span></button><button type="button" data-md-action="info">客户名称 <span>${esc(current.customer || '添加客户')}</span></button><button type="button" data-md-action="info">商机项目 <span>${esc(current.project || '添加项目')}</span></button>${btn('info-toggle',expanded ? '收起 ⌃':'展开 ⌄','md-info-toggle',`aria-expanded="${expanded}"`)}</div><div class="md-info-extra" ${expanded ? '':'hidden'}><div>标签 ${current.tags.map(t => `<span class="md-tag">${esc(t)}</span>`).join('')}${btn('info','＋ 添加标签','md-link')}</div><div>图片（${current.images.length}/50）<div class="md-images">${current.images.map((im,i) => `<div class="md-image"><img src="${im.url}" alt="${esc(im.name)}" data-md-preview="${i}"><button aria-label="移除图片 ${esc(im.name)}" data-md-remove-image="${i}">×</button></div>`).join('')}</div>${btn('image',icon('plus'),'md-image-add','aria-label="添加图片"')}</div></div></section>
    <div class="md-player">${btn('play',icon(audio.paused ? 'play':'pause'),'md-play',`aria-label="${audio.paused ? '播放':'暂停'}录音"`)}${btn('rewind','↶15','md-icon-btn','aria-label="后退15秒"')}<time id="md-elapsed">00:00</time><input id="md-seek" type="range" min="0" max="${audio.duration || 1}" value="${audio.currentTime}" step="0.1" aria-label="录音播放进度"><time id="md-duration">00:00</time>${btn('forward','15↷','md-icon-btn','aria-label="前进15秒"')}<select id="md-speed" aria-label="播放倍速">${[0.5,0.75,1,1.25,1.5,2].map(x => `<option value="${x}" ${audio.playbackRate === x ? 'selected':''}>${x}x</option>`).join('')}</select><span class="md-demo">演示音频</span></div>
    <nav class="md-tabs" role="tablist" aria-label="录音详情内容">${tabs.map(([id,label]) => `<button id="md-tab-${id}" role="tab" type="button" data-md-tab="${id}" aria-controls="md-content" aria-selected="${id === activeTab}" tabindex="${id === activeTab ? 0:-1}">${label}</button>`).join('')}</nav><section id="md-content" class="md-panel" role="tabpanel" aria-labelledby="md-tab-${activeTab}"></section></div></section></div><input type="file" id="md-images-input" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden>`;
    library(); panel(); updatePlayer();
    requestAnimationFrame(fitWorkspace);
  }
  function panel() {
    const r = current;
    $$('[data-md-tab]').forEach(b => { b.setAttribute('aria-selected', String(b.dataset.mdTab === activeTab)); b.tabIndex = b.dataset.mdTab === activeTab ? 0 : -1; });
    const target = $('#md-content'); target.setAttribute('aria-labelledby',`md-tab-${activeTab}`);
    const draft = editDrafts.get(editKey());
    if (draft) { renderInlineEditor(target, draft); return; }
    if (activeTab === 'summary') {
      target.innerHTML = `<div class="md-panel-tools"><small>内容由AI生成，仅供参考</small><div><span>当前使用模板：</span>${btn('template',`${esc(r.template)} ›`,'md-template-button')}${btn('edit',`${icon('edit')} 编辑`)}</div></div><div class="md-prose">${r.summaryHtml ? cleanHtml(r.summaryHtml) : esc(r.summary)}</div><p class="md-edited">${icon('clock')} 最后编辑：${esc(r.updated || `${r.date} 15:06`)}</p><section class="md-feedback"><div class="md-feedback-head"><span class="md-feedback-mark">${icon('spark')}</span><div><h3>欢迎评价本次结果，下次更懂你 <span class="md-reward">✦ 奖励500积分</span></h3><p>${r.feedback ? `已记录你的 ${r.feedback} 分评价，感谢反馈。` : '提交评分反馈，帮助优化会议总结。'} <span class="md-demo">演示反馈 · 不发放真实积分</span></p></div></div><div class="md-feedback-bottom">${Array.from({length:10},(_,i) => `<button type="button" class="md-score" data-md-score="${i+1}" aria-pressed="${score === i+1}" aria-label="评分 ${i+1}">${i+1}</button>`).join('')}${btn('feedback',r.feedback ? '更新反馈':'提交反馈','md-btn md-primary',score ? '':'disabled')}</div></section>`;
    } else if (activeTab === 'transcript' || activeTab === 'translation') {
      const translated = activeTab === 'translation';
      target.innerHTML = `<div class="md-panel-tools"><small>${translated ? '以下实时翻译结果，仅供参考':'按发言人和时间整理 · 演示转译内容'}</small>${btn('copy',`${icon('copy')} 复制全文`)}</div>${linesFor(r).map((l,i) => `<article class="md-speech"><div class="md-speech-head">${btn('participants',`${icon('file')} ${esc(r.speakers[l.speaker] || `发言人 ${l.speaker+1}`)}`,'md-speaker')}<button type="button" data-md-seek="${l.at}" aria-label="播放第 ${i+1} 段"><time>${time(l.at)}</time></button></div><p>${esc(translated ? l.en : l.text)}</p></article>`).join('')}`;
    } else if (!r.generated[activeTab]) {
      const copy = { mindmap:['会议内容结构化、快速理解主题和分支','讨论结构更直观、主题层级清晰展开；适合复盘、汇报与分享'], visual:['图文版会议精简摘要，便捷复盘分享','图文分层排版，重点直观突出，适合快速阅读、团队复盘与对外转发'], verbatim:['转译基础上做清洁整理，更适合阅读、复制、编辑','适合复制、编辑与二次整理'] }[activeTab];
      target.innerHTML = `<div class="md-empty"><svg class="md-empty-art" viewBox="0 0 120 100" aria-hidden="true"><rect x="25" y="8" width="70" height="82" rx="9" fill="#f4f6ff" stroke="#dce3ff"/><path d="M42 30h37M42 42h28M42 54h36M42 66h20" stroke="#b6c4ff" stroke-width="4" stroke-linecap="round"/><circle cx="91" cy="76" r="18" fill="#e9eeff"/><path d="M91 66v20M81 76h20" stroke="#6e87ff" stroke-width="3"/></svg><h2>${copy[0]}</h2><p>${copy[1]}</p>${btn('generate','立即生成','md-btn md-primary')}<small>使用本地模拟数据展示生成结果</small></div>`;
    } else {
      target.innerHTML = `<div class="md-generated-head"><span class="md-demo">演示生成 · ${tabs.find(t => t[0] === activeTab)[1]}</span><div>${activeTab === 'mindmap' ? btn('zoom-out','−')+btn('zoom-in','＋')+btn('fullscreen','全屏') : btn('copy','复制全文')}${btn('export-current','导出')}${activeTab === 'verbatim' ? btn('edit','编辑'):''}</div></div>${activeTab === 'mindmap' ? `<div class="md-map-viewport">${mindmap()}</div>` : activeTab === 'visual' ? `<article class="md-visual"><small>MEETING BRIEF · ${esc(r.date)}</small><h2>${esc(r.title)}</h2><section><h3>01　会议结论</h3><p>${esc(r.summary)}</p></section><section><h3>02　行动与负责人</h3><p>产品：补齐方案与验收标准<br>研发：确认实施排期<br>客户成功：汇总试用反馈</p></section><section><h3>03　下一步</h3><p>下周例会检查进展，复查核心流程中的待解决问题。</p></section></article>` : `<div class="md-prose">${r.verbatimHtml ? cleanHtml(r.verbatimHtml) : esc(r.verbatim || transcriptText())}</div>`}`;
    }
  }
  function mindmap() {
    return `<svg class="md-map" viewBox="0 0 850 350" xmlns="http://www.w3.org/2000/svg" style="transform:scale(${mapZoom})"><path d="M220 175H280V65H350M280 175H350M280 175V285H350" fill="none" stroke="#becbf7" stroke-width="2"/><rect x="20" y="143" width="200" height="64" rx="12" fill="#637bdf"/><text x="120" y="171" text-anchor="middle" fill="white" font-size="13">${esc(current.title.slice(0,13))}</text><text x="120" y="193" text-anchor="middle" fill="#e0e6ff" font-size="11">会议内容结构</text>${[['关键问题','核心流程 · 需求标准 · 客户反馈'],['会议决策','统一优先级 · 明确排期与负责人'],['后续行动','完善方案 · 实施验证 · 下周复查']].map(([a,b],i) => `<rect x="350" y="${38+i*110}" width="130" height="54" rx="8" fill="#eef2ff" stroke="#ccd6f6"/><text x="415" y="${70+i*110}" text-anchor="middle" fill="#455e9a" font-size="14">${a}</text><path d="M480 ${65+i*110}H510" stroke="#becbf7"/><text x="522" y="${70+i*110}" fill="#69788c" font-size="13">${b}</text>`).join('')}</svg>`;
  }
  const time = seconds => `${String(Math.floor((seconds || 0)/60)).padStart(2,'0')}:${String(Math.floor((seconds || 0)%60)).padStart(2,'0')}`;
  function updatePlayer() {
    if (!$('#md-elapsed')) return;
    $('#md-elapsed').textContent = time(audio.currentTime); $('#md-duration').textContent = time(audio.duration);
    $('#md-seek').max = Number.isFinite(audio.duration) ? audio.duration : 1; $('#md-seek').value = audio.currentTime;
    const b = $('[data-md-action=play]'); b.innerHTML = icon(audio.paused ? 'play':'pause'); b.setAttribute('aria-label',`${audio.paused ? '播放':'暂停'}录音`);
  }
  ['timeupdate','loadedmetadata','play','pause','ended'].forEach(e => audio.addEventListener(e,updatePlayer));
  async function play() { try { await audio.play(); } catch { toast('音频暂时无法播放，请刷新后重试。'); } }
  function transcriptText(translation = false) { return linesFor(current).map(l => `${time(l.at)} ${current.speakers[l.speaker] || '发言人'}\n${translation ? l.en:l.text}`).join('\n\n'); }
  function currentText() { return activeTab === 'summary' ? current.summary : activeTab === 'translation' ? transcriptText(true) : activeTab === 'visual' ? `${current.title}\n\n${current.summary}\n\n行动：补齐方案、确认排期、跟进客户反馈。` : current.verbatim && activeTab === 'verbatim' ? current.verbatim : transcriptText(); }
  async function copy(text) { try { await navigator.clipboard.writeText(text); toast('已复制到剪贴板'); } catch { modal('复制内容','浏览器未允许自动复制，可选择下面的文本手动复制。',`<textarea readonly aria-label="待复制内容">${esc(text)}</textarea>`,btn('dismiss','关闭')); } }
  function download(content, extension, mime='text/plain;charset=utf-8', name=current.title) {
    const blob = content instanceof Blob ? content : new Blob([content],{type:mime});
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `${name.replace(/[\\/:*?"<>|]/g,'-')}.${extension}`; a.click(); setTimeout(() => URL.revokeObjectURL(url),10000);
  }
  let dialog, returnFocus;
  function modal(title, subtitle, body, footer, cls='') {
    if (dialog?.open) dialog.close();
    dialog?.remove();
    returnFocus = document.activeElement;
    dialog = document.createElement('dialog'); dialog.className = `md-dialog ${cls}`;
    dialog.setAttribute('aria-labelledby','md-dialog-title');
    dialog.innerHTML = `<header class="md-dialog-head"><div><h2 id="md-dialog-title">${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>`:''}</div>${ibtn('dismiss','close','关闭弹窗')}</header><div class="md-dialog-body">${body}</div><footer class="md-dialog-footer"><span class="md-status" role="status"></span>${footer || btn('dismiss','取消')}</footer>`;
    document.body.append(dialog); dialog.showModal();
    dialog.addEventListener('click',dialogClick);
    dialog.addEventListener('close',() => { returnFocus?.focus?.(); });
    return dialog;
  }
  const error = text => { const status = $('.md-status',dialog); if (status) status.textContent = text; };
  function dismiss() { dialog?.close(); }
  function rename() {
    modal('修改录音标题','',`<label class="md-field"><span>录音标题</span><input id="md-rename" maxlength="120" value="${esc(current.title)}" autofocus></label>`,btn('dismiss','取消')+btn('save-name','保存','md-btn md-primary'));
  }
  function info() {
    modal('补充会议信息','完善客户、商机与标签，便于查找和整理。',`<label class="md-field"><span>客户名称</span><span class="md-inline md-radio-row"><label><input type="radio" name="md-customer-type" value="CRM客户" ${current.customerType !== '非CRM客户' ? 'checked':''}>CRM客户</label><label><input type="radio" name="md-customer-type" value="非CRM客户" ${current.customerType === '非CRM客户' ? 'checked':''}>非CRM客户</label></span><input id="md-customer" list="md-customers" maxlength="80" placeholder="搜索或输入客户名称" value="${esc(current.customer)}"><datalist id="md-customers"><option>ABC Energy</option><option>演示科技</option></datalist></label><label class="md-field"><span>商机项目名称</span><span class="md-inline md-radio-row"><label><input type="radio" name="md-project-type" value="CRM商机" ${current.projectType !== '非CRM商机' ? 'checked':''}>CRM商机</label><label><input type="radio" name="md-project-type" value="非CRM商机" ${current.projectType === '非CRM商机' ? 'checked':''}>非CRM商机</label></span><input id="md-project" list="md-projects" maxlength="80" placeholder="搜索或输入商机项目" value="${esc(current.project)}"><datalist id="md-projects"><option>产品试用项目</option><option>客户合作方案</option></datalist></label><label class="md-field"><span>手动添加位置</span><input id="md-location" maxlength="30" placeholder="输入位置（最多30字）" value="${esc(current.location)}"></label><div class="md-pills">${['线上会议','会议室 A','会议室 B'].map(x => btn('location',x,'',`data-value="${x}"`)).join('')}</div><label class="md-field"><span>已选标签（最多10个）</span><input id="md-tags" maxlength="210" placeholder="用逗号分隔多个标签" value="${esc(current.tags.join('，'))}"></label><small>常用标签</small><div class="md-pills">${['产品复盘','需求讨论','客户访谈','项目评审'].map(x => btn('tag',x,'',`data-value="${x}"`)).join('')}</div>`,btn('dismiss','取消')+btn('save-info','保存','md-btn md-primary'));
  }
  function participants() {
    modal('编辑参会人','修改名称会同步到转译文本和逐字稿。',`<div class="md-inline"><strong>未发言参会人</strong>${btn('add-person','＋ 添加','md-link')}</div><div id="md-silent-people"></div><div id="md-people">${current.speakers.map((name,i) => `<section class="md-participant"><header><input data-md-person aria-label="参会人 ${i+1}" maxlength="30" value="${esc(name)}"><small>${i<3 ? '总发言时长 · 演示':'未发言'}</small></header>${i<3 ? `<div class="md-clip">${btn('clip',`▶ ${time(i*8)} — ${time(i*8+7)}`,'md-link',`data-at="${i*8}"`)}<p>${esc(linesFor(current)[i].text)}</p></div>`:''}</section>`).join('')}</div>`,btn('dismiss','取消')+btn('save-people','保存','md-btn md-primary'));
  }
  const templates = {
    '白领办公':['日常工作例会','项目进度','工作部署','月度 / 季度工作总结','周度工作复盘与规划会'],
    '知识教育':['培训学习笔记','学术或产品分享','党课学习教育总结','党会沉淀'],
    '通用':['智能匹配','通用','播客访谈','党课学习教育总结','商务洽谈合作','学术或产品分享','日常工作例会','项目进度','工作部署','月度 / 季度工作总结','培训学习笔记','周度工作复盘与规划会'],
    '销售管理':['商务洽谈合作','客户需求访谈'], '法律':['法律咨询纪要'], '投研分析':['投研会议纪要'], '人力资源':['面试评估'], '金融':['金融业务会议'], '媒体':['播客访谈'], '我的模版':[],
  };
  let templateChoice = '通用';
  function templateModal() {
    templateChoice = current.template;
    modal('重新总结','以下为当前已选配置，可直接修改后重新总结',`<div class="md-template-layout"><nav class="md-categories" aria-label="模板分类">${Object.keys(templates).map(x => btn('category',x,'',`data-value="${x}" aria-pressed="${x === '通用'}"`)).join('')}</nav><div><div class="md-inline"><strong>选择总结模板</strong>${btn('template-help','查看模板说明 ›','md-link')}</div><div class="md-template-grid" id="md-template-grid"></div><strong>全局设置</strong><p style="color:#9da4b1">生成配置</p><div class="md-settings"><label class="md-field"><span>总结语言</span><select id="md-language">${['中文（中国）','English'].map(x => `<option ${x === current.language ? 'selected':''}>${x}</option>`).join('')}</select></label><label class="md-field"><span>详细程度</span><select id="md-detail">${['精简','标准','详细'].map(x => `<option ${x === current.detail ? 'selected':''}>${x}</option>`).join('')}</select></label></div><div class="md-notice">演示模式：按所选模板重排本地示例内容，未连接 AI 总结服务。</div></div></div>`,btn('dismiss','取消')+btn('regenerate','开始重新总结','md-btn md-primary'),'md-template-dialog');
    templateGrid('通用');
  }
  function templateGrid(category) {
    $('#md-template-grid',dialog).innerHTML = templates[category].length ? templates[category].map(x => btn('choose-template',`<span>▤</span>${esc(x)}`,'md-template-card',`data-value="${esc(x)}" aria-label="${esc(x)}" aria-pressed="${templateChoice === x}"`)).join('') : '<p class="md-notice">还没有自定义模板。请选择系统模板。</p>';
  }
  function regeneratedSummary() {
    if (current.language === 'English') return `${current.title}\n\nMeeting summary · ${current.template}\nThe team reviewed delivery progress and customer feedback.\n\nDecisions\nPrioritize the core workflow and clarify acceptance criteria.\n\nAction items\nProduct: refine the proposal. Engineering: confirm the timeline. Customer success: gather feedback.\n\nNext review: follow up in the next weekly meeting.`;
    const base = defaultSummary(current.title);
    if (current.detail === '精简') return `【${current.template}】\n明确需求优先级与实施排期；产品补齐方案、研发确认时间、客户成功跟进反馈，下周复查。`;
    return `【${current.template}】\n\n${base}\n\n行动项\n1. 产品：补齐方案与验收标准。\n2. 研发：确认实施排期与技术依赖。\n3. 客户成功：汇总试用反馈。${current.detail === '详细' ? '\n\n风险与待确认\n需求范围与资源投入需要进一步核对；下次评审确认验收口径。\n\n后续安排\n会前同步方案，会中核对分工，会后检查行动项。':''}`;
  }
  function editor() {
    const field = activeTab === 'verbatim' ? 'verbatim' : 'summary';
    const html = current[`${field}Html`] ? cleanHtml(current[`${field}Html`]) : esc(current[field] || (field === 'verbatim' ? transcriptText() : ''));
    editDrafts.set(editKey(), { html });
    panel();
    $('#md-edit-body').focus({ preventScroll:true });
  }
  function renderInlineEditor(target, draft) {
    target.innerHTML = `<div class="md-panel-tools md-inline-edit-tools"><small>正在编辑</small><div>${btn('exit-edit','退出编辑')}${btn('save-inline','保存','md-btn md-primary')}</div></div><div class="md-inline-editor"><div class="md-editor-toolbar" role="toolbar" aria-label="正文格式">${[['undo','↶ 撤销'],['redo','↷ 重做'],['bold','B'],['italic','I'],['underline','U'],['insertUnorderedList','• 列表'],['removeFormat','清除格式']].map(([cmd,text]) => btn('inline-format',text,'',`data-command="${cmd}" aria-label="${{bold:'加粗',italic:'斜体',underline:'下划线'}[cmd] || text}"`)).join('')}</div><div id="md-edit-body" class="md-prose md-inline-editable" contenteditable="true" role="textbox" aria-label="编辑正文" aria-multiline="true">${cleanHtml(draft.html)}</div><p class="md-inline-edit-status" role="status"></p></div>`;
    $('.md-editor-toolbar',target).addEventListener('mousedown', event => event.preventDefault());
    $('#md-edit-body',target).addEventListener('input', event => { draft.html = event.currentTarget.innerHTML; });
    $('#md-edit-body',target).addEventListener('paste', event => { event.preventDefault(); document.execCommand('insertText',false,event.clipboardData.getData('text/plain')); });
  }
  function saveInlineEdit() {
    const body = $('#md-edit-body');
    if (!body?.innerText.trim()) { $('.md-inline-edit-status').textContent = '正文不能为空'; body?.focus(); return; }
    const field = activeTab === 'verbatim' ? 'verbatim' : 'summary';
    current[field] = body.innerText.trim();
    current[`${field}Html`] = cleanHtml(body.innerHTML);
    current.updated = new Date().toLocaleString('zh-CN',{hour12:false});
    save(); editDrafts.delete(editKey()); panel();
    $('[data-md-action="edit"]').focus({ preventScroll:true });
  }
  let exportChoice = 'summary';
  function exportModal() {
    exportChoice = 'summary';
    const options = [['audio','音频','会议录音文件（演示音频）'],['transcript','转译文本','会议语音转文字内容'],['translation','实时翻译','会议实时翻译内容'],['summary',`总结-${current.title}`,'AI生成的会议总结']];
    modal('选择导出内容','请选择您需要导出的内容类型',options.map(([id,label,desc]) => `<label class="md-choice"><input type="radio" name="md-export" value="${id}" ${id === exportChoice ? 'checked':''}><span><strong>导出${esc(label)}</strong><small>导出${desc}</small></span></label>`).join(''),btn('dismiss','取消')+btn('export-next','下一步','md-btn md-primary'));
  }
  function exportFormats() {
    const types = exportChoice === 'audio' ? [['wav','WAV','音频文件']] : [['txt','TXT','纯文本格式'],['json','JSON','结构化数据格式']];
    modal('选择导出格式','请选择您需要导出的格式',types.map(([id,label,desc],i) => `<label class="md-choice"><input type="radio" name="md-format" value="${id}" ${i === 0 ? 'checked':''}><span><strong>${label}</strong><small>${desc} · .${id}文件</small></span></label>`).join(''),btn('export','上一步')+btn('download','下载','md-btn md-primary'));
  }
  async function exportDownload() {
    const format = $('[name=md-format]:checked',dialog)?.value;
    if (!format) return;
    if (format === 'wav') {
      try { const response = await fetch(audioUrl); if (!response.ok) throw new Error('audio'); download(await response.blob(),'wav','audio/wav',`${current.title}-演示音频`); } catch { error('下载失败，请稍后重试。'); return; }
    } else {
      const text = exportChoice === 'summary' ? current.summary : transcriptText(exportChoice === 'translation');
      download(format === 'json' ? JSON.stringify({ title:current.title, type:exportChoice, content:text, speakers:current.speakers, demo:true },null,2) : `${current.title}\n\n${text}`,format,format === 'json' ? 'application/json':'text/plain;charset=utf-8');
    }
    dismiss(); toast('已开始下载');
  }
  let shareDays = 7, shareTypes = ['audio','transcript','translation','summary'];
  const shareNames = { audio:'音频',transcript:'转译文本',translation:'实时翻译',summary:'总结' };
  function shareModal() {
    modal('分享配置','',`<label class="md-field"><span>分享类型</span><select aria-label="分享类型"><option>公开链接 · 任何人通过链接都可以访问</option></select></label><div class="md-inline"><strong>分享内容</strong><label><input id="md-share-all" type="checkbox" ${shareTypes.length === 4 ? 'checked':''}>全选</label></div><p style="color:#9ba0aa">仅已选择的内容可供访问者查看</p><div class="md-pills">${Object.entries(shareNames).map(([k,v]) => btn('share-type',v,'',`data-value="${k}" aria-pressed="${shareTypes.includes(k)}"`)).join('')}</div><strong>有效期设置</strong><div class="md-pills">${[3,7,30,0].map(n => btn('share-days',n ? `${n}天`:'永久','',`data-days="${n}" aria-pressed="${n === shareDays}"`)).join('')}</div><p id="md-share-expiry" style="color:#9aa1af"></p><div class="md-notice">当前为本地原型，未连接分享服务。可预览访问者看到的内容，不会发布公开链接。</div>`,btn('share-history','查看分享记录','md-link')+btn('share-preview','预览分享内容')+btn('share-create','生成分享链接','md-btn md-primary'));
    expiry();
  }
  function expiry() { $('#md-share-expiry',dialog).textContent = shareDays ? `有效至：${new Date(Date.now()+shareDays*86400000).toLocaleString('zh-CN')}` : '链接永久有效'; }
  function sharePreview() {
    if (!shareTypes.length) { error('请至少选择一项分享内容'); return; }
    modal('分享内容预览','仅本地预览 · 尚未发布',`<h2>${esc(current.title)}</h2>${shareTypes.map(t => `<section><h3>${shareNames[t]}</h3>${t === 'audio' ? '<p class="md-notice">演示音频 · 返回详情页播放</p>' : `<div class="md-prose">${esc(t === 'summary' ? current.summary : transcriptText(t === 'translation'))}</div>`}</section>`).join('')}`,btn('share','返回配置'));
  }
  let draftKind = 'report';
  function draft(kind) {
    draftKind = kind;
    modal(kind === 'ppt' ? 'AI 智绘 PPT':'生成深度报告','从当前会议继续创作',`<div class="md-notice">已引用当前会议的转译文本与智能总结。演示模式仅生成可编辑提纲，未连接 AI 创作服务。</div><div class="md-pills"><span class="md-tag">${esc(current.title)}-转译文本.txt</span><span class="md-tag">${esc(current.title)}-总结.md</span></div><label class="md-field"><span>创作要求</span><textarea id="md-draft-prompt">${kind === 'ppt' ? '请根据本次会议整理一份用于团队汇报的演示文稿，包含背景、关键结论和行动计划。':'请围绕本次会议生成深度分析报告，梳理问题、决策依据、风险和后续行动。'}</textarea></label><div id="md-draft-result"></div>`,btn('dismiss','取消')+btn('draft-generate','生成演示提纲','md-btn md-primary'));
  }
  let draftText = '';
  function generateDraft() {
    const prompt = $('#md-draft-prompt',dialog).value.trim(); if (!prompt) { error('请填写创作要求'); return; }
    draftText = `# ${current.title}\n\n创作要求：${prompt}\n\n${draftKind === 'ppt' ? '1. 封面与会议背景\n2. 当前问题与客户反馈\n3. 关键结论与决策\n4. 行动计划与负责人\n5. 下周跟进安排':'## 会议背景\n'+current.summary+'\n\n## 核心问题\n需求优先级、交付排期与验收标准。\n\n## 建议与行动\n完善方案、确认实施排期、持续跟进客户反馈。\n\n## 风险\n资源与范围需要进一步确认。'}\n\n（本地演示提纲，未执行真实 AI 研究或 PPT 生成）`;
    $('#md-draft-result',dialog).innerHTML = `<label class="md-field"><span>演示提纲 · 可编辑</span><textarea id="md-draft-edit" style="min-height:210px">${esc(draftText)}</textarea></label>${btn('draft-download','下载提纲')}`;
  }
  async function dialogClick(event) {
    const b = event.target.closest('[data-md-action]'); if (!b) return;
    const action = b.dataset.mdAction;
    if (action === 'dismiss') return dismiss();
    if (action === 'save-name') {
      const name = $('#md-rename',dialog).value.trim(); if (!name) return error('请输入录音标题');
      current.title = name; save(); dismiss(); render(); return;
    }
    if (action === 'location') { $('#md-location',dialog).value = b.dataset.value; return; }
    if (action === 'tag') { const input = $('#md-tags',dialog), tags = input.value.split(/[,，]/).map(x=>x.trim()).filter(Boolean); if (!tags.includes(b.dataset.value) && tags.length < 10) input.value = [...tags,b.dataset.value].join('，'); return; }
    if (action === 'save-info') {
      const tags = [...new Set($('#md-tags',dialog).value.split(/[,，]/).map(x=>x.trim()).filter(Boolean))];
      if (tags.length > 10 || tags.some(t => t.length > 20)) return error('最多10个标签，每个标签不超过20字');
      for (const key of ['customer','project','location']) current[key] = $(`#md-${key}`,dialog).value.trim();
      current.customerType = $('[name=md-customer-type]:checked',dialog).value; current.projectType = $('[name=md-project-type]:checked',dialog).value; current.tags = tags; save(); dismiss(); expanded = true; render(); return;
    }
    if (action === 'add-person') {
      if ($$('[data-md-person]',dialog).length >= 20) return error('最多添加20位参会人');
      $('#md-silent-people',dialog).insertAdjacentHTML('beforeend','<label class="md-field"><input data-md-person aria-label="未发言参会人" maxlength="30" placeholder="输入参会人姓名"></label>'); return;
    }
    if (action === 'save-people') {
      // Spoken participants retain their indices; append silent participants afterwards.
      const people = [...$$('#md-people [data-md-person]',dialog),...$$('#md-silent-people [data-md-person]',dialog)].map(x=>x.value.trim());
      if (people.some(x=>!x)) return error('请填写所有参会人姓名');
      current.speakers = people; save(); dismiss(); render(); return;
    }
    if (action === 'clip') { audio.currentTime = Math.min(Number(b.dataset.at),audio.duration || 0); return play(); }
    if (action === 'category') { $$('[data-md-action=category]',dialog).forEach(x=>x.setAttribute('aria-pressed',String(x === b))); templateGrid(b.dataset.value); return; }
    if (action === 'choose-template') { templateChoice = b.dataset.value; $$('[data-md-action=choose-template]',dialog).forEach(x=>x.setAttribute('aria-pressed',String(x === b))); return; }
    if (action === 'template-help') { error('模板决定总结的组织方式；“详细程度”控制示例内容的篇幅。'); return; }
    if (action === 'regenerate') {
      current.template = templateChoice; current.language = $('#md-language',dialog).value; current.detail = $('#md-detail',dialog).value;
      current.summary = regeneratedSummary(); current.summaryHtml = '';  current.updated = new Date().toLocaleString('zh-CN',{hour12:false}); save(); dismiss(); panel(); toast('已按所选配置生成演示总结'); return;
    }
    if (action === 'export-next') { exportChoice = $('[name=md-export]:checked',dialog).value; return exportFormats(); }
    if (action === 'download') return exportDownload();
    if (action === 'share') return shareModal();
    if (action === 'share-type') { const key = b.dataset.value; shareTypes = shareTypes.includes(key) ? shareTypes.filter(t=>t!==key) : [...shareTypes,key]; b.setAttribute('aria-pressed',String(shareTypes.includes(key))); $('#md-share-all',dialog).checked = shareTypes.length === 4; return; }
    if (action === 'share-days') { shareDays = Number(b.dataset.days); $$('[data-md-action=share-days]',dialog).forEach(x=>x.setAttribute('aria-pressed',String(x === b))); expiry(); return; }
    if (action === 'share-create') return error(shareTypes.length ? '尚未连接分享服务，无法生成公开链接。可先预览分享内容。':'请至少选择一项分享内容');
    if (action === 'share-preview') return sharePreview();
    if (action === 'share-history') { modal('分享记录','', '<div class="md-empty" style="min-height:160px"><h2>暂无分享记录</h2><p>当前原型尚未发布公开分享链接。</p></div>',btn('share','返回配置')); return; }
    if (action === 'draft-generate') return generateDraft();
    if (action === 'draft-download') return download($('#md-draft-edit',dialog).value,'md','text/markdown;charset=utf-8',`${current.title}-创作提纲`);
  }
  document.addEventListener('change',e => {
    if (e.target.id === 'md-share-all') {
      shareTypes = e.target.checked ? Object.keys(shareNames) : [];
      $$('[data-md-action=share-type]',dialog).forEach(b=>b.setAttribute('aria-pressed',String(shareTypes.includes(b.dataset.value))));
    }
  });
  root.addEventListener('click', async event => {
    const row = event.target.closest('[data-md-meeting]');
    if (row) { audio.pause(); audio.currentTime = 0; current = records.get(row.dataset.mdMeeting); activeTab = 'summary'; score = current.feedback; expanded = false; render(); return; }
    const tab = event.target.closest('[data-md-tab]');
    if (tab) { activeTab = tab.dataset.mdTab; panel(); return; }
    const rating = event.target.closest('[data-md-score]');
    if (rating) { score = Number(rating.dataset.mdScore); panel(); return; }
    const seek = event.target.closest('[data-md-seek]');
    if (seek) { audio.currentTime = Math.min(Number(seek.dataset.mdSeek),audio.duration || 0); return play(); }
    const remove = event.target.closest('[data-md-remove-image]');
    if (remove) { const [image] = current.images.splice(Number(remove.dataset.mdRemoveImage),1); URL.revokeObjectURL(image.url); render(); return; }
    const preview = event.target.closest('[data-md-preview]');
    if (preview) { const im = current.images[Number(preview.dataset.mdPreview)]; modal(im.name,'本次会话上传的图片',`<img class="md-preview-image" src="${im.url}" alt="${esc(im.name)}">`,btn('dismiss','关闭')); return; }
    const b = event.target.closest('[data-md-action]'); if (!b) return;
    const action = b.dataset.mdAction;
    if (action === 'close') { audio.pause(); showMainView('home',{silent:true}); return; }
    if (action === 'library') { const frame = $('.md-frame'); if (matchMedia('(max-width:800px)').matches) frame.classList.toggle('library-mobile'); else frame.classList.toggle('library-closed'); return; }
    if (action === 'rename') return rename();
    if (action === 'info') return info();
    if (action === 'participants') return participants();
    if (action === 'info-toggle') { expanded = !expanded; $('.md-info-extra').hidden = !expanded; b.textContent = expanded ? '收起 ⌃':'展开 ⌄'; b.setAttribute('aria-expanded',String(expanded)); return; }
    if (action === 'play') { if (audio.paused) await play(); else audio.pause(); return; }
    if (action === 'rewind' || action === 'forward') { audio.currentTime = Math.max(0,Math.min(audio.duration || 0,audio.currentTime+(action === 'rewind' ? -15:15))); return; }
    if (action === 'template') return templateModal();
    if (action === 'edit') return editor();
    if (action === 'exit-edit') { editDrafts.delete(editKey()); panel(); $('[data-md-action="edit"]').focus({ preventScroll:true }); return; }
    if (action === 'save-inline') return saveInlineEdit();
    if (action === 'inline-format') { document.execCommand(b.dataset.command,false); editDrafts.get(editKey()).html = $('#md-edit-body').innerHTML; return; }
    if (action === 'copy') return copy(currentText());
    if (action === 'feedback') { current.feedback = score; save(); panel(); toast('评价已保存在本地演示中'); return; }
    if (action === 'generate') { current.generated[activeTab] = true; save(); panel(); return; }
    if (action === 'zoom-in' || action === 'zoom-out') { mapZoom = Math.min(2,Math.max(0.5,mapZoom+(action === 'zoom-in' ? 0.1:-0.1))); $('.md-map').style.transform = `scale(${mapZoom})`; return; }
    if (action === 'fullscreen') { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('.md-map-viewport').requestFullscreen(); } catch { toast('此浏览器暂不支持全屏'); } return; }
    if (action === 'export-current') { if (activeTab === 'mindmap') download(mindmap(),'svg','image/svg+xml'); else download(currentText(),'txt'); return; }
    if (action === 'export') return exportModal();
    if (action === 'share') return shareModal();
    if (action === 'delete') { current.row.querySelector('[data-meeting-action=delete]')?.click(); return; }
    if (action === 'ask') {
      document.dispatchEvent(new CustomEvent('meeting-ask-agent', { detail: { title: current.title, summary: current.summary } }));
      return;
    }
    if (action === 'ppt' || action === 'report') return draft(action === 'ppt' ? 'ppt':'report');
    if (action === 'image') return $('#md-images-input').click();
  });
  root.addEventListener('keydown', e => {
    const tab = e.target.closest('[data-md-tab]');
    if (tab && ['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
      e.preventDefault(); const index = tabs.findIndex(t=>t[0] === activeTab);
      activeTab = tabs[e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length-1 : (index+(e.key === 'ArrowRight' ? 1:-1)+tabs.length)%tabs.length][0]; panel(); $(`[data-md-tab=${activeTab}]`).focus();
    }
  });
  root.addEventListener('input',e => {
    if (e.target.id === 'md-search') { query = e.target.value; library(); }
    if (e.target.id === 'md-seek') audio.currentTime = Number(e.target.value);
  });
  root.addEventListener('change',e => {
    if (e.target.id === 'md-speed') audio.playbackRate = Number(e.target.value);
    if (e.target.id === 'md-images-input') {
      const files = [...e.target.files];
      if (current.images.length+files.length > 50) { toast('最多添加50张图片'); return; }
      if (files.some(f=>!['image/png','image/jpeg','image/webp','image/gif'].includes(f.type) || f.size>5*1024*1024)) { toast('请选择5MB以内的 PNG、JPG、WebP 或 GIF 图片'); return; }
      current.images.push(...files.map(f=>({name:f.name,url:URL.createObjectURL(f)}))); expanded = true; render(); toast('图片已添加，仅在本次会话保留');
    }
  });
  new MutationObserver(() => { if (root.hidden) audio.pause(); else requestAnimationFrame(fitWorkspace); }).observe(root,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    try {
      const next = JSON.parse(event.newValue || '{}'); if (!next || typeof next !== 'object') return;
      saved = next;
      const selected = current?.id;
      const images = new Map([...records].map(([id,r])=>[id,r.images]));
      records.clear(); rows().forEach(row => { const r = record(row); r.images = images.get(r.id) || []; });
      if (selected && records.has(selected)) { current = records.get(selected); if (!root.hidden) render(); }
    } catch { toast('编辑内容同步失败，请刷新重试。'); }
  });
  rows().forEach(record);
  window.MeetingDetail = {
    open,
    editInfo(title) { open(title); info(); },
    removed(id) { if (current?.id === id) { audio.pause(); showMainView('home',{silent:true}); } },
  };
})();
