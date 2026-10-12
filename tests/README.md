# 测试口径

当前产品验收以 [SPC 有效基线](../spc/business-baseline.md) 为准。

- `ACCOUNT-01`：每个市场账号最多一个 Team；到期或取消订阅不释放成员资格。国内与海外分别执行该限制，不跨市场累计。
- 创建或接受邀请的成功用例从 `e2e/fixtures/workspace-state.ts` 的 `accountWithoutTeam()` 开始。它表示独立测试账号的初始状态，不是产品中删除团队的操作。
- 已有 Team 的用例须验证第二次创建／加入被拒绝，且邀请、订单、个人权益不变。跨工作区归属用个人区与唯一团队区验证。
- `multi-workspace-model.spec.ts` 中名称以 `legacy data compatibility` 开头的用例只验证保留历史资料不被误改；直接加载历史夹具不代表允许通过当前流程新增多团队。
- 访问 `/prototype/one-to-one-reference/` 的测试，以及 `scripts/test-models.mjs` 中读取该目录的测试，属于冻结 HTML 原型回归。例如 `team-workspaces`、`team-exit`、`account-settings`、`team-recording-parity`。其中旧多团队／退出规则不作为当前 React 产品验收口径；保留用于历史追溯。

登录、品牌与企业隔离：`npm run test:markets`（包括 domestic-auth）。登录字段默认不填、协议默认未勾选；验收账号见 `docs/auth-flows.md`。普通市场入口不显示失败注入按钮，测试异常分支时显式使用 `review=1`；历史 `/workbench/` 保留评审工具。

单团队、权益及归属专项：

```sh
PLAYWRIGHT_CHANNEL=chrome npx playwright test --grep 'ACCOUNT-01|RIGHTS-01|SPACE-01'
```

未安装 Chrome 的环境可去掉 `PLAYWRIGHT_CHANNEL`，使用 Playwright 配置的浏览器。专项筛选不改变全量测试配置，也不代表全量通过；完整结果与遗留问题见 [核验报告](../docs/market-split-verification.md)。

国内积分与会员：`npm run test:cn-billing` 包括账务模型、充值和新的积分入口用例。入口覆盖个人免费／付费会员、团队管理员／成员／到期、签到状态同步、升级跳转、焦点归还与 390/768/1440 宽度。积分浮层、账户菜单和移动导航复用同一张卡片，测试使用可见对话框的角色和名称定位，避免命中未展开的 Popover 内容。

AUTH-GUEST-01：`guest-auth.spec.ts` 验证两地默认游客首页、私有入口登录弹窗、关闭/焦点、深链、续接、跨标签退出、市场隔离及短屏。认证相关测试必须先点击“登录 / 注册”，不再将独立登录页当作默认入口。`npm run test:release` 执行国内账务模型与本次市场发布的认证、积分会员、会议、连接器、单团队/Agent 回归；它不代替全仓库历史套件。`npm run test:deployment` 使用 DEPLOYMENT_URL 验收实际发布地址。
