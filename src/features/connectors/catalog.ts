export type Recommendation = { title: string; description: string; prompt: string; view: "home" | "calendar" };

export const domesticCustomPresets = [
  { id: "contacts", name: "通讯录", description: "将会议内容整理为结构化摘要，识别关键决策与待办。" },
  { id: "flights", name: "航班查询", description: "查询航班信息，帮助安排会议与出行。" },
  { id: "approval", name: "OA审批", description: "查看审批进度与待处理事项。" },
  { id: "todo", name: "待办", description: "整理待办并跟进执行进度。" },
  { id: "docs", name: "文档", description: "查找并使用已授权的工作文档。" },
];

export const domesticPresetTools: Record<string, { provider: string; tools: { name: string; description: string }[] }> = {
  通讯录: {
    provider: "钉钉",
    tools: [
      { name: "contact_department_list", description: "查询企业部门列表，可按父部门 ID 逐级获取子部门。必填参数：无。" },
      { name: "contact_department_get", description: "根据 department_id 查询部门详情，可用于确认部门名称与层级。必填参数：department_id。" },
      { name: "contact_user_list", description: "查询指定部门下的成员列表，不传部门 ID 时使用根部门。必填参数：无。" },
      { name: "contact_user_get", description: "根据 userid 查询员工详情，含姓名、职位、手机号与所属部门。必填参数：userid。" },
      { name: "contact_user_search", description: "按姓名或手机号模糊搜索企业员工，用于快速定位联系人。必填参数：query。" },
      { name: "contact_role_list", description: "查询企业角色列表，可用于获取角色的 roleId。必填参数：无。" },
      { name: "contact_role_get", description: "查询角色详情与权限范围。必填参数：role_id。" },
      { name: "contact_department_create", description: "在企业指定父部门下创建子部门。必填参数：name、parent_id。" },
      { name: "contact_department_update", description: "更新部门名称、父部门或排序值。必填参数：department_id。" },
      { name: "contact_department_delete", description: "删除指定部门，其下成员自动上移至父部门。必填参数：department_id。" },
      { name: "contact_user_create", description: "在企业通讯录创建成员。必填参数：name、mobile。" },
      { name: "contact_user_update", description: "更新员工资料与部门归属。必填参数：userid。" },
      { name: "contact_user_delete", description: "从企业通讯录移除成员。必填参数：userid。" },
      { name: "contact_role_create", description: "创建企业角色并配置成员范围。必填参数：name。" },
    ],
  },
  文档: {
    provider: "钉钉",
    tools: [
      { name: "doc_search", description: "在已授权的文档空间中按关键词查找文档。必填参数：query。" },
      { name: "doc_get", description: "读取指定文档的标题与正文。必填参数：document_id。" },
      { name: "doc_list", description: "列出当前账号可访问的最近文档。必填参数：无。" },
    ],
  },
  待办: {
    provider: "钉钉",
    tools: [
      { name: "todo_list", description: "列出当前账号可访问的未完成待办。必填参数：无。" },
      { name: "todo_get", description: "读取待办详情和截止时间。必填参数：todo_id。" },
      { name: "todo_create", description: "创建待办并指定负责人。必填参数：title。" },
      { name: "todo_complete", description: "将指定待办标记为完成。必填参数：todo_id。" },
    ],
  },
};

export function exampleCustomTools(name: string) {
  return [
    { name: "resource_search", description: `在 ${name} 中按关键词查找已授权资料。必填参数：query。` },
    { name: "resource_list", description: `列出 ${name} 中可访问的最近资料。必填参数：无。` },
    { name: "resource_get", description: `读取 ${name} 中指定资料的详情。必填参数：resource_id。` },
  ];
}

export const connectorRecommendations: Record<string, Recommendation[]> = {
  feishu: [
    { title: "浏览本周会议", description: "浏览飞书日历本周的会议安排，按时间整理会议主题、时间与参与人，快速掌握本周节奏。", prompt: "浏览我本周的飞书会议", view: "home" },
    { title: "查看本周日程", description: "查看飞书日历本周的日程，按时间整理已提供的安排和详情。", prompt: "查看我本周的飞书日程", view: "calendar" },
    { title: "梳理我的未完成待办", description: "梳理你可访问的飞书任务与待办事项，提炼未完成事项并按优先级整理。", prompt: "梳理我的飞书未完成待办", view: "calendar" },
  ],
  dingtalk: [
    { title: "查看本周日程", description: "汇总钉钉日历中本周的安排，快速了解会议时间与参与人。", prompt: "查看我的钉钉本周日程", view: "calendar" },
    { title: "梳理未完成待办", description: "整理可访问的钉钉待办，并按截止时间和优先级查看。", prompt: "梳理我的钉钉待办", view: "calendar" },
    { title: "查找相关文档", description: "在已授权的钉钉文档中查找与你当前工作相关的资料。", prompt: "查找我最近的钉钉文档", view: "home" },
  ],
  "tencent-meeting": [
    { title: "浏览本周会议", description: "浏览腾讯会议账号下本周的会议安排与详情。", prompt: "浏览我本周的腾讯会议", view: "home" },
    { title: "查找云录制", description: "查找已授权范围内的云录制，便于回顾会议内容。", prompt: "查找我的腾讯会议云录制", view: "home" },
    { title: "整理会议纪要", description: "从可访问的会议资料中整理重点与行动项。", prompt: "整理我的腾讯会议纪要", view: "home" },
  ],
};

export const connectorSkills: Record<string, string[]> = {
  feishu: ["消息与群组", "通讯录", "云空间"],
  dingtalk: ["消息与群聊", "通讯录", "日程与待办"],
  "tencent-meeting": ["会议列表", "会议详情", "云录制"],
};

export const connectorToolsByScope: Record<string, Record<string, string[]>> = {
  feishu: {
    messages: ["即时消息", "群组会话"],
    contacts: ["通讯录"],
    calendar: ["日历", "任务与待办"],
    docs: ["云文档", "云盘", "电子表格", "多维表格", "知识库"],
  },
  dingtalk: {
    messages: ["消息与群组", "群机器人"],
    contacts: ["通讯录"],
    tables: ["AI 表格"],
    calendar: ["日历", "待办", "会议室"],
  },
};

export const connectorLogin: Record<string, string> = {
  feishu: "https://www.feishu.cn/",
  dingtalk: "https://www.dingtalk.com/",
  "tencent-meeting": "https://meeting.tencent.com/",
  "google-workspace": "https://accounts.google.com/",
  "microsoft-365": "https://login.microsoftonline.com/",
  slack: "https://slack.com/signin",
};
