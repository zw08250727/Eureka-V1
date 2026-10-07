import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./e2e", testMatch: "native-team-management-parity.spec.ts", workers: 1, reporter: "list", timeout: 30000, use: { baseURL: process.env.NATIVE_BASE_URL || "http://127.0.0.1:3131", channel: "chrome", trace: "off", screenshot: "off", video: "off" } });
