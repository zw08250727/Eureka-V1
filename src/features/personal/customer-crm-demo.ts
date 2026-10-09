// Local selectable records; no remote CRM request is made by this prototype.
export const crmCustomers = [
  { crmId: "CRM-john", subjectType: "person", name: "John Chen", company: "ABC Energy", role: "销售副总裁", email: "john@abc-energy.example", region: "德国 / 欧盟", tag: "客户", summary: "负责德国储能渠道合作，讨论涉及经销商名单、认证和 Demo 支持。" },
  { crmId: "CRM-abc-energy", subjectType: "enterprise", name: "ABC Energy", company: "ABC Energy", role: "能源服务", email: "", region: "德国", tag: "客户", summary: "储能渠道企业，评估德国经销商试点合作。" },
  { crmId: "CRM-yuanhang", subjectType: "enterprise", name: "远航智能科技有限公司", company: "远航智能科技有限公司", role: "智能制造", email: "contact@yuanhang.example", region: "中国 / 上海", tag: "潜在客户", summary: "关注销售团队的会议记录与客户跟进效率。" },
] as const;
