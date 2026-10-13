import { test, expect } from "@playwright/test";
import { createMarketStorage } from "../../src/features/markets/storage";
import { routeMarket, markets } from "../../src/features/markets/config";
import { validateConnector } from "../../src/features/connectors/model";
import { ensureSharedCalendarDemo } from "../../src/features/personal/team-daily-demo";
import { createActions } from "../../src/features/personal/store";
import M from "../../src/features/spaces/model/core";
import PS from "../../src/features/spaces/model/subscription";
function memory(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
    clear: () => data.clear(),
  };
}
test("MARKET-01: storage namespaces isolate identical keys, clears and old data", () => {
  const raw = memory(),
    cn = createMarketStorage(raw, "cn"),
    global = createMarketStorage(raw, "global");
  raw.setItem(M.KEY, "legacy");
  cn.setItem(M.KEY, "domestic");
  global.setItem(M.KEY, "overseas");
  expect(cn.getItem(M.KEY)).toBe("domestic");
  expect(global.getItem(M.KEY)).toBe("overseas");
  expect(cn.length).toBe(1);
  expect(cn.key(0)).toBe(M.KEY);
  expect(cn.key(1)).toBeNull();
  cn.clear();
  expect(cn.getItem(M.KEY)).toBeNull();
  expect(global.getItem(M.KEY)).toBe("overseas");
  expect(raw.getItem(M.KEY)).toBe("legacy");
  expect(routeMarket("/cn/workbench/")).toBe("cn");
  expect(routeMarket("/global/")).toBe("global");
  expect(routeMarket("/workbench/")).toBeNull();
  expect(markets.cn.accountRealm).not.toBe(markets.global.accountRealm);
});
test("RIGHTS-01 / ASYNC-01: regional subscription retry is once-only and never changes the other market", () => {
  const raw = memory(),
    cn = createMarketStorage(raw, "cn"),
    global = createMarketStorage(raw, "global");
  const domestic = M.seed(),
    overseas = M.seed();
  global.setItem(M.KEY, JSON.stringify(overseas));
  const w = M.get(domestic, "personal"),
    before = w.credits.total;
  const o = PS.create(w, "month");
  PS.pay(w, o.id, "failure");
  expect(w.credits.total).toBe(before);
  PS.pay(w, o.id, "success");
  PS.pay(w, o.id, "success");
  expect(w.credits.total).toBe(before + markets.cn.benefits.proCredits);
  cn.setItem(M.KEY, JSON.stringify(domestic));
  expect(JSON.parse(global.getItem(M.KEY)!)).toEqual(overseas);
});
test("CONNECT-01: URL and all JSON servers are validated without executing commands", () => {
  expect(() =>
    validateConnector("demo", "javascript:alert(1)", "url", []),
  ).toThrow("HTTP");
  expect(() =>
    validateConnector(
      "demo",
      '{"mcpServers":{"a":{"url":"https://example.com"},"b":{}}}',
      "json",
      [],
    ),
  ).toThrow("每个");
  expect(
    validateConnector(
      "demo",
      '{"mcpServers":{"a":{"command":"example"}}}',
      "json",
      [],
    ).config,
  ).toContain("command");
  expect(() =>
    validateConnector("demo", "https://example.com", "url", [
      {
        id: "1",
        name: "DEMO",
        custom: true,
        connected: false,
        tools: 0,
        description: "",
      },
    ]),
  ).toThrow("名称已存在");
});


test("calendar examples preserve data and only owners can share a single shared schedule", () => {
  const storage=memory(),now=()=>new Date("2026-10-13T08:00:00+08:00");
  ensureSharedCalendarDemo(storage,"team-eureka",now());
  const owner=createActions(storage,now,"zhang","team-eureka");
  const shared=owner.read().records.find(r=>r.title==="项目联合周会")!;
  expect(shared.participants).toContain("Kevin");
  const member=createActions(storage,now,"kevin","team-eureka");
  expect(member.read().records.filter(r=>r.id===shared.id)).toHaveLength(1);
  expect(()=>createActions(storage,now,"lin","team-eureka","zhang").share(shared.id,[])).toThrow("只有本人");
  const incoming=owner.read().records.find(r=>r.source==="dingtalk")!;
  expect(()=>createActions(storage,now,"zhang","team-eureka","lin").share(incoming.id,[])).toThrow("只有本人");
  const prior=JSON.stringify(owner.read());
  ensureSharedCalendarDemo(storage,"team-eureka",now());
  expect(JSON.stringify(owner.read())).toBe(prior);
  const windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,"window");
  Object.defineProperty(globalThis,"window",{configurable:true,value:{dispatchEvent(){}}});
  try { owner.share(shared.id,[]); } finally {
    if(windowDescriptor) Object.defineProperty(globalThis,"window",windowDescriptor);
    else Reflect.deleteProperty(globalThis,"window");
  }
  ensureSharedCalendarDemo(storage,"team-eureka",now());
  expect(member.read().records.filter(r=>r.id===shared.id)).toHaveLength(0);
  expect(owner.read().records.find(r=>r.id===shared.id)?.sharedWith).toEqual([]);
});
