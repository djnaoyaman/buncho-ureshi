import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {trackEvent} from '../src/analytics.js';
test('measurement allowlist excludes personal content and survives blocked collectors',()=>{
  globalThis.window={dataLayer:[]};
  try {
    trackEvent('studio_export',{site_area:'studio',format:'portrait',name:'private',caption:'private',source:'a@example.com'});
    const [command,event,params]=window.dataLayer[0];
    assert.equal(command,'event');assert.equal(event,'studio_export');
    assert.deepEqual(params,{send_to:'G-VVFMFGKXNL',site_area:'studio',format:'portrait'});
    trackEvent('private_event',{});assert.equal(window.dataLayer.length,1);
    window.gtag=()=>{throw Error('blocked');};assert.doesNotThrow(()=>trackEvent('game_start'));
  }finally{delete globalThis.window;}
});
test('loader initializes the supplied container exactly once',()=>{
  const scripts=[],window={};const context=vm.createContext({window,Date,document:{createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}}});
  const code=readFileSync(new URL('../src/analytics-loader.js',import.meta.url),'utf8');
  vm.runInContext(code,context);vm.runInContext(code,context);
  assert.equal(scripts.length,1);assert.equal(scripts[0].src,'https://www.googletagmanager.com/gtm.js?id=GTM-W9SQSCBT');
  assert.equal(window.dataLayer.filter(x=>x.event==='gtm.js').length,1);
});
