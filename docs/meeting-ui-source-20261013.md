# 会议详情 UI 源码核对 · 2026-10-13

来源：用户授权访问 https://100wiser.com/index 。取得当前HTML引用的公开编译JS/CSS，核对登录后实际详情、重新总结、导出及分享面板。未触发线上生成、分享、保存或删除，未复制用户会议正文。

| 源文件 | SHA-256 | 用途 |
| --- | --- | --- |
| `/static/js/index-DEbbywsx.js` | `890bfd1ca2e9b63738dcd2ab1d0138b491982077c912aec58240c34a8a66638d` | 详情标题／元信息、AudioPlayer、资料卡、导出／分享／参与人／图片组件 |
| `/static/css/index-C44QxGAr.css` | `c1530883859f75e1658815d3d873f1861ae8e5b1a35bab89cd8941b1bd54cfcb` | 详情响应式与入口浮层 |
| `/static/js/index-BqJEgToc.js` | `bd565e35434b3c21e0d448bb963aa13baaf26a37fec4f73f93ca83d2e3c96573` | MeetingSummaryTemplate |
| `/static/css/index-BJNULT9V.css` | `8b81bb05de7de77689b6c2291228fbaa44f9657f2633cf6df02e5151ea262556` | 模板卡片／弹窗布局 |
| `/static/js/index-C_aojDsC.js` | `efbc829bbadb52a13a9df3101bd2f5e7fa0bc46d2bf47488d02f5a568f896c59` | 首页详情容器与插槽 |
| `/static/js/KnowledgeBaseSidebar.vue_vue_type_style_index_0_lang-DDgHMSmP.js` | `480e3c0c2eea5b506de4745170be45164025ecb9813d7b1fc508bd315e961443` | 原始录音类型SVG |

另外读取当前依赖 `index-C_aojDsC.js` 和 `KnowledgeBaseSidebar.vue_vue_type_style_index_0_lang-DDgHMSmP.js`，确认titlePrefix使用KnowledgeBaseFileTypeIcon；录音麦克风、环境录音耳朵和添加图片图标直接提取原SVG路径，保存在public/assets/baizhi/meeting，未重新绘制。模板常见描述及emoji以实际面板核对；接口动态内容继续使用工程现有数据，不复制线上客户数据。

## 逐入口对应

| 入口 | 核对／实现 |
| --- | --- |
| 详情标题、状态、录音列表 | 18px标题、状态前置、12px元信息，列表无多余文件图标 |
| 播放／前后15秒／进度标记／倍速 | 原AudioPlayer布局与实际audio逻辑，未生成虚假音频 |
| 参会人／位置／标签／图片 | 资料卡分行与收起；保留现有参与人对话框、信息编辑、上传／预览／管理 |
| 总结、转译、思维导图、图文摘要、逐字稿 | 五个tab及空／加载／失败／只读状态，源码指示器样式 |
| 重新总结／模板预览／社区／自定义／全局设置 | 分类与卡片分区，选中角标，独立预览，全局设置完整横向展示；默认入口移到说明面板 |
| 内容编辑 | 复用现有富文本编辑；未改变用户格式和保存行为 |
| 导出／分享／分享记录／删除／Agent | 保留已按同一源码实现的浮层和权限；Agent移入详情操作区；具体原复刻范围见baizhi-meeting-export-share.md |

此交付是把公开编译源码中可验证的UI结构、尺寸和原始图标映射到现有React工程；不是接入或复制线上后端。市场主题、团队权限与现有业务数据保持，移动端使用工程公共44px交互目标。

## 验证结果

npm run check、build通过。市场发布回归：21项模型通过；219项浏览器回归首轮218通过，1项检出移动播放器点击宽度不足44px，已修正并纳入受影响复测。新增两地视觉几何、图标实际加载与待办回归覆盖四种宽度。完整页面清单遍历和22项专项通过；最终UI密度／公共规范复测24项通过。发布沿用用户此前整合发布授权，云端继续执行现有test:release门禁。截图位于artifacts/ui-density，用户人工验收待进行。
