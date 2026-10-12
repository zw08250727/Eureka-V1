import modules from "../../../spc/modules.json";
import prd from "@/prototype/prd/content.json";
import { markets, marketUrl } from "@/features/markets/config";
import { basePath, prdUrl } from "@/lib/routes";
import "./review.css";
export default function ReviewPage() {
  const release = process.env.NEXT_PUBLIC_RELEASE_MARKET;
  const visible = (["cn", "global"] as const).filter(
    (id) => !release || id === release,
  );
  const rows = [
    ["品牌", markets.cn.brand, markets.global.brand],
    ["个人/团队账号域", markets.cn.accountRealm, markets.global.accountRealm],
    ["企业账号域", "baizhi-enterprise:100001", "—"],
    [
      "个人/团队登录渠道",
      markets.cn.providers.join(" / "),
      markets.global.providers.join(" / "),
    ],
    ["主题", "百智黑白灰 · 亮蓝 #165DFF", "靛蓝色 · #3858b6"],
    ["Agent 身份", markets.cn.agent.id, markets.global.agent.id],
    [
      "MCP / Skills 前缀",
      `${markets.cn.agent.mcpPrefix} / ${markets.cn.agent.skillPrefix}`,
      `${markets.global.agent.mcpPrefix} / ${markets.global.agent.skillPrefix}`,
    ],
    [
      "连接器目录",
      markets.cn.connectors.map((c) => c.name).join("、"),
      markets.global.connectors.map((c) => c.name).join("、"),
    ],
    [
      "个人订阅（月 / 年）",
      `CNY ${markets.cn.personal.month.amount} / ${markets.cn.personal.year.amount}`,
      `USD ${markets.global.personal.month.amount} / ${markets.global.personal.year.amount}`,
    ],
    [
      "专业版 / Pro 每月积分",
      String(markets.cn.benefits.proCredits),
      String(markets.global.benefits.proCredits),
    ],
    ["配置版本", markets.cn.revision, markets.global.revision],
  ];
  return (
    <main className="review-board">
      <header>
        <a href={`${basePath}/`}>← 演示入口</a>
        <a href={prdUrl}>完整 PRD ↗</a>
      </header>
      <p className="review-board-eyebrow">EUREKAMIND / PRODUCT ALIGNMENT</p>
      <h1>让每次迭代，都有共同依据。</h1>
      <p className="review-board-lead">
        市场差异、模块依赖与交付标准，在这里统一核对。
      </p>
      <div className="review-board-meta">
        <span>业务基线 {modules.rulesVersion}</span>
        <span>PRD {prd.revision}</span>
        <span>SPC {modules.version}</span>
      </div>
      <section>
        <div className="review-section-title">
          <h2>01 · 国内与海外</h2>
          <div>
            {visible.map((id) => (
              <a key={id} href={marketUrl(id)}>
                {markets[id].label}原型 ↗
              </a>
            ))}
          </div>
        </div>
        <p>
          账号独立；各市场内个人与团队共用账号。国内充值及专业版价格已核对线上；标准版、卓越版价格和团队人民币定价仍待确认。海外沿用原有配置。
        </p>
        <div className="review-table-wrap">
          <table>
            <thead>
              <tr>
                <th>对照项</th>
                <th>国内版</th>
                <th>海外版</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((v, i) =>
                    i === 0 ? <th key={i}>{v}</th> : <td key={i}>{v}</td>,
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <div className="review-section-title">
          <h2>02 · 模块与主责</h2>
          <span>待认领 ≠ 已通过评审</span>
        </div>
        <p>
          模块 PM 同时维护公共规则与两地差异。跨模块变更须由关联模块联合评审。
        </p>
        <div className="review-table-wrap">
          <table>
            <thead>
              <tr>
                <th>模块 / 主责</th>
                <th>关联模块</th>
                <th>规则依据</th>
                <th>原型与需求</th>
              </tr>
            </thead>
            <tbody>
              {modules.modules.map((m) => (
                <tr key={m.id}>
                  <th>
                    {m.name}
                    <small>
                      {m.owner} · {m.status}
                    </small>
                  </th>
                  <td>
                    {m.dependencies
                      .map(
                        (id) => modules.modules.find((m) => m.id === id)!.name,
                      )
                      .join("、")}
                  </td>
                  <td>{m.rules.join(" / ")}</td>
                  <td>
                    <div className="review-links">
                      {visible.map((id) => (
                        <a
                          key={id}
                          href={marketUrl(
                            id,
                            m.view === "auth" ? "" : `workbench/?view=${m.view}&space=personal&review=1`,
                          )}
                        >
                          {markets[id].label}
                        </a>
                      ))}
                      <a href={`${prdUrl}#${m.chapters[0]}`}>PRD 规则 ↗</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>03 · 合入前核对</h2>
        <div className="review-check-grid">
          {[
            [
              "账号与归属",
              "两地身份互不通用；个人／团队切换不迁移数据与权益。",
            ],
            [
              "订阅与 Credits",
              "支付失败不生效、重试不重复发放、订单归属不随页面切换。",
            ],
            [
              "Agent 与连接器",
              "授权属于市场、本人及工作区；断连后不再使用对应工具。",
            ],
            [
              "会议与日程待办",
              "来源可追溯，生成草稿经确认保存；访问来源仍需独立鉴权。",
            ],
            [
              "权限与状态",
              "到期、移除、撤权影响页面及后续执行；失败保留输入。",
            ],
            ["UI 与组件", "两地主题、390/768/1440px、键盘焦点、空错慢状态。"],
          ].map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <p className="review-footnote">
          此页展示配置与检查标准，不自动宣称验收通过。实际结果以当次
          CI、测试报告和 PM 评审记录为准。仓库规范入口：spc/README.md。
        </p>
      </section>
    </main>
  );
}
