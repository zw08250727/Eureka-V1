# 海外价格预览同步（2026-10-19）

来源：通过本地服务凭证只读查询 Airwallex Sandbox `/api/v1/billing/products`、`/api/v1/billing/prices`，仅使用 active 的 USD 价格。未修改远端商品。

| 商品 | Price ID | 配置 |
| --- | --- | --- |
| Team Seat 月付 | pri_sgpv4vrlshncesbtjk6 | $19.99 / 席 / 月 |
| Team Seat 年付 | pri_sgpvxj9q6hncetv8e7k | $149.99 / 席 / 年；月均展示 $12.50 |
| Credits | pri_sgpv4vrlshncgozq53w | PER_UNIT，lot.size=1000，rounding_mode=UP，$9.99 / 1000 Credits |

三种价格 tax_included=false。没有首购优惠或数量折扣。保留现有 5000/10000/15000 Credits 档位，对应 $49.95/$99.90/$149.85。

范围：海外团队开通、订阅、续费、加席和个人／团队 Credits 预览及新订单计算。移除没有价格依据的划线价、首次八折和最划算标签；复用原组件和布局。个人订阅没有匹配沙盒商品，保留现价。国内独立配置不变。既有历史订单／账单不迁移或改价，旧待支付席位报价由现有模型金额校验拦截后重新确认。

模块：订阅／订单、Credits；关联 MARKET-01、ASYNC-01、FE-08。金额来源统一为 global.json。价格为当前沙盒快照，并非运行时自动同步；后续远端改价需重新核对。Credits 支付方式仍为原型流程，本次仅同步价格。

验收：npm run check；本地海外订阅与 Credits 渲染核对。回滚恢复本次配置和条件展示变更，不清空浏览器数据。
