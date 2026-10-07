import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./e2e", testMatch: "native-billing-teamhome.spec.ts", workers: 1, retries: 0, reporter: "list", outputDir: "../test-results/native-billing-teamhome", use: { trace: "off", screenshot: "off", video: "off" } });
