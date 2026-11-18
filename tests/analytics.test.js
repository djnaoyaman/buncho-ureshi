import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {trackEvent} from '../src/analytics.js';
test('measurement allowlist excludes personal content and survives blocked collectors',()=>{
  globalThis.window={dataLayer:[],location:new URL('https://djnaoyaman.github.io/buncho-ureshi/game/'),localStorage:{getItem:()=>null}};
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
  const scripts=[],window={location:new URL('https://djnaoyaman.github.io/buncho-ureshi/game/'),localStorage:{getItem:()=>null}};const context=vm.createContext({window,Date,URL,document:{createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}}});
  const code=readFileSync(new URL('../src/analytics-loader.js',import.meta.url),'utf8');
  vm.runInContext(code,context);vm.runInContext(code,context);
  assert.equal(scripts.length,1);assert.equal(scripts[0].src,'https://www.googletagmanager.com/gtm.js?id=GTM-W9SQSCBT');
  assert.equal(window.dataLayer.filter(x=>x.event==='gtm.js').length,1);
});

test('local, wrong hostname, QA, automation and inaccessible storage block loader and events',()=>{
 const code=readFileSync(new URL('../src/analytics-loader.js',import.meta.url),'utf8');
 for(const options of [
  {url:'http://127.0.0.1:4173/buncho-ureshi/game/'}, {url:'https://preview.example/buncho-ureshi/game/'},
  {url:'https://djnaoyaman.github.io/another/game/'}, ...['qa','test','debug','analytics'].map(k=>({query:`?${k}=1`})),
  {webdriver:true}, {optout:'1'}, {broken:true},
 ]){
  const scripts=[];const win={location:new URL(options.url||'https://djnaoyaman.github.io/buncho-ureshi/game/'+(options.query||'')),navigator:{webdriver:options.webdriver},localStorage:{getItem(){if(options.broken)throw Error();return options.optout;}}};
  vm.runInNewContext(code,{window:win,URL,Date,document:{createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}}});
  globalThis.window=win;try{trackEvent('game_start');assert.equal(win.dataLayer,undefined);assert.equal(scripts.length,0);}finally{delete globalThis.window;}
 }
});
test('predator params are bounded enums and numbers, never free text or saved identifiers',()=>{
 globalThis.window={dataLayer:[],location:new URL('https://djnaoyaman.github.io/buncho-ureshi/game/'),localStorage:{getItem:()=>null}};
 try{
  trackEvent('garden_predator_arrival',{predator_kind:'crow',encounter_safety:'danger',active_seconds:15,milestone_seconds:NaN,rule_version:'entry_25_120_threat_86400_v1',outcome:'private_name',worldId:'private',name:'private'});
  assert.deepEqual(window.dataLayer[0][2],{send_to:'G-VVFMFGKXNL',predator_kind:'crow',encounter_safety:'danger',active_seconds:15,rule_version:'entry_25_120_threat_86400_v1'});
  window.location=new URL('https://djnaoyaman.github.io/buncho-ureshi/studio/');trackEvent('garden_active_time');assert.equal(window.dataLayer.length,1);
 }finally{delete globalThis.window;}
});

test('manual QA opt-out survives a new document without query in the same tab',()=>{
 const store=new Map(),win={location:new URL('https://djnaoyaman.github.io/buncho-ureshi/game/?qa=1'),localStorage:{getItem:()=>null},sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}};
 const code=readFileSync(new URL('../src/analytics-loader.js',import.meta.url),'utf8');let loaded=0;
 const run=()=>vm.runInNewContext(code,{window:win,URL,Date,document:{createElement:()=>({}),head:{appendChild:()=>loaded++}}});
 run();win.location=new URL('https://djnaoyaman.github.io/buncho-ureshi/game/');run();
 globalThis.window=win;try{trackEvent('game_start');assert.equal(loaded,0);assert.equal(win.dataLayer,undefined);}finally{delete globalThis.window;}
});
