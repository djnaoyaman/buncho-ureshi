import {defineConfig} from '@playwright/test';
const publicURL=process.env.PUBLIC_URL;
export default defineConfig({
 testDir:'./tests/browser',testMatch:'caretaker-recruitment.spec.js',
 timeout:60000,expect:{timeout:10000},workers:2,retries:0,reporter:'list',
 use:{baseURL:publicURL||'http://127.0.0.1:4173/buncho-ureshi/',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:['chrome','webkit'].flatMap(name=>[
  {name:name+'-320',grep:/layout, exact artwork/,use:{browserName:name==='chrome'?'chromium':'webkit',...(name==='chrome'?{channel:'chrome'}:{}),viewport:{width:320,height:740}}},
  {name:name+'-390',use:{browserName:name==='chrome'?'chromium':'webkit',...(name==='chrome'?{channel:'chrome'}:{}),viewport:{width:390,height:844}}},
  {name:name+'-landscape',grep:/layout, exact artwork/,use:{browserName:name==='chrome'?'chromium':'webkit',...(name==='chrome'?{channel:'chrome'}:{}),viewport:{width:844,height:390}}},
  {name:name+'-desktop',grep:/layout, exact artwork/,use:{browserName:name==='chrome'?'chromium':'webkit',...(name==='chrome'?{channel:'chrome'}:{}),viewport:{width:1280,height:800}}},
 ]),
 webServer:publicURL?undefined:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173/buncho-ureshi/',reuseExistingServer:false},
});
