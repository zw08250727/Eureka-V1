import { defineConfig } from "@playwright/test";
// Load module-scoped market models in an isolated process from global regressions.
export default defineConfig({ tsconfig: "./tsconfig.json", testDir: "./tests/cn-model", workers: 1, fullyParallel: false, reporter: "list" });
