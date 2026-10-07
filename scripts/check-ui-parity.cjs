/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node screenshot comparison. */
const { chromium } = require(process.cwd() + "/node_modules/playwright");
const sharp = require(process.cwd() + "/node_modules/sharp");
const fs = require("fs");
const origin = process.env.PARITY_BASE_URL || "http://127.0.0.1:3131";
const baseline =
  origin +
  "/prototype/one-to-one-reference/team-only-app.html?edition=personal&personal=1";
const cases = [
  ["auth-login", "@auth", null, "#auth-form"],
  ["auth-register", "@auth", null, "#auth-form", ".switch button"],
  ["home", "home", null, "#recent-meeting-title"],
  ["agent", "home", null, "#xiaozhi-rail", "#xiaozhi-entry"],
  ["upload", "home", null, "#audio-upload-dialog", ".audio-upload-entry"],
  ["calendar", "calendar", "PersonalAssets.showList()", "#personal-actions"],
  [
    "calendar-week",
    "calendar",
    "PersonalAssets.showList()",
    "#personal-actions",
    "[data-pa=calendar-mode][data-id=week]",
  ],
  [
    "calendar-month",
    "calendar",
    "PersonalAssets.showList()",
    "#personal-actions",
    "[data-pa=calendar-mode][data-id=month]",
  ],
  [
    "schedule-new",
    "calendar",
    "PersonalAssets.showList()",
    ".pa-create-dialog",
    "[data-pa=new-schedule]",
  ],
  [
    "todo-new",
    "calendar",
    "PersonalAssets.showList()",
    ".pa-create-dialog",
    "[data-pa=new-todo]",
  ],
  [
    "thoughts",
    "thoughts",
    'document.querySelector("[data-widget-all]").click()',
    "#thought-workspace",
  ],
  ["contacts", "contacts", "ContactsUI.open()", "#contacts-root"],
  [
    "contact-add",
    "contacts",
    "ContactsUI.open()",
    "#contacts-root",
    "[data-contact-action=add]",
  ],
  ["settings", "settings", "openUserSettings()", "#personal-settings"],
  [
    "meeting",
    "meeting&id=meeting-1",
    'MeetingDetail.open("三季度产品复盘会议")',
    "#note-detail-title",
  ],
  ...["billing", "devices"].map((x) => [
    "personal-" + x,
    x === "billing" ? "subscription" : x,
    `EurekaSpaces.open('${x}')`,
    "#ws-view",
  ]),
  ...[
    "overview",
    "members",
    "devices",
    "billing",
    "credits",
    "settings",
    "audit",
  ].map((x) => [
    "team-" + x,
    (x === "overview"
      ? "home"
      : x === "billing"
        ? "subscription"
        : x === "settings"
          ? "space-settings"
          : x) + "&space=team-eureka",
    `EurekaSpaces.switch('team-eureka');EurekaSpaces.open('${x}')`,
    "#ws-view",
  ]),
];
cases.push(
  ["space-menu", "home", null, "#ws-menu", "#ws-switcher"],
  ["account-menu", "home", null, "#ws-menu", "#user-card"],
  [
    "source-filter",
    "home",
    null,
    "#meeting-source-filter-popover",
    "#meeting-source-filter-trigger",
  ],
  [
    "date-filter",
    "home",
    null,
    "#meeting-date-filter-popover",
    "#meeting-date-filter-trigger",
  ],
  ["daily-agent", "home", null, "#xiaozhi-input", ".brief-primary"],
  ...["schedule", "todo", "inspiration", "ledger", "other"].map((x) => [
    "thoughts-" + x,
    "thoughts",
    'document.querySelector("[data-widget-all]").click()',
    "#thought-workspace",
    `[data-thought-category=${x}]`,
  ]),
  ...["概览", "时间线", "承诺", "主题", "记忆"].map((x, i) => [
    "contact-tab-" + i,
    "contacts",
    "ContactsUI.open()",
    ".contacts-tabs.detail",
    [
      "[data-contact-action=person][data-value=john]",
      `[data-contact-action=tab][data-value="${x}"]`,
    ],
  ]),
  [
    "contact-note",
    "contacts",
    "ContactsUI.open()",
    ".contacts-dialog",
    [
      "[data-contact-action=person][data-value=john]",
      "[data-contact-action=note]",
    ],
  ],
  [
    "contact-followup",
    "contacts",
    "ContactsUI.open()",
    ".contacts-dialog",
    [
      "[data-contact-action=person][data-value=john]",
      "[data-contact-action=followup]",
    ],
  ],
  [
    "calendar-detail",
    "calendar&id=schedule-1",
    'PersonalAssets.open("schedule-1")',
    ".pa-detail-grid",
  ],
  [
    "calendar-edit",
    "calendar&id=schedule-1",
    'PersonalAssets.open("schedule-1")',
    "#pa-edit-form",
    "[data-pa=edit]",
  ],
  [
    "calendar-agent",
    "calendar",
    "PersonalAssets.showList()",
    "#pa-agent",
    "[data-pa=agent]",
  ],
  ...["transcript", "translation", "mindmap", "visual", "verbatim"].map((x) => [
    "meeting-" + x,
    "meeting&id=meeting-1",
    'MeetingDetail.open("三季度产品复盘会议")',
    "#md-content",
    `[data-md-tab=${x}]`,
  ]),
  [
    "team-invite",
    "members&space=team-eureka",
    "EurekaSpaces.switch('team-eureka');EurekaSpaces.open('members')",
    "#ws-dialog",
    "[data-ws-action=invite]",
  ],
  [
    "personal-bind",
    "devices",
    "EurekaSpaces.open('devices')",
    "#ws-dialog",
    "[data-ws-action=bind]",
  ],
  [
    "team-device-register",
    "devices&space=team-eureka",
    "EurekaSpaces.switch('team-eureka');EurekaSpaces.open('devices')",
    "#ws-dialog",
    "[data-ws-action=register-device]",
  ],
  [
    "team-rename",
    "space-settings&space=team-eureka",
    "EurekaSpaces.switch('team-eureka');EurekaSpaces.open('settings')",
    "#ws-dialog",
    "[data-ws-action=dissolve]",
  ],
  [
    "team-seat-add",
    "subscription&space=team-eureka",
    "EurekaSpaces.switch('team-eureka');EurekaSpaces.open('billing')",
    "#ws-dialog",
    "[data-ws-action=add-seats]",
  ],
  [
    "team-credit-buy",
    "credits&space=team-eureka",
    "EurekaSpaces.switch('team-eureka');EurekaSpaces.open('credits')",
    "#ws-dialog",
    "[data-ws-action=topup]",
  ],
);
cases.push(
  ...[
    "info",
    "participants",
    "export",
    "share",
    "delete",
    "ask",
    "info-toggle",
  ].map((x) => [
    "meeting-" + x,
    "meeting&id=meeting-1",
    'MeetingDetail.open("三季度产品复盘会议")',
    "#md-content",
    `[data-md-action=${x}]`,
  ]),
  [
    "create-team",
    "create-team",
    'document.querySelector("#ws-switcher").click();document.querySelector("[data-ws-action=plan]").click()',
    "#ws-dialog",
  ],
  [
    "invitations",
    "invitations",
    'document.querySelector("#ws-switcher").click();document.querySelector("[data-ws-action=invites]").click()',
    "#ws-dialog",
  ],
  [
    "team-task-new",
    "home&space=team-eureka",
    "EurekaSpaces.switch('team-eureka');EurekaSpaces.open('overview')",
    "#ws-dialog",
    [
      "[data-ws-action=history-tab][data-value=scheduled]",
      "[data-ws-action=auto-new]",
    ],
  ],
  [
    "trash",
    "trash",
    'document.querySelector("#recording-recycle-entry").click()',
    "#recycle-empty",
  ],
);
cases.push(
  [
    "record-permission",
    "home",
    null,
    "#record-permission-modal",
    "#module-start-recording",
  ],
  ["recording", "recording", "RecordingUI.start()", "#recording-layout"],
  [
    "recording-agent",
    "recording",
    "RecordingUI.start()",
    "#recording-assistant-panel",
    "#recording-assistant-toggle",
  ],
  ...["template", "edit"].map((x) => [
    "meeting-" + x,
    "meeting&id=meeting-1",
    'MeetingDetail.open("三季度产品复盘会议")',
    "#md-content",
    `[data-md-action=${x}]`,
  ]),
  ...[
    "本周会议决策整理",
    "研发周报自动整理",
    "客户访谈高频问题",
    "周报与行动项",
  ].map((x, i) => [
    "personal-history-" + i,
    "history&id=" + encodeURIComponent(x),
    `document.querySelectorAll('#history-task-list .history-row')[${i}].click()`,
    "#xiaozhi-rail",
  ]),
  [
    "thought-preview",
    "thoughts",
    'document.querySelector("[data-widget-all]").click()',
    "#thought-workspace",
    ["[data-thought-category=inspiration]", "[data-thought-record]"],
  ],
);
cases.push(
  [
    "contact-agent",
    "contacts",
    "ContactsUI.open()",
    "#contacts-xiaozhi-rail",
    "[data-contact-action=toggle-xiaozhi]",
  ],
  [
    "contact-detail-agent",
    "contacts",
    "ContactsUI.open()",
    "#contacts-xiaozhi-rail",
    [
      "[data-contact-action=person][data-value=john]",
      "[data-contact-action=toggle-xiaozhi]",
    ],
  ],
  ...["agent", "record", "meeting-prompt"].map((x) => [
    "team-home-" + x,
    "home&space=team-eureka",
    "EurekaSpaces.switch('team-eureka');EurekaSpaces.open('overview')",
    "#ws-view",
    `[data-ws-action=${x}]`,
  ]),
  ...["member-role", "member-remove"].map((x) => [
    "team-" + x,
    "members&space=team-eureka",
    "EurekaSpaces.switch('team-eureka');EurekaSpaces.open('members')",
    "#ws-dialog",
    `[data-ws-action=${x}]`,
  ]),
  [
    "device-detail",
    "devices",
    "EurekaSpaces.open('devices')",
    "#ws-dialog",
    "[data-ws-action=device-detail]",
  ],
  [
    "device-unbind",
    "devices",
    "EurekaSpaces.open('devices')",
    "#ws-dialog",
    "[data-ws-action=unbind]",
  ],
  [
    "calendar-quick",
    "calendar",
    "PersonalAssets.showList()",
    "#action-quick-dialog",
    "[data-pa=quick-edit]",
  ],
);
cases.push(
  [
    "team-meeting",
    "meeting&space=team-eureka&id=team-review",
    "EurekaSpaces.switch('team-eureka');EurekaSpaces.open('overview');document.querySelector('[data-ws-action=file][data-value=team-review]').click()",
    "#note-detail-title",
  ],
  [
    "team-meeting-agent",
    "meeting&space=team-eureka&id=team-review",
    "EurekaSpaces.switch('team-eureka');EurekaSpaces.open('overview');document.querySelector('[data-ws-action=file][data-value=team-review]').click()",
    "#md-agent-host",
    "[data-md-action=ask]",
  ],
);
const viewport = {
  width: Number(process.env.PARITY_WIDTH || 1440),
  height: Number(process.env.PARITY_HEIGHT || 1000),
};
const selectedCases = process.env.PARITY_CASES
  ? cases.filter((c) => new RegExp(process.env.PARITY_CASES).test(c[0]))
  : cases;
