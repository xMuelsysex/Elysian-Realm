import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile-chromium",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
  ],
});
