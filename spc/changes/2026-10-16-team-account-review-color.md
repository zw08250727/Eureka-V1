# 评审按钮强调色与海外团队账户浮层

来源：2026-10-16用户截图与明确修改要求。主责：UI张伟；关联国内订阅唐娅、海外订阅鹤飞，海外Credits主责待认领。用户授权本轮实现，尚未发布，不代表人工联合评审完成。

## 变更与边界

- UI-REVIEW-02：两地评审入口使用市场强调色实底／白字，保持右下角位置、44px高度、悬停和键盘焦点；仍仅review=1或历史回归入口显示。
- UI-GLOBAL-TEAM-ACCOUNT-01：海外团队“我的”菜单和移动导航复用TeamCreditsCard，参照国内的团队身份／管理订阅、余额／共享说明、明细／充值布局，保留海外靛蓝和Credits术语。余额、工作区、管理员及到期状态均来自现有模型；不更改个人奖励、计费或权限规则。
- 复用Icon、AiIcon、appUrl、M.creditBalance、M.admin及既有充值事件。新组件仅负责展示和入口，未新增存储。国内继续使用DomesticAccountPoints，海外个人继续使用原CreditsPromo。
- 保持MARKET-01、ACCOUNT-01、RIGHTS-01、ACCESS-01、ASYNC-01；不改国内卡片、冻结原型、生成CSS或市场报价。

## 验收证据

`npm run check`、`npm run build`通过。Chrome验收国内／海外1440、1080、768、390px（高度900）共8组，卡片无横向溢出，按钮配色正确；已查看桌面及移动截图。

海外管理员的管理订阅、Credits明细保留global及team-eureka归属；充值打开现有充值浮层并关闭账户菜单。成员不可充值／管理订阅；过期管理员可续费、不可充值；个人区保留原签到卡片。无页面脚本错误。

临时浏览器脚本`/tmp/eureka-team-account-verify.cjs`、日志`/tmp/eureka-team-account-verify.log`、截图`/tmp/eureka-*-team-account-*.png`及`/tmp/eureka-*-review-color-*.png`。到期验证仅在隔离测试浏览器修改测试数据，未操作用户数据或真实支付。

回滚仅撤回新TeamCreditsCard、CreditsPromo海外团队分支及评审按钮配色。保留上一轮弹窗自适应／悬浮入口和此前PRD拆分。

## 发布授权

2026-10-16用户明确要求“以上发布”，本次范围包括PRD 1.6及国内／海外专项拆分、团队开通自适应弹窗、悬浮评审入口与强调色、海外团队账户浮层。发布使用现有Pages工作流的市场验收分支，执行test:release（不跳过市场验收）。线上完成状态以对应Actions运行及部署后核对为准。

发布回归补充：发现评审按钮覆盖联系人Agent发送入口，UI-REVIEW-02增加Agent面板打开时上移到输入区上方（底部168px）的避让；普通页面仍为右下角24／16px。保留原发送功能测试。single-team-agent中的PRD版本断言由1.4更新为已确认1.6，并增加51章节、国内6／海外7专项章节断言，Agent断言同步为MARKET-01下的“每个市场内只有一个Agent”，其余共享业务断言保持。
