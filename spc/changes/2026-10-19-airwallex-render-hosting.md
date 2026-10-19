# Airwallex 沙盒托管至 Render

状态：用户明确要求实施；本地代码已完成，尚未创建 Render 服务、填写密钥、合并或发布。

## 目标与归属

- 问题／目标：GitHub Pages 为静态站点，海外线上支付仍进入旧演示步骤；为现有 Airwallex 沙盒 Node 服务增加 Render 托管入口，并让 Pages 通过公开 API 地址启用官方 Hosted Checkout。
- 模块／主责／联合评审人：海外支付主责待认领；账号／权限主责待认领；两地 UI 张伟需核对；Render 与 Airwallex 配置由仓库管理员复核。
- 规则 ID：MARKET-01、ACCESS-01、ASYNC-01、FE-04、FE-08。
- 市场：仅海外；工作区：个人与团队；不涉及国内独立企业域。

## 组件与实现

- 现有 React 入口：`/global/workbench/` 的个人 Credits、个人订阅、团队 Credits、团队订阅与订单 invoice。
- 复用组件：AccountExperience、OrdersPanel、Billing、CheckoutDialog、useAirwallexCheckout、AirwallexInvoices。
- 新增部署配置：根目录 `render.yaml` 声明单个 Node Web Service；`docs/airwallex-render.md` 说明 Blueprint、Secret、Pages 变量及验证步骤。未新增产品页面或视觉组件。
- 前端：`NEXT_PUBLIC_AIRWALLEX_CHECKOUT_API` 存在且为合法 HTTPS Checkout API 时启用托管流程；本机继续使用 127.0.0.1 默认地址；未配置的线上构建继续旧演示流程。
- 后端：读取 Render 的 `PORT`／`RENDER_EXTERNAL_HOSTNAME`，监听 `0.0.0.0`；Host 与 Origin 分别使用明确白名单；Key 只从 Render Secret 读取。
- 市场差异：位于海外业务适配与构建配置，国内不启用。没有设计变量、架构白名单例外或历史数据迁移。
- 上游：GitHub Actions Repository Variable、Render Secret、Airwallex 沙盒。下游：Hosted Checkout、状态轮询、官方 invoice；不改变浏览器订单模型与成功后入账条件。

## 状态与验收

| 场景 | Given / When / Then | 适用范围 | 证据 |
| --- | --- | --- | --- |
| 本地主流程 | Given 未配置公开 API，When 打开 localhost 海外支付，Then 继续调用 127.0.0.1:3101 | 海外个人／团队 | Airwallex 服务测试 |
| 托管主流程 | Given 构建配置 HTTPS API，When 打开 GitHub Pages 海外支付，Then 直接创建 Hosted Checkout | 海外个人／团队 | 待 Render 与 Pages 部署后人工验收 |
| 未配置恢复 | Given Pages 未设置 Repository Variable，When 访问支付，Then 保留旧演示流程且不请求访客 loopback | 海外 | 构建与代码检查 |
| 跨域与 Host | Given 非白名单 Origin 或 Host，When 请求服务，Then 返回 403；Render Host + GitHub Pages Origin 通过预检 | 托管服务 | Node HTTP 自动测试 |
| 支付失败／重试 | Given Checkout 未完成或服务错误，When 返回原页或重试，Then 不发放权益并复用原订单语义 | 海外个人／团队 | 既有服务与模型测试 |
| 市场隔离 | Given 国内路由，When 查看支付，Then 不启用 Airwallex 托管路径 | 国内 | 既有市场检查 |

- 实际验证：Airwallex 服务测试 14 项通过；`npm run typecheck:airwallex`、相关 ESLint、`npm run check`、带 Pages base path 与 HTTPS API 的 `npm run build`、两地 `npm run test:deployment`、`git diff --check` 均通过。构建产物已确认包含配置的托管 API 地址；未调用真实 Render 或提交沙盒付款。
- 待确认参数：Render 最终域名、Airwallex Secret、GitHub Repository Variable；生产鉴权、持久化订单映射和 Webhook 不在本次沙盒托管范围。
- 回滚：删除 Render Blueprint 与 Pages API 变量，撤回托管启用判断及服务监听调整；浏览器业务数据无需删除或迁移。
- 发布范围：本地实现，待用户创建 Render Blueprint 并填写 Secret 后再发布。
