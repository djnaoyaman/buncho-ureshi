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

test('actual-app absolute and relative base URLs retain approved root-relative art for all gardens',()=>{
 for(const base of ['http://127.0.0.1:4173/buncho-ureshi/','https://djnaoyaman.github.io/buncho-ureshi/','/buncho-ureshi/']){
  for(const garden of GARDENS){
   const w=worldFor('solo',garden.id),before=engine.serializeWorld(w),window=new Window();
   window.document.body.innerHTML=renderFinchGarden(w,{base});
   const img=window.document.querySelector('.garden-about-booklet img'),art=garden.background.landscape||garden.background;
   assert.ok(img,base+' '+garden.id);
   assert.equal(img.getAttribute('src'),'/buncho-ureshi/'+art.src.replace(/\.png$/,'.screen.webp')+'?v='+art.sha256.slice(0,12));
   assert.equal(engine.serializeWorld(w),before);window.happyDOM.close();
  }
 }
});
test('booklet summaries retain focus and scroll on direct and host refresh without changing saves',async t=>{
 const {mountEncounterPanel}=await import('../src/encounter-controller.js');
 const window=new Window(),doc=window.document,root=doc.createElement('div'),world=worldFor('solo');doc.body.append(root);
 const panel=mountEncounterPanel(root,{getWorld:()=>world,transact:async fn=>fn(world),initialMode:'garden',earlyPredatorVisits:false});
 t.after(()=>{panel.destroy();window.happyDOM.close();});
 const get=key=>root.querySelector('[data-garden-details="'+key+'"]'),before=engine.serializeWorld(world);
 for(const key of ['about','about-rules'])for(const host of [false,true]){
  get('about').open=true;get('about-rules').open=true;get('about').scrollTop=91;
  get(key).querySelector(':scope > summary').focus();
  if(host){doc.dispatchEvent(new window.CustomEvent('buncho-game-will-render'));root.remove();doc.body.append(root);}
  panel.refresh();
  assert.equal(doc.activeElement,get(key).querySelector(':scope > summary'));
  assert.equal(get('about').scrollTop,91);
  assert.equal(engine.serializeWorld(world),before);
 }
 const outside=doc.createElement('button');doc.body.append(outside);
 root.querySelector('[data-garden-details=about] > summary').focus();doc.dispatchEvent(new window.CustomEvent('buncho-game-will-render'));outside.focus();panel.refresh();assert.equal(doc.activeElement,outside,'do not steal focus moved outside');
 const external=doc.createElement('details');external.className='garden-about-booklet';external.dataset.gardenDetails='about';external.innerHTML='<summary>External booklet</summary>';doc.body.append(external);
 root.querySelector('[data-garden-details=about] > summary').focus();doc.dispatchEvent(new window.CustomEvent('buncho-game-will-render'));external.querySelector('summary').focus();panel.refresh();assert.equal(doc.activeElement,external.querySelector('summary'),'do not capture another controller booklet');
 root.querySelector('[data-garden-details=about] > summary').focus();doc.dispatchEvent(new window.CustomEvent('buncho-game-will-render'));const other=root.querySelector('[data-garden-select]');other.focus();panel.refresh();assert.notEqual(doc.activeElement,root.querySelector('[data-garden-details=about] > summary'),'do not restore stale booklet focus over another garden control');
});
test('booklet focus is not restored into a different garden or world',async t=>{
 const {mountEncounterPanel}=await import('../src/encounter-controller.js');
 const window=new Window(),doc=window.document,root=doc.createElement('div');doc.body.append(root);let world=worldFor('solo');
 const panel=mountEncounterPanel(root,{getWorld:()=>world,transact:async fn=>fn(world),initialMode:'garden',earlyPredatorVisits:false});
 t.after(()=>{panel.destroy();window.happyDOM.close();});
 root.querySelector('[data-garden-details=about]').open=true;root.querySelector('[data-garden-details=about] > summary').focus();
 doc.dispatchEvent(new window.CustomEvent('buncho-game-will-render'));world.encounters.garden.id='mizukagami';panel.refresh();
 assert.notEqual(doc.activeElement,root.querySelector('[data-garden-details=about] > summary'));
 await panel.garden('komorebi');assert.equal(doc.activeElement,root.querySelector('h3'),'explicit garden navigation prioritizes its heading');
 root.querySelector('[data-garden-details=about]').open=true;root.querySelector('[data-garden-details=about] > summary').focus();
 doc.dispatchEvent(new window.CustomEvent('buncho-game-will-render'));world=worldFor('solo');world.worldId+='replacement';panel.refresh();
 assert.equal(root.querySelector('.garden-about-booklet'),null);
});
