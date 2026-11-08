import {defineConfig} from '@playwright/test';
const publicURL=process.env.PUBLIC_URL;
export default defineConfig({
 testDir:'./tests/browser',testMatch:'garden-about-booklet.spec.js',
 timeout:60000,expect:{timeout:10000},workers:2,retries:process.env.CI?1:0,
 outputDir:'test-results/garden-about',reporter:[['list']],
 use:{baseURL:publicURL||'http://127.0.0.1:4173/buncho-ureshi/',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chrome',use:{browserName:'chromium',channel:'chrome'}},{name:'webkit',use:{browserName:'webkit'}}],
 webServer:publicURL?undefined:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173/buncho-ureshi/',reuseExistingServer:false},
});
