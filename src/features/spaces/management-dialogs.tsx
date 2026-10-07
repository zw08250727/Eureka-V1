"use client";
import { useState } from "react";
import { M } from "./model/store";
import type { Workspace } from "./model/types";
import type { SpacesController } from "./use-spaces";
import { appUrl } from "@/lib/routes";
import {
  ManagementButton as Button,
  ManagementDialog as Dialog,
} from "./management-ui";
export function assertExitAllowed(
  w: Workspace,
  actor: string,
  kind: "leave" | "dissolve",
) {
  if (w.type !== "team" || !M.member(w, actor))
    throw Error("请进入有效的团队空间");
  if (actor !== M.SELF) throw Error("请先切回自己的视角，再操作团队退出或解散");
  if (kind === "dissolve") M.govern(w, actor);
}
export function InviteMembersDialog({
  controller,
  space,
  actor,
  onClose,
  onSaved,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const w = M.get(controller.state!, space);
  return (
    <Dialog
      title="邀请空间成员"
      form="invite"
      onClose={onClose}
      onSubmit={(f) => {
        controller.change((s) =>
          M.invite(
            M.get(s, space),
            String(f.get("emails")),
            String(f.get("role")),
            actor,
          ),
        );
        onSaved?.();
        onClose();
      }}
      footer={
        <>
          <Button
            action="page"
            value="billing"
            onClick={() =>
              location.assign(appUrl("subscription", "", space, actor))
            }
          >
            增加席位
          </Button>
          <button className="ws-btn primary" type="submit">
            发送模拟邀请
          </button>
        </>
      }
    >
      <p>
        邀请加入 <strong>{w.name}</strong>
      </p>
      <p>
        当前可邀请{" "}
        <b>{Math.min(w.seats, w.pendingSeats ?? w.seats) - M.usedSeats(w)}</b>{" "}
        位伙伴。邀请发送后即占用席位。
      </p>
      <p className="ws-muted">
        {`加入后权益统一截至 ${w.nextDate}，不从加入日重新起算。`}
      </p>
      <label className="ws-field">
        邮箱地址
        <textarea
          name="emails"
          required
          placeholder="name@company.com，多位用逗号分隔"
        />
      </label>
      <label className="ws-field">
        角色
        <select name="role" defaultValue="member">
          <option value="member">成员 · 使用录音与 AI，管理自己的文件</option>
          <option value="admin">管理员 · 管理成员、设备和账单</option>
        </select>
      </label>
      <p className="ws-muted">本地模拟邀请，不会发送真实邮件。</p>
    </Dialog>
  );
}
export function ExitTeamDialog({
  controller,
  space,
  actor,
  kind: initialKind,
  onClose,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  kind: "leave" | "dissolve";
  onClose: () => void;
}) {
  const [kind, setKind] = useState(initialKind);
  const [closure, setClosure] = useState<
    (NonNullable<Workspace["closure"]> & { actor?: string }) | undefined
  >(
    M.get(controller.state!, space).status === "dissolved"
      ? M.get(controller.state!, space).closure
      : undefined,
  );
  const [error, setError] = useState("");
  const w = M.get(controller.state!, space);
  const home = () => location.assign(appUrl("home", "", "personal", M.SELF));
  const last =
    M.admin(w, actor) &&
    w.members.filter((m) => m.status === "active" && m.role === "admin")
      .length === 1;
  if (closure)
    return (
      <Dialog
        title="团队已解散"
        onClose={home}
        error={error}
        footer={
          <>
            <Button
              action="closure-receipt"
              value={space}
              onClick={() => {
                try {
                  if (closure.actor !== M.SELF) throw Error("无权下载此记录");
                  const url = URL.createObjectURL(
                    new Blob(
                      [
                        JSON.stringify(
                          {
                            notice:
                              "本地模拟；未发生退款。真实结算规则待确认。",
                            ...closure,
                          },
                          null,
                          2,
                        ),
                      ],
                      { type: "application/json" },
                    ),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = closure.name + "-解散结算记录.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              下载结算记录
            </Button>
            <Button action="close-dialog" className="primary" onClick={home}>
              完成
            </Button>
          </>
        }
      >
        <p>「{closure.name}」已停止团队权益与续费。已回到个人空间。</p>
        <p>
          冻结{" "}
          {closure.frozenCredits.toLocaleString("zh-CN", {
            maximumFractionDigits: 3,
          })}{" "}
          Credits，原订阅有效期至 {closure.paidThrough}
          。结算信息已保留，本次未自动退款。
        </p>
      </Dialog>
    );
  if (kind === "leave" && last)
    return (
      <Dialog
        title="请先交接管理员"
        onClose={onClose}
        footer={
          <>
            <Button action="close-dialog" onClick={onClose}>
              取消
            </Button>
            <Button
              action="dissolve"
              className="danger"
              onClick={() => setKind("dissolve")}
            >
              解散团队
            </Button>
            <Button
              action="exit-members"
              className="primary"
              onClick={() =>
                location.assign(appUrl("members", "", space, actor))
              }
            >
              前往成员管理
            </Button>
          </>
        }
      >
        <p>
          你是「{w.name}
          」的唯一管理员。请在成员列表将另一位已加入的成员设为管理员，再退出团队。
        </p>
        <p className="ws-muted">
          如果不再使用此团队，可以选择解散；解散将影响所有成员。
        </p>
      </Dialog>
    );
  const dissolve = kind === "dissolve";
  const rules = dissolve
    ? [
        [
          "成员与资料",
          "所有成员立即失去访问权限。资料保留在原团队，不转入个人空间；解散后无法在界面恢复，请先导出有权访问的必要资料。",
        ],
        [
          "席位与转写",
          `${w.seats} 个已购席位停止使用，全部成员的团队 Unlimited 转写权益停止。个人套餐与其他团队不受影响。`,
        ],
        [
          "订阅与订单",
          `停止自动续费，取消未支付的加席 / Credits 订单及下期变更。原订阅有效期至 ${w.nextDate}，已付账单保留；本次操作不自动退款。`,
        ],
        [
          "剩余 Credits",
          `${M.creditBalance(w).toLocaleString("zh-CN", { maximumFractionDigits: 3 })} Credits 冻结留档，不清零、不转移；真实退款与结算规则待确认。`,
        ],
        [
          "设备与自动任务",
          "解除所有设备与该团队的绑定；自动任务停止，待接受邀请失效。",
        ],
      ]
    : [
        [
          "席位与订阅",
          "释放你占用的 1 个席位，管理员可重新分配；已购席位、账单和续费不变，不自动退款或减席。",
        ],
        [
          "转写与 Credits",
          "你的团队 Unlimited 转写权益立即停止；Credits 属于团队，余额及历史消耗保留，不能带走。个人套餐与用量、其他团队权益不变。",
        ],
        [
          "资料与设备",
          "你将无法访问该团队的资料，已有资料留在原团队且保持原授权，不自动转入个人空间。你的设备解除与该团队的绑定，你在该团队创建的自动任务暂停。",
        ],
        [
          "重新加入",
          "退出后回到个人空间。再次加入需要管理员重新邀请，不会自动恢复设备绑定或启用自动任务。",
        ],
      ];
  return (
    <Dialog
      key={kind}
      title={dissolve ? "解散团队" : "退出团队"}
      form={kind}
      onClose={onClose}
      onSubmit={(f) => {
        if (f.get("workspaceId") !== space || f.get("actor") !== actor)
          throw Error("当前空间或身份已变化，请重新打开确认窗口");
        const result = controller.change((s) => {
          const target = M.get(s, space);
          assertExitAllowed(target, actor, kind);
          if (dissolve)
            M.dissolve(s, target, String(f.get("confirmName")), actor);
          else M.leave(s, target, actor);
          return target.closure;
        });
        if (dissolve) setClosure(result);
        else home();
      }}
      footer={
        <>
          <Button action="close-dialog" onClick={onClose}>
            取消
          </Button>
          <button className="ws-btn danger" type="submit">
            {dissolve ? "确认解散团队" : "确认退出团队"}
          </button>
        </>
      }
    >
      <p className="ws-exit-name">{w.name}</p>
      <dl className="ws-exit-rules">
        {rules.map(([title, copy]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{copy}</dd>
          </div>
        ))}
      </dl>
      <input type="hidden" name="workspaceId" value={space} />
      <input type="hidden" name="actor" value={actor} />
      {dissolve ? (
        <label className="ws-field">
          输入完整团队名称以确认
          <input name="confirmName" type="text" required autoComplete="off" />
        </label>
      ) : null}
    </Dialog>
  );
}
