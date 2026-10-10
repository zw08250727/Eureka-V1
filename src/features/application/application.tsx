"use client";
import { ReferenceShell } from "@/features/reference/shell";
import dynamic from "next/dynamic";

import { useAppRoute } from "./route";
import { useSpaces } from "@/features/spaces/use-spaces";
import { ReviewPerspectiveSwitch } from "@/features/spaces/review-switch";
import { M } from "@/features/spaces/model/store";
import { Workbench } from "@/features/workbench/workbench";


import { appUrl } from "@/lib/routes";
const Calendar = dynamic(() =>
  import("@/features/personal/calendar").then((m) => m.CalendarPage),
);
const Thoughts = dynamic(() =>
  import("@/features/personal/thoughts").then((m) => m.ThoughtsPage),
);
const Contacts = dynamic(() =>
  import("@/features/personal/contacts").then((m) => m.ContactsPage),
);
const Settings = dynamic(() =>
  import("@/features/personal/settings").then((m) => m.SettingsPage),
);
const Meeting = dynamic(() =>
  import("@/features/meetings/detail").then((m) => m.MeetingPage),
);
const Recording = dynamic(() =>
  import("@/features/meetings/recording").then((m) => m.RecordingPage),
);
const TeamHome = dynamic(() =>
  import("@/features/spaces/home").then((m) => m.TeamHome),
);
const Devices = dynamic(() =>
  import("@/features/spaces/devices").then((m) => m.DevicesPage),
);
const Members = dynamic(() =>
  import("@/features/spaces/members").then((m) => m.MembersPage),
);
const Billing = dynamic(() =>
  import("@/features/spaces/billing").then((m) => m.BillingPage),
);
const CreateTeam = dynamic(() =>
  import("@/features/spaces/setup").then((m) => m.CreateTeamPage),
);
const Invitations = dynamic(() =>
  import("@/features/spaces/setup").then((m) => m.InvitationsPage),
);
const SpaceSettings = dynamic(() =>
  import("@/features/spaces/settings").then((m) => m.SpaceSettingsPage),
);
export function Application() {
  const route = useAppRoute(),
    actualSpaces = useSpaces(route.creationDemo),
    spaces = actualSpaces;
  if (!spaces.state)
    return (
      <main className="p-8" role={spaces.error ? "alert" : "status"}>
        {spaces.error || "正在读取工作空间…"}
      </main>
    );
  const w = spaces.state.spaces.find((w) => w.id === route.space),
    actor = route.memberView ? w?.members.find(m => m.status === "active" && m.role === "member")?.id || route.actor : route.actor;
  if (!w || !M.member(w, actor))
    return (
      <main className="p-8">
        <p role="alert">工作空间不存在或没有访问权限。</p>
        <a href={appUrl("home", "", "personal", "zhang")}>返回个人空间</a>
      </main>
    );
  const team = w.type === "team";

  const props = { controller: spaces, space: w.id, actor };
  const content =
    route.view === "home" ? (
      team ? (
        <TeamHome {...props} />
      ) : (
        <Workbench />
      )
    ) : route.view === "calendar" ? (
      <Calendar key={`${w.id}:${actor}`} id={route.id} {...props} />
    ) : route.view === "thoughts" ? (
      <Thoughts key={`${w.id}:${actor}`} id={route.id} {...props} />
    ) : route.view === "contacts" ? (
      <Contacts key={`${w.id}:${actor}`} id={route.id} actor={actor} space={w.id} controller={spaces} />
    ) : route.view === "settings" ? (
      <Settings {...props} />
    ) : route.view === "meeting" ? (
      <Meeting id={route.id} spaces={spaces} space={w.id} actor={actor} />
    ) : route.view === "recording" ? (
      <Recording {...props} id={route.id} />
    ) : route.view === "my-devices" ? (
      <Devices {...props} own />
    ) : route.view === "devices" ? (
      <Devices {...props} />
    ) : route.view === "members" && team ? (
      <Members {...props} />
    ) : ["subscription", "credits"].includes(route.view) ? (
      <Billing {...props} credits={route.view === "credits"} />
    ) : route.view === "create-team" ? (
      <CreateTeam controller={spaces} />
    ) : route.view === "invitations" ? (
      <Invitations controller={spaces} />
    ) : ["space-settings", "audit", "content-permissions"].includes(route.view) && team ? (
      <SpaceSettings {...props} audit={route.view === "audit"} permissions={route.view === "content-permissions"} />
    ) : route.view === "history" ? (
      team ? (
        <TeamHome {...props} historyId={route.id} />
      ) : (
        <Workbench historyId={route.id} />
      )
    ) : route.view === "trash" ? (
      team ? (
        <TeamHome {...props} trash />
      ) : (
        <Workbench recycle />
      )
    ) : (
      <p role="alert">此入口不属于当前工作空间。</p>
    );
  const titles: Record<string, string> = {
    home: team ? w.name : "我的 AI 工作台",
    calendar: "日程与待办",
    contacts: "通讯录",
    thoughts: "全部闪念",
    settings: "个人设置",
    "my-devices": "我的设备",
    devices: team ? "设备查看" : "设备与同步",
    members: "团队成员",
    subscription: team ? "空间设置" : "个人订阅",
    credits: "空间设置",
    "space-settings": "空间设置",
    "content-permissions": "空间设置",
    audit: "空间设置",
    meeting: "语音笔记",
    recording: "开始录音",
    history: "我的 AI 工作台",
    tasks: "我的 AI 工作台",
    "create-team": "我的 AI 工作台",
    invitations: "我的 AI 工作台",
    trash: "回收站",
  };
  return (
    <ReferenceShell
      title={
        ["meeting", "recording", "settings"].includes(route.view)
          ? titles[route.view]
          : team
            ? w.name
            : ["subscription", "credits", "devices"].includes(route.view)
              ? "个人工作空间"
              : titles[route.view] || w.name
      }
      view={route.view}
      space={w.id}
      actor={actor}
      controller={spaces}
      reviewSwitch={<ReviewPerspectiveSwitch state={actualSpaces.state!} space={w.id} actor={actor} view={route.view} memberView={route.memberView} creationDemo={route.creationDemo} />}
    >
      {content}
    </ReferenceShell>
  );
}
