# Airwallex 沙盒服务部署到 Render

该服务只连接 Airwallex 沙盒，用于让 GitHub Pages 上的海外个人与团队演示进入官方 Hosted Checkout。它不是生产支付后端；浏览器中的 `actor` 和 `workspaceId` 仍是演示数据，不构成服务端身份认证。

## 1. 创建 Render Blueprint

1. 在 Render 中选择 **New → Blueprint**，连接本仓库并选择 `develop` 分支。
2. Render 会读取仓库根目录的 `render.yaml`，创建 `eureka-airwallex-sandbox` Web Service。
3. 创建时填写 `AIRWALLEX_API_KEY`。不要把 Key 写入仓库、Pages 变量或任何 `NEXT_PUBLIC_*` 变量。
4. 等待 `/health` 检查通过，记录 Render 提供的 HTTPS 地址，例如 `https://eureka-airwallex-sandbox.onrender.com`。

服务会读取 Render 自动提供的 `PORT` 和 `RENDER_EXTERNAL_HOSTNAME`，监听 `0.0.0.0`，并且只允许 `https://zw08250727.github.io` 的浏览器跨域请求。

## 2. 连接 GitHub Pages

在 GitHub 仓库 **Settings → Secrets and variables → Actions → Variables** 中新增：

```text
NEXT_PUBLIC_AIRWALLEX_CHECKOUT_API=https://你的-render-域名/api/airwallex/checkouts
```

该值是公开 API 地址，不包含凭证。随后重新运行 Pages 工作流，或推送一次 `develop`。静态构建会把地址写入前端；未配置该变量时，线上继续使用原演示支付流程，本地仍默认调用 `http://127.0.0.1:3101`。

## 3. 验证

```sh
curl https://你的-render-域名/health
```

预期返回 `ready: true`。然后在 GitHub Pages 海外工作台分别验证个人 Credits、个人订阅、团队 Credits 和团队加席。只有 Airwallex 状态接口返回已完成，原页面才发放演示权益。

## 当前边界

- Checkout ID 和重复请求缓存仍保存在单个 Node 进程内；Render 重启后，已打开订单需从 Airwallex 后台核对。
- CORS 只能限制浏览器来源，不能替代账号鉴权。接入生产支付前必须增加服务端会话验证、持久化订单归属和 Webhook 核账。
- 当前服务使用 Airwallex 沙盒 API 与沙盒商品，不得替换为生产 Key 后直接上线。
