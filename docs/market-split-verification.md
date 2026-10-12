# 2026-10-12 · 游客首页与登录覆盖层发布

本轮规则：AUTH-GUEST-01、AUTH-UI-01；PRD revision：`prd-20261012-market-02-guest-auth`；规则版本：`rules-20261012-05`。

- 国内、海外入口默认显示游客首页；游客不挂载业务控制器，不读取或初始化账号资料。录音、上传、Agent、日程、闪念、通讯录、连接器、通知、积分订阅、团队与账号入口逐项登录校验；商城和 App 下载无需登录。
- 白底居中登录覆盖层复用现有完整表单，关闭/Esc/焦点循环/焦点返回/短屏滚动可用。企业两步登录与独立域、企业 toast 保持。海外邮箱注册及 Google/Apple 保持。
- 私有深链登录后续接原模块，取消返回本市场首页。录音、上传和 Agent 只打开工具，不自动执行；刷新不重复打开。跨标签退出卸载私有界面，保存数据与其他账号域不变。
- `npm run check` 和生产构建通过。发布回归 147 项、国内账务模型 21 项通过；覆盖此次及此前市场功能调整。最终游客入口 21 项复测通过，补充手机侧栏触发后的焦点返回。
- 扩展历史全量运行设置最多 8 项失败后停止：27 通过、8 失败、2 中断、474 未执行。失败在 account-sharing-model / account-sharing-ui，包含旧批量共享开关、移除后仍绑定、管理员私有可见性等断言或旧入口；不宣称全仓库全绿，不为迁就旧断言改回产品规则。
- Pages 的原手动 skip_browser_acceptance 选项已改为运行 `test:release`，仍必须通过代码检查、国内模型及 147 项市场发布回归后才能构建发布；普通推送保留全量套件。不是无测试发布。
- 国内/海外静态包和线上发布结果，以该次打包 manifest、package-smoke.json 及 GitHub Pages workflow 的实际结果为准；源码提交记录与线上验收使用同一 PRD revision。

---

# 国内会议详情与个人订阅布局 · 2026-10-12

本轮读取百智公开 JS/CSS，并在登录后的页面核对组件与交互。国内个人与团队共用详情组件，保留当前页面框架和右侧录音列表；个人订阅恢复账户额度横条、月付／年付卡片及统一升级按钮，完整权益和加时包保留。源码映射和明确差异见 [会议详情矩阵](baizhi-meeting-reference.md)。

- `npm run check`、`npm run build` 通过；`playwright.cn-model.config.ts` 21 项通过。
- 本轮相关浏览器及导出／分享逻辑共43项通过：国内详情、富文本编辑、导出分享、会员、充值、海外原生会议。最终批次42项中41项首轮通过；音频错误用例原先手动派发error事件与真实canplay事件竞态，改为加载实际404音频后通过。另新增图文重新生成清空旧图用例通过。
- 多总结编辑／删除后默认正文保持一致；评分草稿不串；奖励与账户反馈共享月上限；来源快照不随当前总结切换；缺原音频不播放无关样例。个人／团队保存、只读、刷新、失败和390/768/1440宽度均有对应回归。
- 目视检查 `test-results/cn-meeting-{390,768,1440}.png`、`test-results/cn-membership/`。官方空态素材由公开静态资源提供，没有生成替代插画或图文摘要。
- 保留真实依赖边界：静态原型没有生产ASR／AI任务、公网分享、多端同步或服务端导出。图文摘要只显示实际图片；真实媒体需要audioUrl。导图采用所选总结的原生Markmap渲染。完整差异不等同全量生产一比一完成，见上述矩阵。
- `npm run package:markets` 与 `npm run test:packages` 通过：两地独立入口、登录、工作台、原生连接器、订阅与积分购买、账号域和无页面错误检查均通过。结果见 `artifacts/markets/package-smoke.json`；React工程为维护源。

命令：
```sh
npm run check
npm run build
npx playwright test --config=playwright.cn-model.config.ts
PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/e2e/domestic-meeting-detail.spec.ts tests/e2e/domestic-meeting-editor.spec.ts tests/e2e/domestic-meeting-export-share.spec.ts tests/e2e/domestic-membership.spec.ts tests/e2e/domestic-billing.spec.ts tests/e2e/native-meetings-parity.spec.ts
PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/e2e/domestic-meeting-detail.spec.ts --grep 'playback marks|visual regeneration'
```

