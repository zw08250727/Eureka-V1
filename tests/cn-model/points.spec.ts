import { test, expect } from "@playwright/test";
import "./market-context";
import M from "../../src/features/spaces/model/core";
import PS from "../../src/features/spaces/model/subscription";
import { claimReward } from "../../src/features/account/rewards";
import { creditSummary, creditGrants, debitCredits, addCreditMonths } from "../../src/features/spaces/model/credit-ledger";
const personal = () => M.get(M.seed(), "personal");
test("CN-POINTS-01: exact yuan packs, payment channel, once-only credit, isolated personal/team pools", () => {
  const state=M.seed(), p=M.get(state,"personal"), w=M.get(state,"team-eureka"), before=JSON.stringify(p);
  expect(M.CREDIT_PACKS.map(p=>[p.credits,p.amount])).toEqual([[5000,59],[10000,109],[15000,149]]);
  const old=M.creditBalance(w), order=M.createCreditOrder(w,"credits-15k","zhang");
  expect(order.currency).toBe("CNY"); expect(order.amount).toBe(149);
  M.payCreditOrder(w,order.id,"failure","zhang","微信"); expect(M.creditBalance(w)).toBe(old);
  M.payCreditOrder(w,order.id,"success","zhang","支付宝");
  M.payCreditOrder(w,order.id,"success","zhang","支付宝");
  expect(M.creditBalance(w)).toBe(old+15000); expect(order.method).toBe("支付宝");
  expect(JSON.stringify(p)).toBe(before); expect(w.invoices.filter(i=>i.id===order.invoiceId)).toHaveLength(1);
});
test("RIGHTS-01: members cannot create, settle, or cancel team recharge orders", () => {
  const w=M.get(M.seed(),"team-eureka"), order=M.createCreditOrder(w,"credits-5k","zhang");
  const before=JSON.stringify(w);
  expect(()=>M.createCreditOrder(w,"credits-5k","kevin")).toThrow("管理员");
  expect(()=>M.payCreditOrder(w,order.id,"success","kevin","微信")).toThrow("管理员");
  expect(()=>M.cancelCreditOrder(w,order.id,"kevin")).toThrow("管理员");
  expect(JSON.stringify(w)).toBe(before);
});
test("ASYNC-01: obsolete quotes, incorrect payment methods, expired orders and foreign workspaces reject without grants", () => {
  const state=M.seed(), w=M.get(state,"personal"), t=M.get(state,"team-eureka"), order=M.createCreditOrder(w,"credits-5k");
  const balance=M.creditBalance(w);
  expect(()=>M.payCreditOrder(t,order.id,"success")).toThrow("不属于");
  expect(()=>M.payCreditOrder(w,order.id,"success","zhang","PayPal")).toThrow("支付方式");
  const original=order.amount;order.amount=1;
  expect(()=>M.payCreditOrder(w,order.id,"success")).toThrow("报价");order.amount=original;
  expect(()=>M.payCreditOrder(w,order.id,"success","zhang","微信",new Date(order.expiresAt!))).toThrow("过期");
  expect(M.creditBalance(w)).toBe(balance);
});
test("CN-POINTS-02: paid credits expire one calendar year after payment; expired credits cannot be consumed", () => {
  const w=personal(), old=M.creditBalance(w), order=M.createCreditOrder(w,"credits-5k");
  const now=new Date();M.payCreditOrder(w,order.id,"success","zhang","微信",now);
  expect(order.creditsExpireAt).toBe(addCreditMonths(now.toISOString(),12));
  debitCredits(w,200);w.credits.used+=200;
  expect(creditSummary(w).categories.recharge).toBe(4800);
  const expiry=new Date(order.creditsExpireAt!);
  expect(M.creditBalance(w,new Date(expiry.getTime()-1))).toBe(old+4800);
  expect(M.creditBalance(w,expiry)).toBe(old);
  expect(creditSummary(w,expiry).expired).toBe(4800);
  expect(()=>debitCredits(w,old+1,expiry)).toThrow("不足");
  expect(addCreditMonths("2024-02-29T12:00:00.000Z",12)).toBe("2025-02-28T12:00:00.000Z");
});
test("CN-POINTS-02: original balances and records remain intact when adding classified credits", () => {
  const w=personal(); w.credits.total=28200;w.credits.used=6000;
  const logs=JSON.stringify(w.credits.logs), order=M.createCreditOrder(w,"credits-5k");
  M.payCreditOrder(w,order.id,"success");
  expect(creditGrants(w).find(g=>g.id==='opening')?.remaining).toBe(22200);
  expect(w.credits.total).toBe(33200);expect(w.credits.used).toBe(6000);
  expect(JSON.stringify(w.credits.logs)).toBe(logs);
});
test("CN-MEMBER-01: professional pricing, one-time purchase, independent rights, monthly grants are idempotent", () => {
  const state=M.seed(), w=M.get(state,"personal"), t=M.get(state,"team-eureka"), before=JSON.stringify(t), old=M.creditBalance(w);
  expect(PS.current(w).plan).toBe("免费版");
  const order=PS.create(w,"year");expect([order.amount,order.currency]).toEqual([199,"CNY"]);
  PS.pay(w,order.id,"success","微信","2026-01-31T12:00:00.000Z");
  expect(w.personalSubscription?.renew).toBe(false);
  expect(M.creditBalance(w)).toBe(old+5000);
  PS.refresh(w,"2026-02-28T12:00:00.000Z");PS.refresh(w,"2026-02-28T12:00:00.000Z");
  expect(M.creditBalance(w)).toBe(old+10000);
  expect(w.personalSubscription?.nextRefresh).toBe("2026-03-31T12:00:00.000Z");
  PS.refresh(w,"2027-01-31T12:00:00.000Z");
  expect(M.creditBalance(w)).toBe(old+12*5000); expect(PS.current(w,"2027-01-31T12:00:00.000Z").plan).toBe("免费版");
  expect(JSON.stringify(t)).toBe(before);
  const month=PS.create(personal(),"month");expect(month.amount).toBe(50);
});
test("CN-POINTS-03: sign-in and feedback limits and natural-month reset", () => {
  const w=personal(), before=M.creditBalance(w);
  for(let day=1;day<=15;day++)claimReward(w,"zhang","signin","",new Date(2026,9,day,12));
  claimReward(w,"zhang","signin","",new Date(2026,9,1,12));
  expect(M.creditBalance(w)).toBe(before+15000);
  expect(()=>claimReward(w,"zhang","signin","",new Date(2026,9,16,12))).toThrow("上限");
  for(let i=0;i<10;i++)claimReward(w,"zhang","feedback",`使用反馈内容${i}`,new Date(2026,9,1,12));
  expect(()=>claimReward(w,"zhang","feedback","另一条新的反馈",new Date(2026,9,1,12))).toThrow("上限");
  claimReward(w,"zhang","signin","",new Date(2026,10,1,12));
  expect(M.creditBalance(w)).toBe(before+21000);
});
test("EXPIRE-01: expired teams reject recharge and never consume personal credits", () => {
  const state=M.seed(), w=M.get(state,"team-eureka"), p=M.get(state,"personal"), before=JSON.stringify(p);
  const order=M.createCreditOrder(w,"credits-5k"); w.status="expired";
  expect(()=>M.payCreditOrder(w,order.id,"success")).toThrow("只读");
  expect(()=>M.createCreditOrder(w,"credits-5k")).toThrow("只读");
  expect(JSON.stringify(p)).toBe(before);
});
test('CN: an old unpaid USD personal order gets a fresh quote while a paid old invoice stays unchanged',()=>{
 const w=personal(), old=PS.create(w,'year');old.currency='USD';old.amount=99.99;
 const next=PS.create(w,'year');expect(next.id).not.toBe(old.id);expect(old.status).toBe('cancelled');expect(next.currency).toBe('CNY');expect(next.amount).toBe(199);
 expect(old.amount).toBe(99.99);expect(old.currency).toBe('USD');
});
