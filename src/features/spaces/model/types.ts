import type { ThoughtRecord } from "@/features/workbench/model/types";
export type Cycle = "month" | "year";
export interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "pending" | "removed";
  joined: string;
  leftAt?: string;
  exitReason?: string;
}
export interface WorkspaceFile {
  createdBy?: string;
  previousOwner?: string;
  transferredAt?: string;
  id: string;
  title: string;
  owner: string;
  shared: string[];
  editors?: string[];
  bindingId?: string;
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
  rawAudio?: boolean;
  processingPaused?: boolean;
  origin?: string;
  visibility?: string;
  recordedWorkspaceId?: string;
  deviceId?: string;
  sourceAccountId?: string;
  sourceRecordId?: string;
  sourceFileId?: string;
  sharedAt?: string;
}
export interface Thread {
  recordingId?: string;
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
  currency?: string;
  label: string;
  status: string;
}
export interface DeviceThought extends ThoughtRecord {
  shared?: string[];
  editors?: string[];
  bindingId?: string;
  sourceThoughtId?: string;
  sharingMode?: string;
  owner: string;
  deviceId?: string;
  sourceRecordId?: string;
  sourceAccountId?: string;
  sharedAt?: string;
}
export interface Workspace {
  demoArchived?: boolean;
  ownershipTransfers?: { id: string; from: string; to: string; time: string }[];
  customerDemoVersion?: number;
  customerSharing?: Record<string, boolean>;
  contentSharing?: Record<string, Partial<Record<"meetings" | "thoughts", { enabled: boolean; users: string[]; editors?: string[] }>>>;
  entitlementResumedAt?: string;
  entitlementFreeze?: { since: string; teamIds: string[] };
  transcriptionUsage?: { used: number; logs: { id: string; workspaceId: string; user: string; minutes: number; time: string }[] };
  thoughts?: DeviceThought[];
  demoAdminVersion?: number;
  demoWeekDays?: string[];
  id: string;
  type: "personal" | "team";
  name: string;
  country: string;
  members: Member[];
  seats: number;
  cycle: Cycle;
  status: "active" | "expired" | "cancelled" | "dissolved";
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
  frozen?: boolean;
  frozenSince?: string;
  remainingDays?: number;
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
  bound: boolean;
  /** Fixed workspace binding; missing legacy values require owner confirmation. */
  spaceId?: string | null;
  bindings?: { id: string; workspaceId: string; boundAt: string; unboundAt?: string; revoked?: boolean }[];
  localFiles?: unknown[];
  wipeStatus?: "pending" | "completed";
  wipedAt?: string;
  lastSync?: string;
}
export interface CapturePreferences {
  workspaceId: string;
  teams: Record<string, Partial<Record<"meetings" | "thoughts", { enabled: boolean; users: string[]; editors?: string[] }>>>;
}
export interface WorkspaceState {
  demoWorkspaceCleanupVersion?: number;
  privateContentVersion?: number;
  captureSettings?: Record<string, CapturePreferences>;
  accountDevicesVersion?: number;
  accountSpaces?: Record<string, Workspace>;
  version: number;
  activeId: string;
  account: { id: string; name: string; email: string };
  spaces: Workspace[];
  devices: Device[];
  invitations: { id: string; workspaceId?: string; teamName: string; role: string; status: string }[];
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
  teamPricing: Record<Cycle, { monthly: number; originalMonthly: number; firstAmount: number; renewalAmount: number; currency: string }>;
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
  canShare(w: Workspace, record: WorkspaceFile | undefined, actor?: string): boolean;
  canEdit(w: Workspace, record: WorkspaceFile | DeviceThought | undefined, actor?: string): boolean;
  share(w: Workspace, id: string, users: string[], actor?: string, editors?: string[]): void;
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
  contentPreferences(w: Workspace, actor?: string): Partial<Record<"meetings" | "thoughts", { enabled: boolean; users: string[]; editors?: string[] }>>;
  applyContentSharing(w: Workspace, record: WorkspaceFile | DeviceThought, kind: "meetings" | "thoughts", actor?: string): void;
  capturePreferences(s: WorkspaceState, actor?: string): CapturePreferences;
  setCaptureSpace(s: WorkspaceState, wid: string, actor?: string): void;
  setCustomerSharing(s: WorkspaceState, wid: string, enabled: boolean, actor?: string): void;
  setDeviceSharing(s: WorkspaceState, wid: string, owner: string, kind: "meetings" | "thoughts", enabled: boolean, users: string[], actor?: string, editors?: string[]): void;
  addThought(w: Workspace, input: { title: string; detail: string }, actor?: string): DeviceThought;
  editThought(w: Workspace, id: string, input: { title: string; detail: string }, actor?: string): DeviceThought;
  shareThought(w: Workspace, id: string, users: string[], actor?: string, editors?: string[]): void;
  accountSpace(s: WorkspaceState, actor?: string): Workspace;
  deviceList(s: WorkspaceState, wid: string, actor?: string): Device[];
  unbind(s: WorkspaceState, id: string, actor?: string): void;
  visibleThoughts(w: Workspace, actor?: string): DeviceThought[];
  syncThought(s: WorkspaceState, id: string, actor?: string, input?: { sourceId?: string; title?: string; detail?: string; workspaceId?: string; bindingId?: string }): { space: Workspace; thought: DeviceThought; rawAudio?: WorkspaceFile; sharedTeam?: Workspace; sharedTeams?: Workspace[]; duplicate?: boolean };
  sync(
    s: WorkspaceState,
    id: string,
    actor?: string,
    input?: { sourceId?: string; title?: string; workspaceId?: string; bindingId?: string },
  ): { space: Workspace; file: WorkspaceFile; sharedTeam?: Workspace; sharedTeams?: Workspace[]; duplicate?: boolean };
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
  accountTeams(s: WorkspaceState, actor?: string): Workspace[];
  reconcileEntitlements(s: WorkspaceState, now?: Date): void;
  assertEntitlement(w: Workspace, actor?: string): void;
  simulatedTokenUsage(input: string, output: string): { inputTokens: number; outputTokens: number };
  settleCredits(w: Workspace, runId: string, prompt: string, usage: { inputTokens: number; outputTokens: number }, actor?: string): { amount: number };
  consumeMinutes(w: Workspace, runId: string, minutes: number, actor?: string): { id: string; workspaceId: string; user: string; minutes: number; time: string };
  accountTeam(s: WorkspaceState, actor?: string): Workspace | undefined;
  assertCanJoinTeam(s: WorkspaceState, actor?: string): void;
}
