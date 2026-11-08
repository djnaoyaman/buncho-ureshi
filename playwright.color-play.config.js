import { gameDeviceTestState } from './tests/fixtures/game-device-state.js';
import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',testMatch:['color-play.spec.js'],
 timeout:90000,expect:{timeout:10000},workers:2,retries:0,
 reporter:[['list'],['html',{open:'never'}]],
 use:{storageState:gameDeviceTestState(),baseURL:process.env.PUBLIC_URL||'http://127.0.0.1:4173/buncho-ureshi/',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'color-play-chromium-touch',use:{...devices['Pixel 7'],browserName:'chromium'}},
  {name:'color-play-webkit-touch',use:{...devices['iPhone 13'],browserName:'webkit'}},
  {name:'color-play-desktop',use:{...devices['Desktop Chrome'],channel:'chrome'}},
 ],
 webServer:process.env.PUBLIC_URL?undefined:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173/buncho-ureshi/',reuseExistingServer:false},
});
