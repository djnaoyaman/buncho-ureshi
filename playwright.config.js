import { gameDeviceTestState } from './tests/fixtures/game-device-state.js';
import { defineConfig, devices } from "@playwright/test";
const publicURL = process.env.PUBLIC_URL;
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {storageState:gameDeviceTestState(),
    baseURL: publicURL || "http://127.0.0.1:4173/buncho-ureshi/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    acceptDownloads: true,
  },
  projects: [
    { name: "chrome", testIgnore: "**/mobile.spec.js", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "webkit", testIgnore: "**/mobile.spec.js", use: { ...devices["Desktop Safari"] } },
    { name: "android-touch", testMatch: "**/mobile.spec.js", use: { ...devices["Pixel 7"], browserName: "chromium", channel: "chrome" } },
    { name: "iphone-touch", testMatch: "**/mobile.spec.js", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
  webServer: publicURL
    ? undefined
    : {
        command: "node scripts/serve.mjs",
        url: "http://127.0.0.1:4173/buncho-ureshi/",
        reuseExistingServer: false,
      },
});
