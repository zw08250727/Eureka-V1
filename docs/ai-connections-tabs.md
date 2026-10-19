# AI Connections 二级导航

2026-10-19：海外连接器页面新增纵向二级导航，AI Agents 复用 SkillsLandingPage，外部服务复用 ConnectorsPage、ConnectorCard、ConnectorEditor 和 ReferenceDialog。新增 Google Calendar、Notion 目录项，保留原 Google Workspace、Microsoft 365、Slack 与自定义连接器。国内入口维持原目录。

使用现有 market 语义色、8px 导航圆角；导航列196px、间隔24px，900px以下改为横向。Tab 支持方向键及 Home/End，内容区 min-width:0 防止挤出页面。沿用工作区／成员隔离存储、只读权限与冲突检查（MARKET-01、CONNECT-01、FE-08）；新增目录项读取时合并，不主动改写历史数据。授权仍为现有本地交互演示，未新增真实 OAuth。

验证：TypeScript、相关 ESLint 通过；本地团队浏览器确认两 Tab 切换，外部服务正确显示5项系统连接器与自定义入口。
