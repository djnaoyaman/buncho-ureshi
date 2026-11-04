import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', testMatch: 'site-search.spec.js',
  timeout: 60000, expect: { timeout: 10000 }, workers: 2, retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.PUBLIC_URL || 'http://127.0.0.1:4173/buncho-ureshi/', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'search-iphone', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
    { name: 'search-android', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'search-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'search-edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'search-safari', use: { ...devices['Desktop Safari'], browserName: 'webkit' } },
  ],
  webServer: process.env.PUBLIC_URL ? undefined : { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:4173/buncho-ureshi/', reuseExistingServer: false },
});
