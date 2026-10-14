# 团队首页去除重复斜箭头

来源：用户要求评估团队首页闪念模块过多的斜向上箭头并执行简化。主责为团队首页，负责人及联合评审人待认领；覆盖国内／海外团队工作概览。

## UI-TEAM-LINK-09

站内导航和当前页面的 Agent 操作使用文字入口即可。移除“全部闪念”“日历”“全部”“查看”“问问 Agent”后的 `↗`，展开后的会议来源链接也去掉同类符号；保留“查看会议依据”的折叠／展开三角、aria-expanded 和 aria-controls。沿用原链接悬停下划线、按钮悬停与键盘焦点反馈，不添加替代装饰图标。

复用 TeamOverview、PrivateOverview、既有链接及按钮，没有新增组件、样式、依赖或数据变更。所有 href、回调、权限和可访问名称保持；上游仍为原团队记录和洞察，下游日历、闪念列表、会议详情和 Agent 流程保持。MARKET-01、SPACE-01、ACCESS-01、SHARE-01、EXPIRE-01 不变，遵守 FE-01～FE-10；空状态、失败、只读及恢复沿用原流程，无数据迁移。

## 验收与回滚

入口：`/cn/workbench/?view=home&space=team-eureka`、`/global/workbench/?view=home&space=team-eureka`。

Given 团队首页，When 浏览并使用文字入口，Then 没有重复斜箭头，站内导航、Agent 和会议依据展开功能可用，悬停和焦点反馈保留。`npm run check`、`npm run build`、`git diff --check` 通过。Chrome 验收两地 390／768／1080／1440px 布局无横向溢出；五个导航入口的悬停下划线、键盘焦点及 Enter 跳转通过，市场／团队归属保持；会议依据展开、会议详情跳转和问问 Agent 上下文面板通过，无浏览器脚本错误。已核对两地桌面及窄屏截图。

本地交付，未发布；人工验收待用户。回滚两个组件的链接／按钮文本即可，无数据回滚。
