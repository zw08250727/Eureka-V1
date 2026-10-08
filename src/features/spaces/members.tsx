"use client";
import { useEffect, useRef, useState } from "react";
import { M } from "./model/store";
import type { Member } from "./model/types";
import type { SpacesController } from "./use-spaces";
import {
  ManagementRoot,
  ManagementHeading,
  ManagementIcon as Icon,
  ManagementButton as Button,
  ManagementBadge as Badge,
  ManagementDialog as Dialog,
  ManagementToast,
} from "./management-ui";
import {
  InviteMembersDialog,
} from "./management-dialogs";
export function MembersPage({
  controller,
  space,
  actor,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
}) {
  const invitedFromRoute = useRef(false);
  const [modal, setModal] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const w = M.get(controller.state!, space),
    admin = M.admin(w, actor);
  function act(fn: () => void) {
    try {
      fn();
      setError("");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  useEffect(() => {
    if (
      !invitedFromRoute.current &&
      new URLSearchParams(location.search).get("invite") === "1" &&
      M.admin(M.get(controller.state!, space), actor)
    ) {
      const timer = setTimeout(() => {
        invitedFromRoute.current = true;
        setModal("invite");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [space, actor, controller.state]);
  function action(m: Member, kind: string, value?: string) {
    controller.change((s) =>
      M.memberAction(s, M.get(s, space), m.id, kind, value, actor),
    );
  }
  return (
    <ManagementRoot w={w} actor={actor}>
      <ManagementHeading
        w={w}
        actor={actor}
        title="成员与角色"
        subtitle={`${M.usedSeats(w)} / ${w.seats} 席位已分配 · 待接受邀请也占用席位`}
        actions={
          <>
            {admin ? (
              <Button
                action="invite"
                className="primary"
                onClick={() =>
                  act(() => {
                    M.govern(w, actor);
                    M.writable(w);
                    setModal("invite");
                  })
                }
              >
                <Icon name="plus" />
                邀请成员
              </Button>
            ) : null}
          </>
        }
      />
      <section className="ws-surface">
        <div className="ws-table-scroll">
          <table className="ws-table">
            <thead>
              <tr>
                <th>成员</th>
                <th>角色</th>
                <th>权益</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {w.members
                .filter((m) => m.status !== "removed")
                .map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="ws-person">
                        <span className="ws-mini-avatar">{m.name[0]}</span>
                        <span>
                          <strong>
                            {m.name} {m.id === actor ? "（我）" : ""}
                          </strong>
                          <small>{m.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>{m.role === "admin" ? "管理员" : "成员"}</td>
                    <td>
                      <Badge
                        kind={
                          m.status === "active" && w.status === "active"
                            ? "blue"
                            : "amber"
                        }
                      >
                        {m.status === "pending"
                          ? "待加入生效"
                          : w.status === "active"
                            ? "Unlimited"
                            : "权益已暂停"}
                      </Badge>
                      <small>
                        {m.status === "pending"
                          ? "加入后随团队到期"
                          : "当前周期截止"}
                        ：{w.nextDate || "待确认"}
                      </small>
                    </td>
                    <td>
                      <Badge kind={m.status === "pending" ? "amber" : "green"}>
                        {m.status === "pending" ? "待接受" : "已加入"}
                      </Badge>
                    </td>
                    <td>
                      <div className="ws-actions">
                        {admin ? (
                          <>
                            {m.status === "pending" ? (
                              <>
                                <Button
                                  action="member-resend"
                                  value={m.id}
                                  className="link"
                                  onClick={() =>
                                    act(() => {
                                      action(m, "resend");
                                      setNotice("模拟邀请已重发");
                                    })
                                  }
                                >
                                  重发
                                </Button>
                                <Button
                                  action="member-accept"
                                  value={m.id}
                                  className="link"
                                  onClick={() =>
                                    act(() => {
                                      action(m, "accept");
                                      setNotice("成员已模拟接受邀请");
                                    })
                                  }
                                >
                                  模拟接受
                                </Button>
                              </>
                            ) : (
                              <Button
                                action="member-role"
                                value={m.id}
                                className="link"
                                onClick={() => {
                                  setMember(m);
                                  setError("");
                                  setModal("role");
                                }}
                              >
                                调整角色
                              </Button>
                            )}
                            {m.id !== actor ? (
                              <Button
                                action="member-remove"
                                value={m.id}
                                className="link danger"
                                onClick={() => {
                                  setMember(m);
                                  setError("");
                                  setModal("remove");
                                }}
                              >
                                {m.status === "pending" ? "撤销" : "移除"}
                              </Button>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="ws-table-foot">
          全体成员随团队订阅统一到期；待接受邀请不享有转写权益。移除成员释放席位，不会自动减少账单。
        </div>
      </section>
      {admin ? (
        <div className="ws-info">
          <Icon name="users" />{" "}
          管理员负责成员、设备和账单；团队设备录音自动对成员可见，私有记录仍按授权访问。
        </div>
      ) : null}
      {modal === "invite" ? (
        <InviteMembersDialog
          controller={controller}
          space={space}
          actor={actor}
          onClose={() => setModal("")}
          onSaved={() => setNotice("模拟邀请已创建，可在成员列表体验接受流程")}
        />
      ) : null}
      {modal === "role" && member ? (
        <Dialog
          title="调整成员角色"
          form="role"
          onClose={() => setModal("")}
          onSubmit={(f) => {
            action(member, "role", String(f.get("role")));
            setModal("");
          }}
          footer={
            <>
              <Button action="close-dialog" onClick={() => setModal("")}>
                取消
              </Button>
              <button className="ws-btn primary" type="submit">
                保存角色
              </button>
            </>
          }
        >
          <p>{`${member.name} · ${member.email}`}</p>
          <input type="hidden" name="memberId" value={member.id} />
          <label className="ws-field">
            角色
            <select name="role" defaultValue={member.role}>
              <option value="member">成员</option>
              <option value="admin">管理员</option>
            </select>
          </label>
          <p className="ws-muted">
            管理员可以管理账单、成员和设备，但不能访问其他人的私有文件。
          </p>
        </Dialog>
      ) : null}
      {modal === "remove" && member ? (
        <Dialog
          title="移除此成员？"
          error={error}
          onClose={() => setModal("")}
          footer={
            <>
              <Button action="close-dialog" onClick={() => setModal("")}>
                取消
              </Button>
              <Button
                action="confirm"
                className="primary"
                onClick={() => {
                  try {
                    action(member, "remove");
                    setModal("");
                    setNotice("成员已移除，席位已释放");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                确认
              </Button>
            </>
          }
        >
          <p>
            将撤销此成员的空间访问权限并释放席位，设备绑定会解除。订阅的席位数量和账单不会自动减少。
          </p>
        </Dialog>
      ) : null}
      <ManagementToast message={notice} />
    </ManagementRoot>
  );
}