---

# 国内／海外登录注册居中 · 2026-10-12

AUTH-UI-01：登录与注册改为白底单列，品牌和完整表单居中，最大宽度400px；不再挂载右侧示意图、截图与轮播。国内个人/团队、企业代码和成员登录、海外第三方渠道及注册切换保持原有流程。

- `npm run check`、构建通过；最终调整后 lint 通过。
- 登录相关42项回归中41项首轮通过，1项订阅按钮旧文案断言已更正为国内“专业版”。最终构建复验受布局影响及修正断言的15项，全部通过。
- 验证320/390/768/1024/1440宽度，无横向溢出；国内表单列在900px高度上下居中，短屏表单可滚动完成登录。
- 截图：`test-results/auth/cn-centered-*.png`、`cn-enterprise-centered-*.png`、`login-*.png`、`register-*.png`。PRD登录和注册截图已更新。旧素材仅供历史参考。
- 两地独立静态包检查结果见 `artifacts/markets/package-smoke.json`。

---

# 国内会员权益、加时包与账户积分卡 · 2026-10-12

规则版本 `rules-20261012-04`、国内配置 `market-20261012-04`。本节替代下文历史记录中的专业版旧价格及“卓越版／转写权益待核实”结论。

读取当前网页 JS/CSS 和已登录可见 DOM，将会员卡、年/月及会员/加时包页签、勾选 SVG、签到卡结构迁移为 React。完整16项权益与四档对比已配置；专业版 ¥50/月、¥199/年，卓越版 ¥100/月、¥599/年；加时包120/1000/2000分钟对应¥5/¥39/¥69。标准版购卡赠送。来源与实现边界见 docs/baizhi-billing-reference.md。

- `npm run check`、静态构建：通过。
- 国内模型 13 项通过：两档报价、月积分、个人/团队独立、支付与消费幂等、订单取消／重试／到期、加时包两年有效与先到期先消耗、月份额度刷新。
- 浏览器 51 项通过：domestic-membership、domestic-billing、domestic-points、markets、baizhi-theme、account-orders-compact。包含国内加时包从订单页恢复支付，会员及余额刷新持久化、团队管理员边界、海外订单与充值回归、390/768/1440响应式。
- 账户浮层保留会员身份及升级、当月签到次数、累计实际奖励、每日奖励、可用积分、赚积分、充值、立即签到／明日再来／下月再来。顶部积分浮层原有反馈等入口保留。
- 截图：`test-results/cn-membership/`。未生成插图或复制真实付款码；支付沿用本地确认流程。
- 静态包的最终登录、订阅、充值及国内企业入口结果见 `artifacts/markets/package-smoke.json`。团队席位报价和未核实的会员积分失效规则仍保留既有基线。

---

# 连接器页面精简 · 2026-10-12

移除英文标题、宣传文案、重复的市场／工作区说明；搜索与添加合并为单行工具栏。卡片保留名称、状态和用途，工具数量及授权归属收进原有详情。自定义空态与搜索无结果提示合并精简。两地共用页面结构，市场目录、授权与工作区隔离规则不变。

`npm run check`、构建通过；连接器相关 6 项既有回归通过，覆盖两地授权、失败重试、自定义保存、断开、隔离、过期权限和 390/768/1440 响应式。截图位于 `test-results/markets/*-connectors-*.png`。

---

# 国内积分入口与会员升级验收 · 2026-10-12

国内个人与团队统一顶部额度入口、会员浮层及侧栏引导卡。个人升级从积分浮层一键进入；免费／付费会员身份、余额、签到状态均来自当前模型。团队管理员充值、普通成员只读、到期先续费，继续保持个人与团队权益独立。海外入口保持原行为。

