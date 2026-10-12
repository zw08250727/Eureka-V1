export const AGENT_ID: "eurekamind-agent";
type SceneConfig = { label: string; dataMcp: string[]; skills: string[] };
export const SCENES: Record<
  | "home"
  | "thoughts"
  | "calendar"
  | "contacts"
  | "meeting"
  | "recording"
  | "team",
  SceneConfig
>;
export function agentRoute(
  scene: keyof typeof SCENES,
): SceneConfig & { agentId: string; scene: keyof typeof SCENES };
