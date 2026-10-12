# 国内版百智视觉对照

日期：2026-10-12。范围：国内登录（个人/团队、企业）、个人/团队工作台、企业工作台、连接器、订阅及公共弹窗。无业务规则、账号域或页面布局变更。

## 线上依据

访问 https://100wiser.com/index，读取游客工作台和登录弹窗的渲染 DOM、class 与 getComputedStyle；没有提交真实账号或验证码。以下为实际线上值，不依据截图估算：

| 线上组件 | 读取值 | 本仓库映射 |
| --- | --- | --- |
| 侧栏 `.sidebar-container` | #F9F9F9 | --cn-sidebar |
| 首页选中导航 | 黑色 5% 背景、#262626 正文、8px 圆角 | --cn-selected（在浅灰底上近似合成 #EDEDED） |
| 开始录音主操作 | #262626，hover #111111，6px 圆角 | --cn-action / --cn-action-hover |
| 工作台次按钮 | 白底、黑色 8% 边框、6px 圆角 | 白色、--market-border |
| 手机号登录选中标签／获取验证码 | #165DFF | --market-accent |
| 登录输入容器 | #F2F3F5、8px 圆角 | --cn-input |
| 登录按钮禁用 | #ADC6FF | --cn-disabled |
| 登录类型切换 | #F2F2F4 轨道、白色选中块 | .auth-editions |
| 登录卡片 | 白底、#F0F1F4 边框、0 4px 8px rgba(0,0,0,.1) 阴影 | 登录预览卡片及弹窗边界 |
| 正文／次级文字 | #262626 / #595959 / #8C8C8C | text / ink / sub / muted |

登录装饰背景取自页面实际引用的 https://100wiser.com/static/png/login-bg-C9zn8uSa.png，原样保存在 `src/features/markets/assets/baizhi-login-bg.png`。通过 CSS URL 由 Next 打包到本地资源，支持静态包和 basePath，不依赖运行时官网请求。原图不包含表单内容。线上 DOM/CSS 可见样式为参考，未获取其私有工程源码。

## 实施边界

- `baizhi-theme.css` 为国内专属语义 token 与组件视觉映射；以 `html:has([data-market="cn"])` 限定，覆盖挂载到 body 的弹窗及 Select popover。
- 复用现有 React 控件，不引入 iframe、截图覆盖层或整页复制。国内仍为原有左右分栏登录布局，不改成线上弹窗布局。
- 保留原有 grid、宽高、间距、断点、字号和字体度量，避免改变内容位置。仅调整颜色、背景、边框色、阴影和组件圆角。
- 工作台主按钮采用线上深灰；登录提交采用线上亮蓝；成功、错误、危险操作仍有各自语义，不能统一染成品牌色。
- 海外样式与一级白底分流不修改。当前可观察到的是游客工作台与登录组件，未宣称对照过线上登录后的企业/订阅页面；这些模块复用已核实的公共视觉规则。

## 验证

验收包括两地登录及业务入口、国内企业登录、连接器与弹窗、390/768/1440px 视口。结果记录在 `docs/market-split-verification.md`。
