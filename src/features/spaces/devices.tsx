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
  ManagementEmpty as Empty,
  ManagementDialog as Dialog,
  managementDate,
} from "./management-ui";
export function DeviceBindingDialog({
  onClose,
}: {
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
        在 App 中登录本人账号，将设备绑定到 Personal 或指定 Team。设备会议录音固定同步到绑定区；仅切换 App 工作区不会换绑，更换录音目标需本人解绑后重新绑定。
      </p>
    </Dialog>
  );
}
export function DevicesPage({ controller, space, actor, own = false }: { controller: SpacesController; space: string; actor: string; own?: boolean }) {
  const [selected, setSelected] = useState("");
  const [modal, setModal] = useState("");
  const [error, setError] = useState("");
  const state = controller.state!, w = M.get(state, space), team = w.type === "team" && !own;
  if (team && !M.admin(w, actor)) return <ManagementRoot w={w} actor={actor}><Empty title="仅管理员可查看设备信息">请从账号菜单的「我的设备」管理本人设备绑定。</Empty></ManagementRoot>;
  const devices = team ? M.deviceList(state, space, actor) : state.devices.filter(d => d.user === actor), device = devices.find(d => d.id === selected);
  const name = (uid: string) => state.spaces.flatMap(s => s.members).find(m => m.id === uid)?.name || uid;
  const personal = M.accountSpace(state, actor);
  const targets = [personal, ...M.accountTeams(state, actor).filter(s => s.status === "active")];
  const spaceName = (id?: string | null) => state.spaces.find(s => s.id === id)?.name || (id === personal.id ? personal.name : "待确认绑定工作区");
  const open = (id: string, kind: string) => { setSelected(id); setError(""); setModal(kind); };
  return <ManagementRoot w={w} actor={actor}>
    <ManagementHeading w={w} actor={actor} title={team ? "设备查看" : "我的设备"} subtitle={team ? "仅展示绑定在当前团队工作区的设备。管理员只能查看信息，不能替成员解绑或读取私有内容。" : "设备由本人管理，绑定到一个 Personal 或 Team 工作区。App 切换只改变视图，硬件会议录音仍进入设备绑定区；闪念仅保存在个人区。"} actions={!team && <Button className="primary" onClick={() => setModal("guide")}>绑定已有设备</Button>} />
    <section className="ws-surface"><div className="ws-table-scroll"><table className="ws-table"><thead><tr><th>设备 / SN</th><th>设备型号</th><th>设备所有者</th><th>绑定工作区</th><th>最近同步</th><th>操作</th></tr></thead><tbody>
      {devices.map(d => <tr key={d.id}><td><strong>{d.name}</strong><small style={{ display: "block" }}>SN {d.serial}</small></td><td>{d.model}</td><td>{name(d.user)}</td><td>{d.bound ? spaceName(d.spaceId) : "未绑定工作区"}</td><td>{d.lastSync ? managementDate(d.lastSync) : "尚未同步"}</td><td><Button className="link" onClick={() => open(d.id, "detail")}>查看信息</Button>{!team && <><Button className="link" onClick={() => open(d.id, "binding")}>{d.bound && d.spaceId ? "更换绑定工作区" : "绑定工作区"}</Button>{d.bound && <Button className="link" onClick={() => open(d.id, "unbind")}>解绑</Button>}</>}</td></tr>)}
    </tbody></table></div>{!devices.length && <Empty title="暂无绑定设备">设备经本人绑定当前工作区后显示在这里。</Empty>}</section>
    <p className="ws-info">共享权限只决定当前工作区内其他成员能否查看或编辑，不改变设备绑定。团队到期后绑定不变，新录音仍进入该区并保留原始音频，暂停转录与 AI。</p>
    {modal === "guide" && !team && <DeviceBindingDialog onClose={() => setModal("")} />}
    {modal === "detail" && device && <Dialog title="设备信息" onClose={() => setModal("")}><dl className="ws-device-detail"><dt>设备名称</dt><dd>{device.name}</dd><dt>序列号</dt><dd>{device.serial}</dd><dt>设备型号</dt><dd>{device.model}</dd><dt>设备所有者</dt><dd>{name(device.user)}</dd><dt>绑定工作区</dt><dd>{device.bound ? spaceName(device.spaceId) : "未绑定工作区"}</dd><dt>最近同步</dt><dd>{device.lastSync ? managementDate(device.lastSync) : "尚未同步"}</dd></dl></Dialog>}
    {modal === "binding" && device && !team && <Dialog title={device.bound && device.spaceId ? "更换设备绑定工作区" : "绑定设备工作区"} form="device-binding" onClose={() => setModal("")} onSubmit={data => { const target = String(data.get("workspace")); controller.change(s => { if (device.bound) M.unbind(s, device.id, actor); M.bind(s, device.id, target, actor); }); setModal(""); }} footer={<><Button onClick={() => setModal("")}>取消</Button><button type="submit" className="ws-btn primary">{device.bound && device.spaceId ? "确认解绑并绑定" : "确认绑定"}</button></>}>
      <p>{device.name} · {device.serial}</p><p>当前绑定：{device.bound ? spaceName(device.spaceId) : "未绑定"}</p>
      <label className="ws-field">目标工作区<select name="workspace" required defaultValue=""><option value="" disabled>请选择工作区</option>{targets.filter(t => !device.bound || t.id !== device.spaceId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <p className="ws-info">确认后先解除原绑定，再绑定目标 Personal 或 Team。之后的新录音进入目标区；历史会议与原绑定期间录制的离线音频仍属于原区，不移动或合并。</p>
      <p className="ws-muted">原型仅演示绑定状态；真实设备需在 App 确认设备身份。</p>
    </Dialog>}
    {modal === "unbind" && device && !team && <Dialog title="解除设备绑定？" error={error} onClose={() => setModal("")} footer={<><Button onClick={() => setModal("")}>取消</Button><Button className="primary" onClick={() => { try { controller.change(s => M.unbind(s, selected, actor)); setModal(""); } catch (e) { setError((e as Error).message); } }}>确认解绑</Button></>}><p>解除与「{spaceName(device.spaceId)}」的绑定。历史内容和既有授权保留，绑定新的工作区后才可继续录制并同步新内容。</p></Dialog>}
  </ManagementRoot>;
}
