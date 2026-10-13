# 百智 / EurekaMind · 国内／海外交互原型

React + Next.js App Router + TypeScript。一个共享业务基线，两套独立账号与数据的市场原型。每个市场内，个人与团队共用该市场账号；国内与海外互不通用。

## 运行与入口

```sh
npm install
npm run dev
```

| 路径 | 内容 |
| --- | --- |
| `/` | 一级演示评审分流 |
| `/cn/` | 百智首页；需账号的操作打开版本卡片，再进入百智个人／团队或百销企业登录弹窗 |
| `/cn/login/` | 个人／团队独立登录页，续接原操作 |
| `/cn/enterprise/login/` | 企业代码定位与成员独立登录页 |
| `/cn/enterprise/` | 企业工作台，企业成员独立登录 |
| `/global/` | EurekaMind 首页；需账号的操作唤起登录注册覆盖层 |
| `/cn/workbench/`、`/global/workbench/` | 对应工作台；未登录私有深链显示游客首页与登录覆盖层 |
| `/review/` | 两地配置差异、模块主责与依赖、评审检查项 |
| `/prototype/prd/index.html` | 集中 PRD 的阅读与编辑发布网站 |
| `/workbench/` | 历史无市场数据的回归入口，不作为新交付入口 |

国内采用百智线上黑白灰与亮蓝组件主题，海外保留靛蓝色主题。邮箱及渠道登录、支付、Agent、连接器、设备均为本地模拟，不访问真实服务。每个市场使用一套演示人物；并非生产认证或真实多用户后台。

本轮登录流程、企业测试账号、服务模拟边界详见 [登录流程与验收数据](docs/auth-flows.md)。评审辅助操作使用工作台 URL 参数 `review=1`，普通流程不显示评审说明或失败注入工具。

## 当前有效规则

详见 [SPC 有效业务基线](spc/business-baseline.md)。一个市场账号保留一个个人工作区，最多加入或创建一个 Team；Team 到期不释放资格。个人与团队权益独立，不冻结个人权益。管理员管理本团队内容，个人区独立；管理权不等于代共享权。会议、联系人、日程、待办逐条只读共享；灵感、记账、其他按本人在当前区的类型共享。移除成员时移交团队资料并解绑、清空本区设备（真实硬件需确认）。异步任务和支付锁定发起归属且幂等。

旧说明已归档至 [历史 README](docs/history/README-before-markets-20261012.md)，不作为当前规则。`src/prototype/one-to-one-reference` 为冻结历史基线；不要依据旧模型测试重新引入被替代的产品规则。

## PM 交接与 SPC

先读 [spc/README.md](spc/README.md)，包含 UI、前端组件、业务基线和协作规范。主责及依赖维护在 `spc/modules.json`，负责人尚待认领。共用规则由模块 PM 和关联负责人联合评审。

后续迭代执行已确认的 [前端研发规范](spc/frontend.md)：PM 原型进入现有 React 工程，不新增独立 HTML 产品页。两地分别遵守 [国内 UI](spc/ui-cn.md) 和 [海外 UI](spc/ui-global.md)，共用组件与尺度；新规范目标按模块渐进落地，不表示旧页面已全部改造。需求交接使用 [PM 模板](spc/pm-change-template.md)。

## 代码与配置

- `src/features/markets/`：国内、海外独立配置、路由识别、存储适配、登录门禁和主题。
- `src/features/connectors/`：React 连接器目录、卡片、授权演示及自定义配置；不再使用 iframe。
- `src/features/`：个人、团队、会议、日程、订阅、Credits、Agent 的共享交互与模型。
- `src/components/ui/`：共享控件；新增模块遵循 SPC。
- `src/prototype/prd/`：现有 PRD 站点、内容及配图。

两地价格、额度和费率独立配置。国内积分充值与专业版会员已按线上核实为人民币及微信／支付宝；其余会员档位、团队人民币价格仍待确认，海外保持既有 USD 配置。来源及边界见 [国内积分与会员对照](docs/baizhi-billing-reference.md)。Agent 身份、MCP／Skills 与连接器目录分别配置。金额不是汇率换算结果。

浏览器资料通过 `marketStorage` 以市场命名空间保存，两个登录态独立。旧未隔离存储不自动迁移、清空或复制。切换市场使用固定入口；切换个人／团队不改变市场。真实服务隔离需后端身份、授权与账务系统实施。

## 检查与交付

```sh
npm run check          # ESLint、类型、历史模型及 SPC 结构检查
npm run check:architecture # HTML、组件依赖、存储与历史基线门槛及其测试
npm run build          # 静态导出到 out/
npm run test:markets   # 两地端到端、隔离、连接器及规范相关验收
npm run test:e2e       # 全量浏览器与当前模型回归
npm run package:markets # 构建并生成两地独立静态包
```

`artifacts/markets/` 输出国内 `baizhi-cn.zip`、海外 `eurekamind-global.zip`、对应目录及发布 manifest。包须通过 HTTP 静态服务访问，不使用 file://。每包根路径进入该市场首页，两包分别带完整资源；仍保留原 React 工程维护。GitHub Pages 路径前缀由 `NEXT_PUBLIC_BASE_PATH` 注入。

`develop` 是当前 Pages 发布分支，`main` 为稳定分支；新修改使用 `codex/<module>-<change>`，通过相关检查后合入。不要提交环境密钥、依赖目录和运行缓存。
