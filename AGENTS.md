# Eureka-V1 协作入口

开始修改前阅读 README.md、spc/README.md、spc/business-baseline.md；UI 修改还需阅读 spc/ui.md 和 spc/components.md。

- 国内和海外为独立账号域；每个市场内个人与团队共用账号。市场不是语言或工作区。
- PRD 继续集中保存在 src/prototype/prd/content.json，保留原编辑发布流程与稳定章节 ID。
- 遵守 spc/workflow.md 的模块职责、影响分析和规则编号；旧测试不能覆盖已确认业务基线。
- 业务组件调用 marketStorage／marketSessionStorage 和 appUrl；禁止直接浏览器存储或业务 iframe。
- 不手改生成的 prototype.css，不改历史冻结原型来适配新产品规则。
- 修改后执行相应检查和两地相关验收；不删除用户数据，不自动迁移历史浏览器数据。
