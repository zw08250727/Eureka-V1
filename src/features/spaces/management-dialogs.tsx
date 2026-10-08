"use client";
import { M } from "./model/store";
import type { SpacesController } from "./use-spaces";
import { appUrl } from "@/lib/routes";
import {
  ManagementButton as Button,
  ManagementDialog as Dialog,
} from "./management-ui";
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
