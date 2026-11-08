import { gameDeviceTestState } from './tests/fixtures/game-device-state.js';
import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',testMatch:'care-dock-icon.spec.js',timeout:60000,expect:{timeout:10000},workers:2,retries:0,
 reporter:[['list'],['html',{open:'never'}]],
 use:{storageState:gameDeviceTestState(),baseURL:process.env.PUBLIC_URL||'http://127.0.0.1:4173/buncho-ureshi/',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'care-chromium-touch',use:{...devices['Pixel 7'],browserName:'chromium'}},{name:'care-webkit-touch',use:{...devices['iPhone 13'],browserName:'webkit'}},{name:'care-desktop-chrome',use:{...devices['Desktop Chrome'],channel:'chrome'}}],
 webServer:process.env.PUBLIC_URL?undefined:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173/buncho-ureshi/',reuseExistingServer:false},
});