- `npm run check`、静态构建、两地独立打包：通过。
- 最终构建运行 `domestic-points.spec.ts`、`domestic-billing.spec.ts`、`markets.spec.ts`、`baizhi-theme.spec.ts`：40 项全部通过。
- 覆盖免费／专业会员切换、一键升级后团队余额不变、成员充值禁用、到期续费、签到回写、账户菜单复用、Esc 焦点归还、外部点击关闭；充值重试、存储失败及两地账号隔离继续通过。
- 目视核对 `test-results/cn-points/` 的 390/768/1440 个人浮层、团队管理员／成员浮层截图，充值按钮清晰，浮层没有横向溢出。
- `npm run test:packages`：国内与海外静态包各自登录、连接器、订阅、充值和国内企业登录链路通过。最新时间见 `artifacts/markets/package-smoke.json`。

本轮未改价格与积分发放规则，未重新宣称全仓库测试全部通过；此前遗留断言与待确认价格见下方记录。

---

# 国内积分与会员对照验收 · 2026-10-12

本轮保留现有界面结构与交互，替换国内已核实的积分、人民币价格及支付方式；充值 CTA 使用亮蓝。来源、尚未核实的档位和团队人民币报价见 [规则对照](baizhi-billing-reference.md)。规则版本 rules-20261012-03，国内配置 market-20261012-03。

- `npm run check`、`npm run build`：通过。
- `playwright.cn-model.config.ts`：9 项通过，覆盖人民币报价、周年到期、已使用部分不重复失效、按月发放、订单幂等、管理员边界、旧数据保留与旧报价重新确认。
- `domestic-billing.spec.ts` + `baizhi-theme.spec.ts`：11 项通过。覆盖个人专业版、个人与团队充值、微信／支付宝、失败重试、保存失败回滚、积分分类、390/768/1440 响应式及充值按钮实际颜色。
- `native-billing-teamhome.spec.ts --grep 'native billing:'`：7 项通过；已把积分相关旧测试从 50k/¥450 和旧弹窗流程调整为当前 15k/$149 的海外流程。
- `team-pricing.spec.ts`：5 项通过，海外及原有团队席位定价、优惠／续费、旧账单币种保持。
- `credits-daily-model.spec.ts`：6 项通过；`markets.spec.ts` 23 项与两组账户交互 10 项在本轮回归通过。
- 目视检查 `test-results/cn-billing/` 的桌面与手机充值、订阅、明细截图：布局沿用现有页面，无文字遮挡或横向溢出；窄屏弹窗内部滚动。
- 独立包构建与登录、订阅、充值、企业入口检查见 `artifacts/markets/manifest.json`、`package-smoke.json`。包附此报告和规则对照。

本轮不是全仓库测试全绿声明。扩展运行原生工作台整组时，仍发现 3 项不属本次账务改动的旧断言：会议列表固定 11 条夹具、上传弹窗已移除的说明句、已取消的团队解散记录入口。未为这些旧断言修改产品行为。当前账务相关失败已修复并重跑通过。

仍待确认：标准版／卓越版价格、国内团队人民币席位价格、各档转写额度和会员积分失效规则。没有用汇率换算或擅自编造价格。截图的 28,200 是线上账号余额，未覆盖已有原型资产。

---

# 国内登录展示与模拟流程修正

日期：2026-10-12。最新批次，先前视觉与业务验收保留在下方。

- 企业入口增加“以线上为准”toast：点击、重复点击、直接访问均覆盖，4.5秒自动消失，可关闭，不阻断登录。
- 国内右侧采用当前团队与企业工作台真实渲染截图，替换 CSS 模拟界面；展示切换不改变表单数据，登录版本切换联动对应展示。支持放大、Esc关闭及焦点归还。
- 修复手动输入111111无法登录：国内同时接受111111和既有123456，获取验证码自动填入111111，保留格式、协议、成员及存储校验。验证用户截图中的手机号与111111能登录。
- `npm run check`、静态构建通过。相关 **44 / 44** 浏览器测试通过，包含个人/团队、企业与海外回归，390/768/1024/1440px展示及放大交互。独立真实页面截图采集测试 **1 / 1** 通过。
- 截图：`test-results/markets/cn-showcase-team-{1024,1440}.png`、`cn-showcase-enterprise-{390,768,1024,1440}.png`。素材来源与复拍步骤见 `docs/auth-flows.md`，企业素材来自仓库可运行工作台，不声称为线上企业生产环境截图。
- 两份静态包验收结果见 `artifacts/markets/package-smoke.json`。

