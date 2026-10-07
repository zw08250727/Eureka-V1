# EurekaMind 原型全流程核对 · 2026-10-07

范围：当前可见的 Personal 与 Team 页面、正常与异常模拟路径、持久化和空间隔离，以及 PRD 阅读 / 编辑。隐藏的旧企业版、Apps、知识工作台代码不是本轮新增功能承诺。检查依据为用户本会话的最终要求；参考 PDF 仅用于 PRD 组织方式。

## 功能覆盖与回归入口

| 功能界面 | 核对流程 | 自动化依据（tests/e2e） |
| --- | --- | --- |
| 账号与工作空间 | 登录入口、空间人数、精简菜单、邀请入口、切换与隔离 | auth-entry、team-workspaces、team-management-entry |
| 个人首页 | 今日摘要、日程排序、待办完成、灵感与记账、统一按钮 | today-assets、agent-panel |
| 全部闪念 | 五类型顺序、移除重复分类概述、搜索日期排序、查看 / 编辑弹窗、记录设备引导 | thoughts、personal-actions |
| 日程与待办 | 日周月切换、跨日统计、新建 / 行内编辑、详情、关联会议、备注、完成 / 重开、未保存保护 | personal-calendar-subscription、personal-actions、personal-calendar-agent |
| 录音 / 上传 | 模拟暂停继续 / 结束、六种音频格式、取消、失败恢复、刷新和归属 | recording-upload、team-recording-parity、audit-workflows |
| 会议列表 / 详情 | 搜索、来源日期筛选、六页签、正文编辑、导出、分享、回收站 | meeting-list、meeting-filters、meeting-detail、team-recording-parity |
| 联系人 | 搜索 / 档案五页签、添加重名、备注、跟进、失败重试、并发、上下文隔离 | contacts-agent、audit-workflows |
| Agent | 统一紧凑 UI、移除模式切换和输入区冗余提示、新建任务、历史续聊、引用、自动任务手动运行、缩放与小屏 | agent-panel、agent-new-task、agent-history、agent-composer、team-agent-controls |
| 团队工作台 | 跨会议线索及来源权限、成员数据、团队设备录音全员可读、本人会话隔离 | team-recording-parity、team-workspaces、agent-history |
| 团队管理 | 成员邀请 / 角色 / 移除、任务管理占位、设备管理改名、登记 / 同步、空间设置 | team-workspaces、team-management-entry |
| 订阅与 Credits | 个人支付、团队开通、加席入口及失败重试、Credits 购买入口、权益与幂等 | personal-calendar-subscription、seat-payment、team-credits |
| 个人设置 | 两版共用偏好、当前空间套餐、紧凑布局、摘要仅开关、保存失败回退 | account-settings、audit-workflows |
| PRD | 35 个稳定章节、规则就近配图、并排 / 抽屉对照、打印、编辑 / 导入导出 / 草稿并发 | prd-review、prd-visual-review、audit-workflows |

## 本轮补齐

- 联系人模型写入返回失败时，UI 保留表单并回滚内存；成功提示在重新渲染后显示。
- 备注 / 跟进空白输入显示就地错误；备注保存后直接展示，跟进保存稳定 contactId 与完整描述，刷新保留。
- 搜索不再调用不支持的 search 输入选区 API；Alice 等联系人不再套用 John 的承诺 / 首次认识时间。
- 联系人弹窗支持初始焦点、Tab 循环和 Escape；备注数量与标签使用实际记录。
- 联系人与个人上传增加存储快照冲突保护，阻止旧标签页覆盖新数据。
- 语言 / 自动摘要保存失败时保留最后成功状态，开关说明与实际状态一致。
- 团队开通确认信息持久化，支持关闭 / 刷新恢复、取消清理、失败重试、跨页冲突保护与成功防重。
- PRD 以规则分块，并排对照截图；去掉模块独立配图小节，更新设置、设备、Agent、联系人等冲突文字。

## 已知模拟边界

| 能力 | 当前行为 |
| --- | --- |
| 团队任务管理 | 按用户要求点击仅提示“即将上线”；不新增真实管理页 |
| 麦克风 / ASR / AI / 联网 | 计时、演示音频与示例回答；不代表真实服务连接 |
| 上传 | 保存元数据，不存储上传文件本体；不虚构转写 |
| 自动任务 | 配置和手动模拟运行；不在浏览器关闭后调度 |
| 通知 / 邀请邮件 / 支付 / 硬件 | 本地状态模拟；真实发送、支付回调与设备认证待服务接入 |
| 团队开通草稿 | 确认信息后可从创建入口恢复；未确认的输入不自动持久化。真实支付回调与开通恢复仍需服务端 |
| 数据并发 | 浏览器快照检测；不替代服务端事务、认证和跨设备同步 |

## 验证记录

基线全量浏览器回归：101 通过、2 个截图条件用例跳过；补齐后的全量回归已通过 106 项。新增专项覆盖联系人、上传冲突、设置保存失败、团队开通恢复和 PRD 对照交互。最终验证结果以本次提交 CI 与浏览器回归报告为准；截图从实际原型生成，参考 PDF 不发布到公共站点。
