# 前端组件规范

## 组织与职责

沿用 React、Next.js App Router、TypeScript，保持现有工程和静态导出。页面只负责组装与路由；业务模块放 `src/features/<module>`；纯展示通用组件放 `src/components/ui`。模型校验与状态变更不放在 DOM 事件拼接或 HTML 字符串中。

连接器参考实现：`card.tsx` 展示、`editor.tsx` 表单、`page.tsx` 交互编排、`model.ts` 校验与序列化。新增业务不使用 iframe、innerHTML 或全局脚本。历史冻结原型仅用于回溯。

## 公共组件

- 优先复用 `Button`、`Select`、`Modal`／`ReferenceDialog`、字段、日期筛选和表格组件。
- 业务卡片、工具栏、状态反馈与表单可保留模块组件；出现稳定复用后再抽到通用层。
- Props 必须类型明确，动作使用回调，避免模块之间直接操作对方 DOM；禁止用 `any` 逃避数据契约。
- Client Component 仅放在需要交互的边界；重型业务页沿用动态加载，不为简单派生值增加 Effect。

## 市场、路由与存储

- 市场配置唯一源：`src/features/markets/cn.json`、`global.json`。价格、额度、Agent 和目录修改必须更新 revision；相同示例数值不代表两个账号域合并。
- 产品跳转调用 `appUrl`；市场入口用 `marketUrl`。禁止硬编码跳回无市场的工作台路径。兼容旧 `/workbench/` 只服务历史回归。
- 浏览器数据调用 `marketStorage`／`marketSessionStorage`，禁止在业务模块直接使用原生 localStorage／sessionStorage。不补丁修改全局 Storage。
- 纯模型继续接收 Storage 接口，便于内存测试。跨标签页监听必须比较 `scopedKey` 后的真实键。
- 市场入口不读取、不自动迁移旧版未隔离数据。旧数据留在原键；任何正式迁移另行设计。
- 退出只删除当前市场会话，保留业务资料及另一个市场的会话。

## 状态与副作用

保存前重检权限和存储快照；写入成功才更新 UI。冲突、配额不足、无权限、JSON 损坏不静默覆盖。异步动作保存发起时的市场、工作区、账号和稳定操作 ID；重试不改变归属。

不在 render 中写存储，不把生产凭证放入前端配置，不执行连接器 JSON 中的命令。真实服务接入使用独立适配层并补充服务端授权。

## 验证

运行 `npm run check`、`npm run build`，再执行受影响 Playwright 用例。修改公共规则需运行两地关键链路；修改 token 需检查登录、工作台、弹窗及移动端。不得以删除失败断言替代产品决策；旧断言修订必须引用规则编号。`npm run check:spc` 检查市场配置与模块依赖、存储访问边界、连接器无 iframe。

国内积分入口组件位于 `src/features/account/domestic-points.tsx`：`DomesticPointsCard` 复用于顶部浮层、账户菜单与移动导航；`DomesticPointsEntry` 使用原生 Popover 管理顶层展示与关闭；`DomesticPointsGuide` 提供侧栏入口。组件只派生展示状态，任务／支付继续调用既有账户面板，会员跳转使用 `appUrl`，不在入口组件中维护第二份余额或订阅。

## 游客首页与认证覆盖层

- `MarketWorkbench` 管理市场会话、私有路由校验与登录目标；不接受任意外部跳转 URL。
- `GuestHome` 使用独立的轻量内容空态，保留默认个人工作区卡片，展示导航、会议／闪念入口及录音、上传、Agent 操作；不挂载今日概览、积分、团队等引导卡片，也不挂载业务控制器或读取已有账号资料。
- `AuthOverlay` 复用 `Auth`、`DomesticAuth` 和 `ReferenceDialog`，负责关闭、滚动锁、焦点循环与焦点返回。
- `Workbench` 只消费 upload、agent、recording、notifications 白名单一次性意图；消费后移除参数，刷新不重复唤起。

`reference/sidebar-parts.tsx` 提供 `SidebarBrand`、`WorkspaceCard`、`PrimaryNavigation`，由游客首页和已登录 `ReferenceShell` 共用。只接收展示数据与动作回调，不导入账户模型，避免游客为复用侧栏而初始化私人资料。
