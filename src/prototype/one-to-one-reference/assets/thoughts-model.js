/* Personal capture library; action records are read from PersonalAssets, never copied here. */
(function(root){
  'use strict';
  const KEY='eureka:thoughts:v1',types={inspiration:'灵感',ledger:'记账',other:'其他'},clone=v=>JSON.parse(JSON.stringify(v));
  function validate(r){
    if(!types[r.type])throw Error('请选择灵感、记账或其他');
    if(!r.title?.trim()||r.title.trim().length>200)throw Error('请填写 1–200 字的标题');
    if((r.detail||'').length>5000)throw Error('内容最多 5000 字');
    const d=new Date(r.date+'T'+r.time+':00Z');
    if(!Number.isFinite(+d)||d.toISOString().slice(0,16)!==r.date+'T'+r.time)throw Error('请选择有效的记录日期和时间');
    if(r.type==='ledger'&&(!['income','expense'].includes(r.direction)||!Number.isFinite(Number(r.amount))||Number(r.amount)<=0||Number(r.amount)>999999999||Math.abs(Number(r.amount)*100-Math.round(Number(r.amount)*100))>0.00001))throw Error('请输入大于 0、最多两位小数的金额');
  }
  function create(storage,seeds){
    let raw=storage.getItem(KEY),state=raw?JSON.parse(raw):{version:1,records:clone(seeds)};
    if(state.version!==1||!Array.isArray(state.records))throw Error('闪念记录读取失败，请保留浏览器数据后重试');
    return {snapshot:()=>clone(state),reload(){const next=storage.getItem(KEY),parsed=next?JSON.parse(next):{version:1,records:clone(seeds)};if(parsed.version!==1||!Array.isArray(parsed.records))throw Error('闪念数据格式无效');raw=next;state=parsed;},save(input){
      if(storage.getItem(KEY)!==raw)throw Error('另一页面已更新，请先保留输入，再重新打开记录');
      const next=clone(state),old=next.records.find(r=>r.id===input.id);
      if(old&&(old.revision||0)!==(input.revision||0))throw Error('这条记录已更新，请重新打开后编辑');
      const r={...clone(input),id:input.id||globalThis.crypto.randomUUID(),title:String(input.title||'').trim(),detail:input.detail||'',source:old?.source||'manual',capture:old?.capture||'',revision:(old?.revision||0)+1,updated:new Date().toISOString()};
      validate(r);if(r.type==='ledger')r.amount=Number(r.amount);
      if(old)next.records[next.records.indexOf(old)]=r;else next.records.unshift(r);
      const json=JSON.stringify(next);try{storage.setItem(KEY,json);}catch{throw Error('保存失败，浏览器存储不可用或已满；输入已保留');}
      state=next;raw=json;return clone(r);
    }};
  }
  const api={KEY,types,validate,create};if(typeof module!=='undefined')module.exports=api;else root.ThoughtsModel=api;
})(typeof window!=='undefined'?window:globalThis);
