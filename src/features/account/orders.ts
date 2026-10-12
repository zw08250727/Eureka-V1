import { M } from "@/features/spaces/model/store";
import type { Workspace, Order } from "@/features/spaces/model/types";

export type AccountOrder = Order & { kind: "personal" | "credit"; paidAt?: string };
export function assertOrderAccess(w: Workspace, actor: string) {
  if (w.type === "team") M.govern(w, actor);
  else if (!M.member(w, actor)) throw Error("无权访问此工作区账单");
}
export function accountOrders(w: Workspace, actor: string): AccountOrder[] {
  assertOrderAccess(w, actor);
  return [
    ...(w.creditOrders || []).map(o => ({ ...o, kind: "credit" as const })),
    ...(w.type === "personal" ? w.personalOrders || [] : []).map(o => ({ ...o, kind: "personal" as const })),
  ].sort((a, b) => b.created.localeCompare(a.created) || b.id.localeCompare(a.id));
}
export function orderReceipt(w: Workspace, actor: string, kind: AccountOrder["kind"], id: string) {
  const order = accountOrders(w, actor).find(o => o.id === id && o.kind === kind);
  if (!order || order.status !== "paid") throw Error("仅已支付订单可下载账单");
  return {
    filename: `${order.invoiceId || order.id}.txt`,
    text: `EurekaMind 账单（本地模拟）\n工作区：${w.name}\n订单：${order.id}\n账单：${order.invoiceId || "—"}\n商品：${kind === "personal" ? `Pro · ${order.cycle === "year" ? "年付" : "月付"}` : `${order.credits?.toLocaleString()} Credits`}\n金额：${order.amount} ${order.currency || "USD"}\n支付时间：${order.paidAt || order.created}\n未发生真实扣款。`,
  };
}
