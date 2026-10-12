// This suite has its own Playwright process; shared models bind their market on import.
Object.defineProperty(globalThis, "location", { value: { pathname: "/cn/workbench/", search: "" }, configurable: true });
