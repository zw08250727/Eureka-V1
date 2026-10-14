# 联系人卡片标签、创建时间与共享位置

来源：用户截图与确认要求，国内／海外同步。主责为通讯录／个人资产，负责人及联合评审人待认领，关联账号／工作区权限模块。规则 CONTACT-CARD-01：卡片隐藏“示例客户”标签；创建日期显示为“创建时间：YYYY-MM-DD”并右下对齐；有权限的共享按钮置于右上角。

## 组件与影响

复用 ContactsPage、ContactTag 与现有共享按钮，仅修改卡片 JSX 和 contacts-controls.css 的模块样式。两地个人／团队共用结构，各自继承主题；共享标题行预留操作空间，长名称可截断，底部其他自定义标签仍保留。无新增组件、设计变量、存储操作或检查例外。ContactsPage 现有文件超过 500 行，本轮只调整卡片两行展示，不扩大职责或进行无关拆分。

上游为已有联系人记录和共享权限，下游为列表卡片。示例数据原始标签保留，以兼容既有演示资料识别；用户数据不迁移、不删除。缺失创建日期仍显示“时间未记录”。MARKET-01、SPACE-01、ACCESS-01、SHARE-01、EXPIRE-01 不变，遵守 FE-01～FE-10；其他成员不能代共享，团队只读时按钮仍禁用。已有列表空态、加载、错误恢复及共享保存流程沿用。

## 验收与回滚

入口：`/cn/workbench/?view=contacts` 与 `/global/workbench/?view=contacts`；团队加 `&space=team-eureka`。

Given 两地个人／团队的联系人列表，When 查看不同屏宽，Then 无“示例客户”标签，创建时间在右下角，共享在右上角且不遮挡名称；点击共享仍打开同一联系人的授权弹窗。其他自定义标签、成员归属、来源及已有日期保持。

`npm run check`、`npm run build` 均通过；`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/e2e/my-customers-ui.spec.ts --grep 'cn:|global:'` 4 项通过。另以本机 Chrome 核对两地个人／团队、390／768／1080／1440px 的卡片位置、无横向溢出和无标题遮挡，以及共享授权弹窗可正常打开、取消；截图位于 `test-results/contact-card/`。人工产品验收待用户，未发布。回滚仅恢复这次 JSX／CSS 展示修改，无数据回滚或待确认参数。
