"use client";

import { ReferenceDialog } from "@/features/reference/dialog";

export function CrmImportGuide({ onClose }: { onClose: () => void }) {
  return (
    <ReferenceDialog className="ex-dialog crm-guide-dialog" label="导入 CRM 客户" onClose={onClose}>
      <header className="ex-head">
        <h2>导入 CRM 客户</h2>
        <button className="ex-close" aria-label="关闭 CRM 引导" onClick={onClose}>×</button>
      </header>
      <div className="ex-body crm-guide-content">
        <section>
          <h3>导入目的</h3>
          <p>将 CRM 中的客户资料集中到通讯录，减少重复录入，方便结合会议记录持续跟进客户。</p>
        </section>
        <section>
          <h3>如何导入</h3>
          <p>请联系系统管理员完成 CRM 系统对接与授权，确认客户范围后，将客户列表导入当前工作区。</p>
        </section>
      </div>
    </ReferenceDialog>
  );
}
