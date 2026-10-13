# 国内会议详情：最终集成功能核验矩阵

静态复读日期：2026-10-12。适用范围：国内个人／团队会议详情，保留当前录音列表、详情与 Agent 布局。本文整理集成代码与官方公开前端产物的对应关系，**不是全量验收通过报告**。本轮仅重写本文；未修改实现或测试，未执行 build、测试或浏览器回归。主代理在文末补实际结果。

“实现”表示在当前调用链读到代码；“待后端”表示本地实现不能证明或提供的服务能力；“差异／待验证”包含仍存在的前端差异和未执行的验收。三者不能互相替代。共享工作树仍在并行回归，后续修复须按代码和结果更新本表。

## 来源与适用边界

公开产物在 `/tmp/baizhi-detail-source/`。本轮复读本地文件及哈希，未重新联网确认线上版本。`D` 指详情包，`B` 指公共包；组件名和检索词比压缩符号更适合定位。

| 来源 | 已取得内容 | SHA-256 |
| --- | --- | --- |
| [index-DEbbywsx.js](https://100wiser.com/static/js/index-DEbbywsx.js)（D） | 详情、弹窗、音频、图片、总结、转写、生成状态、请求与轮询调用 | `890bfd1ca2e9b63738dcd2ab1d0138b491982077c912aec58240c34a8a66638d` |
| [index-C44QxGAr.css](https://100wiser.com/static/css/index-C44QxGAr.css) | 详情、播放器、Markdown、弹窗与响应式样式 | `c1530883859f75e1658815d3d873f1861ae8e5b1a35bab89cd8941b1bd54cfcb` |
| [index-BqJEgToc.js](https://100wiser.com/static/js/index-BqJEgToc.js)（B） | 模板选择、社区、自定义模板与偏好设置相关代码 | `bd565e35434b3c21e0d448bb963aa13baaf26a37fec4f73f93ca83d2e3c96573` |
| [editor-BE12tseD.js](https://100wiser.com/static/js/editor-BE12tseD.js) | 编辑器接口辅助包；本轮已取得，不再列为缺失来源 | `0eac11912c32c2f945bc0281b8055510d68f94e16e1d1c8be2ecde65a1c634c2` |
| [index-DbMJdQBd.js](https://100wiser.com/static/js/index-DbMJdQBd.js) | 编辑页、AI 对话、引用、翻译等组件；本轮作入口与组件级检查 | `96b927dcb8d733cdf5124b2bd3d7dac77a4dc44a9e27638c992981422bd5d238` |
| [AddToAIChat-CsRNTvlH.js](https://100wiser.com/static/js/AddToAIChat-CsRNTvlH.js) | WaveDocEditor、工具栏及扩展组件；取得不等于全部功能已适用或复刻 | `baa29bd2c36f56cfd5891d2304968758ee93b0ee0435a0e6ec58526c157665f7` |

**source 是构建后的前端源码，不是后端业务源码。** 它能证明前端显示条件、交互与请求字段，不能证明后端授权、计费、生成质量、存储一致性或分享服务。线上可见会议内容仅用于交互核对，未把生产会议私有正文、音频或图片复制进原型；生产生成导图 HTML 未取得。使用的空态插图来自公开静态资源。

下列来源边界仍保留，不能从矩阵省略：

| 未取得或未完整核验部分 | 当前处理与核验边界 |
| --- | --- |
| 服务端返回的真实导图 HTML、图文摘要图片及生成任务结果 | 原生 Markmap 使用本地真实总结；图文摘要消费 `visualUrl`。生产导图主题、库配置、布局、图片质量不能声称一比一一致。 |
| 模板／语言完整目录、预览示例、社区动态数据、CRM 实体、反馈接口快照 | 使用仓库本地目录、示例或固定选项；不能称这些数据与生产完整一致。 |
| 原录音及 `deleteSourceAudio` 后端生命周期 | 来源解析已接入（R4已修待验）；仅明确样例使用示例WAV。真实上传／录音资源发布、后端删除协议与可达性仍需服务保证。 |
| 完整编辑器功能及会议模式启用范围 | 新取得的依赖含表格、图片、链接、批注、查找替换、打印、AI 等扩展；尚未逐项核对哪些在会议编辑模式启用。不能仅凭依赖存在就列为必需缺口，也不能称全部已实现。 |
| `MeetingGeneratingSparkleLottie` 动画资源及完整运行效果 | 当前 CSS 指示和骨架代替；未完成原 Lottie 资源与逐帧对照。 |
| `INDUSTRY_ASSET` 场景资产、企业专属资源与转写拒绝查看策略 | D 中有类型／条件入口；对应业务返回数据及完整适用产品范围未核验。当前六类详情 tab 不覆盖完整场景资产体系。 |

适用规则：`MARKET-01`、`ACCOUNT-01`、`SPACE-01`、`ACCESS-01`、`SHARE-01`、`ASYNC-01`、`EXPIRE-01`、`CN-POINTS-03`。官方 enterprise 条件不直接映射本仓库 Team；管理员可管理不等于可代他人共享。个人与团队复用国内组件，各自读写所属资料；市场不是语言或工作区。本文不修改业务基线或 PRD。

以下实现文件默认相对 `src/features/meetings/`；其他目录明确写出。

## R1–R5 修复状态

已仅复读这五项指定修复及接线，没有扩展审查范围。以下“已修”指代码已落地，“待验”指尚未据新增回归结果关闭；此前通过的测试不自动覆盖这些后续改动。

| 编号／原优先级 | 状态与修复证据 | 待验证 |
| --- | --- | --- |
| R1／P1 | **已修并有定向回归**。`summaries.ts::updateSummary` 以 `summaries[0]` 维护顶层兼容字段；显式 summaries patch 直接保留；`detail.tsx` 删除时同步剩余首项正文、HTML、模板与分数。 | 编辑 B 后删 B、刷新，顶层正文与默认 A 一致；个人／Team及其他消费者一致。主代理正补对应e2e。 |
| R2／P1 | **已修并有定向回归**。`detail.tsx` 的 `MeetingContent` key 含 meetingId／summaryId，切总结重建反馈表单，避免未提交输入串用。 | A填写未提交反馈后切B，草稿不串；各总结提交与刷新独立。主代理正补对应e2e。 |
| R3／P1 | **已修并有定向回归**。图文重新生成清空 `visualUrl` 并设为 failed，不再把旧图标为新来源的成功结果。 | 换来源后不显示／导出旧图；后端新图尚未接入时保持失败提示。 |
| R4／P1 | **已修并有定向回归**。新增 `audio-source.ts::meetingAudioSource`；国内详情、导出可用性及下载共用会议音频来源。优先安全的显式 audioUrl，仅精确样例ID允许示例WAV；无源、删除或清除记录返回不可用。详情已接无音频提示及切源重载。 | 真实会议正确播放／下载、无源不回填样例、删除音频、切会议旧请求失效、样例兼容、下载格式与MIME。 |
| R5／P2 | **已修并有定向回归**。`domestic-assets.tsx` 与 `export-content.ts` 的导图可用性均优先判断 `mindmapSourceText` 快照。 | A生成后切空总结B，已有快照的导图仍可展示／导出；无快照旧记录按兼容路径处理。 |

本轮仅更新审计文档，未修改实现、运行测试或构建；新增边界与编辑器补测结果仍由主代理补充。

## 总结与模板

| 功能／source 组件或检索词 | 当前实现文件 | 已实现（静态） | 待后端／真实差异 | 待验证 |
| --- | --- | --- | --- | --- |
| 多总结、当前选择、默认标题；D `summaries`、`Wr`、`c5` | `summaries.ts`、`types.ts`、`detail.tsx`、`store.ts`；`spaces/model/core.js::saveDetail` | 可选 summaries；旧记录适配默认总结；选中项按 ID，默认取末项；个人／Team 可持久化；有多项选择器。 | 未见服务端版本／未读数量与会话已读标记接入；创建新总结的真实任务未接。根字段兼容修复见 R1（已修待验）。 | 零／一／多项、未知选中 ID、刷新、旧记录、两个工作区。 |
| 总结正文；D `MeetingSummary`、Markdown `index` | `content.tsx::Prose`、`store.ts::sanitizeRichText`、`domestic-detail.css` | Markdown 结构渲染，HTML 白名单；国内空正文不回填会议样例。 | 不保留任意链接／图片／HTML；`KEY_MARK_SUMMARY_START/END` 重点摘要没有 source 专属结构提取，不能等同普通 Markdown。 | 标题、列表、表格、代码、引用、危险 HTML；完整／损坏重点摘要标记。 |
| 模板、编辑、最后编辑；D `MeetingSummaryHeader/LastEdited` | `content.tsx`、`detail.tsx` | 当前模板、编辑入口、最后编辑信息；只读禁编辑。 | 无更新时间时仍有按创建日拼接 15:06 的展示回退，非真实编辑时间；updateSummary 已仅在正文／HTML修改时更新总结项时间。 | 切总结后模板与时间匹配；时间来源及“最后编辑”语义。 |
| 富文本编辑；D `d5`；编辑包 `WaveDocEditor/Toolbar` | `detail.tsx`、`domestic-inline-editor.tsx/.css`、`store.ts` | 国内已接独立组件：字体、字号、段落、列表、格式／对齐、撤销重做、选择区维护、清洗和保存；海外仍用原 InlineEditor。 | 保留当前原位布局，未复刻 `/editor` 独立页面及完整 AI／引用工作流；依赖扩展适用性见来源边界。 | IME、选区、撤销、粘贴、清洗后格式、保存失败保留草稿、刷新回显。 |
| 草稿／退出编辑 | `detail.tsx` | draft key 含会议／tab／summaryId；退出编辑有放弃确认；beforeunload 保护。 | 未见覆盖全部 SPA 离开路径的统一拦截。 | 换总结、换录音、路由离开、浏览器刷新；保存到原目标。 |
| 删除总结；D `MeetingSummaryDeleteDialog`、`agent_generated` | `detail.tsx`、`summaries.ts` | 仅 agent_generated 且可编辑时显示删除；确认／取消；至少保留一份；删除后选末项。 | 根字段修复见 R1（已修待验）；已有资产来源指向已删除总结时需确定保留快照策略。 | 默认总结不可删；只剩一份；删除失败；不删会议、转写或其他总结。 |
| 模板选择；B preset/custom/community；D `l5` | `template-picker.tsx`、`templates.ts`、`dialogs.tsx` | 分类、智能匹配、本地预设、我的模板、预览、选择、语言与详细程度。 | 名称作为标识，无完整 SMART_MATCH／PRESET／CUSTOM／COMMUNITY 服务 ID；本地七语言；“精简”与 source“简洁”不同；声纹与预计分钟提示未齐。 | 切分类、未选项、同名模板、语言／详细度保存、生成／重生成／偏好模式差异。 |
| 默认模板／用户偏好；B preference | `template-picker.tsx`；`personal/store` 设置 | 设默认已写 `settings.recordingTemplate`，作用域和登录状态复核；本地模板库存储冲突会报错、保留输入。 | 后端账号偏好与多端同步未接；未证明 source 自动总结设置的所有条件一致。 | 新录音读到默认值；个人／Team 及账号切换；损坏存储／冲突／配额失败。 |
| 社区与自定义；B custom/preview/community/publish | `template-picker.tsx` | 本地社区搜索、收藏、使用、预览；创建自定义名称／说明／prompt。 | 社区为固定样例；AI 生成 prompt／大纲、发布、服务端不可用校验、完整删除／生命周期尚未等价。 | 空结果、空输入、重复名称、默认项被移除、失败保留输入。 |
| 发起／重新总结；D `l5` 生成请求 | `dialogs.tsx` template 分支、`detail.tsx` | 保存配置时保留现有正文和富文本，不伪造 AI 结果。 | 按钮仍叫“开始重新总结”，实际仅保存配置；没有发起任务、扣费、进度或新总结返回。 | 不覆盖既有结果；UI 不把配置保存当生成完成；真实任务接入后重试／归属。 |

## 转写、参会人与反馈

| 功能／source | 当前实现文件 | 已实现（静态） | 待后端／真实差异 | 待验证 |
| --- | --- | --- | --- | --- |
| 转写来源与实时翻译；D `s5`、`realtimeTranslationContent` | `content.tsx::linesFor`、`domestic-transcript.tsx` | 优先 segments；国内文本回退来自 r.transcript；空内容不填四段样例，译文无数据有空态。 | 无分段元数据时按行分段、7 秒间隔及 speaker 索引回退，是本地推导；真实 ASR 时间与说话人需服务端。仅 translation 无原文／segments 的完整呈现待核验。 | 空数组、纯文本、仅译文、原译文长度不同、真实时间轴。 |
| 播放定位与跟随；D `followActiveTranscriptIntoView` | `domestic-transcript.tsx`、`detail.tsx` | 时间／正文点击播放，活动段高亮；换段自动滚动，用户 wheel／touch 暂停跟随 5 秒。 | 播放来源接入见 R4（已修待验）。 | 倍速、末段、筛选重点、手动滚动、键盘定位。 |
| 发言人修改；D `MeetingSpeakerEditDialog` | `domestic-transcript.tsx`、`types.ts` | 1–16 字；单段／全部；全量匹配 speaker 索引并匹配原显示名，避免同名不同索引混改。 | 无服务端稳定说话人 ID；已有单段别名时“全部”保留不同别名的行为需与 source 语义对照。 | 同名异人、单段后再全量、刷新、参会人弹窗与顶部同步。 |
| 划重点；D highlight／markSource／仅看重点 | `domestic-transcript.tsx` | 选区／整段标记、重叠与相邻合并、部分取消拆分、全段取消、仅看重点。 | source 标记来源标签、后端稳定标记 ID 未接；不是缺合并功能。 | 跨 DOM 文本选区、相邻／包含／交叉、边界取消、只读、保存失败。 |
| 参会人；D `MeetingParticipantsDialog` | `dialogs.tsx`、`types.ts` | 有声与无声分开；无声人增删持久化；姓名最多 16 字；保持 speaker 索引，改名清理该人的旧别名。 | 默认有声名单仍可能来自个人固定名单／团队成员，而非真实检测；非16人总数上限。 | 超过16人、空名／同名、计数、修改后所有显示一致。 |
| 参会人片段；D `o5` | `dialogs.tsx`、`detail.tsx` | 每位展示实际分段片段；父级提供切换／停止、结束边界、临时1x与恢复原速、关弹窗停止。 | 依赖真实分段与音频；音频来源已接入，见R4待验项。 | 同片段切换、换片段、末段无end、关闭、播放拒绝、原倍速恢复。 |
| 总结反馈；D `MeetingSummaryFeedback`、`r5` | `domestic-feedback.tsx`、`feedback-model.ts`、`store.ts` | 1–10分；≤6分必选原因；100字；提交后锁定；可按 summaryId 保存，个人刷新从 feedbackKey 回填，Team 写对应总结。 | 固定原因选项，无服务端反馈版本／幂等协议；未提交草稿隔离见 R2（已修待验）。 | 两份总结独立评分、重复提交、刷新、撤权、失败保留输入。 |
| 共同反馈月上限；CN-POINTS-03，D `GRANTED/MONTH_LIMIT` | `feedback-model.ts`；`account/rewards.ts`、`experience.tsx`、`domestic-points.tsx` | 两入口及 UI 调用 `countMonthlyFeedbackRewards`；按实际奖励时间、唯一ID，统计 feedback: 与 meeting-feedback:；北京时间自然月、cap10。会议先存评分，满额只跳过500积分；团队评价奖励归个人账户。 | 本地账本不能替代服务端反重放／可信时间与账本事务。 | 账户→会议及反向第10／11次、月界、重复ID、无奖励仍提交、事务失败。 |
| 原反馈 ID 兼容 | `account/rewards.ts::nextFeedbackRewardId` | 账户沿用 feedback:YYYY-MM:序号；按账户记录起算并碰撞检查，不用共同计数充当新序号。 | 不迁移历史记录。 | ID间隙、重复历史、旧时区记录、无效时间排除。 |

## 内容状态、权限与元信息

| 功能／source | 当前实现文件 | 已实现（静态） | 待后端／真实差异 | 待验证 |
| --- | --- | --- | --- | --- |
| 空态／生成中／失败；D `MeetingGeneratingState`、`Sh/ls/ll` | `domestic-content-state.tsx/.css`、`detail.tsx` | summary／transcript 为空才进入状态组件；数字、枚举及本地状态映射；队列、处理、失败、暂停独立显示，已有正文保留。 | 无真实状态轮询、任务恢复或后台完成事件；页头状态样式不等于完整状态机。 | 空／部分内容、处理→失败→完成、未知值、刷新。 |
| 短录音；D `viewType` 2/3 | 同上、`types.ts::MeetingContentState` | 依据显式 viewType，展示短录音／无实质内容提示，不按时长猜测；已有转写继续可见。 | 当前仍保留六tab布局，与 source 部分短录音隐藏普通tab有差异。 | viewType2／3、有少量转写、无字段、短时但有实质内容。 |
| 额度／自动转写；D `subStatus=300001`、`autoTranslateEverEnabled` | 同上；`spaces/model/core.js::saveDetail` | 可选 contentState 四字段进入白名单；额度不足与未开启自动转写区分；个人会员／加时包／设置入口，Team 管理员订阅入口，非管理员联系管理员。 | 上游需准确映射服务字段；当前转写生成／重试报服务不可用，summary打开模板配置，无假生成。 | 未开启仅影响转写提示；缺字段不误判；会员／加时包／设置路由、Team到期。 |
| 编辑权限、到期与共享；D `resourceScopeType/transcriptVisible/isShareMode` | `detail.tsx`、`share-page.tsx`；`spaces/model/core.js` | Team 依 M.canEdit/M.canShare；saveDetail 重检；到期只读／AI暂停；原音频同步模型保留；个人链接页只读。 | source 企业禁止查看转写专属页未按普通Team套用；生产服务必须再次鉴权。 | 本人、共享只读、管理员看他人、撤权／移除／到期，分享不随管理权扩张。 |
| 标题；D `MeetingRecordHeader/u5` | `detail.tsx`、`dialogs.tsx` | 独立改名弹窗和持久化。 | 与source原位输入／清空交互不同。 | 空标题、Enter/Esc、失败恢复、列表同步、长标题。 |
| 元信息折叠；D `MeetingInfoPanel/mh` | `detail.tsx` | 保留当前元信息展开／收起、来源、时长、标签、人物与CRM布局。 | 默认展开值、按字段／企业资源显隐与source不同。 | 空字段、长内容、Agent开关、只读、折叠状态。 |
| 标签、位置、CRM字段；D `MeetingTagsEditDialog` | `dialogs.tsx`、`info-dialog.tsx`、`types.ts` | 国内10标签×30字、位置30字、客户／商机50字；CRM/非CRM类型与保存；旧20／80字缺口已消除。 | 常用项仍固定快捷列表；无常用位置管理／删除确认；CRM文本+datalist未绑定稳定实体ID、评级／阶段／金额及服务搜索。 | 去重／空白／长度、类型切换、同名实体、取消、权限与失败。 |
| 生命周期与异步；D `Oh/Mo/vo` | `detail.tsx`、`domestic-content-state.tsx`、`domestic-assets.tsx` | 本地读取有 active 清理；图片操作有scope和记录版本检查；组件回调保留错误。 | 未建立真实生成任务的轮询、取消、幂等、扣费及旧结果丢弃协议。 | 切市场／账号／工作区／会议、重复回调、失效会话、并发更新。 |

## 图片与音频

| 功能／source | 当前实现文件 | 已实现（静态） | 待后端／真实差异 | 待验证 |
| --- | --- | --- | --- | --- |
| 图片列表／懒加载；D `MeetingInfoPanel/MeetingLazyImage` | `detail.tsx`、`domestic-image-manager.tsx` | 缩略图、50张计数、loading=lazy、全部图片入口。 | 缩略图没有完整逐图loading/error替代；顶部仍直接列全部图片，未完全等价source截断展示。 | 0／1／50张、坏图、重复URL、窄屏与长列表。 |
| 上传；D `lh/MeetingImageUploadLoading` | `detail.tsx` | FileReader数据持久化；上传状态／重复点击锁；检查市场、actor、space、meeting及record是否变化；失败提示、重置input。 | PNG/JPEG/WebP/GIF、单图5MB，本地存储容量限制；source另支持BMP/TIFF/HEIC/SVG等且有部分容量／失败接纳。本地超限或任一失败整批拒绝；无对象存储。 | 同文件重选、超额、读取失败、storage quota、操作中切scope／改记录；不覆盖新数据。 |
| 单图／批量管理；D `MeetingImageDialogs` | `domestic-image-manager.tsx/.css`、`detail.tsx` | 全部网格、批量选择／取消、单图与批量确认、删除中禁用、失败保留选择；原缩略图×进入确认。 | 客户端索引回调，组件用内容key核对选中项；服务端图片ID／删除接口未接。 | 确认前不删除、只读、列表变化、失败／取消、刷新。 |
| 图片viewer；D `MeetingImageDialogs` | `dialogs.tsx` | 前后切换／计数、缩放、复位、旋转、失败提示及下载入口；父级传全图数组和index。 | 下载为repo补充交互，不应误称source原有独立下载按钮；大图/格式取决于资源服务。 | 第N张、头尾、切图复位、Esc／键盘、损坏图、下载MIME与scope。 |
| 基本播放；D `AudioPlayer` | `domestic-audio-player.tsx/.css`、`detail.tsx` | 播放／暂停、±15秒、进度seek、六档倍速、长时格式、播放器内键盘快捷键。 | 真实音频来源已接入，见R4（已修待验）；未完全等价source独立拖动预览语义。 | seek边界、播放结束、切会议、触屏、倍速、长于1小时。 |
| 缓冲／错误／标记；D `buffered/loaded/error/marks` | 同上 | 元数据、buffered、waiting/canplay/error已接；加载与失败禁用／重试；时间轴marks、tooltip及点击播放并切转写。 | 错误时source下载引导未完全对齐；mark播放失败与定位联动仍需实测。 | 404／解码失败／慢网／重试、重复与越界mark、末端tooltip、无音频。 |
| 原音频删除；D `deleteSourceAudio` | `audio-source.ts`、`export-content.ts::contentOptions`、`types.ts`、`detail.tsx` | audioUrl／deleteSourceAudio 已进入类型，播放／导出统一读取并处理删除状态（R4已修待验）。 | 真实资源发布、删除接口与上游生命周期仍待后端。 | 只有文本、原音频删除／不可达，文本导出仍可用。 |

## 生成资产、导出与分享

| 功能／source | 当前实现文件 | 已实现（静态） | 待后端／真实差异 | 待验证 |
| --- | --- | --- | --- | --- |
| 资产状态；D `MeetingVisualSummary/MeetingVerbatimTranscript/MeetingMindMap/MeetingGenerateAction` | `domestic-assets.tsx/.css`、`content.tsx`、`detail.tsx` | 三类空、generating、failed、source-empty、只读分支；公开source插图、骨架、重试／来源入口。 | 状态组件不等于真实任务编排；Lottie替代见来源边界。 | 三tab×各状态，失败恢复，不产生示例正文。 |
| 选择来源；D `ContentAssetSourceDialog` | `detail.tsx`、`summaries.ts`、`domestic-assets.tsx` | 从多总结选非空项，保存SourceId／SourceTitle／SourceText快照；导图渲染及导出读取绑定文本。 | 没有后端source版本与任务ID；图文旧图失效和导图可用性均已修待验（R3/R5）。 | A生成后切B、编辑／删除A、取消、空来源、保存失败。 |
| 思维导图；D `MeetingMindMap` | `domestic-assets.tsx::NativeMindmap`、`share-mindmap.tsx` | 原生Markmap，真实总结结构、折叠、拖动、缩放／复位、全屏及可访问大纲；不使用业务iframe。 | 无生产生成HTML完整对照；本地Markdown渲染不是AI生成服务。 | 长文、节点、缩放、全屏、来源快照、无iframe、危险Markdown。 |
| 图文摘要；D `MeetingVisualSummary` | `domestic-assets.tsx::VisualImage`、`detail.tsx`、`export-share-dialog.tsx` | 真实URL图片、加载／失败、缩放／全屏；无URL显示失败；导出下载实际图片并校验MIME。 | 没有图文生成服务；重新生成已清空旧URL并保持失败态（R3已修待验）。 | 缺URL／坏URL／CORS、缩放、MIME、来源切换；当前导出弹窗默认项需核验。 |
| 逐字稿；D `MeetingVerbatimTranscript`、文本编辑dialog | `domestic-assets.tsx::domesticVerbatimText`、`content.tsx`、`detail.tsx` | 真实verbatim或清洁HTML显示／复制；编辑保存；本地生成仅拼接真实segments，无转写则source-empty。 | 不等于服务端清洁逐字稿；HTML-only兼容记录在导出可用性上仍要求非空r.verbatim，显示与导出可能不一致。 | 显示／复制／编辑／导出同源，纯HTML旧数据、空数据、刷新。 |
| 内容→格式→下载；D `MeetingExportDialog` | `export-share-dialog.tsx`、`export-content.ts` | 按可用内容启停；TXT/JSON/MD/HTML实际序列化；下载锁／错误；图文原图；详情导图可导SVG。 | 音频已按会议来源下载并据文件头／MIME确定格式，样例仍为WAV（R4已修待验）；source导出转码／场景资产服务未齐。弹窗总结导出当前选中项，无独立多总结目录；不含PNG/PDF导图导出。 | 文件后缀／MIME／正文、无内容、当前总结、只读、scope变更、重复下载。 |
| 分享配置／预览／链接／历史；D `MeetingShareDialog` | `export-share-dialog.tsx`、`share-links.ts`、`share-browser.ts`、`share-page.tsx`、`share-content.tsx` | 国内个人选内容、预览、生成、复制失败回退、3/7/30天或永久、快照、历史、失效；访问复核过期／撤销／身份／源会议。 | 本地同源同浏览器且创建者账号可用，**不是公网多人分享服务**；无服务端token授权／多端传播。多总结分享当前所选总结；已分享快照不随正文编辑改变。 | 最少一项、只选内容、到期边界、撤销／登出／源会议删除、另浏览器拒绝。 |
| 团队共享与共享页只读；D share mode与repo SHARE-01 | `detail.tsx` RecipientDialog；`spaces/sharing-settings.tsx`、`spaces/model/core.js` | Team沿用接收人授权；个人链接流程拒绝Team；分享页无编辑／再共享入口。 | 不以source企业账号条件替代repo共享规则；生产权限待后端保证。 | 所有者可共享；管理员看他人不获代共享；移除／撤权／到期。 |

## 布局与小交互

| source | 实现文件 | 已实现与差异 | 待验证 |
| --- | --- | --- | --- |
| `MeetingRecordTabsNav/MeetingRecordSkeleton`；C44 adaptive header／sticky tabs | `detail.tsx`、`domestic-detail.css`、`domestic-content-state.css` | 保留现有三栏和Agent；六tab、键盘切换、内容状态骨架；没有声称完全复刻source动态tab显隐及整页骨架。 | Agent开关、长标题、元信息展开、窄屏、loading切换无布局跳变。 |
| C44 audio-player 430/960px／coarse pointer | `domestic-audio-player.css`、`domestic-detail.css` | 国内独立样式与响应式；不能从存在CSS推定每个断点等价。 | 390/768/1440px、触屏拖动、按钮不重叠、局部滚动、海外回归。 |
| C44 markdown-content／弹窗／图标 | `domestic-detail.css`、各domestic组件CSS、`reference-ui.tsx` | Markdown结构样式、弹窗与控件复用；未改生成prototype.css。 | 标题／表格／代码、对比度、错误可读、icon名称、焦点顺序。 |
| source loading／禁用／键盘／遮罩行为 | `reference-ui.tsx`、`dialogs.tsx`、`template-picker.tsx`、新增domestic组件 | 图片上传／删除、反馈锁定、导出、模板存储错误已有分支；不同流程并非统一后台busy任务。 | Enter/Space/Esc、嵌套弹窗焦点与返回、失败保留输入、连点、reduce motion。以本仓库规范和明确产品决定裁决source冲突。 |

## 集成验收记录（由主代理补充）

本轮完成的是源码复读、来源哈希核对与文档重写。未运行构建、测试、浏览器验收；其他分工的局部通过记录不等于本矩阵全量通过。相关测试文件存在也不代表执行通过。

主代理于本次交付前提供的回归进度：34 项 e2e 通过、18 项 cn-model 通过、`npm run check` 通过、build 通过；新增 2 项边界测试正在运行，编辑器由 Kuhn 补测。此处按主代理报告记录，本审计未独立重跑或读取完整日志；尚不能推定这些既有测试已覆盖 R1–R5 后续修复或全部 source 行为。具体命令、环境、失败／修复记录及新增测试结果由主代理补入下表。

| 核验范围 | Given / When / Then 核心条件 | 实际命令／环境／结果 |
| --- | --- | --- |
| 多总结一致性 | 多份总结；编辑、评分、删除、切来源；各ID内容、草稿、兼容字段和资产来源一致（R1/R2/R3/R5） | 待主代理填写 |
| 真实内容与媒体 | 真实空录音／仅转写／仅总结／无音频；打开所有tab、复制导出；无样例填充和媒体错配（R4） | 待主代理填写 |
| 状态与权限 | 国内个人、Team本人／共享只读／管理员看他人／到期／移除；执行读写、生成、分享；按基线允许或拒绝 | 待主代理填写 |
| 积分 | 两反馈入口混用、第10／11次、北京时间月界、重复提交；最多10次奖励，满额会议评分仍保存 | 待主代理填写；候选 `tests/cn-model/feedback-rewards.spec.ts` / `playwright.cn-model.config.ts` |
| 异步与持久化 | 上传／下载／保存中切scope、并发修改、存储拒绝；目标不串、错误保留输入、刷新一致 | 待主代理填写 |
| 资产、导出、分享 | 实际内容与格式、绑定快照、有效期／撤销、另一浏览器、只读；正文、MIME、权限一致 | 待主代理填写；候选 `tests/e2e/domestic-meeting-export-share.spec.ts` |
| 布局与两地 | 390/768/1440px、键盘／触屏、国内个人与Team、海外会议入口；当前布局保留且无跨市场影响 | 待主代理填写；候选 `tests/e2e/domestic-meeting-detail.spec.ts` |

主责：会议模块；联合影响账号／工作区权限、订阅积分、录音设置、CRM、Agent、导出分享。人员按 `spc/modules.json`，未擅自指定。规则ID与PRD章节未改变。本文可单独回滚，不迁移、清空或删除浏览器数据；实现变更及发布由主代理按真实检查结果处理。


## 最终执行结果

主流程执行：`npm run check`、`npm run build`通过。国内模型21项通过，覆盖R1、R4、R5与奖励共同上限。浏览器及导出分享逻辑43项通过（最终批次41项首轮通过，音频实际404失败注入修正后和新增图文重生成两项复验通过），包括R1/R2个人与团队编辑删除刷新、R3旧图失效、R4音频状态、编辑器6项。详细命令见 `docs/market-split-verification.md`。这不宣称未接生产服务与表中差异已完成；两地静态包单列结果见 `artifacts/markets/package-smoke.json`。

## 2026-10-13 登录态实页复核与两地更新

本次使用用户已登录的 `https://100wiser.com/index` 浏览器标签，逐条查看五条会议：长录音／多发言人、两秒短录音、合并录音／表格总结、时长超过五分钟但内容不足的录音、带实时翻译的短会议。正文和会议 ID 不落入仓库；自动化用例均为合成数据。同步复核公开详情 JS/CSS，以及完整编辑器界面。旧矩阵未列为已解决的后端或交互差异仍有效。

| 实页证据 | 本次工程处理 | 市场 |
| --- | --- | --- |
| 播放器、会议信息、标签、图片与内容 Tab 分层；信息默认展开 | 复用播放器和元信息组件；位置进入信息区；客户／商机仅在团队或已有数据时显示；切录音复位滚动 | 国内、海外 |
| viewType=2 隐藏所有正文 Tab；viewType=3 保留少量转写 | 独立录音内容 region，隐藏普通 Tab；稀疏转写只读，保留定位播放 | 国内、海外 |
| 只有有翻译的录音才展示实时翻译 | 条件标签；独立免责声明、全文复制、时间显示，不提供发言人编辑 | 国内、海外 |
| 总结编辑为完整文档工作区 | `MeetingDocumentEditor` 全屏 React 编辑界面、标题、现有富文本工具、撤销重做、保存／退出确认、写作助手区域 | 国内、海外 |
| 每份总结都可独立选择导出、分享 | 用稳定总结 ID 选取内容；下载、预览、分享快照保持对应；修改名称不会串选 | 国内、海外 |
| 未生成、生成中、失败、来源为空有不同界面 | 海外也接入既有原生资产和内容状态组件，不再使用通用示例图文填充缺失内容 | 国内、海外 |
| 模板卡片有场景说明 | 在现有模板组件增加两行说明；两地沿用保存、并发和会话校验 | 国内、海外 |
| 源站颜色和密度与本项目规范存在差异 | 按 UI-CN／UI-GLOBAL 语义主题落地；正文15px、辅助12px、可访问控件最小36/40px及移动44px，不复制源站低对比度文字 | 国内、海外 |

### 明确的实现边界

- 这是基于可见实页和浏览器公开前端产物的 React 重建，不是生产项目原始源码或后台服务的拷贝。不能据此宣称所有线上状态已逐一触发或像素级完全一致。
- 线上编辑会打开新标签页，本地实现为当前页面内的全屏编辑工作区，沿用受控草稿和退出确认。工具栏补充格式刷、文字／背景调色、缩进和链接；保留受限 HTML 过滤。未照搬第三方编辑器插件及完整命令集。
- AI 写作区保留输入并明确展示服务未连接；生产 AI 重生成、云端文件转换、跨设备公开分享均未接入。导图使用原生 Markmap，不嵌入线上 iframe。
- 两地分享均为当前市场、当前账号内的本地内容快照。新增 `/global/meeting-share/`，历史国内记录无需迁移；团队仍走团队权限模型。界面已明确提示当前浏览器预览边界。
- 线上核对导图时，点击“重新生成”直接触发了请求；后续未重复该操作，已告知用户。其他编辑／分享／删除／反馈核对均未提交。

### 本次验证

首轮会议相关浏览器及逻辑回归38项通过；全屏编辑器动画修正后的会议／两地视觉／公共UI复验31项通过。覆盖390／768／1080／1440px；截图已经人工检查，修正了旧弹窗动画导致的编辑器入场透底。最终检查结果在下方补记。

最终复验：`npm run check`、`npm run build`通过；国内模型21项通过；会议详情／编辑器／导出分享／两地还原39项通过，新增覆盖安全链接、文字颜色、默认背景色、非法富文本过滤；状态标签最后修正后，两地12项再次通过。公共UI与历史无市场路由31项在本轮布局修正后通过。日志位于 `/tmp/eureka-meeting-{check-final,build-final,model-final,final,state-final,visual}.log`。未推送或发布。
