# Airwallex 官方沙盒 Checkout 本地服务

本轮目标：在现有工程内提供可本地运行的后端，按月付／年付生成官方 Hosted Billing Checkout URL。前端不绘制替代支付页。服务固定使用 `https://api.sandbox.airwallex.com`，不支持生产扣款。

## 启动

需要 Node.js >= 22.13。无需新增依赖。

1. 本地配置文件为 `.env.airwallex.local`，已被 `.gitignore` 忽略。首次安装可用 `cp .env.example .env.airwallex.local`；不要覆盖已有配置。
2. 填写 `AIRWALLEX_API_KEY`、`AIRWALLEX_SUCCESS_URL`、`AIRWALLEX_BACK_URL`。Key 仅填入本地文件。成功和返回地址按官方要求填写项目公开可访问的 HTTPS 页面（可使用自己控制的开发隧道网址）。本服务不创建公开隧道、不承诺 localhost 回跳地址被 Airwallex 接受。
3. 如有多个收款账户，填写 `AIRWALLEX_LINKED_PAYMENT_ACCOUNT_ID`。
4. 两个终端分别运行：

```sh
npm run dev:airwallex
npm run dev
```

配置修改后重启后端。前端默认请求 `http://127.0.0.1:3101/api/airwallex/checkouts`。更改端口时，在 Next.js 的 `.env.local` 设置 `NEXT_PUBLIC_AIRWALLEX_CHECKOUT_API` 并重启前端；该变量只包含本地接口地址，不得包含密钥。

```sh
curl http://127.0.0.1:3101/health
```

响应 `ready: false` 时，`missing` 给出缺失配置名称。配置齐全不代表网络和凭证验证通过；只有成功创建 Checkout 才证明该链路可用。

已预填的沙盒资源：

| 配置 | 值 |
| --- | --- |
| Client ID | `-SKsRMNmQMmVW92h7Du0Ow` |
| Legal Entity ID | `le_KD4_aWnoPxOWAoHDucwRGg` |
| 年付 Price ID | `pri_sgpvxj9q6hncetv8e7k` |
| 月付 Price ID | `pri_sgpv4vrlshncesbtjk6` |
| 关联商品（参考，不随 Checkout 请求发送） | `prd_sgpv4vrlshnceq4xng5` |

## 创建官方链接

```sh
curl http://127.0.0.1:3101/api/airwallex/checkouts \
  -H 'Content-Type: application/json' \
  -H 'X-Eureka-Checkout: 1' \
  -d '{"requestId":"d8ec585b-d5a6-4dc1-9380-c379f7d8ad15","market":"global","workspaceId":"team-eureka","actor":"zhang","cycle":"year","quantity":1}'
```

新的一次购买使用新的 UUID；同一次不确定失败重试应保留原 UUID 和全部参数。`cycle` 为 `month` 或 `year`，`quantity` 为本次测试的席位数（1–50）。已有团队新增一席的体验默认测试 1；新建团队的最少 2 席规则仍由正式开通流程负责。

成功返回 `{id, url, status, expiresAt}`，在浏览器打开 `url` 即进入 Airwallex 官方页面。URL 来自上游响应，不拼接商品 ID 或后台商品目录地址。有效期以响应的 `expiresAt` 为准；到期重新创建，不能作为永久商品链接。官方教程描述一小时，但本次沙盒实际返回了更长的期限，代码不把文档期限硬写为上游结果。

本地服务依次调用：

- `POST /api/v1/authentication/login`，通过服务端 `x-client-id`、`x-api-key` 获取 token。
- `POST /api/v1/billing/billing_checkouts/create`，传入 `mode: SUBSCRIPTION`、`ui_mode: HOSTED`、循环 Price ID、数量、回跳地址及演示工作区归属。

API Key 需有 Billing Checkouts 写入权限；查询还需读取权限。不在日志、接口响应或前端中返回 API Key、access token 或上游原始错误页。

## 查询真实沙盒结果

```sh
curl 'http://127.0.0.1:3101/api/airwallex/checkouts/替换为创建响应中的ID' \
  -H 'X-Eureka-Checkout: 1'
```

