(function () {
  "use strict";
  const root = document.documentElement;
  const toggle = document.querySelector(".collapse-btn");
  if (!toggle) return;

  const setCollapsed = (collapsed) => {
    root.dataset.sidebarCollapsed = String(collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", collapsed ? "展开侧栏" : "收起侧栏");
    toggle.title = collapsed ? "展开侧栏" : "收起侧栏";
  };

  document.querySelectorAll(".sidebar-quick-nav button, #user-card").forEach((button) => {
    const label = button.textContent.trim().replace(/\s*\d+$/, "").trim();
    if (label && !button.hasAttribute("aria-label")) button.setAttribute("aria-label", label);
    if (label) button.title = label;
  });
  setCollapsed(window.matchMedia("(max-width:1100px)").matches);
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setCollapsed(root.dataset.sidebarCollapsed !== "true");
  });
})();
