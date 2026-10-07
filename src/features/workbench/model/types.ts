export interface ActionRecord {
  id: string;
  type: "schedule" | "todo";
  title: string;
  start: string;
  end: string;
  done: boolean;
  source: string;
  notes: string;
  reminder: string;
  location: string;
  participants: string;
  capture?: string;
  detail?: string;
  created: string;
  updated: string;
  revision?: number;
  links: string[];
}
export interface ActionState {
  version: number;
  records: ActionRecord[];
  meetings: { id: string; title: string; created: string; seconds: number }[];
  sessions: unknown[];
  settings: Record<string, unknown>;
  calendarDemoVersion?: number;
}
export interface ThoughtRecord {
  id: string;
  type: "inspiration" | "ledger" | "other";
  title: string;
  date: string;
  time: string;
  detail: string;
  amount?: number;
  direction?: string;
}
export interface Meeting {
  id: string;
  title: string;
  source: string;
  date: string;
  size: string;
  creator: string;
  tag: string;
  duration: string;
  status: string;
  created: string;
  updated: string;
  deletedAt?: string;
}
export interface Upload {
  id: string;
  title: string;
  name: string;
  size: string;
  created: string;
  note: string;
  deleted?: boolean;
  deletedAt?: string;
}
export interface WorkspaceSummary {
  id: string;
  name: string;
  members: number;
}
export interface WorkbenchSnapshot {
  actions: ActionRecord[];
  thoughts: ThoughtRecord[];
  meetings: Meeting[];
  spaces: WorkspaceSummary[];
  accountName: string;
  contactCount: number;
  personalPlan: string;
  recycled: Meeting[];
}
export interface WorkbenchRepository {
  load(): Promise<WorkbenchSnapshot>;
  toggleTodo(id: string): Promise<WorkbenchSnapshot>;
  setUploadDeleted(id: string, deleted: boolean): Promise<WorkbenchSnapshot>;
  purgeUpload(id: string): Promise<WorkbenchSnapshot>;
  upload(file: Pick<File, "name" | "size">): Promise<WorkbenchSnapshot>;
}
export interface AgentContext {
  kind: "page" | "daily";
  title: string;
  lines: string[];
}
export interface AgentReply {
  title: string;
  text: string;
  items: string[];
}
export interface AgentGateway {
  send(
    prompt: string,
    context: AgentContext,
    options: { web: boolean; audio: boolean; apps: boolean },
    signal: AbortSignal,
  ): Promise<AgentReply>;
}
