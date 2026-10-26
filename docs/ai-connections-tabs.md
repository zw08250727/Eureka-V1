# 海外 AI Connections：应用目录与品牌图标

2026-10-26。仅作用于 `/global/workbench/?view=connectors` 的个人／团队空间。国内仍直接使用原 `ConnectorsPage`，其布局、字号、资源和授权流程保持原样。

## 需求与实现

用户确认移除“连接到 AI 助手”入口和整个顶部 Tab 栏。海外 AI Connections 直接进入“接入其他应用”，不再挂载 SkillsLandingPage；不保留单个不可切换的 Tab。旧纵向导航及双 Tab 说明已失效。

依据 `spc/frontend.md` FE-01～FE-10、`spc/ui.md` UI-TYPE-02、`spc/ui-global.md` 与 `spc/components.md`。主责、依赖以 `spc/modules.json` 为准，未代签人工评审。复用 ConnectionsPage、ConnectorsPage、ConnectorCard、ConnectorMark、ReferenceDialog，不新增页面框架或架构例外。MARKET-01、CONNECT-01、SPACE-01 以及存储／授权逻辑不变。

之前连接器合并将共用卡片从 ConnectorLogo 切到 ConnectorMark，但仅配置国内三个品牌，海外五个服务因此回退首字母。本次为当前 ConnectorMark 补齐已有海外品牌资源，卡片、系统详情、Agent 选择器共用。来源见 `public/connector-logos/SOURCES.md`。国内原资源与查找行为保留；海外自定义服务继续显示名称首字。

## 页面契约

| 组件 | 布局与尺寸 | 字体／颜色 | 来源与状态 |
| --- | --- | --- | --- |
| 海外应用目录 | 内容列最大1140px；标题／卡片左边缘对齐；24px内边距，≤700px为16px；分区间24px | 标题22/30px、600；说明12/18px；分区16/24px；海外语义主题 | 最大宽复用旧源码，边距与文字层级来自SPC；无顶部Tab、无助手安装内容 |
| 系统／自定义卡片 | 保留150px高、12px圆角；内边距24px；网格间隔16px，单列最小280px；≤700px单列；添加卡片保持标准列宽 | 卡片14/22px、600，摘要12/18px；白底、语义边框、无悬停阴影 | 复用现有卡片；已连接／未连接及新增入口不改变 |
| 海外Logo | 48px容器内32px图像，large状态48px图像；保留原始比例 | 已有品牌图片、透明背景 | 卡片、详情、Agent选择器；国内样式不变 |

布局样式限定 `html:has(.market-surface[data-market="global"]) body`。画布为390/768/1080/1440 × 900；指标依据SPC和现有源码，不宣称外部Figma测量。保留加载、空、失败、存储失败、无权限、只读和恢复判断，不迁移或删除用户数据。

## 验证与发布

- `npm run check`：lint、类型、模型、SPC与架构检查。
- `npm run build`：Next.js静态导出。
- `tests/e2e/global-connections-layout.spec.ts`：四个宽度直接展示应用目录、移除Tab与助手内容、内容对齐、无横向溢出、五个Logo实际加载、添加卡片列宽、Slack详情及Esc关闭。截图在 `test-results/markets/global-connections-services-{width}.png`。
- `tests/e2e/connector-interactions.spec.ts`：国内原Logo、卡片尺寸、添加、授权、断连、Agent入口及移动选择器回归。
- `tests/e2e/markets.spec.ts`、`guest-auth.spec.ts`、`ui-standards.spec.ts`：同步移除海外已失效的Tab点击步骤，继续覆盖授权、登录、主题、市场／空间隔离与存储失败。

用户已于本轮明确授权提交并发布。通过检查后提交、推送develop，使用现有Pages工作流，并核对线上海外目录和国内入口；最终提交与部署结果见本轮交付回复。回滚本次提交可撤回视觉和导航改动，数据模型未变。
