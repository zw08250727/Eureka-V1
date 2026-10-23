# 闪念创建来源梳理与本轮交付

日期：2026-10-19。适用：国内／海外、个人／团队；当前分支 `codex/quick-schedule-tasks`。闪念、日程与待办负责人：佳音（国内／海外）；关联会议与录音模块负责人仍以 `spc/modules.json` 的“待认领”为准。本地实现及自动化验证不表示跨模块人工评审、合入或线上发布。

同日后续修订：音频条下方的独立下载／倍速按钮已按用户要求移除，改由浏览器原生菜单承担；日程辅助入口与两地闪念引导同时更新，当前行为以 [后续交付说明](schedule-assist-guide-20261019.md) 的 THOUGHT-AUDIO-02 等规则为准。下文音频按钮记录保留为上一轮实现的历史说明。

## 代码中实际存在的来源

分类 `type`（日程／待办／灵感／记账／其他）与创建来源 `source` 是两种属性，不能合并。

| source 值 | 现有数据或写入入口 | 本轮统一展示 | 事实边界 |
| --- | --- | --- | --- |
| `manual` | `personal/calendar.tsx` 的新建日程／待办；`personal/store.ts` 的新建闪念保存；`spaces/model/core.js` 的 `addThought` | 手动创建 | 创建方式。现有“记录闪念”按钮主要展示设备／App 指引，不能因模型可写就认定已有完整手动创建三类闪念的 UI。 |
| `capture` | `workbench/model/baseline.json`、`demo-week.ts` 中五类提取样例 | 闪念提取 | 创建方式。来源文字在 `capture` 中，新增 `captureAudioUrl` 承接关联原始录音；明确样例 ID 才回退仓库样本。 |
| `agent` | `personal/store.ts` 的 `parseSchedule`、`createActions.confirm`；`calendar-agent.tsx` 对话生成草稿后确认写入 | Agent 创建 | 目前可实际创建的是日程／待办。通用闪念 Agent 使用 `workbench/components/agent-panel.tsx` 与 `model/mock-agent.ts` 回顾内容，没有确认创建灵感、记账、其他的完整写入链路。 |
| `device` | `spaces/model/core.js` 的 `recordThought`；附带 `deviceId`、`bindingId`、`sourceRecordId` | 闪念提取 | 表示设备渠道，和 manual／capture／agent 不在同一维度。保持现有面向用户的“闪念提取”归类，不擅自新增一套“设备闪念”主标签。 |
| `dingtalk` | `personal/team-daily-demo.ts` 的共享日历样例 | 钉钉 | 外部平台。现有原型样例不代表已接入钉钉真实同步。 |
| `feishu` | 同上，飞书日历样例 | 飞书 | 外部平台。现有原型样例不代表已接入飞书真实同步。 |
| `system` | 同上，交付节点提醒样例 | 系统 | 只标出执行主体，无法判断规则、定时任务或系统提醒，语义不足。 |
| 未知／缺失 | 历史或外来记录 | 其他来源 | 兜底，不推断为闪念提取，也不与“其他”内容分类混淆。 |

原有显示问题：闪念列表识别 `agent`，但灵感／记账／其他详情中只区分 `manual` 与非 `manual`，导致 Agent 来源误显示为闪念提取；非 manual 的未知值也会误归类。本轮由 `personal/creation-source.ts` 统一列表、弹窗和日历详情来源文案，修正该不一致。

## 建议补齐的来源与属性（方案分析，未扩展业务入口）

1. **Agent 对话创建必须作为正式方式保留。** 日程／待办已有“生成草稿→人工确认→保存”的链路；建议扩展至灵感／记账／其他，预览分类和字段后统一确认。记账应额外确认金额、收支方向、币种、实际／计划与发生日期，不能仅根据回答文本直接入账。
2. **区分闪念提取与会议提取。** 前者来源是一次随手语音捕获，后者来源是会议录音／转写及其片段。主标签建议“闪念提取”“会议提取”，保留捕获 ID／会议 ID、片段起止时间、原始音频引用。没有实际会议提取写入链路前，不把现有 capture 批量改名。
3. **外部同步单独归类。** 建议主标签“外部同步”，次级显示“钉钉”“飞书”等平台；这是同步渠道，不应与手动／提取的创建方式平铺在一个无约束字符串里。
4. **区分 Agent 对话与自动任务的触发方式。** 对话创建主标签仍为“Agent 创建”；自动任务可展示“自动任务创建”，但需保留任务、运行批次和来源会话。只有自动运行入口实际落地后才启用该标签，不能把所有 system 自动改成 Agent。
5. **把“已编辑”放在状态层。** 编辑不改变创建来源。转发／共享、所有权移交也不是创建来源，继续保留现有 `ownerId`、`previousOwnerId` 和共享权限属性。

推荐字段分工：

