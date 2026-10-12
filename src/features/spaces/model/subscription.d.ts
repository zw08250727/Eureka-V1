import type { Workspace, Subscription, Order, Cycle } from "./types";
declare const model: {
  refresh(w: Workspace, now?: string): void;
  current(w: Workspace, now?: string): Subscription;
  create(w: Workspace, cycle: Cycle, tier?: string): Order;
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
