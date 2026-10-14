# 添加联系人移除 CRM 导入标签

来源：用户确认移除截图中“添加联系人”表单的“CRM 系统导入”标签，国内／海外同步。模块主责为通讯录／个人资产，负责人及联合评审人待认领；关联账号／工作区与连接器模块。

## CONTACT-ADD-01 · 范围与实现

两地个人／团队共用 ContactDialog，添加方式仅保留“手动创建”和“手机通讯录导入”，默认手动创建。移除 CRM 选择器、预览、专用隐藏字段及本地状态；复用现有 Select、表单和弹窗行为，两项使用现有 flex 布局等宽展示。无新增组件、主题变量或架构例外，颜色继续继承各市场主题。

入口为 `/cn/workbench/?view=contacts`、`/global/workbench/?view=contacts`，团队加 `&space=team-eureka`。上游仍为当前工作区与用户输入，下游仍为既有 onSave 和联系人存储。列表“导入 CRM”说明入口、CRM 来源筛选、已有数据及 CRM 字段优先规则保持；不涉及企业独立域。MARKET-01、SPACE-01、ACCESS-01、SHARE-01 和 EXPIRE-01 不变，工程遵守 FE-01～FE-10。

手动创建校验、失败保留输入、取消不保存、手机导入幂等、只读禁用均沿用现有流程；此次没有新增异步加载或空目录状态。旧验收中的 CRM 标签切换改为手机导入，依据本规则，CRM 模型验收仍保留。

## 验收与回滚

- Given 国内／海外登录后个人及团队区，When 打开添加联系人，Then 仅有手动与手机两项，默认手动，CRM 表单不存在。
- Given 手动创建或手机示例导入，When 保存、刷新或重复导入，Then 创建结果保留且同一手机来源不重复创建。
- Given 390／768／1080／1440px，When 切换手机导入并按 Esc，Then 按钮可见、弹窗无横向溢出、关闭后焦点返回入口。
- 检查与构建：`npm run check`、`npm run build` 均通过；定向浏览器验收：`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/e2e/my-customers-ui.spec.ts --grep 'cn:|global:'`，4 项通过。默认 Playwright 浏览器未安装，改用本机 Chrome 完成验证。
- 截图：`test-results/contact-add/`，覆盖两地个人／团队及四种宽度；已查看国内桌面、海外团队窄屏截图，标签布局与内容正常。人工产品验收待用户，未发布。
- 回滚仅撤回本次组件与验收修改，不迁移或删除任何联系人数据。无待确认业务参数。
