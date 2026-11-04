import {defineConfig, devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser', testMatch:'care-direct-petting.spec.js',
  timeout:60000, expect:{timeout:10000}, workers:2, retries:0,
  reporter:[['list'], ['html', {open:'never'}]],
  use:{baseURL:process.env.PUBLIC_URL || 'http://127.0.0.1:4173/buncho-ureshi/', trace:'retain-on-failure', screenshot:'only-on-failure', serviceWorkers:'block'},
  projects:[
    {name:'petting-chromium-touch', use:{...devices['Pixel 7'], browserName:'chromium'}},
    {name:'petting-webkit-touch', grepInvert:/native Chromium touch/, use:{...devices['iPhone 13'], browserName:'webkit'}},
    {name:'petting-desktop-chrome', grepInvert:/native Chromium touch/, use:{...devices['Desktop Chrome'], channel:'chrome'}},
  ],
  webServer:process.env.PUBLIC_URL ? undefined : {command:'node scripts/serve.mjs', url:'http://127.0.0.1:4173/buncho-ureshi/', reuseExistingServer:false},
});
