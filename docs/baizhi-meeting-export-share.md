# 国内会议导出、个人分享与参会人交接

## 范围与来源

- 来源为线上 DOM 提取及对应官方公开脚本的本地下载。脚本 `/tmp/baizhi-detail-source/index-DEbbywsx.js`：MeetingExportDialog 6894..18724；MeetingShareDialog 23175..46877；MeetingParticipantsDialog 63946..74651。
- 修改 meetings/dialogs.tsx、template-picker.tsx、info-dialog.tsx，并增加独立 export/share 模块、国内分享路由和测试。不修改 detail/content/types、顶栏入口、团队 RecipientDialog 或权限模型；海外继续走原分支。保留工作区其他人的未提交修改。
- 关联规则：MARKET-01、SPACE-01、ACCESS-01、SHARE-01、ASYNC-01。未改变共享业务基线。模块主责为会议；身份、市场、团队权限关联负责人仍待统筹联合验收。

## 已实现

- 国内导出列表补齐逐字稿、思维导图、图文摘要；未完成生成的内容禁用，下一步和最终导出均校验可用性。
- 文本类导出分别生成 UTF-8 TXT、结构化 JSON、带标题层级的 Markdown `.md`、完整 HTML 文档。HTML 转义用户文本、Markdown 转义原始 HTML；不执行用户富文本脚本。导出采用当前文本及 segments，不传出整个 MeetingDetail、feedbackDetail 或未选择的内容。
- 音频保留仓库已有 `meeting-demo.wav`，下载校验 RIFF/WAVE 头。仓库未找到 MP3，不转码、不把 WAV 伪装为 MP3。该音频仍是详情播放器沿用的样例资源，不是用户会议真实上传文件。
- 原生分享配置支持可用内容全选/逐项选择、3/7/30 天及永久有效、只读预览、生成后复制/查看、历史列表、到期状态与手动失效确认。剪贴板失败保留可手动复制的完整 URL；存储失败保留输入，损坏记录不覆盖。
- 链接使用 `/cn/meeting-share/?token=...`（保留 NEXT_PUBLIC_BASE_PATH）。无须修改现有 app 入口；新页面只显示所选快照，不提供编辑、再共享或团队入口。
- 存储键为 `eureka:meeting-share-links:v1`，通过 marketStorage 自动归入国内命名空间。记录显式保存 cn/personal/owner。生成、复制、失效及访问重检身份、个人域、会议存在/未删除状态。团队记录不可进入这条链路，原团队 RecipientDialog 原子权限不变。
- 访问页响应跨标签页撤销和登出、窗口聚焦，并每秒复核过期/源会议状态；失效后撤下内容。历史操作前读最新记录；不自动迁移或删除原有数据。

## 静态原型限制与数据兼容

这不是公网多人分享服务。链接只在同源、同浏览器存储且登录创建者国内个人账号的环境可访问；换设备、浏览器配置或账号没有分享记录，不可访问。token 不携带内容，不向任何服务器上传会议。生产访问控制、跨设备传播、可靠撤权均需服务端。已复制/下载内容无法被撤回。上述范围仅记录在文档，产品 UI 不放演示说明，也不宣称“任何人可访问”。

生成内容保存的是创建时的所选快照，后续编辑不会静默改变历史链接。保留既有会议字段，兼容可选 segments（含 speakerName 单段别名）、images；没有翻译文本或英文 segments 时不伪造翻译。反馈不属于分享内容。导图仅以 r.title 与 r.summary 为源，与 DomesticAssets 的 Markmap 输入一致；分享预览和只读页使用原生 Markmap，禁用源 Markdown 中的 HTML、图片及链接解析。Markdown 导出保留真实总结的标题/列表层级，JSON 包含 sourceMarkdown，TXT/HTML 提供真实文字大纲，未实现导图 PNG/PDF 图像导出。逐字稿仅使用非空 r.verbatim，不能回退到 transcript、样例文本或旧 verbatimHtml。图文摘要必须生成状态成功且 generated.visualUrl 可用才可选；导出只下载真实原图并依据 MIME 保留格式，拒绝伪造 TXT/JSON/Markdown/HTML 摘要；分享直接显示对应图片，不拼接任何结论或行动项。图片加载/下载失败显示错误，跨域图片下载取决于资源服务的 CORS。