| 属性 | 建议值或结构 | 用途 |
| --- | --- | --- |
| `creationMethod` | `manual`、`capture_extract`、`meeting_extract`、`agent_create`、`external_sync`、`system_create` | 决定主来源标签 |
| `inputChannel` | `web`、`mobile`、`device`、`integration` | 捕获渠道；W1/W2/M1 等型号单独使用 deviceModel/deviceId |
| `sourceProvider` | `dingtalk`、`feishu` 等 | 仅外部来源的平台属性 |
| `sourceRefs` | 捕获／会议／Agent 会话／外部日程的稳定 ID 与可选片段范围 | 从来源标签进入可追溯的原始内容，允许同时有会话与会议依据 |
| `triggerType` | 用户确认／自动任务 | 区分人工触发与自动运行 |
| `createdBy` | 发起账号、可选 Agent ID | 与当前 owner、共享者和执行主体分开 |

示例：“让 Agent 根据 W1 捕获的录音创建明天下午的待办”，主标签是“Agent 创建”，渠道是设备，来源引用同时保留捕获和对话；无需把主标签扩成“W1-Agent-闪念-待办”。创建成功须以持久化结果为准，并通过稳定操作 ID 避免重复确认产生重复记录。

建议迁移顺序：先统一显示（本轮已实现）→补齐真实入口写入属性与来源跳转→新增结构化字段并设计显式兼容读取→再考虑经授权的数据迁移。未知历史值保留原值；本轮不迁移、不清空已有浏览器资料。

## 本轮产品变更

| 规则 | 实现与影响 |
| --- | --- |
| THOUGHT-DELETE-01 | 五类记录编辑态提供删除，确认标题“确认删除此条{分类}吗？”，说明“删除后不可恢复”，按钮“取消／删除”。取消保持草稿；确认时按打开编辑时的快照重检版本、所属人、成员资格及工作区可写状态。 |
| THOUGHT-DELETE-01 | 删除沿用模型 `deleted` 标记，无恢复入口；过滤首页、闪念、日历和成员可见查询。标记用于防止示例补充、旧编辑及共享快照复活，不联动删除关联会议、联系人或其他提取记录。存储失败保留记录与弹窗。 |
| THOUGHT-AUDIO-01 | 共用 `CaptureAudio`，在提取详情显示原始录音，播放／暂停、下载及 0.5／0.75／1／1.25／1.5／2 倍速；收起原始捕获不改变录音。已存在演示 ID 使用仓库 33 秒音频样本，不宣称该样本就是所展示文字的真实录音。真实录音必须提供安全的 `captureAudioUrl`，缺失或非法时显示暂无可用原始录音，不伪造资源。 |
| RECORDING-MODE-01 | 新增可选 `recordingMode`，仅 W1/W2/M1 可为 call；其他来源强制 environment，支持设备未指定时也默认 environment。列表与详情复用同一判断及现有耳朵／麦克风 SVG。 |
| RECORDING-MODE-01 | 明确模拟通话样例：个人 meeting-3/M1、meeting-4/W1、meeting-14/W2；团队 team-demo-pilot/W2、team-demo-research/M1、team-demo-sales/W1。显式 environment 可覆盖样例，其他设备记录不按设备型号推断成通话。 |
| PERSONAL-LIST-01 | 个人首页移除创建人列并调整九列布局；团队保留创建人。 |

复用组件：`ReferenceDialog`／`RefDialog`、`Select`、原始耳朵／麦克风 SVG、市场主题变量、现有仓库权限与存储封装。新增业务组件：删除确认、原始捕获播放器、模式图标；不修改冻结原型、生成 CSS 或基础 UI 依赖策略。

上游：现有捕获／会议元数据、ActionRecord／ThoughtRecord、工作区角色与订阅。下游：首页简报、分类计数、收支统计、日历、只读共享视图与 Agent 上下文。跨市场数据仍由 MARKET-01 隔离，管理员管理不扩大共享权。

回滚：回退本轮源码即可恢复旧 UI；已删除标记保持有效，不自动恢复已删除记录或迁移浏览器数据。新字段为可选，对历史记录兼容。

## 验收入口与证据

- 国内：`/cn/workbench/?view=thoughts&id=inspiration`；海外：`/global/workbench/?view=thoughts&id=inspiration`。
- 会议样例：两地 `?view=home` 与 `?view=meeting&id=meeting-3`；团队 `?view=home&space=team-eureka`。
- 模型：`tests/cn-model/thought-lifecycle.spec.ts`，覆盖持久化、过期版本、写失败、只读成员／到期权限、安全资源与模式白名单。
- 浏览器：`tests/e2e/thought-lifecycle.spec.ts`，覆盖两地五类音频、下载与倍速、删除取消与确认、刷新保持删除、个人／团队列、列表—详情图标、390px 弹窗。
- 截图位于 `test-results/thought-lifecycle/`，作为本地验收产物，不提交生成截图到历史 PRD。

扩展回归中 `personal-thought-routing.spec.ts` 有两项旧断言要求团队管理员不能看其他成员闪念，与 ACCESS-01 和当前未修改的 `spaces/model/core.js` 可见权限冲突。这两项未为消除失败而修改，也不归入本轮通过统计。会议测试曾出现一次 Chrome 会话关闭超时，单用例复跑通过。

实际最终检查结果以本轮交付回复为准；未运行的套件不记为通过，人工验收仍待负责人完成。
