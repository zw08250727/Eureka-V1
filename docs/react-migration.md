# React / Next.js 迁移记录

## 仓库与版本

- 本项目目录：`/Users/admin/Documents/Playground/projects/Eureka-V1`，不是相邻的 `EureKa` 仓库。
- 远端：`zw08250727/Eureka-V1`；生产分支：`develop`；迁移分支：`codex/next-workbench-migration`。
- 原型基线标签：`prototype-baseline-20261007`，提交 `b41c97420186ad81b319f4cc57fc3013c71be947`。
- PRD 基线：`prd-20261007-40`；本次迁移不修改 PRD 内容及 URL。
- 合并到 `develop` 前必须通过 CI；Pages 工作流再次执行检查和浏览器测试，再发布带 `/Eureka-V1` 前缀的静态产物。

## 入口与页面

| 入口 | 实现 |
| --- | --- |
| `/` | React 登录 / 注册演示，完成后进入原生工作台 |
| `/workbench/` | React 页面调度；通过 `view`、`space`、`id`、`actor` 保留可分享的演示状态 |
| `/prototype/one-to-one-reference/team-only-app.html` | 完整原型基线，用于对照及回退 |
| `/prototype/prd/index.html` | 保留 PRD 的版本、草稿、锚点和评审功能 |

当前公开原型的个人与团队入口均由原生组件承接：个人首页、日程与待办、全部闪念、联系人及详情、录音权限说明及录制页、会议详情六个标签页、录音回收站、个人设置、个人订阅、设备与同步、历史会话、团队首页、成员与邀请、团队创建向导、团队设备、订阅席位、Credits、空间设置、审计记录、自动任务。

空间菜单、顶部导航、App 二维码、来源与日期筛选、上传、编辑与删除确认、权限模拟、付款模拟、Agent 引用与调宽等仍沿用原型结构。创建团队、工作空间邀请和录音权限说明覆盖当前页面，关闭后保留背景页面。原型原本隐藏的知识库、应用数据功能保留在基线文件中，不新增入口；“即将上线”的功能继续保持原状态。

## 实现与视觉约束

- `src/features/reference/`：原型壳层、共享筛选、标题上下文、Agent 几何计算和 SVG。
- `src/features/workbench/`：首页、会议列表、今日概览、上传、Agent；仓储和 API 网关类型。
- `src/features/personal/`：日历、闪念、联系人、设置、各自的弹窗及本地存储。
- `src/features/meetings/`：会议详情、播放、正文编辑、模板、导出、分享预览、录制及权限说明。
- `src/features/spaces/`：团队管理、设备、成员、订阅与支付模拟、会话与自动任务。
- `src/features/auth/`：原型登录和注册页面的 React 实现。

`npm run sync:ui` 按原型加载顺序提取全部 CSS（包括运行时注入样式）和 SVG 路径。`npm run lint` 检查这些文件与原型一致，禁止直接调整生成文件。布局沿用原 class、标签层级、字号、字体栈、间距、素材和响应式断点。Tailwind 使用本地构建，关闭默认 Preflight，避免覆盖原型控件；未引入 Vite 或运行时 CDN。

## 数据与服务边界

仍为本地模拟工程。上传只保存元数据，录音授权不访问真实麦克风，转写/Agent 回复/付款/设备同步均不访问生产服务。会议详情及 Agent 的正式业务规则仍以 PRD「参考与边界」为准，没有扩大本次需求范围。

`WorkbenchRepository` 与 `AgentGateway` 是后续真实接口接入边界。日程、闪念、联系人、会议详情使用类型化 store/hooks；团队与个人订阅模型从原型的纯 JS 规则模块提取为 ESM，再通过 TypeScript 类型门面接入，保留已验证算法而非重新发明规则。真实权限校验、支付、身份认证和持久化需后续后端实现。

继续兼容原型 localStorage 键，包括个人日程、闪念、联系人、上传、会议详情、工作空间与订阅。写入前比较存储快照，发生跨标签页冲突或存储失败时回滚并提示；不静默覆盖其他页面数据。数据范围和会话所有权仍按现有模型执行。未真实接入后台的定时任务不会自行在后台运行。

## 验证方式

```bash
npm ci
npm run check
npm run build
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -- --workers=1
# CI 安装 Chromium，不设置 PLAYWRIGHT_CHANNEL。

# 本地低内存构建（可选）
EUREKA_LOW_MEMORY=1 NODE_OPTIONS=--max-old-space-size=768 npm run build

# 对同一构建内的原型与 React 页面逐场景截图比较
python3 -m http.server 3131 --directory out
PARITY_BASE_URL=http://127.0.0.1:3131 node scripts/check-ui-parity.cjs
PARITY_WIDTH=390 PARITY_HEIGHT=844 PARITY_OUTPUT=test-results/parity-mobile node scripts/check-ui-parity.cjs

# 对本地 Pages 前缀预览或实际线上地址检查 21 个业务页面及保留入口
DEPLOYMENT_URL=https://zw08250727.github.io/Eureka-V1 PLAYWRIGHT_CHANNEL=chrome npm run test:deployment
```

视觉脚本固定日期、随机数、时区、窗口尺寸，并在两边禁用动画和光标闪烁；每个场景使用独立浏览器上下文。报告保存逐像素差异数量、最大通道差值和差异图，不把发生异常的场景计为通过。`PARITY_CASES` 可按场景名正则选择，`PARITY_OUTPUT` 可指定输出目录。

浏览器测试包括原型与 PRD 原有回归，以及原生页面的功能、权限范围、CRUD、刷新、存储失败、冲突恢复、付款幂等、上传校验、跨页导航、窄屏和 Agent 调宽。最终记录见 `docs/migration-integrity.json`；过程中的场景清单保留 source-reviewed 与实测的区别，避免把静态审查当作截图验收。

本轮测量包含桌面 88、平板 87、手机 85 组原型 / React 截图，共 260 组，229 组逐像素零差异。其余原始差值保留在报告中，主要为圆角、字形边缘及透明色混合，不宣称全部截图逐像素相同。响应式原型隐藏的侧栏入口不计作截图通过；相应弹窗功能由浏览器测试覆盖。

## 发布与回退

静态导出启用 `trailingSlash`，统一通过 `NEXT_PUBLIC_BASE_PATH` 生成业务路由与资源 URL。发布后验证根入口、原生工作台、PRD 和原型基线四类入口。回退可恢复基线标签对应的 `develop` 内容再运行现有 Pages 工作流；用户浏览器中的个人数据不在发布中清空。