```sh
PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/e2e/domestic-showcase.spec.ts tests/e2e/domestic-auth.spec.ts tests/e2e/baizhi-theme.spec.ts tests/e2e/auth-entry.spec.ts --workers=2
npm run check
npm run build
npm run package:markets
npm run test:packages
```

---

# 百智国内视觉主题验收

日期：2026-10-12。最新批次为国内视觉调整，历史登录批次保留在下方。

- 官网游客工作台与登录弹窗的 DOM / computed CSS 已对照，来源与映射见 [视觉参考](baizhi-visual-reference.md)。国内改为黑白灰工作台、亮蓝登录与蓝紫品牌装饰。
- 国内专属 CSS、官网登录背景本地资源；不改账号、功能、数据、页面布局和断点。海外与根分流页保持原样。
- `npm run check` 与静态构建通过；相关浏览器 **76 / 76 通过**，包含新增的4项主题验收。这是本轮相关套件结果，不表示全仓库历史套件全部通过。
- 390 / 768 / 1440px 下对比启用与移除国内主题规则后的 DOM 几何：登录表单、输入及提交按钮，工作台、顶部栏、首页概览与会议容器的位置与尺寸一致。
- 实际检查个人/团队首页、日程、Agent、连接器、订阅支付弹窗及 top-layer Select；主题弹窗交互保留，海外登录主按钮仍为 #3858B6。浏览器修改前后海外登录关键控件的尺寸、颜色、背景、边框、阴影、字体计算值一致。
- 截图保存于 `test-results/markets/`：`cn-home-{390,768,1440}.png`、`cn-auth-{390,768,1440}.png`、`cn-team-home.png`、`cn-calendar.png`、`cn-agent.png`、`cn-payment-select.png`，以及连接器/企业流程/海外对照图。
- 静态包验收另见 `artifacts/markets/package-smoke.json`；打包本身不代表验收通过。

```sh
npm run check
npm run build
PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/e2e/baizhi-theme.spec.ts tests/e2e/domestic-auth.spec.ts tests/e2e/markets.spec.ts tests/e2e/auth-entry.spec.ts tests/e2e/select-avatar.spec.ts tests/e2e/account-polish.spec.ts --workers=2
npm run package:markets
npm run test:packages
```

---

# 百智 / EurekaMind 登录与文案核验

日期：2026-10-12；配置 `market-20261012-02`，规则 `rules-20261012-02`。以下为最新一批；后文保留先前批次证据。

## 本次变更

- 白底简洁分流入口，国内百智、海外 EurekaMind；国内工作台品牌与新初始团队名同步。
- 国内手机号/邮箱验证码，新用户自动注册；个人/团队版与企业版只有两个登录入口。海外保留原登录注册方式。
- 企业代码 → 成员登录 → 独立工作台；待办增删、完成、刷新保存、成员信息、退出。企业登录态及业务资料与国内个人/团队、海外独立。
- 产品界面删除实现、演示、账号隔离及待 PM 确认说明；失败注入、账期推进、身份切换仅在评审模式开放。规则与服务边界保留在仓库文档。
- 修复创建团队评审模式的子页面读取原工作区导致崩溃的问题；全体浏览器工作区仓库保持同一评审数据来源。普通工作区与注入的测试存储接口不变。

## 当前验证

| 项目 | 结果 |
| --- | --- |
| `npm run check` | 通过：lint、类型、模型、SPC |
| 静态构建 | 通过，含 `/cn/enterprise/` |
| 相关 Playwright | **119 / 119 通过**，Chrome，2 workers |
| 视觉复核 | 白底分流；国内手机号、企业代码、成员登录；390/768/1440px；海外另含320px |
| 独立包验收 | 结果单独记录在 `artifacts/markets/package-smoke.json`，不以完成打包代替验收 |
| 仓库全量历史套件 | 本次未重跑；之前已有的历史失败见下方旧批次记录，119项通过不代表全仓库通过 |

测试覆盖企业错误代码、非企业成员、错误验证码、协议未勾选、倒计时重发、存储失败保留输入、三种账号域不复用会话、跨标签退出、企业待办持久化，以及两地连接器、订阅、Credits、团队资格与评审流程。没有用改回多团队规则来满足旧测试。

