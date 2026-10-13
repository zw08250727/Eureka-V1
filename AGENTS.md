# Eureka-V1 协作入口

开始修改前阅读 README.md、spc/README.md、spc/business-baseline.md、spc/frontend.md；UI 修改还需阅读 spc/ui.md、spc/components.md 和对应市场的 spc/ui-cn.md／spc/ui-global.md。

- 国内和海外为独立账号域；每个市场内个人与团队共用账号。市场不是语言或工作区。
- 遵守 spc/workflow.md 的模块职责、影响分析和规则编号；旧测试不能覆盖已确认业务基线。
- 业务组件调用 marketStorage／marketSessionStorage 和 appUrl；禁止直接浏览器存储或业务 iframe。
- 不手改生成的 prototype.css，不改历史冻结原型来适配新产品规则。
- PM 迭代必须交付现有 Next.js／React／TypeScript 工程中的组件与路由，禁止新增独立 HTML 产品页。构建产物、历史文档页面和受控富文本例外见 spc/frontend.md。
- 新组件复用语义主题和公共控件；国内／海外共用工程，基础 UI 不依赖业务模型。例外不得自行扩大或自动重建白名单。
- 修改后执行相应检查和两地相关验收；不删除用户数据，不自动迁移历史浏览器数据。
