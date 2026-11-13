import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,advanceTo,validateWorld,serializeWorld,parseSave,prepareWorldReplacement,renameBird,economyToken,honorBird} from '../src/engine.js';
import {accidentLifeBird,lifeStatus} from '../src/life-care.js';
import {openGameStore} from '../src/game-store.js';
import {MEMORIAL_DESIGNS,memorialDesignId,memorialDesignForBird,renderMemorialArtwork} from '../src/memorial-designs.js';
import {renderMemorialPanel} from '../src/life-care-ui.js';
const NOW=1800000000000;
const golden=['de-stijl','scandinavian-modern','de-stijl','art-deco','scandinavian-modern','streamline-moderne','bauhaus','memphis','art-deco','mid-century-modern','memphis','bauhaus','streamline-moderne','scandinavian-modern','de-stijl','art-deco','mid-century-modern','bauhaus','brutalism','swiss-style'];
function grave(){const w=createWorld(NOW,42);w.paused=true;accidentLifeBird(w,'b1',NOW);return validateWorld(w);}
const selected=w=>Object.fromEntries(w.birds.map(b=>[b.id,memorialDesignId(w,b)]));
function documentFor(html){const window=new Window();window.document.body.innerHTML=html;return window.document;}
class Storage{constructor(){this.data=new Map();}getItem(k){return this.data.get(k)??null;}setItem(k,v){this.data.set(k,String(v));}removeItem(k){this.data.delete(k);}}
function locks(){let tail=Promise.resolve();return{request(_name,fn){const task=tail.then(fn);tail=task.catch(()=>{});return task;}};}

