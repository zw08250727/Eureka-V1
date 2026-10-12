# CN 会议生成内容独立组件

适用：国内个人／团队会议详情。主责为会议模块；上游由详情页传入权限与当前记录，下游动作由主代理接线。遵守 MARKET-01、SHARE-01、EXPIRE-01、ASYNC-01，不改变业务基线，不读写存储，不处理市场或工作区切换，不修改海外组件。

## 集成合约

`src/features/meetings/domestic-assets.tsx` 导出 `DomesticAssets`、`DomesticAssetsProps`、`DomesticAssetTab`、`domesticVerbatimText`。组件自带 CSS 导入。

```tsx
<DomesticAssets r={r} tab={tab} readonly={readonly} action={action} zoom={zoom} />
```

- `r: MeetingDetail`；不修改类型文件。
- `tab: 'mindmap' | 'visual' | 'verbatim'`。
- `readonly: boolean`：隐藏生成、重试、来源选择、编辑；保留已有内容、复制和视图操作。
- `action: (name: string) => void`：父级持有当前 tab、权限、记录、市场及工作区；保存前重新校验。组件不写入状态或自动将任务标为成功。
- `zoom: number`：相对初始适配比例，通常为 1；父级处理放大／缩小。

| action | 主代理处理 |
| --- | --- |
| `generate` | 为当前 tab 发起生成，先记录 generating；异步结果锁定发起市场／工作区／记录 |
| `regenerate` | 当前 tab 重试或重新生成；重复回调不得重复扣费或投错记录 |
| `asset-source` | 打开父级来源选择弹窗；当前原生导图仅以 r.summary 为数据源 |
| `copy` | 复制逐字稿，使用 domesticVerbatimText(r) 与显示内容一致，不回退到虚构转译样例 |
| `edit` | 打开父级逐字稿编辑器，保存 r.verbatim／r.verbatimHtml |
| `export-current` | 导出真实图片；无图不会显示成功工具栏 |
| `zoom-in` / `zoom-out` | 更新 zoom |
| `fullscreen` | 父级处理导图全屏 |

`r.generated` 既有 string/boolean 容器，无需扩展 MeetingDetail：

| 字段／值 | 含义 |
| --- | --- |
| `generated[tab] = false / undefined / ''` | 官方初始空态；即使 r.verbatim 有预置内容也不自动展示生成成功 |
| `generated[tab] = 'generating'` | 生成中，禁止重复触发 |
| `generated[tab] = 'failed'` | 失败与重新生成 |
| `generated.verbatim = 'source-empty'` | 转译来源为空，不显示生成按钮 |
| `generated[tab] = true / 'ready' / 既有时间戳` | 校验可用内容后展示；空总结／无图不会伪造成功 |
| `generated.visualUrl: string` | 可选真实 HTTPS 图片或同源根路径，需图片加载成功；不接受 HTML、data 或脚本 URL |
| `generated.mindmapSourceTitle / visualSourceTitle` | 可选来源显示名，默认“智能总结”；父级需保持名称与 r.summary 所选内容一致 |

## 复刻依据和边界

官方下载入口 `https://100wiser.com`，源码文件 `index-DEbbywsx.js`。用户指定组件范围为 MeetingVisualSummary 148557..157409、MeetingVerbatimTranscript 160497..164240、MeetingMindMap 164240..171393；另核对 MeetingGenerateAction 和 MeetingGeneratingState。静态 PNG 的原始 URL、SHA-256 见 `public/assets/baizhi/meeting/README.md`。

空态使用官方 PNG、文案、240×146 插画尺寸、60px 顶部间距、335×48 深色按钮；失败插画为140×154，逐字稿无来源插画为180×128。工具栏、来源说明和逐字稿纯文本结构依据源码；小屏允许换行，控件最小36px（移动44px）。来源参考提示采用更可读的灰色。

思维导图外层源码明确含 `.markmap-node`、节点折叠追踪及后端 HTML iframe。线上 DOM 获取的公开 HTML 地址为：
https://resource-cdn.100wiser.com/audio-recording/afdae8bee3f2488daddbf331fcc3a12a/aac5083f-759f-49e4-809c-2b817cdf1de3/content-asset/mind-map/27d6c080-58fa-48f3-baa2-164d9a26280a.html

该 URL 通过网页读取与 HTTP（含站点 Referer）均返回403，未取得正文、精确渲染参数或库版本。使用外层源码可核实的 Markmap 技术结构，安装 `markmap-lib@0.18.12`、`markmap-view@0.18.12`，动态导入；由 Transformer 转换本地 r.summary，通过 Markmap 在本页原生 SVG 渲染。未复制私有会议正文、未嵌入 iframe、未手绘导图。精确后端主题仍有待可访问的 renderer 依据核对。Markdown 禁用 HTML、图片及链接，不注入远程资源或可执行正文；采用空插件列表，不启用数学／代码插件。

图文摘要成功图片来自生产后端，本项目没有该服务。没有真实图片时显示“未获取到图文摘要图片，请重新生成”，不自绘图片、不将假内容标为成功；允许父级接入真实图片。逐字稿仅使用 r.verbatim 或清洁后的 r.verbatimHtml，不回填会议示例文本。生成中沿用官方骨架布局，以 CSS 加载指示替代未单独提供的 Lottie 动画；未自制插画。

来源选择弹窗、编辑、复制持久化、导出与全屏由主代理负责接线；组件不在 UI 展示实现或演示说明。回滚时删除独立组件和对应引用、素材及新增 Markmap 依赖即可，不迁移或清空任何用户数据。

## 验收

- 初始 generated=false → 三类官方插画／文案／立即生成；readonly 不提供写入动作。
- generating → 骨架加载；failed → 官方失败插画与重新生成。
- mindmap 就绪 → 仅本地总结的原生 Markmap；节点可折叠，支持缩放、拖动，提供可访问文字大纲。
- visual 就绪但无真实 URL → 诚实失败；有效真实图加载成功后呈现；图片请求失败可重试。
- verbatim 就绪 → 清洁原文、复制全文、编辑；readonly 保留复制并隐藏编辑。
- 未运行 build，主代理统一进行集成与两地端到端验收。独立组件 ESLint 无错误或警告，隔离 TypeScript 检查通过；临时浏览器夹具通过三类官方空态图片、生成／重试／来源／复制回调、只读编辑保护、无图失败、生成中、原生导图本地总结（6节点）、无iframe、390px无横向溢出检查，浏览器无运行时错误。已目视核对1440px空态／原生导图和390px空态截图。全仓 tsc 被并行模块缺失 `./export-share-dialog` 阻塞，未修改该模块。

依赖审计：新增 markmap-lib 的可选 KaTeX 依赖链有 npm low 级公告 GHSA-238p-pmpm-9mq7；本组件未启用数学插件。未为解决仓库已有审计告警进行无关升级。
