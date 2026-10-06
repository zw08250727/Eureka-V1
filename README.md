# Eureka

EurekaMind 团队工作台交互原型，采用 Next.js App Router 作为工程入口，原型页面和资源按模块收纳在 `src/prototype/`。

## 本地运行

```bash
npm install
npm run dev
```

访问 <http://localhost:3000>，进入登录 / 注册演示；完成后直接进入个人工作台首页，无用途问卷或信息收集步骤。

## 质量检查

```bash
npm run check       # ESLint、TypeScript、原型资源引用和模型测试
npm run build       # 生产构建
npm run test:e2e    # Playwright 浏览器测试（需先安装依赖）
```

原型自身的模型测试位于 `src/prototype/one-to-one-reference/tests/`，覆盖联系人、应用数据筛选排序、编辑权限、团队数据隔离和导出行为。

## 目录约定

- `src/app/`：Next.js 工程入口和页面壳层
- `src/prototype/`：最终交付的 HTML 原型、样式、脚本、素材和模型测试
- `scripts/`：原型资源准备、静态引用检查和测试入口
- `docs/prototype-import.json`：纳入仓库的原型文件校验清单
- `.github/workflows/ci.yml`：提交和 Pull Request 的自动检查

## 分支策略

- `main`：可交付稳定版本
- `develop`：日常集成和下一轮迭代
- `feature/<name>`：功能开发
- `fix/<name>`：问题修复

本仓库只提交脱敏的原型代码与资源，不提交 `.env`、构建缓存、依赖目录或本地运行产物。

## Team 工作空间演示（2026-10）

从左上角工作空间菜单进入，账号保持统一：

- 个人空间：保留现有会议、闪念、联系人与 Agent。个人订阅独立于 Team。
- EurekaMind 产品团队：管理员场景，演示成员邀请/接受/撤销、角色管理、席位、账单、设备、AI 积分与空间设置。
- 设计共创空间：普通成员场景，只能访问自己创建或被分享的文件。
- 工作空间邀请：接受「增长研究小组」邀请后，新增一个独立团队。
- 创建团队：方案 → 空间信息/席位/周期 → 模拟支付（支持失败重试）→ 开通/邀请成员。

Team 只使用一种 Unlimited 席位；邀请占席，移除成员释放席位但不自动减账单；加席立即生效，减席与周期切换安排到下一账期，可通过「模拟下一账期」验证。管理员可以管理成员与设备元数据，但不会获得成员私有录音的访问权。设备可模拟 App 重新绑定，切换空间不会改变同步目标。跨空间资料通过导出/导入 JSON 创建独立私有副本，兼容原会议详情导出的演示 JSON。

EurekaMind 独立采用 Team AI 积分池：Agent 分析每次扣除 200 演示积分，空资料不扣费；与成员转写权益、个人空间积分分别记账。团队页面底部可切换演示成员视角验证权限。该入口仅用于本地原型测试，不代表实际身份切换或服务端授权。

数据模型：`assets/workspace-model.js`；界面：`assets/workspace-ui.js` / `.css`。新增状态保存在 localStorage 的 `eureka:workspaces:v2` 中，不覆盖旧团队原型或个人会议存储。付款、邀请邮件、设备通信和 Agent 均为本地模拟；下载的账单不是有效发票。所有价格为 EurekaMind 演示假设。生产环境仍需接入身份认证、租户级授权、支付和设备服务。

参考：实际访问 [Plaud Web](https://web.plaud.ai/) 与 [团队方案页面](https://web.plaud.ai/member/workspace/plan?from=profile_dropdown)，并核对 [工作空间](https://support.plaud.ai/hc/en-us/articles/57744144794393-What-is-a-workspace)、[席位规则](https://support.plaud.ai/hc/en-us/articles/57744114159641-What-is-a-seat)、[设备绑定](https://support.plaud.ai/hc/en-us/articles/57674058082841-Device-management) 官方说明。参考其账号与空间边界，UI 沿用 EurekaMind 现有设计。
