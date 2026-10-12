# CN 会议音频播放器独立组件

`src/features/meetings/domestic-audio-player.tsx` 导出 `DomesticAudioPlayer`、`DomesticAudioPlayerProps`、`DomesticAudioStatus` 和 `formatDomesticAudioTime`；自带 CSS 导入。仅新增组件、CSS及本文档，不改 detail，不新增 audio 标签、音频请求、依赖或媒体源。

## Props 合约

```ts
interface DomesticAudioPlayerProps {
  time: number;
  duration: number;
  speed: number;
  playing: boolean;
  marks?: MeetingDetail['marks']; // number[]，单位秒
  status?: 'loading' | 'ready' | 'buffering' | 'error'; // 默认 ready
  buffered?: number; // 当前播放位置所在缓冲区间的结束秒数，默认0
  error?: string; // 非空时优先呈现失败态
  disabled?: boolean; // 整体不可操作，默认false；不是readonly
  onTogglePlay: () => void;
  onSeek: (seconds: number, autoplay: boolean) => void;
  onSpeedChange: (speed: number) => void;
  onRetry?: () => void;
}
```

时间轴、±15秒调用 `onSeek(seconds, false)`，不改变播放／暂停状态；重点标记点击调用 `onSeek(seconds, true)`，跳转后播放，与官方行为一致。父级既有 `seek(n, autoplay)` 可直接传入。回调前将定位时间限制在0至duration；过滤非法、重复及超出真实媒体时长的标记，仅影响展示，不更改原始 marks。时间显示支持 `HH:MM:SS`。

倍速提供0.5、0.75、1、1.25、1.5、2；父级更新 speed 并设置既有 audio.current.playbackRate。播放器不持有 audio ref，不主动读取／修改任何媒体元素。

`status=loading` 或 duration 未就绪时禁用播放、定位和倍速；buffering 显示状态且播放中的音频仍可暂停；error 禁用媒体操作，若有 onRetry 则显示重试。父级负责捕获 play() rejection 并设置 error，组件不会自行吞错或假定播放成功。播放状态始终以父级 onPlay/onPause/onEnded 回传为准。

`disabled` 用于音频整体不可操作，不要直接等同于会议 readonly：只读会议仍可播放。缓冲位置只接受秒数并做边界保护；若媒体有多个 buffered ranges，父级应传当前播放点所在 range 的 end，而非最后区间末尾。

## detail 最小接线

```tsx
<DomesticAudioPlayer
  time={time}
  duration={duration}
  speed={speed}
  playing={playing}
  marks={r.marks}
  status={audioStatus}
  buffered={bufferedEnd}
  error={audioError}
  onTogglePlay={() => {
    if (playing) audio.current?.pause();
    else {
      void audio.current?.play().catch(() => {
        setAudioError('音频暂时无法播放，请重试');
        setAudioStatus('error');
      });
    }
  }}
  onSeek={seek}
  onSpeedChange={value => {
    setSpeed(value);
    if (audio.current) audio.current.playbackRate = value;
  }}
  onRetry={() => {
    setAudioError('');
    setAudioStatus('loading');
    audio.current?.load(); // 复用现有src，不更换fixture
  }}
/>
```

以上状态名仅为接线示例；由主代理自行维护。现有隐藏 audio 标签保持原位和原始 fixture/blob 加载流程，在原有事件上补充：

| audio事件 | 状态更新 |
| --- | --- |
| loadstart | 清错误、bufferedEnd=0、status=loading |
| loadedmetadata | 保留现有duration更新；元数据不等于已能播放，可等canplay |
| canplay / playing | 清错误、status=ready；playing继续同步真实播放状态 |
| waiting / stalled | status=buffering；不要把playing强制改false，否则无法在缓冲时暂停 |
| progress / timeupdate | 同步当前缓冲区间结束时间；timeupdate继续更新time |
| error | status=error，设置可读失败原因；不要更换为其他媒体或伪造成功 |
| pause / ended | 保留setPlaying(false)；播放结束的时间重置沿用父级逻辑 |

`seek(n,true)` 内部的 play() rejection 也需要归并同一失败状态。切换记录时继续由 detail 暂停、重置time及状态，不能将上一个音频错误带入新记录。组件不读写存储、不改会议marks，也不管理音频生命周期。

## 来源、布局和验收

官方源码依据：用户提供的 `/tmp/baizhi-detail-source/index-DEbbywsx.js` 内 `AudioPlayer`（`__name:"AudioPlayer"` 位于字符46877），提取只读参考保存在 `/tmp/baizhi-detail-source/audio-player.txt`。核对了6档倍速、前后15秒、缓冲轨道、蓝色播放轨道、重点标记悬浮时间、标记自动播放、加载及失败行为。

遵从本轮“不要改变现有布局”：继续使用 md-player 行、控件顺序、md-elapsed/md-duration/md-seek/md-speed标识和桌面原有间距。没有强行改为官方557×46px浮卡；新CSS限定在cn-audio-player下，状态气泡不占正文行高。小屏收紧间距，基础操作触控高度增大；错误和加载消息有alert/status语义。采用既有MdButton/MdIcon、Select，快捷键仅作用于获得焦点的播放器区域，不注册全局keydown。

范围：仅国内会议播放器展示，遵守MARKET-01、SHARE-01，不改变市场、权限、媒体来源或异步持久化规则；海外旧播放器不受组件CSS影响。主代理负责detail集成、媒体事件接线和两地集成验收。

检查：ESLint、隔离TypeScript通过。独立真实浏览器验证播放回调、±15秒不自动播放、合法去重标记跳转并播放、倍速、原生range键盘与上下界、局部快捷键不影响外部编辑器、缓冲中暂停、失败重试、加载禁用、没有新增audio标签、390px无横向溢出；运行时无错误。已目视检查1440px和390px播放器截图。未跑build，未变更detail及fixture来源。
