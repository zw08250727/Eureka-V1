import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'native-*.spec.ts',workers:1,retries:0,timeout:25000,reporter:'list',use:{baseURL:process.env.NATIVE_BASE_URL||'http://127.0.0.1:3131',channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',viewport:{width:1440,height:1000},timezoneId:'Asia/Shanghai',trace:'off',screenshot:'off',video:'off'}});
