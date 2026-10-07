/* Opt-in links between the React pilot and existing pages. No effect on original URLs. */
(() => {
  const query = new URLSearchParams(location.search);
  if (query.get("migration") !== "1") return;
  const entry = query.get("entry"),
    target = query.get("target") || "";
  const home = new URL("../../workbench/", location.href).href;
  const click = (selector) => document.querySelector(selector)?.click();
  const exact = (selector, value, field) =>
    [...document.querySelectorAll(selector)].find(
      (el) => (field ? el.dataset[field] : el.textContent.trim()) === value,
    );
  // Hand off only to existing, named actions. User input never selects arbitrary DOM or URLs.
  try {
    window.EurekaSpaces.switch("personal");
    if (entry === "calendar") {
      window.PersonalAssets.showList();
      if (target) window.PersonalAssets.open(target);
    } else if (entry === "contacts") click("[data-contacts-entry]");
    else if (entry === "thoughts") {
      click("[data-widget-all]");
      if (
        ["schedule", "todo", "inspiration", "ledger", "other"].includes(target)
      )
        exact("[data-thought-category]", target, "thoughtCategory")?.click();
      else if (target) window.ThoughtsUI.open(target);
    } else if (entry === "meeting") {
      const row = exact("#meeting-list [data-meeting-id]", target, "meetingId");
      if (row) window.MeetingDetail.open(row.dataset.meeting);
      else showToast("会议已不存在或无法访问，请从列表重新选择。");
    } else if (entry === "recording") click("#start-recording");
    else if (entry === "settings") click('[data-profile-action="settings"]');
    else if (entry === "devices") window.EurekaSpaces.open("devices");
    else if (entry === "subscription") window.EurekaSpaces.open("billing");
    else if (entry === "history") {
      const row = [
        ...document.querySelectorAll("#history-task-list .history-row"),
      ].find(
        (el) =>
          el.querySelector(".history-text")?.textContent.trim() === target,
      );
      row?.click();
    } else if (entry === "spaces" && target) window.EurekaSpaces.switch(target);
    else if (entry === "create-team" || entry === "invitations") {
      click("#ws-switcher");
      click(
        entry === "create-team"
          ? '[data-ws-action="plan"]'
          : '[data-ws-action="invites"]',
      );
    }
  } catch (error) {
    showToast(error.message || "页面无法打开，请从导航重新选择。");
  }
  window.addEventListener(
    "click",
    (event) => {
      if (!event.target.closest("#home-entry")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const go = () => location.assign(home);
      if (window.PersonalAssets.guard(go)) return;
      const activeRecording = document.querySelector(
        '[data-main-view="recording"]',
      );
      if (
        activeRecording &&
        !activeRecording.hidden &&
        !window.RecordingUI.ended() &&
        !confirm("当前录音尚未保存，确定返回个人工作台？")
      )
        return;
      go();
    },
    true,
  );
})();
