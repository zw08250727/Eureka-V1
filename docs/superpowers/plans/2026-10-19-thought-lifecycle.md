# 闪念、日程与待办优化实施计划

> 本轮在当前 `codex/quick-schedule-tasks` 分支内执行用户已明确的两地需求，复用现有 React 工程、市场存储、权限和弹窗；不包含远程发布。

**Goal:** 国内／海外、个人／团队五类记录支持编辑态确认删除、原始捕获音频，以及一致的录音模式展示。

**Architecture:** 个人记录仓库负责删除、版本冲突与权限复检；编辑组件只编排确认流程。共享录音模式模型与图标供个人列表、团队列表和会议详情复用。来源标签由同一映射提供，额外来源维度仅提出建议。

**Tech Stack:** Next.js、React、TypeScript、Playwright。

- [x] 在 `tests/cn-model/thought-lifecycle.spec.ts` 验证删除持久化、旧快照拒绝、共享只读和到期权限；先运行观察缺失删除方法的失败。
- [x] `personal/store.ts` 增加动作／闪念 remove，重检归属、版本与可写权限，保留内部删除标记防止示例补充与旧编辑复活；所有查询过滤删除记录，无恢复入口。
- [x] 抽 `personal/asset-delete-dialog.tsx`，复用 ReferenceDialog，取消不丢草稿、失败保留确认、成功再关闭编辑并刷新。
- [x] 抽 `personal/capture-audio.tsx` 与音频来源模型，供三类闪念、动作弹窗及独立详情复用；仅明确示例 ID 使用样本，缺失／无效真实资源不回退样本。
- [x] `meetings/recording-mode.ts`、`recording-mode-icon.tsx` 统一环境／通话规则。为明确演示 ID 配置通话样例；缺省环境，非法设备来源不允许通话。
- [x] 更新个人与团队列表及详情；个人移除创建人列并对齐九列 CSS。
- [x] 统一来源文案并在交付文档记录现有枚举、Agent 入口边界和后续拆分建议。
- [x] 运行 `npm run check`、`npm run build`、新增及受影响 Playwright 用例，两地桌面／移动端截图验证。5项新增模型、20项相关浏览器用例通过；旧 `personal-thought-routing` 两项权限断言冲突单独记录，不计为通过。

适用规则：MARKET-01、SPACE-01、ACCESS-01、SHARE-01、EXPIRE-01、FE-01～FE-10、UI-DENSITY-05。权限与共享策略保持现有规则。新增规则编号 THOUGHT-DELETE-01、THOUGHT-AUDIO-01、RECORDING-MODE-01、PERSONAL-LIST-01 由本轮用户需求定义，尚不代表人工联合评审或已合入。
