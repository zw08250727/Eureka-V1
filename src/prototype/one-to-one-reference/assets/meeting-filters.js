/* Shared meeting filters: native values retain the existing filtering contract. */
(() => {
  'use strict';
  const controls = [];
  const icon = name => name === 'calendar' ? '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16"/></svg>' : `<svg class="icon" aria-hidden="true"><use href="#ico-${name}"/></svg>`;
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const parseDate = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d,12); };
  const dateLabel = date => `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日`;
  function enhance(id, kind) {
    const input = document.getElementById(id);
    if (!input) return;
    const old = input.parentElement;
    const wrap = document.createElement('div');
    wrap.className = `${old.className} mf-control`;
    old.replaceWith(wrap);
    wrap.append(...old.childNodes);
    wrap.querySelectorAll(':scope > svg').forEach(el => el.remove());
    input.hidden = true;
    input.tabIndex = -1;
    const trigger = document.createElement('button');
    trigger.type = 'button'; trigger.id = `${id}-trigger`; trigger.className = 'mf-trigger';
    trigger.setAttribute('aria-haspopup', kind === 'source' ? 'listbox' : 'dialog');
    if (kind === 'source') trigger.setAttribute('role','combobox');
    trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-controls',`${id}-popover`);
    wrap.append(trigger);
    const clear = document.createElement('button');
    clear.type = 'button'; clear.className = 'mf-clear'; clear.innerHTML = icon('x');
    clear.setAttribute('aria-label', kind === 'date' ? '清除录音日期' : '清除来源筛选');
    wrap.append(clear);
    const popup = document.createElement('div');
    popup.id = `${id}-popover`; popup.className = `mf-popover mf-${kind}-popover`;
    popup.setAttribute('popover','auto');
    popup.setAttribute('role',kind === 'source' ? 'listbox' : 'dialog');
    popup.setAttribute('aria-label',kind === 'source' ? '选择会议来源' : '选择录音日期');
    document.body.append(popup);
    let month, focusDate;
    const isOpen = () => popup.matches(':popover-open');
    const position = () => {
      if (!isOpen()) return;
      const r = trigger.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > innerHeight) { popup.hidePopover(); return; }
      const width = popup.offsetWidth;
      popup.style.maxHeight = `${innerHeight-24}px`;
      const naturalHeight = popup.offsetHeight;
      const belowSpace = innerHeight-r.bottom-20;
      const aboveSpace = r.top-20;
      const below = naturalHeight <= belowSpace || belowSpace >= aboveSpace;
      popup.style.maxHeight = `${Math.max(80,below ? belowSpace : aboveSpace)}px`;
      const height = popup.offsetHeight;
      popup.style.left = `${Math.max(12,Math.min(r.right-width,innerWidth-width-12))}px`;
      const top = below ? r.bottom+8 : Math.max(12,r.top-height-8);
      popup.style.top = `${top}px`;
    };
    const sync = () => {
      const selected = kind === 'source' ? input.value !== 'all' : Boolean(input.value);
      wrap.classList.toggle('mf-selected',selected);
      clear.hidden = !selected;
      const text = kind === 'source' ? input.selectedOptions[0]?.textContent || '全部来源' : input.value ? input.value.replaceAll('-',' / ') : '录音日期';
      trigger.innerHTML = `${kind === 'date' ? icon('calendar') : ''}<span></span>${kind === 'source' ? icon('chevron') : ''}`;
      trigger.querySelector('span').textContent = text;
      trigger.setAttribute('aria-label', `${kind === 'source' ? '筛选会议来源' : '筛选录音日期'}：${text}`);
    };
    const apply = value => {
      input.value = value;
      input.dispatchEvent(new Event('change',{bubbles:true}));
      sync();
      if (isOpen()) popup.hidePopover();
      trigger.focus({preventScroll:true});
    };
    clear.addEventListener('click', () => apply(kind === 'source' ? 'all' : ''));
    const focusDay = () => popup.querySelector(`[data-date="${dateKey(focusDate)}"]`)?.focus({preventScroll:true});
    function renderCalendar() {
      const y=month.getFullYear(), m=month.getMonth();
      const first=new Date(y,m,1,12);
      const start=new Date(y,m,1-(first.getDay()+6)%7,12);
      const today=dateKey(new Date());
      const weeks=Math.ceil(((first.getDay()+6)%7+new Date(y,m+1,0).getDate())/7);
      popup.innerHTML = `<header class="mf-calendar-head"><button type="button" data-month="-1" aria-label="上个月">‹</button><strong aria-live="polite">${y}年 ${m+1}月</strong><button type="button" data-month="1" aria-label="下个月">›</button></header><div class="mf-calendar-grid" role="grid" aria-label="${y}年${m+1}月"><div class="mf-weekdays" role="row">${['一','二','三','四','五','六','日'].map(d=>`<span role="columnheader">${d}</span>`).join('')}</div>${Array.from({length:weeks},(_,week)=>`<div class="mf-calendar-week" role="row">${Array.from({length:7},(_,day)=>{
        const date=new Date(start.getFullYear(),start.getMonth(),start.getDate()+week*7+day,12);
        const key=dateKey(date);
        return `<div role="gridcell" aria-selected="${key===input.value}"><button type="button" data-date="${key}" class="mf-day${date.getMonth()!==m?' mf-other-month':''}${key===today?' mf-today':''}${key===input.value?' mf-day-selected':''}" aria-label="${dateLabel(date)}" ${key===today?'aria-current="date"':''} tabindex="${key===dateKey(focusDate)?0:-1}">${date.getDate()}</button></div>`;
      }).join('')}</div>`).join('')}</div><footer class="mf-calendar-footer"><button type="button" data-shortcut="today">今天</button><button type="button" data-shortcut="yesterday">昨天</button><button type="button" data-shortcut="clear">不限日期</button></footer>`;
      position();
    }
    function renderSource() {
      popup.replaceChildren();
      for (const option of input.options) {
        const button=document.createElement('button');
        button.type='button'; button.className='mf-option'; button.dataset.value=option.value;
        button.setAttribute('role','option'); button.setAttribute('aria-selected',String(option.value===input.value));
        button.tabIndex=option.value===input.value?0:-1;
        const label=document.createElement('span'); label.textContent=option.textContent;
        button.append(label);
        if(option.value===input.value) button.insertAdjacentHTML('beforeend','<span class="mf-check" aria-hidden="true">✓</span>');
        popup.append(button);
      }
    }
    function open() {
      sync();
      if(kind==='date') {
        focusDate=input.value?parseDate(input.value):new Date();
        month=new Date(focusDate.getFullYear(),focusDate.getMonth(),1,12);
        renderCalendar();
      } else renderSource();
      popup.showPopover(); position();
      if(kind==='date') focusDay(); else popup.querySelector('[aria-selected="true"]')?.focus({preventScroll:true});
    }
    trigger.addEventListener('click',()=> isOpen()?popup.hidePopover():open());
    trigger.addEventListener('keydown',e=>{
      if(['ArrowDown','ArrowUp'].includes(e.key)) { e.preventDefault(); if(!isOpen()) open(); }
    });
    popup.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(isOpen())));
    popup.addEventListener('click',e=>{
      const button=e.target.closest('button'); if(!button) return;
      if(kind==='source') { apply(button.dataset.value); return; }
      if(button.dataset.date) { apply(button.dataset.date); return; }
      if(button.dataset.month) {
        month=new Date(month.getFullYear(),month.getMonth()+Number(button.dataset.month),1,12);
        focusDate=new Date(month); renderCalendar(); popup.querySelector(`[data-month="${button.dataset.month}"]`).focus({preventScroll:true});
      }
      if(button.dataset.shortcut) {
        const date=new Date();
        if(button.dataset.shortcut==='yesterday') date.setDate(date.getDate()-1);
        apply(button.dataset.shortcut==='clear'?'':dateKey(date));
      }
    });
    popup.addEventListener('keydown',e=>{
      if(e.key==='Escape') { e.preventDefault(); popup.hidePopover(); trigger.focus({preventScroll:true}); return; }
      if(kind==='source' && ['ArrowDown','ArrowUp','Home','End'].includes(e.key)) {
        e.preventDefault(); const options=[...popup.querySelectorAll('[role="option"]')];
        const index=options.indexOf(document.activeElement);
        const next=e.key==='Home'?0:e.key==='End'?options.length-1:(index+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
        options.forEach((b,i)=>b.tabIndex=i===next?0:-1); options[next].focus({preventScroll:true});
      }
      if(kind==='date' && e.target.dataset.date) {
        const date=parseDate(e.target.dataset.date);
        const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
        if(e.key in delta) date.setDate(date.getDate()+delta[e.key]);
        else if(e.key==='Home') date.setDate(date.getDate()-(date.getDay()+6)%7);
        else if(e.key==='End') date.setDate(date.getDate()+6-(date.getDay()+6)%7);
        else if(e.key==='PageUp'||e.key==='PageDown') {
          const day=date.getDate(); date.setDate(1); date.setMonth(date.getMonth()+(e.key==='PageUp'?-1:1));
          date.setDate(Math.min(day,new Date(date.getFullYear(),date.getMonth()+1,0).getDate()));
        } else return;
        e.preventDefault(); focusDate=date; month=new Date(date.getFullYear(),date.getMonth(),1,12); renderCalendar(); focusDay();
      }
    });
    // Match native popovers: light-dismiss on outside clicks, and no stale open
    // menus after switching views or scrolling the trigger out of the viewport.
    input.addEventListener('change',sync);
    controls.push({sync,position,close:()=>{if(isOpen()) popup.hidePopover();}});
    sync();
  }
  ['meeting-source-filter','team-meeting-source'].forEach(id=>enhance(id,'source'));
  ['meeting-date-filter','team-meeting-date'].forEach(id=>enhance(id,'date'));
  document.addEventListener('meeting-filters-reset',()=>controls.forEach(c=>{c.close();c.sync();}));
  window.addEventListener('resize',()=>controls.forEach(c=>c.position()));
  document.addEventListener('scroll',()=>controls.forEach(c=>c.position()),true);
})();