命令：

```sh
npm run check
npm run build
PLAYWRIGHT_CHANNEL=chrome npx playwright test \
  tests/e2e/domestic-auth.spec.ts tests/e2e/markets.spec.ts \
  tests/e2e/market-model.spec.ts tests/e2e/auth-entry.spec.ts \
  tests/e2e/single-team-agent.spec.ts tests/e2e/multi-workspace-model.spec.ts \
  tests/e2e/multi-workspace-ui.spec.ts tests/e2e/team-pricing.spec.ts \
  tests/e2e/account-expansion-ui.spec.ts tests/e2e/account-orders-compact.spec.ts \
  tests/e2e/account-polish.spec.ts tests/e2e/select-avatar.spec.ts \
  tests/e2e/team-creation-demo.spec.ts --workers=2
npm run package:markets
npm run test:packages
```

本次日志：`artifacts/markets/verification/auth-refresh-check.log`、`auth-refresh-build.log`、`auth-refresh-tests.log`；截图在 `artifacts/markets/verification/auth-refresh-screenshots/`。线上核对范围、账号数据与未接真实服务的边界见 [登录流程](auth-flows.md)。企业代码之后是按用户要求设计的仓库原型，不宣称已对照线上企业全流程。

---

## 先前批次记录（下面的“本轮”指当时批次）

# 国内／海外原型与 SPC 交接记录

日期：2026-10-12。来源提交：`8722ef8a2c96564bf9cecb6486766e49fc6b4323`，本次修改保留在工作区，未提交或部署。

## 本次已实现

- 根路径提供国内／海外一级评审分流；固定入口 `/cn/`、`/global/`，各自登录后进入所属市场工作台。
- 两地账号域、登录态、资料、订单、Credits、Agent 会话与连接器授权独立；各市场个人与团队使用同一演示账号。旧无市场数据保留，不自动复制迁移。
- 价格、额度、奖励、费率、支付渠道列表、Agent 标识、MCP／Skills 和连接器目录集中到独立市场配置。当前 USD 数值和渠道仍为演示，不代表国内正式售价。
- 国内松绿色、海外靛蓝色主题；新增连接器卡片、详情、授权演示、URL／JSON 编辑、断开、删除、输入保护、权限与冲突校验，移除业务 iframe。
- PRD 仍为原来的集中 content.json，保留原本地编辑、导出、Git 发布流程。修正总则与流程中的单团队、权益独立及共享规则冲突。
- 增加 SPC、模块主责／依赖清单、统一评审总览、项目 AGENTS 和 PR 模板。
- 生成各自独立的静态包；包根入口仅显示该市场，另一市场路由移除，资源自包含。保留 React 工程作为维护源。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| `npm run check` | 通过：ESLint、TypeScript、静态资源、既有历史纯模型、SPC 结构与存储边界 |
| `npm run build` | 通过：8 个业务／系统静态路由（包含框架 404） |
| 两地及相关回归 Playwright | 本轮 85 / 85 通过，使用本机 Chrome；包含原 65 项及新增市场限制、工作区和定价用例 |
| 单团队规则专项 Playwright | 本轮 33 / 33 通过，与上述回归有重叠，不相加统计 |
| 两份包独立启动冒烟 | 国内与海外均通过；登录、工作台、连接器、会话域、另市场 404、评审链接及页面错误检查 |
| `git diff --check` | 通过 |
| 全仓库历史回归（首次分版时记录，本轮未重跑） | 未通过，达到 15 个失败上限后停止；50 通过、15 失败、3 中断、338 未运行 |
| 修改前提交的独立复现 | 原始提交另行导出、构建并测试，同样达到 15 个失败上限；51 通过、15 失败、2 中断、325 未运行 |

专项命令：

```sh
PLAYWRIGHT_CHANNEL=chrome npx playwright test \
  tests/e2e/markets.spec.ts tests/e2e/market-model.spec.ts \
  tests/e2e/single-team-agent.spec.ts tests/e2e/multi-workspace-model.spec.ts \
  tests/e2e/multi-workspace-ui.spec.ts tests/e2e/team-pricing.spec.ts \
  tests/e2e/account-expansion-ui.spec.ts tests/e2e/auth-entry.spec.ts --workers=3
PLAYWRIGHT_CHANNEL=chrome npx playwright test --grep 'ACCOUNT-01|RIGHTS-01|SPACE-01' --workers=3
# 以下是首次交付包的独立检查命令，本轮仅修改测试与文档，未重新打包
npm run test:packages
```

