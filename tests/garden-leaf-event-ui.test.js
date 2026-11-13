import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,validateWorld} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {leafEventStatus,leafEventToken,startLeafEvent,chooseLeafEvent,completeLeafEvent} from '../src/garden-leaf-event.js';
import {renderLeafGift,renderLeafDiary,renderLeafKeepsake,leafGiftNarrative} from '../src/garden-leaf-event-ui.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
const now=Date.UTC(2026,10,14,8);
function fixture(){const w=createWorld(now);encounterSystem.selectGarden(w,'komorebi',{worldId:w.worldId,revision:w.revision});return w;}
const sleep=()=>new Promise(r=>setTimeout(r,15));
function setup(w){const win=new Window();win.document.body.innerHTML='<div id="root"></div>';const root=win.document.querySelector('#root');const panel=mountEncounterPanel(root,{getWorld:()=>w,initialMode:'garden',transact:async fn=>{fn(w);validateWorld(w);}});return {win,root,panel,close(){panel.destroy();win.happyDOM.abort();}};}
test('leaf story card is inline, uses real bird art, readable choices and no forced timer',()=>{
 const w=fixture();assert.equal(startLeafEvent(w,leafEventToken(w)).changed,true);
 const win=new Window();win.document.body.innerHTML=renderLeafGift(w);const d=win.document;
 assert.equal(d.querySelector('dialog'),null);assert.equal(d.querySelectorAll('[data-leaf-choice]').length,3);assert.ok(d.querySelector('ruby rt'));
 assert.equal(d.querySelectorAll('.leaf-gift-bird img').length,2);assert.ok(d.querySelector('.leaf-gift-right'));
 assert.match(d.body.textContent,/いつ きめても/);assert.match(d.body.textContent,/どちらを えらんでも/);win.happyDOM.abort();
});
test('leaf controller completes choice then later return, once, and keepsake toggles',async()=>{
 const w=fixture(),s=setup(w);try{
 assert.ok(s.root.querySelector('[data-leaf-start]'));s.root.querySelector('[data-leaf-start]').click();await sleep();
 s.root.querySelector('[data-leaf-choice="later"]').click();await sleep();assert.equal(w.leafEvent.entry.choice,null);assert.equal(s.root.querySelector('[data-garden-details="leaf-gift"]').open,false);
 s.root.querySelector('[data-leaf-choice="deliver"]').click();await sleep();assert.equal(w.leafEvent.entry.choice,'deliver');
 assert.equal(s.root.querySelector('[data-leaf-complete]'),null);
 encounterSystem.leaveGarden(w,leafEventToken(w));await s.panel.garden('komorebi');
 assert.ok(s.root.querySelector('[data-leaf-complete]'));const before=w.economy.gold;
 s.root.querySelector('[data-leaf-complete]').click();await sleep();assert.equal(w.economy.gold,before+3);assert.ok(s.root.querySelector('.leaf-gift-keepsake'));
 s.root.querySelector('[data-leaf-display]').click();await sleep();assert.equal(s.root.querySelector('.leaf-gift-keepsake'),null);assert.equal(w.economy.gold,before+3);
 assert.match(renderLeafDiary(w),/はっぱの しおり/);
 }finally{s.close();}
});
test('different personality branches and both choices leave different memories',()=>{
 const w=fixture();startLeafEvent(w,leafEventToken(w));chooseLeafEvent(w,'deliver',leafEventToken(w));const s=leafEventStatus(w),texts=[];
 for(const branch of ['watch','play','chat']){const state={...s,entry:{...s.entry,branch}};texts.push(leafGiftNarrative(state,{thanks:true}));}
 assert.equal(new Set(texts).size,3);assert.notEqual(leafGiftNarrative(s),leafGiftNarrative({...s,entry:{...s.entry,choice:'display'}}));
});
test('different garden, active encounter and pause do not offer competing leaf actions',()=>{
 const w=fixture();startLeafEvent(w,leafEventToken(w));w.paused=true;assert.equal(renderLeafGift(w),'');w.paused=false;
 encounterSystem.selectGarden(w,'mizukagami',leafEventToken(w));assert.equal(renderLeafGift(w),'');assert.notEqual(renderLeafDiary(w),'');assert.equal(renderLeafKeepsake(w),'');
});
test('failed transaction does not pretend to progress; navigation preserves deferred choice',async()=>{
 const w=fixture(),win=new Window();win.document.body.innerHTML='<div id="root"></div>';const root=win.document.querySelector('#root'),before=structuredClone(w);
 const panel=mountEncounterPanel(root,{getWorld:()=>w,initialMode:'garden',transact:async()=>{throw Error('disk full');}});
 try{root.querySelector('[data-leaf-start]').click();await sleep();assert.deepEqual(w,before);assert.match(root.textContent,/記録できなかった/);}finally{panel.destroy();win.happyDOM.abort();}
});