返回官方 `status`、`subscriptionId`、`completedAt` 和 `expiresAt`。仅允许查询本次服务进程创建的 Checkout；服务重启后请从 Airwallex 后台查已有记录。状态接口自身不写浏览器数据；前端仅在接口返回 COMPLETED 且有 subscriptionId 时完成原订单。成功回跳不等于经核验的支付成功。

## 前端入口与边界

在 `http://localhost:3000/global/workbench/?view=subscription&space=team-eureka&actor=zhang` 登录后点击「增加席位」，或从团队成员邀请弹窗点击同名入口。邀请入口前往订阅页自动打开数量弹窗；选择数量→确认订单→点击确认，在独立窗口打开官方域名。原页每 3 秒查询服务端状态，最多持续 30 分钟。核验完成后关闭采购窗口并显示原成功弹窗，幂等更新本地演示席位及参考价账单。期间禁用重复支付、修改和取消；未支付关闭窗口会保留订单，重试复用 sessionStorage 市场适配器保存的 requestId。切换页面或卸载停止核验；刷新后可通过待支付订单继续。

本地 `localhost`／`127.0.0.1` 下的 `/global/` 默认启用该路径。线上静态包只有在构建时提供 `NEXT_PUBLIC_AIRWALLEX_CHECKOUT_API` 才启用托管沙盒服务；未配置时继续原演示行为，也不会请求访客本机。服务校验 Host、浏览器 Origin、JSON 请求类型和自定义请求头；允许的前端 Origin 通过 `AIRWALLEX_ALLOWED_ORIGINS` 配置，Render 主机名由平台的 `RENDER_EXTERNAL_HOSTNAME` 自动加入。国内和无市场历史路径不启用。不接受前端金额、Price ID、回跳地址或 API 地址覆盖。Render 部署见 [airwallex-render.md](airwallex-render.md)。

这是开发与评审使用的沙盒工具，不是多用户生产后端。`actor`／`workspaceId` 仅作为沙盒测试归属记录，不视为真实服务端身份授权。`SUBSCRIPTION` 会创建新的沙盒测试订阅，**不是更新原 Team 订阅数量**。原订阅加席、生产席位发放、Webhook 与生产认证不属于本期交付。演示页面旧价格标记为参考价，官方 Checkout 金额按沙盒 Price ID 决定；演示账单不冒充生产实付账单。

## 排错与验证

- 503：本地配置缺失或回跳地址格式无效。
- 502 + HTTP 403：请求已到官方网络链路但被拒绝；检查网络出口及沙盒权限。创建本地后端不会自动消除此前的 403。
- 502 + HTTP 401：检查沙盒 Client ID 与 Key 是否配套。
- 409：同一 UUID 参数发生变化或官方返回的会话已过期，重新发起购买。
- 超时：保留原 requestId 重试，不立即换 UUID。若上游提示重复请求，应先在 Airwallex 后台核对，避免重复创建。
- 服务重启会清除本地重复请求缓存；上游仍收到相同 request_id。该缓存不作为持久化订单或支付账本。

```sh
npm run test:airwallex
npm run typecheck:airwallex
npm run check
npm run build
```

服务测试使用上游 HTTP 响应替身，验证请求契约、隔离与错误分支，不代表官方沙盒成功支付。真实链路验收需要有效 Key、公开回跳页与可达的 API。

模块主责：订阅／订单（待认领），依赖账号／工作区模块。关联规则：MARKET-01、ACCESS-01、ASYNC-01、FE-04、FE-08。复用订阅页与邀请弹窗的既有按钮／错误样式；新增共享请求 Hook 与独立服务。回滚可移除本地入口分支并停用服务，不删除或迁移浏览器资料。

