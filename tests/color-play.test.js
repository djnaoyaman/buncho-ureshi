import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
const css=readFileSync(new URL('../src/game.css',import.meta.url),'utf8');
const theme=css.slice(css.indexOf('/* COLOR PLAY —'));
test('Color Play restyles UI without changing living artwork or its dimensions',()=>{
 const window=new Window(),style=window.document.createElement('style');style.textContent=theme;window.document.head.append(style);
 assert(theme.includes('/* End COLOR PLAY. */'));
 const walk=rules=>{for(const rule of rules){
  if(rule.cssRules){walk(rule.cssRules);continue;}
  assert(rule.selectorText?.startsWith('body[data-world="buncho"]'),rule.selectorText);
  assert(!/\.game-room-bird|\.game-sprite|\.game-care-pet-bird|\.finch-garden-(friend|household|visitor|image-plane)|\.finch-(crow|raptor)-(actor|java)|\.owner-peek|\.game-family-node/.test(rule.selectorText),rule.selectorText);
  if(rule.selectorText.includes('.game-owner-companion'))for(let i=0;i<rule.style.length;i++)assert.equal(rule.style[i],'bottom','Only the owner position can adapt to the larger UI, never art or size');
 }};walk(style.sheet.cssRules);
 assert(!theme.includes('url('));
 window.happyDOM.abort();
});
function luminance(hex){const c=hex.match(/[\da-f]{2}/g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function contrast(a,b){const x=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(x[0]+.05)/(x[1]+.05);}
test('Color Play text pairs meet WCAG AA for normal-size labels',()=>{
 for(const surface of ['fff9ef','fffdf7','f5c9b8','f7e3b1','e2ecdf','f8dfd2','fbefd3'])assert(contrast('604b3d',surface)>=4.5,surface);
 assert(contrast('75614f','fffdf7')>=4.5);
});

import {colorPlayWorld} from './fixtures/color-play.js';
import {validateWorld} from '../src/engine.js';
test('Color Play browser fixture is a valid paused save with consistent predator history',()=>{const world=colorPlayWorld();assert.equal(world.paused,true);assert.equal(world.encounters.crow.visits.length,1);assert.equal(world.encounters.raptor.visits.length,1);assert.doesNotThrow(()=>validateWorld(JSON.parse(JSON.stringify(world))));});

import {renderCrowNotebook} from '../src/garden-crow-ui.js';
import {renderRaptorNotebook} from '../src/garden-raptor-ui.js';
test('Color Play enemy detail navigation groups all three existing destinations without changing saves',async()=>{
 const window=new Window(),world=colorPlayWorld(),before=JSON.stringify(world);
 try{
  for(const [render,id] of [[renderCrowNotebook,'large-billed-crow'],[renderRaptorNotebook,'black-kite']]){
   window.document.body.innerHTML=render(world,{id});
   const nav=window.document.querySelector('nav.finch-route-actions');assert.ok(nav);assert.equal(nav.getAttribute('aria-label'),'ページの移動');
   assert.deepEqual([...nav.querySelectorAll('button')].map(b=>b.textContent),['庭へ戻る','おうちへ','天敵の記録へ']);
   for(const selector of ['[data-finch-go-garden]','[data-finch-go-home]','[data-crow-notebook]'])assert.equal(nav.querySelector(selector).parentElement,nav);
   assert.equal(JSON.stringify(world),before);
  }
 }finally{await window.happyDOM.close();}
});
