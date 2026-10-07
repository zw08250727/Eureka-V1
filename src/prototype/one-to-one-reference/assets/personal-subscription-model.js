/* Personal subscription simulation. Uses the personal workspace; never touches Team billing. */
(function(root){
  'use strict';
  const plans={month:{cycle:'month',amount:17.99,currency:'USD'},year:{cycle:'year',amount:99.99,currency:'USD'}};
  const fail=message=>{throw Error(message);},id=()=>`PERSONAL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  function owner(w){if(w.type!=='personal')fail('只能在个人空间管理此订阅');}
  function addMonths(iso,n){const d=new Date(iso),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const max=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,max));return d.toISOString();}
  function current(w,now=new Date().toISOString()){owner(w);const s=w.personalSubscription;if(!s||s.endsAt<=now)return {plan:'标准版',minutes:400,credits:null,renew:false,cycle:null,endsAt:s?.endsAt||null,nextRefresh:null,usedMinutes:0};return {...s,plan:'Pro',minutes:99999,credits:5000,usedMinutes:0};}
  const snapshot=w=>JSON.stringify(w.personalSubscription||null);
  function create(w,cycle){owner(w);const p=plans[cycle]||fail('请选择有效的套餐');const s=current(w);if(s.plan==='Pro'&&s.cycle===cycle)fail('当前套餐已生效，无需重复购买');w.personalOrders||=[];const before=snapshot(w),old=w.personalOrders.find(o=>['pending','failed'].includes(o.status)&&o.cycle===cycle&&o.snapshot===before);if(old)return old;w.personalOrders.filter(o=>['pending','failed'].includes(o.status)).forEach(o=>o.status='cancelled');const order={id:id(),workspaceId:w.id,...p,created:new Date().toISOString(),status:'pending',snapshot:before,priceVersion:'mobile-demo-v1'};w.personalOrders.unshift(order);return order;}
  function get(w,orderId){owner(w);return (w.personalOrders||[]).find(o=>o.id===orderId&&o.workspaceId===w.id)||fail('个人订阅订单不存在');}
  function cancel(w,orderId){const o=get(w,orderId);if(o.status==='paid')fail('已支付订单不能取消');o.status='cancelled';return o;}
  function pay(w,orderId,result,method='Visa ···· 4242',now=new Date().toISOString()){
    const o=get(w,orderId);if(!['success','failure'].includes(result))fail('支付结果无效');if(o.status==='paid')return o;if(!['pending','failed'].includes(o.status))fail('订单已取消');
    if(o.snapshot!==snapshot(w))fail('订阅已变化，请重新确认订单');const p=plans[o.cycle];if(!p||o.amount!==p.amount||o.currency!==p.currency||o.priceVersion!=='mobile-demo-v1')fail('订单报价无效');
    if(!['Visa ···· 4242','Apple Pay（模拟）'].includes(method))fail('支付方式无效');if(result==='failure'){o.status='failed';return o;}
    const subscription={plan:'Pro',cycle:o.cycle,startsAt:now,endsAt:addMonths(now,o.cycle==='year'?12:1),nextRefresh:addMonths(now,1),renew:true,orderId:o.id};
    o.status='paid';o.paidAt=now;o.method=method;o.subscription=subscription;o.invoiceId='INV-'+o.id;
    w.personalSubscription={...subscription};w.plan='Pro';w.credits.total+=5000;return o;
  }
  function renew(w,value){owner(w);if(current(w).plan!=='Pro')fail('暂无有效 Pro 订阅');w.personalSubscription.renew=!!value;return w.personalSubscription;}
  function restore(w,now=new Date().toISOString()){owner(w);const o=(w.personalOrders||[]).find(o=>o.status==='paid'&&o.subscription?.endsAt>now);if(!o)fail('本浏览器没有可恢复的有效购买记录');if(w.personalSubscription?.orderId!==o.id)w.personalSubscription={...o.subscription};w.plan='Pro';return current(w,now);}
  const api={plans,current,create,get,cancel,pay,renew,restore,addMonths};if(typeof module!=='undefined')module.exports=api;else root.PersonalSubscriptionModel=api;
})(typeof window==='undefined'?globalThis:window);