普通图片分享读取已持久化 r.images，接收 PNG/JPEG/WebP/GIF data URL 或同源绝对路径；blob 会话 URL 不进入长期快照。图文摘要另接收生成结果中的 HTTPS 图片 URL，与 DomesticAssets 真实图片输入衔接；图片本体不上传或复制到后端。没有可用图片时禁用。旧分享记录保留原存储；缺少 sourceMarkdown 的历史导图、缺少图片的历史图文摘要不再显示旧文字替代内容，提示重新生成链接。

参会人源码的 `zr=16,jr=16` 分别用于发言人和未发言参会人的**姓名长度**，源码本身未见 16 人总数限制。国内取消人数限制，仅保留两类姓名最多 16 字的约束，不裁剪已有名单。未发言参会人支持增删、独立保存 silentParticipants 并回填。发言人改名不排序、不拼入未发言人，保持 segments.speaker 数字索引；被改名的发言人清除旧单段 speakerName 覆盖，其他片段及索引保留。片段使用实际时间和文本，每个发言人展示前两段；父级可按下述合约提供片段暂停及结束控制，未接入时仍调用现有 seek。海外保留 20 人/30 字与原有保存逻辑。

## 交付验证（待主代理执行）

用户要求此分工不运行 build/tests；未执行构建、测试或浏览器验收。新增 `tests/e2e/domestic-meeting-export-share.spec.ts` 供主代理统一运行，覆盖格式真实性、真实导图源与 Markdown 层级、空逐字稿不回退、图文摘要成功状态与图片 URL、生成禁用、发言人索引/别名、所选快照、市场与个人域隔离、有效期边界、撤销、存储损坏与配额失败。

待验收：

1. Given 国内个人会议，When 分别下载四类文档，Then 后缀、MIME 与正文一致，只有选定内容；WAV 仍可播放。
2. Given 逐字稿为空、导图无总结或图文摘要无成功图片，When 打开导出与分享，Then 对应项不可选；具备成功状态与真实源内容后可选，导图只反映真实总结，图文摘要只下载/显示原图。
3. Given 仅选择总结并生成链接，When 新标签打开，Then 仅见总结；撤销、到期、登出、删除源会议后访问失败。
4. Given 团队会议或海外入口，When 打开现有共享流程，Then 不出现国内个人链接生成权限；既有 RecipientDialog 与海外行为不变。
5. Given 国内参会人改名并增删未发言参会人，When 保存重开，Then 独立字段回填、segments 索引不变、片段与新名称对应；超过 16 人仍可添加，姓名超过 16 字不可保存。
6. 核对 390/768/1440 宽度、键盘焦点、空选项、空历史、存储/剪贴板失败。需要源会议存在，不能仅构造一个不存在的 r 来生成链接。

回滚仅撤销本次 dialogs.tsx 增量与新增模块/路由/测试；保留全部浏览器分享历史及其他脏文件，不执行数据清空。

## 图片预览补充

已读取 MeetingImageDialogs 243203..251933；该段包含前后切换、计数、缩放（1.2 倍，0.2–7）、复位和旋转，未见独立下载按钮。按本轮补充要求在国内预览加入下载，按响应 MIME 保留真实 PNG/JPEG/WebP/GIF/AVIF/BMP 格式；失败反馈且不生成伪后缀文件。没有改动图片删除权限或批量删除逻辑。

`MeetingDialogs` 新增可选参数：

```ts
allImages?: { name: string; url: string }[];
previewIndex?: number;
onPreview?: (index: number) => void;
```

