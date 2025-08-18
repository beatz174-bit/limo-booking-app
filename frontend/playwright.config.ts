// @ts-check
// tsconfig: ./tsconfig.playwright.json
import { defineConfig, devices } from "@playwright/test";
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.e2e') });

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    // storageState: path.join(process.cwd(), 'storage', 'admin.json'),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [["list"], ["html", { outputFolder: "playwright-report" }]],
  globalSetup: "./tests/e2e/setup/global-setup.ts",
  projects: [
    // { name: "chromium", use: { ...devices["Desktop Chrome"] } },
   {
      name: 'anonymous',
      testDir: 'tests/e2e/specs/auth',       // your login/register specs
      use: { storageState: undefined },      // start signed OUT
    },
    {
      name: 'admin',
      testDir: 'tests/e2e/specs/admin',      // your admin specs
      use: { storageState: path.join(process.cwd(), 'storage', 'admin.json') }, // start signed IN
    },
  ],

});
