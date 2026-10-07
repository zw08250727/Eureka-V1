/* Shared right-hand Agent sizing; pointer capture keeps dragging stable outside the handle. */
(() => {
  const key='eureka:agent-panel-width:v1';
  let preferred=390;try{preferred=Number(localStorage.getItem(key))||390;}catch{/* use default */}
  const selector='.ws-agent,#xiaozhi-rail,.contacts-xiaozhi-rail,#pa-agent';
  function container(rail){return rail.closest('.ws-layout,.md-detail-layout,.meeting-agent-grid,.contacts-shell,.pa-workspace,.pa-archive-wrap');}
  function bounds(rail){
    const host=container(rail),available=host?.getBoundingClientRect().width||innerWidth;
    const breakpoint=rail.matches('#pa-agent')?1050:rail.closest('.md-detail-layout')?1000:rail.matches('#xiaozhi-rail')?760:900;
    const max=Math.max(1,Math.min(760,available-(innerWidth>breakpoint?300:0)));
    return {min:Math.min(300,max),max};
  }
  function apply(rail,value){
    const host=container(rail);if(!host||!host.getBoundingClientRect().width)return;
    const {min,max}=bounds(rail),width=Math.round(Math.max(min,Math.min(max,value)));
    host.style.setProperty('--agent-panel-width',width+'px');
    const handle=rail.querySelector(':scope > .agent-resize-handle');
    if(handle){handle.setAttribute('aria-valuemin',min);handle.setAttribute('aria-valuemax',max);handle.setAttribute('aria-valuenow',width);}
    return width;
  }
  function save(value){preferred=value;try{localStorage.setItem(key,String(value));}catch{/* session sizing still works */}}
  function install(){document.querySelectorAll(selector).forEach(rail=>{
    if(!rail.querySelector(':scope > .agent-resize-handle')){
      const handle=document.createElement('div');handle.className='agent-resize-handle';handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','调整 Agent 窗口宽度');handle.title='左右拖动调整宽度，或使用左右方向键';
      rail.prepend(handle);
      handle.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;event.preventDefault();handle.setPointerCapture(event.pointerId);
        const startX=event.clientX,startWidth=rail.getBoundingClientRect().width;let latest=startWidth,frame=0;
        document.body.classList.add('agent-resizing');
        const move=e=>{latest=startWidth+startX-e.clientX;if(!frame)frame=requestAnimationFrame(()=>{apply(rail,latest);frame=0;});};
        const finish=()=>{cancelAnimationFrame(frame);const width=apply(rail,latest);if(width)save(width);document.body.classList.remove('agent-resizing');handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);handle.removeEventListener('lostpointercapture',finish);};
        handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('lostpointercapture',finish);
      });
      handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const {min,max}=bounds(rail);const width=apply(rail,e.key==='Home'?min:e.key==='End'?max:rail.getBoundingClientRect().width+(e.key==='ArrowLeft'?24:-24));if(width)save(width);});
    }
    apply(rail,preferred);
  });}
  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;install();});}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',schedule);document.addEventListener('click',schedule);install();
})();