无需更改调用也可工作：默认读取 `r.images`，按已有 `previewImage.url` 定位初始图片，内部维护切换索引。主代理将传 `allImages={r.images}`、`previewIndex={preview}`、`onPreview={setPreview}`，同步详情缩略图和弹窗索引。所有 props 向后兼容，图片持久化接入已由主代理完成。

## 国内重新总结的内容保护

国内尚未接入真实总结生成后端。保留“开始重新总结”按钮名称，点击时仅保存 template、language、detail 配置；不调用固定文案 regenerated()，不提交 summary 或 summaryHtml 字段，保留用户现有总结与富文本，也不标记生成完成、不生成图片。海外继续沿用原逻辑。

待主代理验收：国内已有自定义总结及富文本时，切换模板、语言或详细程度后点击按钮，配置应保存，总结内容与格式应保持不变；保存失败仍保留输入并显示错误。按分工要求未运行 build/tests。

## 国内信息字段、默认模板和保存异常

本轮按已核实源码参数调整国内：标签每个 30 字（仍最多 10 个）、客户/商机各 50 字、位置 30 字，控件与提交校验一致。海外维持标签 20 字、客户/商机 80 字及原保存行为。

国内默认模板唯一读取/写入源是 `createActions(marketStorage, now, actor, space).settings.recordingTemplate`，与 recording.tsx 一致：个人 zhang 使用 `eureka:personal-actions:v1`；其他个人成员及团队使用 `eureka:actions:${space}:${actor}:v1`，外层还有 marketStorage 市场前缀。模板库的旧 defaultName 保留但国内不再读取它，不做历史迁移。点击“设为默认”仅更新模板名称，保留已保存的语言/详细程度，并同步当前选择；“保存设置”保存当前三项设置。团队默认模板属于当前成员在本团队的录音设置，并非管理员配置整个团队；授权、团队到期和成员状态由既有 createActions 重检。只写本地存储，无生产 API 写入。

模板库读取失败不再静默吞错；损坏数据不覆盖，收藏/自定义模板保存失败不更新成功状态、不关闭编辑器，社区使用模板会先完成收藏保存。国内保存操作绑定打开时的市场、工作区、actor 和登录态。MeetingDialogs.onSave 兼容 void 或 Promise<void>，等待成功才关闭；失败显示错误并保留输入，保存期间阻止重复提交和关闭。MeetingInfoDialog 保留模型原有团队原子权限检查，非个人工作区缺失时不会回退个人存储。onSaved 支持异步；若持久化成功但刷新失败，会明确提示并保留表单。

### 父级片段播放合约

```ts
onPlayParticipantSegment?: (segment: {
  key: string;
  start: number; // 秒
  end?: number; // 秒；没有下一段边界时缺省
}) => void;
onStopParticipantSegment?: () => void;
activeParticipantSegmentKey?: string;
```

key 使用会议 ID、发言人索引、开始时间和原片段索引组合，改名不改变 key。点击激活片段再次暂停；弹窗卸载时调用 stop。父级负责定位、播放、在 end 处暂停及同步 active key；end 缺省时以实际音频结尾为界。不再伪造末段“+7秒”终点。主代理仍需在 detail.tsx 接入这三个可选 props；本分工未改 detail.tsx。

### 本轮检查与建议

三个修改文件的 ESLint 与 git diff 空白检查通过；未运行 build、tests 或生产写入。

- 国内分别输入 30/31 字标签、50/51 字客户和商机、30/31 字位置，验证边界与保存；海外核对原长度不变。
- 个人和团队分别设不同默认模板，重开设置、录音保存后检查实际模板；切换市场/成员/工作区不串用，团队到期或移除成员后写入失败。
- 模拟存储配额不足、损坏 JSON、并发模板库改动，以及 onSave/onSaved Promise 拒绝；验证输入和弹窗保留，恢复后可重试，不出现假成功。
- 接入父级片段回调后，验证第二段播放、同段暂停、边界停止、无 end 的末段、关闭弹窗停止；改名后 key 与 speaker 索引保持稳定。
