"use client";
/* eslint-disable @next/next/no-img-element -- Preserve the reference image DOM and dimensions. */
import { useState } from "react";
import { M } from "./model/store";
import type { SpacesController } from "./use-spaces";
import { assetUrl } from "@/lib/routes";
import {
  ManagementRoot,
  ManagementHeading,
  ManagementIcon as Icon,
  ManagementButton as Button,
  ManagementBadge as Badge,
  ManagementEmpty as Empty,
  ManagementDialog as Dialog,
  ManagementToast,
  managementDate,
} from "./management-ui";
export function DeviceBindingDialog({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  return (
    <Dialog title="绑定你的设备" onClose={onClose}>
      <div className="ws-device-guide">
        <section className="ws-device-guide-card">
          <h3>已经有设备？</h3>
          <p>
            在手机上下载 EurekaMind App，
            <br />
            登录后即可绑定你的设备。
          </p>
          <div className="ws-device-guide-art ws-device-guide-qr">
            <img
              src={assetUrl("download/eurekamind-download-qr.png")}
              alt="扫码下载 EurekaMind App"
              width="240"
              height="240"
            />
          </div>
          <a
            className="ws-btn ws-device-download"
            href="https://eurekamind.ai/download"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="phone" />
            下载 App <Icon name="expand" />
          </a>
          <small>iOS / Android · 手机扫码下载</small>
        </section>
        <section className="ws-device-guide-card">
          <h3>还没有设备？</h3>
          <p>
            了解 EurekaMind 录音设备，
            <br />
            让每一次对话都成为有价值的记录。
          </p>
          <div className="ws-device-guide-art">
            <img
              src={assetUrl("download/eurekamind-device.webp")}
              alt="EurekaMind 录音设备"
              width="280"
              height="280"
            />
          </div>
          <a
            className="ws-btn primary"
            href="https://eurekamind.ai/shop"
            target="_blank"
            rel="noopener noreferrer"
          >
            购买设备 <Icon name="expand" />
          </a>
          <small>前往 EurekaMind 官方商城</small>
        </section>
      </div>
      <p className="ws-device-guide-note">
        在 App 中登录同一账号，选择「{name}
        」完成设备绑定。绑定成功后，录音将同步到设备所属的工作空间。
      </p>
    </Dialog>
  );
}
export function DevicesPage({
  controller,
  space,
  actor,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
}) {
  const [modal, setModal] = useState("");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const state = controller.state!,
    w = M.get(state, space),
    admin = M.admin(w, actor);
  const devices = state.devices.filter(
    (d) => d.spaceId === space && (admin || d.user === actor),
  );
  const device = devices.find((d) => d.id === selected);
  const name = (uid: string) =>
    w.members.find((m) => m.id === uid)?.name || "已移除成员";
  function open(kind: string, id = "") {
    setError("");
    setSelected(id);
    setModal(kind);
  }
  function act(fn: () => void) {
    try {
      fn();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  return (
    <ManagementRoot w={w} actor={actor}>
      <ManagementHeading
        w={w}
        actor={actor}
        title="设备与同步"
        subtitle={
          w.type === "team"
            ? "绑定团队设备的录音自动进入团队会议，成员无需额外分享即可查看。切换工作空间不会改变设备归属。"
            : "录音同步到设备绑定的个人空间，仅自己可见。切换工作空间不会改变设备归属。"
        }
        actions={
          <Button
            action="bind"
            className="primary"
            onClick={() => open("guide")}
          >
            <Icon name="plus" />
            绑定已有设备
          </Button>
        }
      />
      <section className="ws-surface">
        <div className="ws-table-scroll">
          <table className="ws-table">
            <thead>
              <tr>
                <th>设备</th>
                <th>绑定成员</th>
                <th>录音目标</th>
                <th>最近同步</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="ws-person">
                      <span className="ws-device-mark">
                        <Icon name="phone" />
                      </span>
                      <span>
                        <strong>{d.name}</strong>
                        <small>{`SN ${d.serial} · ${d.model}`}</small>
                      </span>
                    </div>
                  </td>
                  <td>{name(d.user)}</td>
                  <td>
                    <Badge kind="blue">{w.name}</Badge>
                  </td>
                  <td>
                    {d.lastSync ? managementDate(d.lastSync) : "尚未同步"}
                  </td>
                  <td>
                    {d.user === actor ? (
                      <>
                        <Button
                          action="sync"
                          value={d.id}
                          className="link"
                          onClick={() =>
                            act(() => {
                              const result = controller.change((s) =>
                                M.sync(s, d.id, actor),
                              );
                              setNotice(
                                `已同步至${result.space.name}，${M.teamRecording(result.space, result.file) ? "团队成员可直接查看" : "新录音仅自己可见"}`,
                              );
                            })
                          }
                        >
                          模拟同步
                        </Button>
                        <Button
                          action="device-detail"
                          value={d.id}
                          className="link"
                          onClick={() => open("detail", d.id)}
                        >
                          详情
                        </Button>
                        <Button
                          action="unbind"
                          value={d.id}
                          className="link"
                          onClick={() => open("unbind", d.id)}
                        >
                          解绑
                        </Button>
                      </>
                    ) : (
                      <Button
                        action="device-detail"
                        value={d.id}
                        className="link"
                        onClick={() => open("detail", d.id)}
                      >
                        查看
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!devices.length ? (
          <Empty
            title="当前空间尚未绑定设备"
            action={
              w.type === "personal" ? (
                <Button
                  action="bind"
                  className="primary"
                  onClick={() => open("guide")}
                >
                  下载 App 绑定
                </Button>
              ) : undefined
            }
          >
            {w.type === "personal"
              ? "在手机 App 完成设备绑定后，即可在这里查看。"
              : "可在 App 绑定设备，或录入设备信息并绑定团队成员。"}
          </Empty>
        ) : null}
      </section>
      {w.type === "team" ? (
        <section className="ws-surface">
          <div className="ws-section-head">
            <div>
              <h2>设备录入</h2>
              <p className="ws-muted">
                填写 SN 码和设备型号，绑定{admin ? "对应的团队成员" : "到自己"}
                。
              </p>
            </div>
            <Button
              action="register-device"
              onClick={() =>
                act(() => {
                  M.writable(w);
                  open("register");
                })
              }
            >
              <Icon name="plus" />
              录入设备
            </Button>
          </div>
        </section>
      ) : null}
      <div className="ws-info">
        <Icon name="phone" />{" "}
        重新绑定只影响之后的录音。已有文件留在原空间，可手动导出、导入。
      </div>
      {modal === "register" ? (
        <Dialog
          title="录入并绑定设备"
          form="register-device"
          onClose={() => setModal("")}
          onSubmit={(f) => {
            const d = controller.change((s) =>
              M.registerDevice(
                s,
                space,
                {
                  serial: String(f.get("serial")),
                  model: String(f.get("model")),
                  user: String(f.get("user")),
                },
                actor,
              ),
            );
            setModal("");
            setNotice(`设备 ${d.model} 已录入并绑定至 ${name(d.user)}`);
          }}
          footer={
            <>
              <Button action="close-dialog" onClick={() => setModal("")}>
                取消
              </Button>
              <button className="ws-btn primary" type="submit">
                保存并绑定
              </button>
            </>
          }
        >
          <p>录入设备信息，并选择使用这台设备的成员。</p>
          <label className="ws-field">
            SN 码
            <input
              name="serial"
              type="text"
              required
              maxLength={64}
              placeholder="例如：474204126010000027"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="ws-field">
            设备型号
            <input
              name="model"
              type="text"
              required
              maxLength={40}
              placeholder="例如：W2"
            />
          </label>
          <label className="ws-field">
            绑定成员
            <select name="user" defaultValue={actor}>
              {w.members
                .filter(
                  (m) => m.status === "active" && (admin || m.id === actor),
                )
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.email}
                    {m.id === actor ? "（我）" : ""}
                  </option>
                ))}
            </select>
          </label>
          <div className="ws-record-target">
            录音目标：<strong>{w.name}</strong>
          </div>
          <p className="ws-muted">
            保存后设备将显示在列表中；新录音记录绑定成员，并自动进入团队会议供空间成员查看。
          </p>
        </Dialog>
      ) : null}
      {modal === "guide" ? (
        <DeviceBindingDialog name={w.name} onClose={() => setModal("")} />
      ) : null}
      {modal === "detail" && device ? (
        <Dialog
          title={device.name}
          onClose={() => setModal("")}
          footer={
            <Button action="close-dialog" onClick={() => setModal("")}>
              关闭
            </Button>
          }
        >
          <dl className="ws-device-detail">
            <dt>序列号</dt>
            <dd>{device.serial}</dd>
            <dt>设备型号</dt>
            <dd>{device.model}</dd>
            <dt>绑定空间</dt>
            <dd>{w.name}</dd>
            <dt>绑定成员</dt>
            <dd>{name(device.user)}</dd>
            <dt>同步说明</dt>
            <dd>
              切换界面不会改变设备的录音同步位置。管理员仅可查看设备元数据。
            </dd>
          </dl>
        </Dialog>
      ) : null}
      {modal === "unbind" && device ? (
        <Dialog
          title="模拟解除设备绑定？"
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
                    controller.change((s) => {
                      const d = s.devices.find((d) => d.id === selected);
                      if (!d || d.user !== actor || d.spaceId !== space)
                        throw Error("只能解绑自己的设备");
                      const target = M.get(s, space);
                      M.writable(target);
                      d.spaceId = null;
                      M.log(target, "模拟解绑自己的设备", actor);
                    });
                    setModal("");
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
          <p>解除后设备不再向此空间同步，已有录音保留。可在 App 重新绑定。</p>
        </Dialog>
      ) : null}
      <ManagementToast message={notice} />
    </ManagementRoot>
  );
}
