# React / Next.js 渐进迁移

## 已发布基线与仓库

- 项目目录：`/Users/admin/Documents/Playground/projects/Eureka-V1`。旧目录 `../EureKa` 是另一个仓库，不在其中执行本项目命令。
- 远程仓库：`zw08250727/Eureka-V1`；生产分支：`develop`。
- 原型与 PRD 基线：`prototype-baseline-20261007` → `b41c97420186ad81b319f4cc57fc3013c71be947`。
- 基线 PRD：`prd-20261007-40`，已由 GitHub Pages run `37591329130` 发布；基线 CI run `37591328904` 成功。
- 迁移分支：`codex/next-workbench-migration`。此分支不直接触发生产发布。

## 当前阶段与入口

| 入口 | 当前行为 |
| --- | --- |
| `/` | 保留登录演示及 iframe 原型入口 |
| `/workbench/` | React 原生个人首页，首个迁移验收页面 |
| `/prototype/one-to-one-reference/team-only-app.html` | 完整原型继续可用 |
| `/prototype/prd/index.html` | PRD 地址、锚点、草稿与版本逻辑保持不变 |

生产地址前缀为 `/Eureka-V1`。`NEXT_PUBLIC_BASE_PATH` 同时用于 Next 资源、旧页面跳转及 PRD 链接，`trailingSlash` 生成适合 Pages 的目录入口。

个人首页包含：侧栏折叠与工作空间菜单、顶部导航与 App 二维码、今日简报与待办完成操作、日程/灵感/记账摘要、会议搜索/来源/日期筛选与逐批加载、标签弹窗、上传、回收站恢复及彻底删除、可拖动和键盘调宽的 Agent 面板。

录音、日历编辑、联系人、闪念详情、会议详情、设备、订阅、设置、团队与历史会话通过显式 `migration=1&entry=…` 参数进入原有界面。旧页点击首页返回 React。未携带迁移参数的原型行为不变。团队开通入口仍打开现有套餐弹窗。

## 工程结构

- `src/app/workbench/`：Next App Router 页面和样式。保持既有字号、配色、间距及素材，不重新设计。
- `src/components/ui/`：按钮、图标、模态弹窗、表单字段、日期筛选、泛型表格。
- `src/features/workbench/components/`：导航、今日概览、会议列表、上传、Agent 面板。
- `src/features/workbench/hooks/`：数据载入与写入、Agent 自适应宽度。
- `src/features/workbench/model/`：类型、日期/筛选规则、本地存储适配器、模拟 Agent、固定原型种子数据。
- `src/lib/routes.ts`：统一入口及 basePath。
- `src/prototype/one-to-one-reference/assets/migration-entry.js`：受限入口桥接，不执行任意查询参数指定的 DOM/URL。

继续使用 React 19、Next.js 16、TypeScript，新增 Tailwind CSS 4 的 PostCSS 构建。共享组件使用 Tailwind，首页复杂布局保留可读的 CSS。没有引入 Vite、运行时 Babel 或运行时 Tailwind CDN。

## 数据与服务边界

`WorkbenchRepository` 提供载入、完成待办、上传、移入/恢复回收站、彻底删除接口。React 组件不直接读写 localStorage。`AgentGateway` 接收提示词、当前上下文、引用选项及 AbortSignal，后续替换为 Agentplatform 适配器。

首阶段完全使用模拟数据。上传只保存元数据；未上传真实音频、未生成转写、未调用外部模型、未执行联网检索。运行状态、计费、历史任务业务规则继续遵循 PRD 的参考与边界，不在本阶段发明业务逻辑。

兼容以下已有存储：

- `eureka:personal-actions:v1`：保留 records / meetings / sessions / settings 和未知字段；修改待办时递增 revision。
- `eureka:thoughts:v1`：按业务日期计算今日灵感与支出，排除收入。
- `eureka:audio-uploads:v1`：兼容 deleted / deletedAt，删除上传记录可跨刷新恢复或彻底删除。
- `eureka:meeting-details:v1`：读取已编辑的会议标题。
- `eureka:workspaces:v2`：读取空间成员、账户名与个人订阅信息。
- `baizhi-v14-contacts`：读取个人联系人数量。

写入前比较存储快照；并发变更、损坏 JSON、容量不足时显示错误并保留当前输入，不覆盖旧记录。未修改模拟数据时不强行覆盖原型种子。种子的相对日期按当天平移，历史会议日期保持原值。

与原型相同，内置演示会议的标签编辑和回收站仍为当前页面内存状态；上传记录可以持久保存。回收站的“30 天”是原型文案，不代表已实现后端定时清理。真正的数据持久化、权限与清理任务留待后端阶段。

## 验证与发布

```bash
npm ci
npm run check
npm run build
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e  # 本机使用已安装 Chrome
# CI 自动安装 Chromium，可直接 npm run test:e2e
NEXT_PUBLIC_BASE_PATH=/Eureka-V1 npm run build
```

新增测试：`tests/e2e/workbench-migration.spec.ts`、`tests/e2e/workbench-model.spec.ts`。覆盖原生无 iframe 渲染、旧页往返、待办持久化、筛选与懒加载、上传验证和失败恢复、回收站、App 二维码、Agent 输入及调宽、桌面/窄屏溢出、并发写入保护、损坏数据保护。

2026-10-07 本地验收：`npm run check` 和生产构建通过；全量浏览器测试 128 项通过、2 项按既有规则跳过。首次并发运行有两个旧 Agent 用例在导航阶段超时，降低浏览器并发至本机 3 / CI 2 后完整重跑通过，未放宽断言。带 `/Eureka-V1` 前缀的独立静态构建及浏览器冒烟也通过：新首页资源、旧页往返、根 iframe 和 PRD 均正常，无 HTTP / 浏览器错误。

测试尺寸为 1440×900、1280×650、1080×680、390×844；验收截图使用固定时区和同一批模拟记录。两个原有截图刷新用例只在设置专用环境变量时运行，常规回归跳过。

Pages workflow 已加入代码/模型检查及全量浏览器测试；通过后才构建带 `/Eureka-V1` 前缀的部署产物。CI 验证迁移分支；合并到 develop 才触发生产发布。

## 后续顺序

1. 个人日历与待办、闪念和联系人：逐页提取数据规则与编辑交互，保留旧页面作为比对基线。
2. 录音、设备、工作空间/团队和订阅：沿用现有模型测试及权限、支付模拟用例。
3. 按参考边界接入会议详情及 Agentplatform；真实服务适配器替换模拟适配器。
4. 全部入口及跨页流程验收通过，再替换根入口中的 iframe。保留原型回退入口及 PRD 固定地址。

尚未替换生产根入口，尚未完成全站 React 迁移。
