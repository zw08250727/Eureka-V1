# Airwallex 完整页面支付

- 用户要求：各入口支付从固定尺寸小窗口改为新浏览器完整页面。
- 范围：海外个人订阅、个人／团队 Credits、团队加席及已有订单继续支付；统一复用 useAirwallexCheckout。国内支付不变。
- 主责：支付负责人及市场范围待确认；关联 UI 张伟。人工评审待确认。
- 规则：FE-01/02/09、ASYNC-01、MARKET-01；订单归属、幂等、报价及结果核验无变化。
- 实施：window.open 使用 _blank，移除 popup,width,height 特性，由浏览器按用户偏好打开普通标签页／完整窗口。保留 opener 隔离、失败关闭空白页、服务端结果轮询和成功后关闭支付页返回原页。
- 页面：Airwallex Hosted Checkout 原生页面，不新增 iframe、HTML 页面或支付表单；样式由 Airwallex 提供。
- 验收：各调用方共用同一入口；新页面打开不传小窗口尺寸；只有后端确认 COMPLETED 后调用原成功处理；拦截打开时原页面显示可重试错误。
- 回滚：还原 use-airwallex-checkout.ts 的窗口特性与错误文案，无数据迁移。
- 验证：npm run check、npm run build通过；markets.spec.ts 国内／海外订阅购买与充值回归2例通过。海外测试使用模拟后端回执，未执行真实扣款；团队入口通过统一hook调用核对覆盖。
