import type { Workspace, Subscription, Order, Cycle } from "./types";
declare const model: {
  current(w: Workspace, now?: string): Subscription;
  create(w: Workspace, cycle: Cycle): Order;
  get(w: Workspace, id: string): Order;
  cancel(w: Workspace, id: string): Order;
  pay(
    w: Workspace,
    id: string,
    result: "success" | "failure",
    method?: string,
    now?: string,
  ): Order;
  renew(w: Workspace, value: boolean): Subscription;
  restore(w: Workspace): Subscription;
};
export default model;
