export type Cycle = "month" | "year";
export interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "pending" | "removed";
  joined: string;
}
export interface WorkspaceFile {
  id: string;
  title: string;
  owner: string;
  shared: string[];
  duration: number;
  created: string;
  updated: string;
  source: string;
  summary: string;
  transcript: string;
  deleted: boolean;
  deletedAt?: string | null;
  size: string;
  creator: string;
  status: string;
  tags: string[];
  detail: Record<string, unknown>;
  origin?: string;
  visibility?: string;
  recordedWorkspaceId?: string;
  deviceId?: string;
}
export interface Thread {
  id: string;
  user: string;
  title?: string;
  prompt: string;
  answer: string;
  time: string;
  files: string[];
  parentThreadId?: string;
  usage?: { inputTokens: number; outputTokens: number; cost: number };
}
export interface AutomaticTask {
  id: string;
  user: string;
  title: string;
  prompt: string;
  frequency: "daily" | "weekly";
  time: string;
  enabled: boolean;
  runs: { time: string; status: string; threadId?: string }[];
}
export interface Order {
  id: string;
  status: "pending" | "failed" | "paid" | "cancelled";
  amount: number;
  created: string;
  cycle: Cycle;
  currency: string;
  packId?: string;
  credits?: number;
  added?: number;
  fromSeats?: number;
  targetSeats?: number;
  nextDate?: string;
  invoiceId?: string;
}
export interface Invoice {
  id: string;
  date: string;
  amount: number;
  label: string;
  status: string;
}
export interface Workspace {
  demoWeekDays?: string[];
  id: string;
  type: "personal" | "team";
  name: string;
  country: string;
  members: Member[];
  seats: number;
  cycle: Cycle;
  status: "active" | "expired" | "dissolved";
  renew: boolean;
  nextDate: string;
  pendingSeats: number | null;
  pendingCycle?: Cycle | null;
  files: WorkspaceFile[];
  threads: Thread[];
  automaticTasks: AutomaticTask[];
  deletedThreadIds?: string[];
  credits: {
    total: number;
    used: number;
    logs: {
      id: string;
      user: string;
      task: string;
      amount: number;
      time: string;
      inputTokens?: number;
      outputTokens?: number;
    }[];
  };
  billing: { company: string; email: string; taxId: string; method: string };
  invoices: Invoice[];
  audit: { time: string; actor: string; action: string }[];
  security: { externalSharing: boolean };
  seatOrders?: Order[];
  creditOrders?: Order[];
  personalOrders?: Order[];
  personalSubscription?: Subscription;
  closure?: {
    actor?: string;
    name: string;
    endedAt: string;
    frozenCredits: number;
    purchasedSeats: number;
    paidThrough: string;
    invoices: Invoice[];
  };
}
export interface Subscription {
  startsAt?: string;
  plan: string;
  minutes: number;
  credits: number | null;
  renew: boolean;
  cycle: Cycle | null;
  endsAt: string | null;
  nextRefresh: string | null;
}
export interface Device {
  id: string;
  name: string;
  serial: string;
  model: string;
  user: string;
  spaceId: string | null;
  lastSync?: string;
}
export interface WorkspaceState {
  version: number;
  activeId: string;
  account: { id: string; name: string; email: string };
  spaces: Workspace[];
  devices: Device[];
  invitations: { id: string; teamName: string; role: string; status: string }[];
  orders: { id: string; spaceId: string }[];
}
export interface Insight {
  id: string;
  title: string;
  description: string;
  sources: { fileId: string; title: string; quote: string }[];
}
export interface WorkspaceAPI {
  KEY: string;
  SELF: string;
  id(prefix: string): string;
  clone<T>(value: T): T;
  seed(now?: Date): WorkspaceState;
  enrich(s: WorkspaceState, now?: Date): WorkspaceState;
  load(storage: Storage): WorkspaceState;
  get(s: WorkspaceState, id?: string): Workspace;
  member(w: Workspace, id?: string): Member | false | undefined;
  admin(w: Workspace, id?: string): boolean;
  usedSeats(w: Workspace): number;
  writable(w: Workspace): void;
  govern(w: Workspace, actor?: string): void;
  visible(w: Workspace, id?: string): WorkspaceFile[];
  getFile(w: Workspace, id: string, actor?: string): WorkspaceFile;
  teamRecording(w: Workspace, f: WorkspaceFile): boolean;
  price(cycle: Cycle): number;
  create(
    s: WorkspaceState,
    input: {
      name: string;
      country: string;
      cycle: Cycle;
      seats: number;
      orderId: string;
    },
  ): Workspace;
  invite(w: Workspace, emails: string, role?: string, actor?: string): Member[];
  memberAction(
    s: WorkspaceState,
    w: Workspace,
    id: string,
    action: string,
    value?: string,
    actor?: string,
  ): void;
  leave(s: WorkspaceState, w: Workspace, actor?: string): void;
  dissolve(
    s: WorkspaceState,
    w: Workspace,
    name: string,
    actor?: string,
  ): unknown;
  seats(w: Workspace, count: number, actor?: string): void;
  seatQuote(
    w: Workspace,
    count: number,
    actor?: string,
  ): { added: number; amount: number; nextAmount: number };
  createSeatOrder(w: Workspace, count: number, actor?: string): Order;
  paySeatOrder(
    w: Workspace,
    id: string,
    result: "success" | "failure",
    actor?: string,
  ): Order;
  cancelSeatOrder(w: Workspace, id: string, actor?: string): Order;
  CREDIT_PACKS: { id: string; credits: number; amount: number }[];
  creditBalance(w: Workspace): number;
  createCreditOrder(w: Workspace, pack: string, actor?: string): Order;
  payCreditOrder(
    w: Workspace,
    id: string,
    result: "success" | "failure",
    actor?: string,
  ): Order;
  cancelCreditOrder(w: Workspace, id: string, actor?: string): Order;
  advanceCycle(w: Workspace, actor?: string): void;
  log(w: Workspace, action: string, actor?: string): void;
  addFile(
    w: Workspace,
    input: {
      title: string;
      summary?: string;
      transcript?: string;
      source?: string;
      duration?: number;
    },
    actor?: string,
  ): WorkspaceFile;
  edit(
    w: Workspace,
    id: string,
    patch: Partial<WorkspaceFile>,
    actor?: string,
  ): WorkspaceFile;
  saveDetail(
    w: Workspace,
    id: string,
    patch: Record<string, unknown>,
    actor?: string,
  ): WorkspaceFile;
  share(w: Workspace, id: string, users: string[], actor?: string): void;
  trash(w: Workspace, id: string, restore?: boolean, actor?: string): void;
  purge(w: Workspace, id: string, actor?: string): void;
  exportFile(w: Workspace, id: string, actor?: string): unknown;
  importFile(w: Workspace, value: unknown, actor?: string): WorkspaceFile;
  registerDevice(
    s: WorkspaceState,
    wid: string,
    input: { serial: string; model: string; user: string },
    actor?: string,
  ): Device;
  sync(
    s: WorkspaceState,
    id: string,
    actor?: string,
  ): { space: Workspace; file: WorkspaceFile };
  bind(s: WorkspaceState, id: string, wid: string, actor?: string): void;
  insights(
    w: Workspace,
    actor?: string,
    now?: Date,
  ): { items: Insight[]; [key: string]: unknown };
  history(w: Workspace, actor?: string): Thread[];
  conversation(w: Workspace, id: string, actor?: string): Thread[];
  deleteConversation(w: Workspace, id: string, actor?: string): void;
  scheduledTasks(w: Workspace, actor?: string): AutomaticTask[];
  saveTask(
    w: Workspace,
    input: Partial<AutomaticTask>,
    actor?: string,
  ): AutomaticTask;
  runTask(w: Workspace, id: string, actor?: string): unknown;
  ask(
    w: Workspace,
    prompt: string,
    fid?: string | null,
    actor?: string,
    historyId?: string | null,
    options?: { fileIds?: string[]; web?: boolean; appData?: boolean },
  ): { answer: string; cost: number; threadId: string };
  acceptInvite(s: WorkspaceState, id: string): Workspace;
}
