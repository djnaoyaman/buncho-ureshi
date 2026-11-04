import {defineConfig, devices} from '@playwright/test';

const publicURL = process.env.PUBLIC_URL;
const chromiumExecutable = process.env.CHROMIUM_EXECUTABLE;
const chromium = chromiumExecutable ? {launchOptions: {executablePath: chromiumExecutable}} : {};
export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'garden-loading.spec.js',
  timeout: 60000,
  expect: {timeout: 10000},
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {
    baseURL: publicURL || 'http://127.0.0.1:4173/buncho-ureshi/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {name: 'loading-chromium-touch', use: {...devices['Pixel 7'], browserName: 'chromium', ...chromium}},
    {name: 'loading-webkit-touch', use: {...devices['iPhone 13'], browserName: 'webkit'}},
    {name: 'loading-desktop', use: {...devices['Desktop Chrome'], browserName: 'chromium', ...chromium}},
  ],
  webServer: publicURL ? undefined : {
    command: 'node scripts/serve.mjs',
    url: 'http://127.0.0.1:4173/buncho-ureshi/',
    reuseExistingServer: false,
  },
});
