import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {load,engine,cases,worldFor,GARDENS,options,raptor} from './fixtures/garden-about-world.js';
const {renderFinchGarden}=await load('encounter-ui.js');
const {renderRaptorNotice}=await load('garden-raptor-ui.js');
const {openGameStore}=await load('game-store.js');
async function rawRecord(indexedDB){return new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world','readonly'),q=tx.objectStore('world').get('current');let value;q.onsuccess=()=>value=q.result;tx.oncomplete=()=>{db.close();resolve(value)};tx.onerror=()=>reject(tx.error);};});}
function mount(w,kind){
 const window=new Window(),doc=window.document;
 doc.body.innerHTML='<div class="game-panel-overlay">'+renderRaptorNotice(w)+renderFinchGarden(w,options(kind))+'</div>';
 assert.equal(doc.querySelectorAll('.garden-about-booklet').length,1,'real renderer is integrated');
 return window;
}
for(const kind of cases)test('strict saved fixture + mounted app DOM: '+kind,async()=>{
 const w=worldFor(kind),before=engine.serializeWorld(w),window=mount(w,kind),doc=window.document;
 assert.equal(doc.querySelectorAll('.finch-garden-dock > [data-garden-details=about]').length,1);
 const about=doc.querySelector('[data-garden-details=about]');
 for(const sel of [':scope > summary','h4','img','[data-garden-details=about-rules] > summary','.garden-about-booklet__warning'])assert.equal(about.querySelectorAll(sel).length,1,sel);
 assert.equal(doc.querySelectorAll('[data-garden-select]').length,12);
 assert.equal(about.querySelectorAll('[data-raptor-notice],[data-crow-phase]').length,0);
 if(['raptor-hostile','legacy-warning','settings-after-warning'].includes(kind)){
  assert.equal(doc.querySelector('.game-panel-overlay > [data-raptor-notice]').dataset.raptorPhase,'warning');assert.equal(raptor.raptorTarget(w).id,'b1');
 }
 if(['raptor-targetless','raptor-friendly','osprey'].includes(kind))assert.equal(doc.querySelector('[data-raptor-notice]').dataset.raptorPhase,'visiting');
 if(kind==='crow-warning')assert.equal(doc.querySelector('[data-crow-phase]').dataset.crowPhase,'warning');
 const platform={indexedDB:new IDBFactory()},store=await openGameStore(platform);await store.transact(()=>w);
 const savedBefore=await rawRecord(platform.indexedDB);about.open=true;about.querySelector('[data-garden-details=about-rules]').open=true;about.scrollTop=100;about.open=false;about.open=true;
 assert.equal(engine.serializeWorld(w),before);assert.deepEqual(await rawRecord(platform.indexedDB),savedBefore);assert.equal(engine.serializeWorld(await store.transact(w=>w)),before);
 store.close?.();window.happyDOM.close();
});
for(const p of GARDENS)test('mounted garden identity: '+p.id,()=>{
 const w=worldFor('solo',p.id),window=mount(w,'solo'),doc=window.document;
 assert.equal(doc.querySelector('[data-garden-details=about] h4').textContent,p.name);
 assert.ok(doc.querySelector('[data-garden-details=about]').textContent.includes(p.description));
 assert.equal(doc.querySelectorAll('[data-garden-select="'+p.id+'"][aria-current=page]').length,1);window.happyDOM.close();
});

test('booklet JS and CSS participate in versioned production delivery',async()=>{
 const {readFile}=await import('node:fs/promises');
 const build=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8');
 const hash=build.split('const gameVersion =')[1].split('const securityPolicy')[0];
 assert.ok(hash.includes('"garden-about-booklet.js"'));assert.ok(hash.includes('"garden-about-booklet.css"'));
 const loop=build.split('for (const name of [')[1].split(']) {')[0];assert.ok(loop.includes('"garden-about-booklet.js"'));
 for(const name of ['garden-about-booklet','garden-crows','garden-raptors'])assert.ok(build.includes('.replaceAll("./'+name+'.js", `./'+name+'.js?v=${gameVersion}`)'));
 assert.ok(build.includes('<link rel="stylesheet" href="src/garden-about-booklet.css?v=${gameVersion}">'));
});
