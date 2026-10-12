"use client";
import {useState} from 'react';
import {ReferenceDialog} from '@/features/reference/dialog';
import {RefIcon} from '@/features/reference/symbols';
import {appUrl} from '@/lib/routes';
export function CrmImportGuide({team,admin,readonly,space,actor,admins,onClose}:{team:boolean;admin:boolean;readonly:boolean;space:string;actor:string;admins:string[];onClose:()=>void}){
 const [notice,setNotice]=useState(''),[failed,setFailed]=useState(false);
 const canSetup=(!team||admin)&&!readonly;
 const message='请协助对接 CRM 客户数据：在工作区连接器中配置 CRM 系统并完成授权，确认可访问的客户范围、客户负责人及手机号/邮箱等身份字段，再拉取客户列表到通讯录。仅在同一工作区、同一成员名下跨渠道去重合并，保留 CRM 来源及原负责人，不跨成员合并。';
 return <ReferenceDialog className="ex-dialog crm-guide-dialog" label="导入 CRM 客户" onClose={onClose}>
  <header className="ex-head"><h2>导入 CRM 客户</h2><button className="ex-close" aria-label="关闭 CRM 引导" onClick={onClose}>×</button></header>
  <div className="ex-body">
   <div className="crm-guide-intro"><span><RefIcon name="link"/></span><div><h3>连接 CRM，让客户资料集中管理</h3><p>{team?'由团队管理员完成系统对接与授权，再将指定范围的客户列表导入当前团队通讯录。':'先连接你有权限访问的 CRM 系统，再将客户列表导入个人通讯录。企业统一管理的系统，请联系系统管理员完成授权。'}</p></div></div>
   <ol className="crm-guide-steps"><li><strong>连接系统并授权</strong><p>在连接器中配置 CRM 地址及访问授权，确认可读取的客户数据范围。</p></li><li><strong>确认导入范围与所属人</strong><p>选择需要拉取的客户列表，并确认客户负责人及手机号、邮箱等身份字段。</p></li><li><strong>导入并去重合并</strong><p>同一成员名下的重复客户按可靠身份信息合并，保留 CRM 来源；不同成员的客户分别管理。</p></li></ol>
   {team&&!admin&&<div className="crm-guide-tip"><strong>请联系团队管理员{admins.length?`：${admins.join('、')}`:''}</strong><p>你可以复制对接说明，交给管理员确认系统权限与导入范围。</p></div>}
   {readonly&&<p className="crm-guide-tip">当前团队工作区为只读状态，请联系管理员恢复订阅后配置导入。</p>}
   <p className="crm-guide-footnote">此入口提供接入引导，尚未连接或拉取 CRM 数据。</p>
   {notice&&<p role={failed?'alert':'status'} className="crm-guide-notice">{notice}</p>}
   <footer className="ex-footer"><button onClick={async()=>{try{await navigator.clipboard.writeText(message);setFailed(false);setNotice('对接说明已复制，可发送给系统管理员')}catch{setFailed(true);setNotice('复制失败，请选择下方文字手动复制')}}}>复制对接说明</button>{canSetup?<button className="primary" onClick={()=>location.assign(appUrl('connectors','',space,actor))}>前往连接器 ↗</button>:<button className="primary" onClick={onClose}>知道了</button>}</footer>
   {failed&&<textarea className="crm-copy-fallback" readOnly aria-label="CRM 对接说明" value={message} onFocus={e=>e.currentTarget.select()}/>}
  </div>
 </ReferenceDialog>;
}
