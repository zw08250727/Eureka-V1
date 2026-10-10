"use client";
import { ContentSharingSettings } from "./sharing-settings";
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
import { appUrl } from "@/lib/routes";
export function SpaceSettingsPage({
  controller,
  space,
  actor,
  audit = false,
  permissions = false,
}: {
  controller: SpacesController;
  space: string;
  actor: string;
  audit?: boolean;
  permissions?: boolean;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const w = M.get(controller.state!, space);
  if (!permissions && !M.admin(w, actor))
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
  const rows = w.audit.filter((l) => !l.action.match(/文件|私有/)).map(l => ({ ...l, action: l.action.startsWith("上传团队录音：") ? "上传录音" : l.action }));
  return (
    <ManagementRoot w={w} actor={actor}>
      <ManagementHeading
        w={w}
        actor={actor}
        title={audit ? "活动记录" : "空间设置"}
        subtitle={
          audit
            ? "记录空间管理操作，正文内容请在对应详情查看。"
            : "名称、成员权限与隐私设置仅作用于当前工作空间。"
        }
      />
      <ManagementTabs
        space={space}
        actor={actor}
        selected={permissions ? "permissions" : audit ? "audit" : "settings"}
        admin={M.admin(w, actor)}
      />
      {permissions ? <ContentSharingSettings key={`${space}:${actor}`} controller={controller} space={space} actor={actor} /> : audit ? (
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
              成员逐条共享会议与联系人，只读授权；团队管理员默认可编辑和管理本区全部内容。
            </div>
            <p className="ws-form-error" role="alert">
              {error}
            </p>
            <button className="ws-btn primary" type="submit">
              保存设置
            </button>
          </form>
        </>
      )}
      <ManagementToast message={notice} />
    </ManagementRoot>
  );
}
