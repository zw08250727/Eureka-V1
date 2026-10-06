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

团队首页围绕会议展开：连续的 Agent 团队简报（内容与数量由实际发现决定，同一议题合并叙述）、可核对的会议原文与完整会议列表。不展示个人日程、待办、灵感、记账和全部闪念，也不提供独立「团队文件」或通用文件管理入口。团队会议保留个人列表字段并增加创建成员，复用六页签详情、播放器、原位编辑、导出、成员分享、回收站和页面内 Agent。联系人复用完整关系档案、备注、跟进与 Agent。默认产品团队有 12 条录音（张伟视角可见 11 条）及 4 位联系人；旧数据增量补齐，新建团队保持空态。

Team 只使用一种 Unlimited 席位；邀请占席，移除成员释放席位但不自动减账单；加席立即生效，减席与周期切换安排到下一账期，可通过「模拟下一账期」验证。管理员可以管理成员与设备元数据，但不会获得成员私有录音的访问权。设备支持手动录入 SN、型号并绑定成员：管理员可选团队有效成员，普通成员仅本人；重复 SN 拒绝，长数字与前导零按文本保留。原设备申请 / 发放入口已替换，历史设备保留。已有本人设备可模拟 App 重新绑定，切换空间不会改变同步目标。跨空间资料通过导出/导入 JSON 创建独立私有副本，兼容原会议详情导出的演示 JSON。

EurekaMind 独立采用 Team AI 积分池：Agent 分析每次扣除 200 演示积分，空资料不扣费；与成员转写权益、个人空间积分分别记账。团队页面底部可切换演示成员视角验证权限。该入口仅用于本地原型测试，不代表实际身份切换或服务端授权。

数据模型：`assets/workspace-model.js`；界面：`assets/workspace-ui.js` / `.css`。新增状态保存在 localStorage 的 `eureka:workspaces:v2` 中，不覆盖旧团队原型或个人会议存储。付款、邀请邮件、设备通信和 Agent 均为本地模拟；下载的账单不是有效发票。所有价格为 EurekaMind 演示假设。生产环境仍需接入身份认证、租户级授权、支付和设备服务。

参考：实际访问 [Plaud Web](https://web.plaud.ai/) 与 [团队方案页面](https://web.plaud.ai/member/workspace/plan?from=profile_dropdown)，并核对 [工作空间](https://support.plaud.ai/hc/en-us/articles/57744144794393-What-is-a-workspace)、[席位规则](https://support.plaud.ai/hc/en-us/articles/57744114159641-What-is-a-seat)、[设备绑定](https://support.plaud.ai/hc/en-us/articles/57674058082841-Device-management) 官方说明。参考其账号与空间边界，UI 沿用 EurekaMind 现有设计。

## 产品 PRD 与需求评审网站

- 网站：`/prototype/prd/index.html`（与交互原型使用不同 URL，同一仓库 / Pages 部署）。
- 原型顶部新增「需求评审」入口，新标签打开 PRD，不打断当前工作内容。
- 内容源：`src/prototype/prd/content.json`。37 章涵盖个人版与 Team、用户故事、功能优先级、页面规则、异常、数据、上线约束和验收；附当前原型截图及 24 页参考 PDF 覆盖对照。参考 PDF 本身不入库。
- 支持章节导航、全文匹配搜索、链接锚点、逐章 Markdown 编辑和实时预览、评审记录、JSON / Markdown 导出、JSON 导入和打印。
- **保存本地**：立即更新当前浏览器，持久化到 `eureka:prd:draft:v1`；未保存输入按标签页存入 sessionStorage。其他访客不会看到本地稿。存储失败保留输入；并发标签页修改会阻止旧稿覆盖。
- **发布给所有人**：点击「发布修订」，复制 / 下载完整 `content.json`，通过 GitHub 编辑页提交到 `develop`（受保护时提 PR 合入）。Pages 成功后所有访客刷新可读取新基线。网站不存 GitHub Token，不模拟自动提交，不宣称复制等于发布。
- 新发布基线与旧本地稿冲突时，明确对照并确认合并。恢复发布版会要求确认，产品的会议 / Team 数据不会被清除。
- 实时多人协作尚未提供；需要另行接入身份、授权、数据库和版本合并服务。当前采用静态文档 + Git 版本发布，适合当前部署条件。

验证：`tests/e2e/prd-review.spec.ts` 覆盖编辑刷新、取消、独立浏览器基线、导入导出、无效输入、脚本净化、跨标签页冲突、存储异常、旧基线冲突、响应式、深链接和原型入口。刷新演示截图时先构建，再显式运行 `PRD_CAPTURE=1 PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -- tests/e2e/prd-review.spec.ts -g 'capture current'`，随后重新构建。

团队情报使用已授权会议的当前正文进行本地规则模拟，至少两场会议、两位创建成员才形成交叉线索。首页展示日期与唯一主标题，每条线索仅保留「问问 Agent」，右侧展开并携带当前问题与会议来源；发送后展示交叉依据，支持继续追问；来源撤回、删除或正文更正后重新计算，未修改的旧演示数据增量补充，个人数据保持独立。