官方依据：[Hosted Billing Checkout](https://www.airwallex.com/docs/billing/billing-components/checkout/hosted-billing-checkout)、[Billing Checkouts API](https://www.airwallex.com/docs/api/billing/billing_checkouts/api)、[API Access Token](https://www.airwallex.com/docs/api/authentication/api_access_token)。

## 本次验收（2026-10-19）

- 8 项服务测试、独立服务类型检查、全项目检查及静态构建通过。
- 海外订阅页和邀请弹窗均已验证请求本地服务、失败保留原页面；国内仍打开原席位表单。
- 使用用户此前提供的沙盒凭证，实际认证成功；首次创建返回 `subscription_data must be provided`，补齐 `subscription_data: {}` 后创建成功。
- 真实创建的 Checkout ID：`bco_sgpv7n7nxhncgrevunn`，查询返回 `ACTIVE`，尚未支付，未创建本地席位或账单。
- 本地忽略配置的临时成功／返回地址使用已验证 HTTP 200 的项目公开海外工作台：`https://zw08250727.github.io/Eureka-V1/global/workbench/?view=subscription&space=team-eureka&actor=zhang`。它返回公开部署，不会同步本机浏览器资料。
- 工作台「增加席位」已实际跳转至 `checkout.sandbox.airwallex.com`；官方页面显示 EurekaMind Team Seat、1 席、年付 $149.99 USD。
- 官方支付页的测试支付由用户继续；本轮未执行付款。

## 确认弹窗衔接验收（2026-10-19）

复用现有 WsDialog / CheckoutDialog、ws-steps、ws-order 与语义主题；宽度、padding、字号和间距保持现有弹窗 CSS，不新增视觉系统。来源为用户提供的确认／成功截图及 SPC；新增等待、窗口被拦截、未支付关闭、核验失败状态。国内与未配置托管 API 的静态部署保留原支付模型。

- 实测选择总席位 8（原有 6），确认后原页保留，官方窗口显示 2 × $149.99 = $299.98。
- 关闭未支付窗口后保留待支付订单，无席位发放。
- 在独立自动化浏览器中拦截状态请求返回 COMPLETED + 测试 subscriptionId，验证成功弹窗及 6→8 更新；这是成功分支测试，未向官方提交付款。
- 全项目 check 通过。实际沙盒支付后的核验仍需用户完成付款后验收。
- 公共 HTTPS 回跳仍可在采购窗口短暂出现；原工作台通过状态查询关闭该窗口。浏览器可能限制自动聚焦，可手动切回原工作台。没有嵌入第三方 iframe。

## 个人 Credits 两步充值（2026-10-19）

本地海外个人区顶栏 Credits → 充值：只保留选择套餐、充值完成两步；确认充值直接打开官方沙盒窗口。复用 AccountExperience 的套餐卡、进度条、成功面板及共享结账 Hook，不新增视觉系统。国内充值保持原流程；海外团队充值已在后续迭代接通同一流程。

接口新增可选 kind：省略/seat 仍为席位 SUBSCRIPTION；credits 支持个人与团队工作区、quantity=5/10/15（千 Credits 份数）。服务端转换为原始 Credits 数 5000/10000/15000，使用 PAYMENT + invoice_data 和 pri_sgpv4vrlshncgozq53w；该价格本身 lot.size=1000，不能把份数 5 直接当作上游 quantity。可选 AIRWALLEX_PRICE_CREDITS 仅配置在服务端。

原页面等待服务端查询官方状态，COMPLETED 后使用原模型幂等完成订单并更新发起个人区余额，随后显示成功页。关闭未支付窗口保留套餐，可重试；后端失败展示错误，不增加余额。不依赖公开回跳页参数判断支付成功。刷新或关闭原页会停止核验，返回相同套餐可复用订单与 requestId 继续；本地后端重启仍受内存 Checkout 缓存边界限制。

验证：9 项后端测试、工程 check 通过。真实官方沙盒结账页显示 Pay for EurekaMind Credits、5000 × $9.99/1000 Credit、$49.95，未提交付款。独立自动化浏览器通过拦截状态接口注入 COMPLETED 验证成功页及余额 3000→8000；这是成功分支测试，不代表实际沙盒付款完成。适用 MARKET-01、ASYNC-01、FE-08；生产账务和 Webhook 不在本轮范围。

## 用户可见错误码

前端不展示上游响应中的 error/message 或异常原文。显示简短提示及 PAY-* 错误码：WINDOW（窗口被拦截）、ORDER（订单校验）、STORAGE（本地持久化）、CONNECT（创建请求连接失败）、CREATE-HTTP状态（创建接口失败）、RESPONSE（响应无效）、VERIFY[-HTTP状态]（核验失败）、APPLY（核验成功但本地入账失败）、EXPIRED（结账取消或过期）、PENDING（等待核验超时）。请求超时追加 -TIMEOUT。核验及入账失败提示“支付结果待确认”，不误报未付款。

## 团队账单历史与周期说明（2026-10-19）

订阅卡移除公司、邮箱、支付方式的账单信息区域，取消／恢复自动续费操作留在订阅卡。切换周期确认及待生效提示明确：当前到期日生效，下期席位数（若有减席使用 pendingSeats）× 对应周期每席位价格 = 周期总价，税费另计；当前账期保持不变。周期变更仍沿用本地演示计划，不调用远端 Subscription 更新接口。

海外账单历史调用 GET /api/airwallex/invoices?market=global&workspaceId=...，服务端读官方 Checkouts，以 legal_entity_id + metadata.market/workspace_id 筛选其 subscription_id，再关联 Invoice。使用官方 number、total_amount、currency、payment_status/status、pdf_url，不再展示本地模拟账单。分页沿 page_after → page 获取（20 页保护上限，超限报错不静默截断），不靠商品 ID／邮箱猜测归属，未关联团队返回空列表。仅回传展示字段及官方 HTTPS PDF 链接。前端保留加载、空、错误码、刷新状态，原账单数据不删除。

该工具仍非生产认证后端；静态部署未配置托管 API 时显示 INV-UNAVAILABLE，不回退为模拟账单，配置后从同一 Airwallex 沙盒服务读取。国内保留其账单数据源。正式上线需要服务端登录授权和持久化工作区订阅映射。

验证：10 项服务测试、全项目 check 和类型检查通过；浏览器显示真实 INV-PAS7ZU52-0001 / $149.99 USD / 已支付及官方 PDF 链接。月付确认显示 6 × $19.99 = $119.94/月。复用既有卡片、表格、Badge、Button 和语义样式；新增 AirwallexInvoices 负责数据加载及状态。遵守 MARKET-01、ACCESS-01、FE-08。模块主责订阅／账单，负责人待认领。

## 团队顶栏 Credits 两步充值（2026-10-19）

海外本地团队顶栏入口与个人入口共用两步流程：选择套餐后直接打开官方支付窗口，核验完成后显示充值成功。团队管理员权限、订单所属工作区和余额更新仍由现有模型校验。前端不展示沙盒或服务端技术提示。

验证：10 项后端测试、后端与前端 TypeScript 检查、修改文件 ESLint 均通过。从团队 AI Connections 页面顶栏实际打开官方沙盒结账，15,000 Credits 显示 $149.85；未提交付款。在独立自动化浏览器中模拟状态接口 COMPLETED，验证成功面板与团队余额 37,600→52,600。此状态模拟仅用于验证成功分支，不代表实际沙盒支付完成。

## 个人订阅官方结账（2026-10-19）

海外本地个人订阅确认页移除支付方式选择，点击「前往支付」打开官方 Hosted Checkout；只有 COMPLETED 且返回 subscription_id 才调用原个人订阅模型更新权益。使用独立 personal 类型，限定个人工作区、数量 1，保留取消、重试与原订单幂等逻辑。国内沿用原支付方式。

沙盒新增 EurekaMind Pro 商品 prd_sgpv4vrlshnckc9k787：月付 $17.99 对应 pri_sgpvxj9q6hnckc9rw29；年付 $99.99 对应 pri_sgpvxj9q6hnckca0ule。可用 AIRWALLEX_PRICE_PERSONAL_MONTH / AIRWALLEX_PRICE_PERSONAL_YEAR 覆盖服务端配置。

验证：11 项后端测试、前后端类型检查和相关 ESLint 通过；本地后端实际创建两种周期的官方沙盒 Checkout 均返回 200 和 checkout.sandbox.airwallex.com URL，未提交付款。生产认证、Webhook 与正式部署仍不在此本地沙盒范围。
