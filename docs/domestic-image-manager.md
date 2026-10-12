# CN 会议全部图片组件

源码依据：从线上页面获取并下载核对的 `https://100wiser.com/static/js/index-DEbbywsx.js` 中 `MeetingImageDialogs`，指定区间243203..251933。保留查看图片、五列150px左右网格、438px最大滚动区、批量删除、选中遮罩、删除确认的颜色和结构；用 MdDialog 原生 dialog 承载，不嵌入 iframe。小屏改为两列；按钮支持键盘操作与可访问名称。

组件：`src/features/meetings/domestic-image-manager.tsx`，导出 `DomesticImageManager`、`DomesticImageManagerProps`，自带 CSS 导入。未修改 detail 或共享 Dialog。

```tsx
<DomesticImageManager
  images={images}
  readonly={readonly}
  onClose={() => setAllImages(false)}
  onPreview={(index) => openPreview(index)}
  onDelete={async (indices) => {
    // 重检市场、记录、工作区及权限；持久化成功后更新父级 images。
    // 失败必须 throw；不得吞错后正常 resolve。
    await deleteImages(indices);
  }}
/>
```

- `images: { name: string; url: string }[]`：只展示父级提供的真实图片；点击缩略图在普通模式调用 `onPreview(index)`，批量模式切换选中。
- `readonly: boolean`：不显示批量入口、单图删除或选框，允许预览。提交时再次检查。
- `onDelete: (indices: number[]) => void | Promise<void>`：同步 void 接口兼容；同步抛错、异步 reject 均显示错误并保留选择。回调拿到去重、升序的当前列表索引。请基于原列表一次过滤删除，避免逐个 splice 导致索引移动。
- `initialSelection?: number[]`：仅在挂载时读取，过滤无效和重复索引。非空且可写时直接展示删除确认，适合旧单图删除按钮传 `[index]`；取消或成功调用 `onClose`。更换快捷删除目标时请重新挂载或设置 key。
- 普通管理模式确认删除成功后留在网格；取消确认保留批量选择；取消批量清空选择。
- 等待 Promise 时禁用确认／取消，隐藏关闭控件，并拦截 Esc 关闭；锁避免重复提交。失败后可再次确认。组件不会自删图片、伪造存储成功或直接访问浏览器存储。
- 选择按名称、URL及重复出现次序跟踪，提交前映射当前索引；选中项已消失时拒绝提交并提示重新选择。异步期间图片并发变化仍由父级依 ASYNC-01 保存任务快照并处理冲突。

规则范围：仅国内会议个人／团队图片管理，遵守 SHARE-01、EXPIRE-01、ASYNC-01。海外实现与数据不受此独立组件影响；接线及两地集成验收由主代理负责。

验收：定向 ESLint、隔离 TypeScript 检查通过；独立真实浏览器通过预览回调、批量选择／取消、确认回调索引、异步失败保留选择、删除中按钮及Esc锁定、成功更新网格、单图快捷确认与取消、只读保护、390px弹窗无横向溢出，浏览器无运行时错误。已目视检查1440px批量态和390px只读网格。未运行 build，未新增依赖。