const output = process.env.PARITY_OUTPUT || "test-results/parity";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const b = await chromium.launch({
      channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    }),
    reports = [];
  try {
    for (const [name, route, setup, ready, action] of selectedCases) {
      if (
        (viewport.width <= 760 &&
          ["space-menu", "account-menu"].includes(name)) ||
        (viewport.width <= 1100 && name === "team-task-new")
      ) {
        reports.push({
          name,
          viewport,
          skipped:
            "The original responsive layout hides this sidebar entry; native functional tests cover the underlying dialog.",
        });
        continue;
      }
      let buffers = [];
      for (const kind of ["reference", "native"]) {
        const reference =
          kind === "reference" || process.env.PARITY_SELF === "reference";
        const c = await b.newContext({ viewport, timezoneId: "Asia/Shanghai" }),
          p = await c.newPage();
        try {
          await p.clock.install({ time: new Date("2026-10-07T04:00:00Z") });
          await p.addInitScript(() => (Math.random = () => 0.2));
          await p.addInitScript(() => {
            const install = () => {
              if (!document.documentElement) return false;
              const style = document.createElement("style");
              style.textContent =
                "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";
              document.documentElement.append(style);
              return true;
            };
            if (!install()) {
              const observer = new MutationObserver(() => {
                if (install()) observer.disconnect();
              });
              observer.observe(document, { childList: true });
            }
          });
          await p.goto(
            route === "@auth"
              ? origin + (reference ? "/prototype/auth-shell.html" : "/")
              : reference
                ? baseline
                : origin + "/workbench/?view=" + route,
          );
          await p
            .locator(
              route === "@auth"
                ? "#auth-form"
                : reference
                  ? "#recent-meeting-title"
                  : ".sidebar",
            )
            .waitFor({ state: "attached" });
          await p.addStyleTag({
            content:
              "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
          });
          if (!name.startsWith("recording")) await p.clock.runFor(1000);
          if (reference && setup) await p.evaluate(setup);
          if (action) {
            for (const step of Array.isArray(action) ? action : [action])
              await p.locator(step).first().click({ timeout: 5000 });
          }
          await p.locator(ready).waitFor({ timeout: 5000 });
          await p.addStyleTag({
            content:
              "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
          });
          await p.mouse.move(0, 0);
          await p.clock.runFor(4000);
          await p.evaluate(() =>
            Promise.all([
              document.fonts.ready,
              ...[...document.images].map((i) => i.decode().catch(() => {})),
            ]),
          );
          if (process.env.PARITY_GEOMETRY)
            fs.writeFileSync(
              output + "/" + name + "-" + kind + "-geometry.json",
              JSON.stringify(
                await p.evaluate(() =>
                  [
                    ".main",
                    "#meeting-table-scroll",
                    ".home-meeting-table-head",
                    ".home-meeting-table-head > span",
                  ].map((s) => {
                    const e = document.querySelector(s);
                    if (!e) return null;
                    const c = getComputedStyle(e);
                    return {
                      selector: s,
                      html: e.outerHTML.slice(0, 3000),
                      textRect: (() => {
                        const r = document.createRange();
                        r.selectNodeContents(e);
                        return r.getBoundingClientRect().toJSON();
                      })(),
                      scrollTop: e.scrollTop,
                      rect: e.getBoundingClientRect().toJSON(),
                      styles: Object.fromEntries(
                        [...c].map((x) => [x, c.getPropertyValue(x)]),
                      ),
                    };
                  }),
                ),
                null,
                2,
              ),
            );
          buffers.push(await p.screenshot({ animations: "disabled" }));
        } catch (e) {
          reports.push({ name, kind, error: e.message });
          console.log("ERROR", name, kind, e.message.slice(0, 200));
        } finally {
          await c.close();
        }
      }
      if (buffers.length === 2) {
        const a = await sharp(buffers[0])
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true }),
          d = await sharp(buffers[1]).ensureAlpha().raw().toBuffer();
        let n = 0,
          maxChannelDelta = 0,
          pixelsDeltaAboveOne = 0;
        const diff = Buffer.alloc(a.data.length);
        for (let i = 0; i < d.length; i += 4) {
          let delta = 0;
          for (let j = 0; j < 3; j++)
            delta = Math.max(delta, Math.abs(a.data[i + j] - d[i + j]));
          if (delta > 0) n++;
          maxChannelDelta = Math.max(maxChannelDelta, delta);
          if (delta > 1) pixelsDeltaAboveOne++;
          diff[i] = delta ? 255 : a.data[i];
          diff[i + 1] = delta ? 0 : a.data[i + 1];
          diff[i + 2] = delta ? 60 : a.data[i + 2];
          diff[i + 3] = 255;
        }
        const ratio = n / (a.info.width * a.info.height);
        reports.push({
          name,
          viewport,
          differingPixels: n,
          maxChannelDelta,
          pixelsDeltaAboveOne,
          totalPixels: a.info.width * a.info.height,
          ratio,
        });
        console.log(name, ratio);
        if (ratio > 0) {
          fs.writeFileSync(output + "/" + name + "-ref.png", buffers[0]);
          fs.writeFileSync(output + "/" + name + "-native.png", buffers[1]);
          await sharp(diff, { raw: a.info })
            .png()
            .toFile(output + "/" + name + "-diff.png");
        }
      }
    }
    fs.writeFileSync(output + "/report.json", JSON.stringify(reports, null, 2));
    if (reports.some((r) => r.error)) process.exitCode = 1;
    if (
      process.env.PARITY_MAX_DIFFERENT_PIXELS !== undefined &&
      reports.some(
        (r) =>
          (r.differingPixels || 0) >
          Number(process.env.PARITY_MAX_DIFFERENT_PIXELS),
      )
    )
      process.exitCode = 1;
  } finally {
    await b.close();
  }
})();