相关回归包含：同邮箱在两地独立登录、退出不影响另一地、直达未登录市场回到该市场登录、个人／团队导航留在本市场、两地分别开通团队并保留账号、订阅支付与充值、Agent 使用所属市场身份与工具前缀、连接器无 iframe、URL／JSON 校验、授权失败与重试、刷新恢复、断开、编辑删除、账号／空间范围、存储失败保留输入、过期权限重检、并发写入冲突、390／768／1440px 和键盘焦点；另有原生登录 320px 及现有 Agent／单团队回归。

## 单团队测试修正补充

本轮仅修改测试和测试说明，未修改产品业务规则、PRD 保存机制或冻结 HTML 原型。

- 正常、到期、取消订阅的团队均占用唯一成员资格；菜单禁用再次创建、邀请禁用接受，直达创建页面也不能生成订单。
- 拒绝第二团队后检查原邀请状态、订单、个人余额不变；无团队账号可首次创建或加入，刷新后仍只有个人区与唯一团队区。
- 国内、海外独立执行上述检查，验证所属市场账号不变、拒绝操作不写入另一市场。
- 客户示例使用两个独立账号场景；设备、闪念、上传、录音及 Agent 使用个人区与唯一团队区验证归属和权益隔离。
- 新增 `accountWithoutTeam()` 测试夹具；历史多团队资料兼容测试明确标注用途，不借此放宽当前创建／加入流程。

本轮证据：`artifacts/markets/verification/account-rule-tests.log`（33 项）、`account-rule-regression.log`（85 项）、`account-rule-check.log`（检查）；两组测试有重叠。

## 全量回归的既存问题

没有删掉或跳过失败测试来宣称全量通过；也没有修改旧规则以迎合旧断言。本轮已修正当前 React 测试中创建／加入第二团队的成功预期，以及客户示例、设备归属、闪念、团队权益、定价、上传与录音用例中隐含的多团队前置状态。保留明确标注 `legacy data compatibility` 的历史资料兼容夹具，冻结 HTML 原型的回归规则不用于当前产品验收，详见 `tests/README.md`。

以下旧套件还需要专门迁移到有效基线，已有对应失败在修改前提交复现：

| 套件 | 既存问题 | 对应基线 |
| --- | --- | --- |
| account-sharing-model / account-sharing-ui | 仍调用已撤下的类型共享开关，或期待管理员看不到团队内容、移除后保留团队绑定 | ACCESS-01 / SHARE-01 / REMOVE-01 |
| customer-demo-home | 多团队样例前置条件已修正并验证；剩余布局断言需核对亚像素容差与移动端高度 | UI 规范 |
| customer-schedule-model | 移除后的资料归属预期与当前移交行为不一致 | REMOVE-01 |
| demo-week-model | 按日期生成的样例与旧精确快照不一致 | 演示数据维护 |

单团队规则专项已通过；未运行其他旧权限、设备操作、日期快照和布局用例来宣称全仓库已通过。当前新增功能通过专项验证，但不能据此宣称全仓库 CI 或正式发布门槛已通过。完整回归仍有未运行用例，以上清单不是全仓库问题穷举。证据日志存于静态交付目录的 `verification/`。

## PM 接手事项

1. 在 `spc/modules.json` 填入真实模块负责人，确定账号／工作区／权限主责。
2. 确认两地正式品牌色、登录与支付渠道、币种价格、Credits 参数及 Agent 服务配置，再更新对应配置 revision。
3. 本次 UI／协议仍为本地模拟；真实账号、账务与服务隔离由后端实施。
4. 在正式合入／部署前处理上述历史测试迁移并完成全量回归。

交付包须以静态 HTTP 服务打开，不能直接用 file://。包内 manifest 记录市场、账号域、源码提交、工作区有修改、PRD／规则／配置版本。根目录下的 package-smoke.json 记录两包独立验证结果。
