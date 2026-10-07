"use client";
import { useState } from "react";
import { M } from "./model/store";
import type { SpacesController } from "./use-spaces";
import {
  ManagementRoot,
  ManagementHeading,
  ManagementTabs,
  ManagementButton as Button,
  ManagementIcon as Icon,
  ManagementEmpty,
  ManagementToast,
  managementDate,
} from "./management-ui";
import { ExitTeamDialog, assertExitAllowed } from "./management-dialogs";
import { appUrl } from "@/lib/routes";
export function SpaceSettingsPage({
  controller,
  space,
  actor,
  audit = false,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  audit?: boolean;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exit, setExit] = useState<"leave" | "dissolve" | null>(null);
  const w = M.get(controller.state!, space);
  function open(kind: "leave" | "dissolve") {
    try {
      assertExitAllowed(w, actor, kind);
      setExit(kind);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  if (!M.admin(w, actor) && !exit)
    return (
      <ManagementRoot w={w} actor={actor}>
        <ManagementEmpty
          title="此页面暂不可访问"
          action={
            <Button
              className="primary"
              onClick={() => location.assign(appUrl("home", "", space, actor))}
            >
              返回团队首页
            </Button>
          }
        >
          仅管理员可以管理此工作空间
        </ManagementEmpty>
      </ManagementRoot>
    );
  const rows = w.audit.filter((l) => !l.action.match(/文件|私有/));
  return (
    <ManagementRoot w={w} actor={actor}>
      <ManagementHeading
        w={w}
        actor={actor}
        title={audit ? "活动记录" : "空间设置"}
        subtitle={
          audit
            ? "只记录空间管理操作，不向管理员暴露成员私有文件内容。"
            : "名称、成员权限与隐私设置仅作用于当前工作空间。"
        }
      />
      <ManagementTabs
        space={space}
        actor={actor}
        selected={audit ? "audit" : "settings"}
      />
      {audit ? (
        <section className="ws-surface">
          <div className="ws-list">
            {rows.map((l, i) => (
              <div className="ws-list-row" key={`${l.time}-${i}`}>
                <div>
                  <strong>{l.action}</strong>
                  <small>{l.actor}</small>
                </div>
                <time>{managementDate(l.time)}</time>
              </div>
            ))}
            {!rows.length ? (
              <ManagementEmpty title="暂无管理活动">
                创建、邀请、席位与设备变更会显示在这里。
              </ManagementEmpty>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          <form
            className="ws-surface ws-settings-form"
            data-ws-form="settings"
            onSubmit={(e) => {
              e.preventDefault();
              const values = new FormData(e.currentTarget);
              try {
                controller.change((s) => {
                  const target = M.get(s, space);
                  M.govern(target, actor);
                  M.writable(target);
                  const name = String(values.get("name") || "").trim();
                  if (!name) throw Error("名称不能为空");
                  if (name.length > 40) throw Error("名称须为 1–40 字");
                  target.name = name;
                  M.log(target, "更新空间名称", actor);
                });
                setError("");
                setNotice("设置已保存");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <div className="ws-settings-fields">
              <label className="ws-field">
                工作空间名称
                <input
                  name="name"
                  type="text"
                  defaultValue={w.name}
                  required
                  maxLength={40}
                />
              </label>
              <label className="ws-field">
                公司所在地区
                <input name="country" type="text" value={w.country} disabled />
              </label>
            </div>
            <p className="ws-muted">地区在创建时确定，后续保持不变。</p>
            <div className="ws-info">
              <Icon name="users" />{" "}
              团队设备录音自动进入团队会议，当前空间成员可查看；个人空间的数据保持隔离。
            </div>
            <p className="ws-form-error" role="alert">
              {error}
            </p>
            <button className="ws-btn primary" type="submit">
              保存设置
            </button>
          </form>
          <section className="ws-surface ws-settings-form ws-settings-leave">
            <div>
              <h3>退出团队</h3>
              <p>仅退出你自己的成员身份。唯一管理员需先完成交接。</p>
            </div>
            <Button
              action="leave"
              className="danger"
              onClick={() => open("leave")}
            >
              退出团队
            </Button>
          </section>
          <section className="ws-surface ws-settings-form ws-settings-leave">
            <div>
              <h3>解散团队</h3>
              <p>
                所有成员将失去访问权限，团队订阅与自动任务停止。此操作无法在界面撤销。
              </p>
            </div>
            <Button
              action="dissolve"
              className="danger"
              onClick={() => open("dissolve")}
            >
              解散团队
            </Button>
          </section>
        </>
      )}
      {exit ? (
        <ExitTeamDialog
          controller={controller}
          space={space}
          actor={actor}
          kind={exit}
          onClose={() => setExit(null)}
        />
      ) : null}
      <ManagementToast message={notice} />
    </ManagementRoot>
  );
}
