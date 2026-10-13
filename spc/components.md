# 前端组件规范

版本：1.1 / 2026-10-13。依赖和交付边界见 [前端研发规范](frontend.md)，视觉见 [公共 UI](ui.md)、[国内 UI](ui-cn.md)、[海外 UI](ui-global.md)。以下目标约束新增与后续改造，不宣称旧组件已经全部符合。

## 组织与职责

沿用 React、Next.js App Router、TypeScript，保持现有工程和静态导出。页面只负责组装与路由；业务模块放 `src/features/<module>`；纯展示通用组件放 `src/components/ui`。模型校验与状态变更不放在 DOM 事件拼接或 HTML 字符串中。

连接器职责参考：`card.tsx` 展示、`editor.tsx` 表单、`page.tsx` 交互编排、`model.ts` 校验与序列化；其旧浏览器确认框等交互仍需渐进收敛。新增业务不使用 iframe、HTML 拼接页面或全局脚本；会议富文本仅允许登记的清洗与内容边界。历史冻结原型仅用于回溯。

## 公共组件

- 优先复用 `Button`、`Select`、`Modal`／`ReferenceDialog`、字段、日期筛选和表格组件。
- 业务卡片、工具栏、状态反馈与表单可保留模块组件；出现稳定复用后再抽到通用层。
- Props 必须类型明确，动作使用回调，避免模块之间直接操作对方 DOM；禁止用 `any` 逃避数据契约。
- Client Component 仅放在需要交互的边界；重型业务页沿用动态加载，不为简单派生值增加 Effect。
- `AiIcon`／`AiRewardArtwork` 位于 `src/components/ui/ai-icon.tsx`，仅负责 SVG 和 CSS 动效，不依赖积分模型；国内积分入口和账户浮层复用，尺寸／动效遵守 UI-CN-AI-01。

### 公共契约与待收敛项

| 组件 | 新增／改造时应具备的契约 | 现状边界 |
| --- | --- | --- |
| Button／IconButton | 语义 variant、36/40/44px size、loading、disabled、明确可访问名称 | 当前 Button 只有 default/primary/ghost，尚未补齐统一尺寸和 loading 接口 |
| Field／Input／Textarea | label、help、error、required、disabled、受控值、关联描述 | 保留现有 Field，按需扩展，不在页面复制校验展示 |
| Select／Popover | 键盘移动、选中／禁用、Esc、定位和焦点返回；鼠标选中与键盘焦点分离，遵守 UI-SELECT-01 | 复用现有 Select，不新增另一套全局选择器 |
| Modal／ReferenceDialog | 标题、关闭请求、dirty 保护、初始焦点、焦点返回、短屏滚动 | 暂保留两个接口，后续共用行为底座，不新增第三套实现 |
| DataTable | columns/rows、稳定 ID、可配置 empty 内容、排序／筛选回调 | 当前“会议”空态文案待抽为参数；基础表格不导入会议模型 |
| Tabs／StatusBadge／Toast／EmptyState | 展示值、状态和动作；无业务数据访问 | 逐步提取稳定重复，不宣称已有完整独立组件库 |
| DateFilter | 日期值和回调，日期工具应位于公共层 | 现有 localDay 业务层导入精确登记为遗留例外，后续移出 |

组件 API 目标不等于当前可调用接口；实施时兼容旧调用点，并同步状态展示与测试。状态展示页也必须是 React 路由，不输出新的独立 HTML 页面。

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

运行 `npm run check`、`npm run build`，再执行受影响 Playwright 用例。修改公共规则需运行两地关键链路；修改 token 需检查登录、工作台、弹窗及移动端。不得以删除失败断言替代产品决策；旧断言修订必须引用规则编号。`npm run check:spc` 检查市场配置与模块依赖，并调用架构检查验证当前源码的存储、iframe、HTML 写入、UI 依赖及冻结边界。

国内积分入口组件位于 `src/features/account/domestic-points.tsx`：`DomesticPointsCard` 复用于顶部浮层、账户菜单与移动导航；`DomesticPointsEntry` 使用原生 Popover 管理顶层展示与关闭；`DomesticPointsGuide` 提供侧栏入口。组件只派生展示状态，任务／支付继续调用既有账户面板，会员跳转使用 `appUrl`，不在入口组件中维护第二份余额或订阅。

## 游客首页与认证覆盖层

- `MarketWorkbench` 管理市场会话、私有路由校验与登录目标；不接受任意外部跳转 URL。
- `GuestHome` 使用独立的轻量内容空态，保留默认个人工作区卡片，展示导航、会议／闪念入口及录音、上传、Agent 操作；不挂载今日概览、积分、团队等引导卡片，也不挂载业务控制器或读取已有账号资料。
- `AuthOverlay` 复用 `ReferenceDialog` 管理关闭、滚动锁、焦点循环与焦点返回。国内由 `DomesticEntry` 卡片选择后挂载 `DomesticAuth` 或 `EnterpriseLoginForm`，企业表单使用百销品牌；海外挂载 `Auth`。只展示一个 dialog，切换内容不叠加浮层。
- 国内 `/cn/login/` 与 `/cn/enterprise/login/` 为独立页面；`DomesticCredentials` 复用手机／邮箱验证码交互，企业定位和百销品牌由 `EnterpriseLoginForm` 负责，`EnterpriseLogin` 仅承载直达弹窗。`login-routes` 仅允许续接国内工作台地址。
- `Workbench` 只消费 upload、agent、recording、notifications 白名单一次性意图；消费后移除参数，刷新不重复唤起。

`reference/sidebar-parts.tsx` 提供 `SidebarBrand`、`WorkspaceCard`、`PrimaryNavigation`，由游客首页和已登录 `ReferenceShell` 共用。只接收展示数据与动作回调，不导入账户模型，避免游客为复用侧栏而初始化私人资料。

### MEETING-UI-02 · 会议详情复用

`MeetingDetail` 保持编排职责，播放、转写、生成资产、评价、导出分享与文档编辑使用独立 React 组件。国内／海外的真实市场路由共用这些组件；颜色、正文行高与控件尺寸继承 UI-CN／UI-GLOBAL token。历史无市场路由保留兼容行为。

内容不足由 `contentState.viewType` 决定，不用时长推断：2/3隐藏普通内容标签，3可显示已有零散转写；翻译标签仅在存在翻译内容时出现。多总结的编辑、导出与分享使用稳定总结ID，标题只用于展示。全屏编辑不改变会议原始转写，退出须保留现有草稿确认行为。未接生成服务必须呈现真实未接入或失败状态，不伪造成功内容。
