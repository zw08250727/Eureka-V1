# EurekaMind PRD 内容维护

本目录由 `prepare-prototype.mjs` 拷贝到静态站，访问 `/prototype/prd/index.html`，不依赖额外后端或 CDN。目前共 35 章，版本切换、打印 / PDF、导入、导出和发布位于顶栏。

## 数据格式

`content.json` 是发布内容源，schemaVersion=1、documentId 固定。每章包含稳定锚点 id、title、group、summary、body 和纯文本 reviewNotes。正文支持标题、表格、列表、粗体、行内代码、引用、本目录 images 图片和 flow 流程图；原始 HTML 不执行。

每次发布更新 revision。编辑器比较完整发布内容摘要，避免旧本地稿静默覆盖新基线。网页编辑不增删章节；结构变化由仓库维护。旧稿移除已撤下的 evidence、reference、review 三章后，若剩余结构与当前版一致，可保留其他章节修改和原存储。缺少个人订阅章节的 34 / 37 章旧稿，需要先通过仓库合并结构变化再导入；不会静默覆盖或丢弃旧章节内容。

## 编辑、备份和发布

1. 章节「编辑」修改文本并保存本地；顶栏导出 JSON 备份。
2. 发布面板生成新的 revision 和日期，复制完整 JSON，或下载 content.json。
3. 用有仓库写权限的 GitHub 账号更新 `develop/src/prototype/prd/content.json`；按分支保护流程提交或创建 PR。
4. CI 和 Pages 成功后核对线上 revision，切换「仓库发布版」。
5. 若仓库基线变更，保留当前工作稿、对照发布版合并，再确认新基线。版本切换本身不删除草稿。

浏览器内修改只在本机当前浏览器生效；提交仓库并成功部署后所有访客才可看到。网站不会把复制发布内容或打开 GitHub 当作发布成功。

## 交互配图

图片紧邻功能说明，点击可打开原图；集中索引也保留。新增截图来自本仓库运行中的原型。更新交互配图：

```sh
npm run build
PRD_ILLUSTRATIONS=1 PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -- tests/e2e/prd-illustrations.spec.ts --workers=1
npm run build
```

`PRD_CAPTURE=1` 用于显式刷新相应功能测试内的截图；使用测试文件及 `-g` 限定范围，避免覆盖无关配图。参考 PDF 不复制到公共站点。

## 流程图

在正文的 flow 围栏代码块中填写 JSON，编辑器实时预览，正文和打印使用本地 SVG 渲染。例如：

````text
```flow
{"title":"确认流程","nodes":[{"id":"a","label":"提交需求","x":0,"y":0,"kind":"start"},{"id":"b","label":"确认结论","x":1,"y":0,"kind":"end"}],"edges":[["a","b","评审"]]}
```
````

节点 x/y 为 0–10 的网格位置；kind 支持 start、step、decision、end、error。节点 ID 唯一，文字最多 42 字，最多 40 个节点 / 60 条边。节点与连接文字均转义，非法 JSON 显示错误说明。布图时避免长边穿过节点，保留分支间距。移动端可横向滚动图形，打印输出矢量图。
