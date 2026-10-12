import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
export default defineConfig({ ...config, testDir: "./tests/visual", outputDir: "test-results/auth-asset-capture", workers: 1 });
