import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,drawDecoration,economyToken,parseSave,serializeWorld,validateWorld} from '../src/engine.js';
import {openGameStore} from '../src/game-store.js';
import {fixture,rawWorld,until} from './caretaker-mounted-fixture.mjs';
const ready=()=>{const w=createWorld(Date.now(),123);w.paused=true;w.decor.points=w.decor.lifetimePoints=1000;return w;};

test('same tick, paused, different machines/categories and save reload allow fresh paid draws',()=>{
 let w=ready(),paid=0;
 for(const [slot,machine] of [['perch','house'],['perch','house'],['swing','cloud'],['toy','round']]){
  const result=drawDecoration(w,slot,machine,economyToken(w));assert.equal(result.changed,true);
  paid+=result.cost-result.refund;assert.equal(w.decor.points,1000-paid);assert.equal(w.tick,0);
  w=parseSave(serializeWorld(w));validateWorld(w);
 }
 assert.equal(w.decor.draws,4);
});
for(const mode of ['idb','local'])test(mode+': concurrent tabs spend once; refreshed offer immediately spends once again',async()=>{
 const data=new Map();let tail=Promise.resolve();
 const platform=mode==='idb'?{indexedDB:new IDBFactory()}:{localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},navigator:{locks:{request(_k,fn){const p=tail.then(fn);tail=p.catch(()=>{});return p;}}}};
 const a=await openGameStore(platform),b=await openGameStore(platform);
 try{
  assert.equal(a.mode,mode==='idb'?'device':'locked-local');
  const initial=await a.transact(()=>ready()),token=economyToken(initial),results=[];
  await Promise.all([a,b].map(s=>s.transact(w=>{results.push(drawDecoration(w,'perch','house',token));return w;})));
  assert.equal(results.filter(r=>r.changed).length,1);assert.equal(results.filter(r=>r.reason==='stale').length,1);
  const current=await a.transact(w=>w),success=results.find(r=>r.changed);
  assert.equal(current.decor.points,1000-success.cost+success.refund);assert.equal(current.decor.draws,1);
  const saved=serializeWorld(current);
  await b.transact(w=>{assert.equal(drawDecoration(w,'toy','round',token).changed,false);return w;});
  assert.equal(serializeWorld(await a.transact(w=>w)),saved);
  await a.transact(w=>{assert.equal(drawDecoration(w,'perch','house',economyToken(current)).changed,true);return w;});
  assert.equal((await b.transact(w=>w)).decor.draws,2);
 }finally{a.close();b.close();}
});
test('mountGame double press, result close/cancel, stale offer, preview and reload',async t=>{
 const h=await fixture(t),world=h.initial;world.decor.points=world.decor.lifetimePoints=1000;
 await rawWorld(h.indexedDB,world);await h.mount();
 const read=()=>rawWorld(h.indexedDB);
 h.root.querySelector('[data-game-panel="decorate"]').click();
 const draw=()=>h.root.querySelector('[data-decor-draw]');
 assert.equal(draw().disabled,false);
 draw().click();draw().click();
 await until(()=>h.root.querySelector('[data-draw-result-close]'),'first result');
 assert.equal((await read()).decor.draws,1);assert.equal(draw().disabled,true);
 h.root.querySelector('[data-draw-result-close]').click();
 assert.equal(draw().disabled,false);
 draw().click();await until(()=>h.root.querySelector('[data-draw-result-close]'),'second result');
 assert.equal((await read()).decor.draws,2);
 h.root.querySelector('.game-draw-result').dispatchEvent(new h.window.Event('cancel',{bubbles:false,cancelable:true}));
 assert.equal(draw().disabled,false);
 // Another tab spends against the visible offer. Its outdated button cannot charge again.
 const other=await h.otherTab();
 await other.transact(w=>{drawDecoration(w,'toy','house',economyToken(w));return w;});
 draw().click();await until(()=>!draw().disabled,'stale button refreshed');
 assert.equal((await read()).decor.draws,3);assert.equal(h.root.querySelector('.game-draw-result'),null);
 draw().click();await until(()=>h.root.querySelector('[data-draw-result-preview]'),'refreshed draw');
 assert.equal((await read()).decor.draws,4);
 h.root.querySelector('[data-draw-result-preview]').click();
 await until(()=>!h.root.querySelector('.game-draw-result'),'preview dismisses result');
 assert.equal(draw().disabled,false);
 h.stop();await h.mount();h.root.querySelector('[data-game-panel="decorate"]').click();
 assert.equal(draw().disabled,false);validateWorld(await read());
});
