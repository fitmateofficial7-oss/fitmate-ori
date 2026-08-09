import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.FITMATE_E2E_BASE_URL?.trim() ||
  "http://127.0.0.1:3000";
const useExternalServer = Boolean(
  process.env.FITMATE_E2E_BASE_URL?.trim()
);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile-webkit",
      use: {
        ...devices["iPhone 13"],
      },
    },
  ],
});
