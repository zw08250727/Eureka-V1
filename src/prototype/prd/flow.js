/* A small deterministic SVG flow renderer. Labels are always text, never markup. */
(() => {
  'use strict';
  let sequence=0;
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(source){
    try{
      const d=JSON.parse(source);
      if(typeof d.title!=='string'||!d.title||d.title.length>200||!Array.isArray(d.nodes)||!Array.isArray(d.edges)||!d.nodes.length||d.nodes.length>40||d.edges.length>60)throw Error('请提供标题、节点和连线');
      const ids=new Set();for(const n of d.nodes){if(!/^[a-z][\w-]*$/.test(n.id)||ids.has(n.id)||typeof n.label!=='string'||n.label.length>42||![n.x,n.y].every(v=>Number.isInteger(v)&&v>=0&&v<=10))throw Error('节点 ID、文字或位置不合法');ids.add(n.id);}
      for(const e of d.edges)if(!Array.isArray(e)||!ids.has(e[0])||!ids.has(e[1]))throw Error('连线引用了不存在的节点');
      const marker='flow-arrow-'+(++sequence),width=285*(Math.max(...d.nodes.map(n=>n.x))+1)+20,height=128*(Math.max(...d.nodes.map(n=>n.y))+1)+30;
      const pos=id=>{const n=d.nodes.find(n=>n.id===id);return {x:32+n.x*285,y:28+n.y*128,n};};
      const lines=d.edges.map(([from,to,label=''])=>{
        const a=pos(from),b=pos(to);let x1,y1,x2,y2,path,lx,ly;
        if(a.n.y===b.n.y){const right=b.x>a.x;x1=a.x+(right?220:0);y1=a.y+34;x2=b.x+(right?0:220);y2=b.y+34;path=`M${x1},${y1} L${x2},${y2}`;lx=(x1+x2)/2;ly=y1-10;}
        else if(a.n.x===b.n.x){const down=b.y>a.y;x1=a.x+110;y1=a.y+(down?68:0);x2=b.x+110;y2=b.y+(down?0:68);path=`M${x1},${y1} L${x2},${y2}`;lx=x1+8;ly=(y1+y2)/2;}
        else{x1=a.x+110;y1=a.y+68;x2=b.x+110;y2=b.y;const mid=(y1+y2)/2;path=`M${x1},${y1} L${x1},${mid} L${x2},${mid} L${x2},${y2}`;lx=(x1+x2)/2;ly=mid-8;}
        return `<path class="flow-edge" d="${path}" marker-end="url(#${marker})"/>${label?`<text class="flow-edge-label" x="${lx}" y="${ly}">${escape(String(label).slice(0,24))}</text>`:''}`;
      }).join('');
      const nodes=d.nodes.map(n=>{const p=pos(n.id),chunks=Array.from(n.label).reduce((arr,c,i)=>{const row=Math.floor(i/12);arr[row]=(arr[row]||'')+c;return arr;},[]);const kind=['start','decision','end','error'].includes(n.kind)?n.kind:'step';return `<g class="flow-node flow-${kind}"><rect x="${p.x}" y="${p.y}" width="220" height="68" rx="${kind==='start'||kind==='end'?30:10}"/><text x="${p.x+110}" y="${p.y+34-(chunks.length-1)*8}">${chunks.map((c,i)=>`<tspan x="${p.x+110}" dy="${i?16:0}">${escape(c)}</tspan>`).join('')}</text></g>`;}).join('');
      return `<figure class="flow-figure"><div class="flow-scroll" tabindex="0" role="region" aria-label="${escape(d.title)}，可横向滚动"><svg xmlns="http://www.w3.org/2000/svg" class="flow-svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${marker}-title ${marker}-desc"><title id="${marker}-title">${escape(d.title)}</title><desc id="${marker}-desc">${escape(d.edges.map(e=>`${d.nodes.find(n=>n.id===e[0]).label} → ${d.nodes.find(n=>n.id===e[1]).label}${e[2]?'（'+e[2]+'）':''}`).join('；'))}</desc><defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#8da8c4"/></marker></defs>${lines}${nodes}</svg></div><figcaption>${escape(d.title)}</figcaption></figure>`;
    }catch(e){return `<p class="flow-error" role="alert">流程图暂时无法渲染：${escape(e.message)}。请检查 flow 代码块中的 JSON。</p>`;}
  }
  window.PRDFlow={render};
})();
