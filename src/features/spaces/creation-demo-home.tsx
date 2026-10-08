import type { SpacesController } from "./use-spaces";
import { M } from "./model/store";
import { appUrl } from "@/lib/routes";
import { CreateTeamDialog, InvitationsDialog } from "./setup";
import { ManagementRoot, ManagementHeading, ManagementButton as Button } from "./management-ui";

export function CreationDemoHome({ controller, view }: { controller: SpacesController; view: string }) {
  const state = controller.state!;
  const personal = M.get(state, "personal");
  const team = M.accountTeam(state);
  const close = () => location.assign(appUrl("home", "", "personal", state.account.id));
  return <>
    <ManagementRoot w={personal} actor={state.account.id}>
      <ManagementHeading w={personal} actor={state.account.id} title="创建团队演示" subtitle="从未加入团队开始，完整体验开通与邀请。原工作空间的资料保持不变。" />
      <section className="ws-surface" style={{ padding: 28 }}>
        <h2>{team ? `已创建或加入：${team.name}` : "当前演示账号尚未加入团队"}</h2>
        <p>选择套餐 → 填写团队信息 → 确认订单 → 模拟支付 → 邀请成员</p>
        <p>可关闭后继续；右上角支持重新体验或返回原工作空间。</p>
        {team ? <Button className="primary" onClick={() => location.assign(appUrl("home", "", team.id, state.account.id))}>进入演示团队</Button> : <>
          <Button className="primary" onClick={() => location.assign(appUrl("create-team", "", "personal", state.account.id))}>开始创建团队</Button>{" "}
          <Button onClick={() => location.assign(appUrl("invitations", "", "personal", state.account.id))}>体验接受邀请</Button>
        </>}
      </section>
    </ManagementRoot>
    {view === "create-team" ? <CreateTeamDialog controller={controller} onClose={close} /> : null}
    {view === "invitations" ? <InvitationsDialog controller={controller} onClose={close} /> : null}
  </>;
}
