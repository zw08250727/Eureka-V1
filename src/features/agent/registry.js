import { marketConfig, routeMarket } from "../markets/config";
// One Agent identity. These are scene adapters, not separate agents.
// MCP / skill identifiers describe the integration contract; this prototype uses local data.
export const AGENT_ID = "eurekamind-agent";
export const SCENES = {
  home: {
    label: "工作台",
    dataMcp: ["meetings", "personal-records"],
    skills: ["daily-review"],
  },
  thoughts: {
    label: "闪念",
    dataMcp: ["personal-records"],
    skills: ["thought-review"],
  },
  calendar: {
    label: "日程与待办",
    dataMcp: ["personal-records"],
    skills: ["schedule-planning"],
  },
  contacts: {
    label: "联系人",
    dataMcp: ["contacts"],
    skills: ["relationship-followup"],
  },
  recording: {
    label: "录音",
    dataMcp: ["live-transcript"],
    skills: ["meeting-summary"],
  },
  meeting: {
    label: "会议",
    dataMcp: ["meetings"],
    skills: ["meeting-summary"],
  },
  team: {
    label: "团队工作台",
    dataMcp: ["team-meetings"],
    skills: ["team-insights"],
  },
};
export function agentRoute(scene) {
  if (!Object.hasOwn(SCENES, scene)) throw Error("Agent 场景不可用");
  const market = routeMarket();
  const config = marketConfig(market).agent;
  return { agentId: market ? config.id : AGENT_ID, scene, ...SCENES[scene],
    dataMcp: SCENES[scene].dataMcp.map(id => market ? config.mcpPrefix + id : id),
    skills: SCENES[scene].skills.map(id => market ? config.skillPrefix + id : id),
  };
}
