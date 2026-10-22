# AI Connections 顶部横向分类

## 目标与范围

- 用户要求：次级侧栏占用过多横向空间，改为顶部横向 Tab。
- 海外个人／团队 AI Connections；国内仍复用原 ConnectorsPage，不新增分类导航。
- 模块主责：李鹤飞（海外连接器）；关联 UI：张伟。人工评审待确认。
- 遵循 FE-01/02/09/10、UI-TYPE-02、MARKET-01、CONNECT-01；无业务基线变更。

## 页面与组件方案

来源为用户截图、spc/ui-global.md 和现有 connections-page；按 team-design-spec 的项目本地证据优先规则实施。

| 元素 | 规格与状态 | 来源 |
| --- | --- | --- |
| 顶部分类 | 位于工作台顶栏下方，横向排列，高48px；桌面左右24px、项间24px；600px以下左右及项间16px | 项目间距尺度，具体布局为本次设计 |
| 分类按钮 | 14px/600，选中显示市场强调色与2px下划线；hover浅底；键盘单层焦点 | 海外Tab规范及现有字号 |
| 内容区 | 删除196px侧栏及24px列间距，内容占满可用宽度；原标题、搜索、连接器卡片、Skills页面复用 | 现有页面 |
| 窄屏 | 分类不换行、必要时局部横向滚动；保留48px点击高度 | 响应式设计 |

复用 ConnectionsPage、ConnectorsPage、SkillsLandingPage。仍由 selected 状态切换面板；左右方向键、Home/End移动并激活Tab，上下方向键保留页面滚动。
加载、空、失败、已连接、无权限及只读状态由原子页面处理；授权归属、数据和存储无变更。

## 影响与验收

- 上游：工作区、当前用户、SpacesController；下游：连接器列表、Skills介绍。仅布局及分类键盘方向改变。
- Given 海外个人或团队，When 打开AI Connections，Then 两个分类在同一顶部行且内容在其下方。
- When 点击或使用左右方向键切换，Then aria-selected、焦点与面板一致。
- 国内连接器仍保持原入口，授权失败／恢复、持久化及工作区隔离执行现有两地回归。
- 验证：npm run check、npm run build通过；现有 markets.spec.ts 国内／海外连接器授权失败恢复、持久化与工作区隔离两例通过。浏览器核对1440/1080/768/390px顶部横向布局，并检查左方向键激活前一Tab；窄屏内容边距补齐16px。无自动发布。
- 回滚：还原 connections-page.tsx/css 的本轮修改，无数据迁移。
