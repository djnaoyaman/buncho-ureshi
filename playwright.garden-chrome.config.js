import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',testMatch:'garden-chrome.spec.js',timeout:90000,
 expect:{timeout:10000},workers:2,retries:0,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:process.env.PUBLIC_URL||'http://127.0.0.1:4196/buncho-ureshi/',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'garden-chrome',use:{...devices['Desktop Chrome'],channel:'chrome'}},
  {name:'garden-webkit',use:{...devices['iPhone 13'],browserName:'webkit'}},
 ],
 webServer:process.env.PUBLIC_URL?undefined:{command:'PORT=4196 node scripts/serve.mjs',url:'http://127.0.0.1:4196/buncho-ureshi/',reuseExistingServer:false},
});
