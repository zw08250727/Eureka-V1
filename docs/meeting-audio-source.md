# R4 会议音频来源约束

统一入口 `src/features/meetings/audio-source.ts`：

- `meetingAudioSource(r): string`：返回当前记录的可用音频 URL；无可用音频返回空字符串。
- `isSafeAudioUrl(value: unknown): value is string`：只允许 HTTPS（无用户名／密码）和单斜线开头的同源根路径；拒绝空值、空白／控制字符、反斜线、协议相对 URL、data/blob/file/javascript URL。此校验不替代资源服务的权限检查。
- `deleteSourceAudio=true`、deleted或purged优先禁用。合法显式audioUrl优先；非法显式audioUrl不回退。
- 只有个人baseline.json的20个明确ID和core.seed/enrich的有限团队样例ID可在无URL时使用既有meeting-demo.wav。团队样例包含4条基础会议、8条team-demo、3条daily-insight以及固定2026-10-08至14的双人demo-week；不存在任意前缀放行。新增上传、设备录音、其他ID无音频时不可用。

接线：detail负责使用返回值设置／清空既有audio.src，不应在空字符串分支再回退fixture；此改动未修改detail。MeetingDetail新增可选audioUrl、deleteSourceAudio，团队saveDetail白名单同步保留两者。

导出与分享统一从getExportContent拿audioUrl。真实音频导出请求该资源，保留识别到的原始音频格式；固定WAV仍校验RIFF/WAVE文件头。未知格式、HTTP错误不回退fixture。分享快照保存创建时的原始audioUrl，播放仅引用快照URL；旧快照没有URL时显示缺失，加载失败显示错误，不依据标题、ID或当前页面记录重新找音频。创建音频分享要求有效URL；历史记录不自动迁移或清空。

检查：限定修改文件ESLint通过。临时来源断言覆盖20条个人样例、M.seed截至2026-10-14的29条团队样例、未知ID禁用、删除标记优先、非法显式URL不回退、URL校验、音频导出可用性、快照保持原URL、团队白名单持久化、分享无URL拒绝。未运行build/package，由主代理统一执行。
