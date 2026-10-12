import { test, expect } from "@playwright/test";
import "./market-context";
import M from "../../src/features/spaces/model/core";
import PS from "../../src/features/spaces/model/subscription";
import { createTimeOrder, payTimeOrder, cancelTimeOrder, timeBalance, allocateMinutes } from "../../src/features/spaces/model/time-packs";
import { accountOrders, orderReceipt } from "../../src/features/account/orders";
const personal = () => M.get(M.seed(), "personal");
test("CN-MEMBER-01: both paid tiers carry exact quotes, benefits, and repeat-safe monthly grants", () => {
  for (const [tier, cycle, amount, points, minutes] of [["professional","month",50,5000,3000],["professional","year",199,5000,3000],["excellent","month",100,10000,Infinity],["excellent","year",599,10000,Infinity]] as const) {
    const w = personal(), before = M.creditBalance(w), order = PS.create(w, cycle, tier);
    expect(order.amount).toBe(amount);
    PS.pay(w, order.id, "success", "支付宝"); PS.pay(w, order.id, "success", "支付宝");
    expect(M.creditBalance(w)).toBe(before + points);
    expect(PS.current(w).minutes).toBe(minutes);
    expect(PS.current(w).tier).toBe(tier);
    expect(PS.current(w).credits).toBe(points);
    expect(() => PS.create(w, cycle, tier)).toThrow("无需重复");
  }
});
test("CN-MEMBER-01: tier switching requotes pending orders and active excellent cannot downgrade", () => {
  const w = personal(), pro = PS.create(w,"year"), elite = PS.create(w,"year","excellent");
  expect(pro.status).toBe("cancelled"); expect(elite.amount).toBe(599);
  PS.pay(w,elite.id,"success");
  expect(()=>PS.create(w,"month","professional")).toThrow("卓越版");
});
test("CN-TIME-01: package payment, receipt, retries, cancellation, expiry, quote and scope validation", () => {
  const state=M.seed(), w=M.get(state,"personal"), team=M.get(state,"team-eureka"), before=JSON.stringify(team);
  const o=createTimeOrder(w,"time-2000","2026-01-31T12:00:00.000Z");
  expect([o.amount,o.minutes,o.currency]).toEqual([69,2000,"CNY"]);
  expect(()=>payTimeOrder(w,o.id,"success","微信",o.expiresAt!)).toThrow("过期");
  expect(()=>createTimeOrder(team,"time-120")).toThrow("个人");
  expect(()=>payTimeOrder(w,o.id,"success","PayPal",o.created)).toThrow("支付方式");
  payTimeOrder(w,o.id,"failure","微信",o.created);expect(timeBalance(w,o.created).packs).toBe(0);
  payTimeOrder(w,o.id,"success","微信",o.created);payTimeOrder(w,o.id,"success","微信",o.created);
  expect(o.validUntil).toBe("2028-01-31T12:00:00.000Z");expect(timeBalance(w,o.created).packs).toBe(2000);
  expect(accountOrders(w,"zhang").filter(o=>o.kind==='time')).toHaveLength(1);
  expect(orderReceipt(w,"zhang","time",o.id).text).toContain("2000 分钟加时包");
  expect(timeBalance(w,o.validUntil).packs).toBe(0);expect(JSON.stringify(team)).toBe(before);
  const cancelled=createTimeOrder(w,"time-120");cancelTimeOrder(w,cancelled.id);
  expect(()=>payTimeOrder(w,cancelled.id,"success","微信")).toThrow("取消");
  const bad=createTimeOrder(w,"time-1000");bad.amount=1;
  expect(()=>payTimeOrder(w,bad.id,"success","微信")).toThrow("报价");
});
test("CN-TIME-01: consume earliest expiry, respect monthly quota reset, no duplicate or overdraw", () => {
  const w=personal(), now="2026-10-12T00:00:00.000Z", o=createTimeOrder(w,"time-120","2024-10-13T00:00:00.000Z");
  payTimeOrder(w,o.id,"success","微信",o.created);
  const allocations=allocateMinutes(w,150,now);
  expect(allocations[0]).toEqual({source:o.id,minutes:120});
  w.transcriptionUsage={used:150,logs:[{id:"record",workspaceId:w.id,user:"zhang",minutes:150,time:now,allocations}]};
  expect(timeBalance(w,now).quota).toBe(270);expect(timeBalance(w,now).packs).toBe(0);
  expect(()=>allocateMinutes(w,271,now)).toThrow("不足");
  expect(timeBalance(w,"2026-11-01T00:00:00.000Z").quota).toBe(300);
  const p=personal();M.consumeMinutes(p,"same",10);M.consumeMinutes(p,"same",10);
  expect(timeBalance(p).quota).toBe(290);
});
