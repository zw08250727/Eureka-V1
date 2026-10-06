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
