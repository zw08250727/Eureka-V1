# EurekaMind PRD 内容维护

本目录由现有 `prepare-prototype.mjs` 原样拷贝到静态站，访问 `/prototype/prd/index.html`。不依赖额外后端或 CDN。

## 数据格式

`content.json` 为唯一发布内容源，schemaVersion=1、documentId 固定。sections 中每章包含：

- id：稳定锚点，现有章节修改时不变。
- title / group / summary：标题、导航分组和摘要。
- body：安全 Markdown 子集（标题、表格、列表、粗体、行内代码、引用以及本目录 images 图片）。原始 HTML 不执行。
- reviewNotes：纯文本评审记录。

`revision` 在每次正式发布时更新；编辑器额外比较完整发布内容摘要，因此忘记更新 revision 也能检测已有本地稿的基线冲突。

网页编辑只改章节，不增删结构。新增章节或重排通过仓库修改 JSON；结构不匹配的导入会拒绝，避免静默丢失章节。

## 编辑、备份和发布

1. 章节「编辑」修改文本，保存本地；右上角可导出 JSON 备份。
2. 发布面板生成新的 revision 和日期，复制完整 JSON，或下载为 content.json。
3. GitHub 登录有写权限的账号，打开 `develop/src/prototype/prd/content.json`，替换并提交。分支保护开启时按 GitHub 引导创建 PR。
4. CI 和 Pages 成功后核对线上 JSON revision，再切换「仓库发布版」。
5. 确认线上已含本地改动后可「恢复发布版」清理本地副本；不要在上线前清理唯一草稿。

网站不能验证某个人是否已提交 GitHub，所以不会显示虚假的发布成功。只有 Actions 成功和线上版本核对证明全员版本生效。读取网站无需仓库写权限；本地编辑不授予任何线上写权限。

## 覆盖证据

基于原型 c64f4b2、用户迭代指令和 `V1.0【0612】企业信息分析师Agent_需求PRD.pdf` 全部 24 页。参考 PDF 不复制入公共站点。第 reference 章提供逐页维度映射；价格、指标、日期、生产服务等未确认内容明确区分。