test('v1 golden draws are frozen across all nine styles, including legitimate repeats',()=>{
 assert.deepEqual(Array.from({length:20},(_,i)=>memorialDesignId({epoch:NOW},{id:`b${i+1}`,bornTick:0})),golden);
 assert.equal(new Set(golden).size,9);assert.equal(new Set(MEMORIAL_DESIGNS.map(d=>d.id)).size,9);assert.ok(Object.isFrozen(MEMORIAL_DESIGNS));
 assert.ok(MEMORIAL_DESIGNS.every(d=>Object.isFrozen(d)&&Object.isFrozen(d.position)));
});
test('same name, color, stage and birth tick remain distinct saved individuals',()=>{
 const w=createWorld(NOW,42),a=w.birds[0],b=createBird(w,{name:a.name,color:a.color,stage:a.stage,sex:a.sex,home:'resident'});
 assert.equal(a.bornTick,b.bornTick);assert.notEqual(a.id,b.id);assert.equal(memorialDesignId(w,a),golden[0]);assert.equal(memorialDesignId(w,b),golden[1]);
 const bad=structuredClone(w);bad.birds[1].id=bad.birds[0].id;assert.throws(()=>validateWorld(bad));
});
test('render and draw are byte-pure and remain stable after rename, offers, order and export/import',()=>{
 const w=grave();const b=createBird(w,{home:'resident'});accidentLifeBird(w,b.id,NOW);validateWorld(w);
 const ids=selected(w),before=serializeWorld(w),seed=w.seed;renderMemorialPanel(w);for(let i=0;i<3;i++)w.birds.forEach(b=>memorialDesignForBird(w,b));assert.equal(serializeWorld(w),before);assert.equal(w.seed,seed);
 renameBird(w,'b1','ずっとおもち');honorBird(w,'b1','incense',economyToken(w),NOW);honorBird(w,'b1','prayer',economyToken(w),NOW);w.birds.reverse();w.lifecycle.birds.reverse();assert.deepEqual(selected(w),ids);
 const reloaded=parseSave(serializeWorld(w)),imported=prepareWorldReplacement(createWorld(NOW+1000),reloaded,NOW+1000,'garden-memorial-import');
 assert.notEqual(imported.worldId,w.worldId);assert.deepEqual(selected(reloaded),ids);assert.deepEqual(selected(imported),ids);assert.equal(imported.version,17);assert.equal(imported.lifecycle.version,1);assert.equal(lifeStatus(imported,'b1').incenseCount,1);assert.equal(lifeStatus(imported,'b1').prayerCount,1);
});
test('restoring a pre-death backup and later death keeps the same individual draw',()=>{
 const living=createWorld(NOW,42),first=structuredClone(living);accidentLifeBird(first,'b1',NOW);
 const restored=prepareWorldReplacement(first,living,NOW+86400000,'garden-restored-before-death');accidentLifeBird(restored,'b1',NOW+86400000);validateWorld(restored);
 assert.notEqual(lifeStatus(first,'b1').death.at,lifeStatus(restored,'b1').death.at);assert.equal(memorialDesignId(first,first.birds[0]),memorialDesignId(restored,restored.birds[0]));
});
for(const mode of ['idb','local','memory'])test(`${mode}: fixed artwork survives actual reset-backup restore and import without new save fields`,async()=>{
 const storage=new Storage(),platform=mode==='idb'?{indexedDB:new IDBFactory()}:mode==='local'?{localStorage:storage,navigator:{locks:locks()}}:{};
 const s=await openGameStore(platform);try{
  const original=await s.transact(()=>grave()),ids=selected(original),raw=serializeWorld(original);renderMemorialPanel(original);assert.equal(serializeWorld(await s.transact(w=>w)),raw);
  const fresh=await s.resetWorld(original.worldId),restored=await s.restoreResetBackup(fresh.worldId);assert.notEqual(restored.worldId,original.worldId);assert.deepEqual(selected(restored),ids);
  const imported=await s.replaceWorld(restored.worldId,parseSave(raw),restored.lastUpdated);assert.deepEqual(selected(imported),ids);assert.equal(imported.version,17);assert.equal(imported.lifecycle.version,1);assert.deepEqual(Object.keys(lifeStatus(imported,'b1').death).sort(),['at','cause','tick']);
 }finally{s.close();}
});
test('every death cause gets a grave; living departed friends do not',()=>{
 for(const cause of ['lifespan','neglect','illness','injury','accident']){
  const w=grave();lifeStatus(w,'b1').death.cause=cause;createBird(w,{home:'departed'});validateWorld(w);const doc=documentFor(renderMemorialPanel(w));assert.equal(doc.querySelectorAll('.life-grave').length,1);assert.equal(doc.querySelector('[data-memorial-bird]').dataset.memorialBird,'b1');
 }
});
test('portrait matches actual color and life stage; names and all nine lineage links are safe',()=>{
 for(const color of ['white','sakura','cinnamon','silver'])for(const stage of ['egg','chick','juvenile','adult']){
  const expected=stage==='adult'?color:stage==='juvenile'?(color==='sakura'?'juvenile':`juvenile-${color}`):stage;
  const doc=documentFor(renderMemorialArtwork(MEMORIAL_DESIGNS[0],{name:'<script> & "名前"',color,stage}));assert.equal(doc.querySelector('script'),null);assert.equal(doc.querySelector('text').textContent,'<script> & "名前"');assert.ok(doc.querySelector('.memorial-bird-art').getAttribute('href').endsWith(`/${expected}.${stage==='egg'?'svg':'webp'}`));
 }
 const w=createWorld(NOW,42);for(let i=0;i<20;i++){const b=i?w.birds.at(-1):w.birds[0];accidentLifeBird(w,b.id,NOW);if(i<19)createBird(w,{home:'resident'});}validateWorld(w);
 const doc=documentFor(renderMemorialPanel(w)),seen=new Set();for(const card of doc.querySelectorAll('.life-grave')){const design=MEMORIAL_DESIGNS.find(d=>d.id===card.dataset.memorialDesign),link=card.querySelector('.memorial-lineage-link');seen.add(design.id);assert.equal(link.href,design.sourceURL);assert.match(link.rel,/noopener/);assert.match(link.rel,/noreferrer/);assert.equal(link.target,'_blank');assert.match(link.textContent,new RegExp(design.linkLabel));}assert.equal(seen.size,9);
});
test('approved artwork bytes and catalog manifest stay exact; cache imports and CSS are registered',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/game-art/memorial-modern/manifest.json',import.meta.url),'utf8'));assert.deepEqual(manifest.designs,MEMORIAL_DESIGNS);
 for(const d of MEMORIAL_DESIGNS){const bytes=await readFile(new URL(`../public/game-art/memorial-modern/${d.file}`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),d.sha256);assert.equal(bytes.readUInt32BE(16),d.width);assert.equal(bytes.readUInt32BE(20),d.height);}
 const build=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8');assert.match(build,/"memorial-designs.js", "memorial.css"/);assert.match(build,/"memorial-designs.js", "app.js"/);assert.ok(build.includes('.replaceAll("./memorial-designs.js", `./memorial-designs.js?v=${gameVersion}`)'));assert.ok(build.includes('href="src/memorial.css?v=${gameVersion}"'));
});
