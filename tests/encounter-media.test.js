import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountEncounterMedia} from '../src/encounter-media.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
import {renderEncounterNotebook,renderEncounterPage,renderGardenStage,renderEncounterCageGuest} from '../src/encounter-ui.js';
import {createWorld} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {readFile} from 'node:fs/promises';
import {inviteFixture} from './fixtures/garden-invitation.js';

const frame = src => `<span class="finch-media" data-media-state="pending"><img data-media-src="${src}" data-media-lazy="true" width="384" height="384"><span data-media-label>読み込み中…</span></span>`;
function setup(html) {
  const win=new Window(),root=win.document.createElement('div');win.document.body.append(root);root.innerHTML=html;
  for(const img of root.querySelectorAll('img'))Object.defineProperty(img,'complete',{value:false,configurable:true});
  let callback,observed=[];
  win.IntersectionObserver=class{constructor(fn){callback=fn;}observe(el){observed.push(el);}unobserve(){}disconnect(){observed=[];}};
  const media=mountEncounterMedia(root);
  return {win,root,media,intersect:img=>callback([{target:img,isIntersecting:true}]),observed:()=>observed};
}
function load(win,img){Object.defineProperty(img,'naturalWidth',{value:384,configurable:true});Object.defineProperty(img,'complete',{value:true,configurable:true});img.decode=()=>Promise.resolve();img.dispatchEvent(new win.Event('load'));}
test('notebook defers every full-resolution original and requests only visible thumbnails',()=>{
  const {root,media,intersect,observed}=setup(`<div class="finch-catalog">${frame('/near.thumb.webp')}${frame('/far.thumb.webp')}</div>`);media.refresh();
  const images=[...root.querySelectorAll('img')];assert.equal(observed().length,2);assert.ok(images.every(img=>!img.getAttribute('src')));
  intersect(images[0]);assert.equal(images[0].getAttribute('src'),'/near.thumb.webp');assert.equal(images[1].getAttribute('src'),null);media.destroy();
});
test('pending image and decoded image nodes survive refresh without refetch or stale completion',async()=>{
  const {win,root,media,intersect}=setup(frame('/bird.thumb.webp'));media.refresh();const original=root.querySelector('img');intersect(original);
  media.preserve();root.innerHTML=frame('/bird.thumb.webp');media.refresh();assert.equal(root.querySelector('img'),original);
  load(win,original);await Promise.resolve();assert.equal(root.querySelector('.finch-media').dataset.mediaState,'ready');
  media.preserve();root.innerHTML=frame('/bird.thumb.webp');media.refresh();assert.equal(root.querySelector('.finch-media').dataset.mediaState,'ready');
  media.destroy();original.dispatchEvent(new win.Event('error'));assert.equal(root.querySelector('.finch-media').dataset.mediaState,'ready');
});
test('failure reveals retry; retry clears error without changing source or creating a new save',async()=>{
  const {win,root,media,intersect}=setup(frame('/bird.thumb.webp')+'<button class="finch-media-retry" data-media-retry hidden>Retry</button>');media.refresh();const img=root.querySelector('img');intersect(img);img.dispatchEvent(new win.Event('error'));
  assert.equal(root.querySelector('.finch-media').dataset.mediaState,'error');assert.equal(root.querySelector('button').hidden,false);root.querySelector('button').click();
  assert.equal(img.getAttribute('src'),'/bird.thumb.webp');load(win,img);await Promise.resolve();assert.equal(root.querySelector('.finch-media').dataset.mediaState,'ready');assert.equal(root.querySelector('button').hidden,true);media.destroy();
});
test('garden remains loading until every layer decodes and ignores completion after navigation',async()=>{
  const {win,root,media}=setup('<div class="finch-garden-stage"><div class="finch-garden-carousel"><img src="/bg.webp"><img src="/bird.webp"></div><div class="finch-garden-loading" role="status"><span data-media-label></span><button data-media-retry hidden></button></div></div>');media.refresh();const imgs=[...root.querySelectorAll('img')];
  const carousel=root.querySelector('.finch-garden-carousel'),status=root.querySelector('[role=status]');
  assert.equal(carousel.getAttribute('aria-busy'),'true');assert.equal(root.firstElementChild.hasAttribute('aria-busy'),false);assert.equal(status.closest('[aria-busy=true]'),null);
  load(win,imgs[0]);await Promise.resolve();assert.equal(root.firstElementChild.dataset.sceneState,'loading');load(win,imgs[1]);await Promise.resolve();assert.equal(root.firstElementChild.dataset.sceneState,'ready');assert.equal(root.querySelector('.finch-garden-loading').hidden,true);
  assert.equal(carousel.getAttribute('aria-busy'),'false');assert.equal(status.closest('[aria-busy=true]'),null);
  media.preserve();root.innerHTML=frame('/another.thumb.webp');media.refresh();imgs[0].dispatchEvent(new win.Event('error'));assert.equal(root.querySelector('.finch-media').dataset.mediaState,'pending');media.destroy();
});
test('rendered cards preserve individual silhouettes and use small delivery copies',()=>{
  const win=new Window();win.document.body.innerHTML=renderEncounterNotebook(createWorld(1000,42));const imgs=[...win.document.querySelectorAll('img')];
  assert.ok(imgs.length>20);assert.ok(imgs.every(img=>!img.getAttribute('src')));assert.equal(new Set(imgs.map(i=>i.dataset.mediaSrc)).size,imgs.length);assert.ok(imgs.filter(i=>i.dataset.mediaSrc.endsWith('.thumb.webp')).length>=29);assert.ok(imgs.every(i=>i.alt===''));
});
test('delivery copies reduce bytes while preserving full-size dimensions; original photographs are not processed',async()=>{
  const records=JSON.parse(await readFile(new URL('../dist/encounter-image-sizes.json',import.meta.url),'utf8'));
  const gardens=records.filter(x=>x.source.includes('/gardens/')),birds=records.filter(x=>x.source.includes('/finches/'));
  const total=(list,key)=>list.reduce((sum,x)=>sum+x[key],0);
  assert.equal(gardens.length,12);assert.ok(total(gardens,'screenBytes')<total(gardens,'originalBytes')*.25);
  assert.ok(total(birds,'thumbnailBytes')<total(birds,'originalBytes')*.05);assert.ok(records.every(x=>x.width>0&&x.height>0&&!x.source.includes('/photos/')));
});

test('cage visitors are visible without an encounter panel loader',()=>{
 const win=new Window();win.document.body.innerHTML=renderEncounterCageGuest(encounterSystem.catalog[0]);
 assert.equal(win.document.querySelector('.finch-media'),null);const img=win.document.querySelector('img');assert.match(img.getAttribute('src'),/\.screen\.webp$/);assert.ok(img.alt);
});
test('all catalog photographs retain exact original URLs, unaltered styles and license credits',()=>{
 const win=new Window(),world=createWorld(1000,42),before=JSON.stringify(world),base='/buncho-ureshi/';
 const visibleSystem={...encounterSystem,status:()=>({discovered:true})};
 assert.equal(encounterSystem.catalog.length,35);
 for(const entry of encounterSystem.catalog){
  win.document.body.innerHTML=renderEncounterPage(world,entry.id,{system:visibleSystem,base,showPhoto:true});
  const figure=win.document.querySelector('.finch-photo'),img=figure.querySelector('img'),caption=figure.querySelector('figcaption'),links=caption.querySelectorAll('a');
  assert.equal(img.getAttribute('src'),base+entry.photo.src,entry.id);assert.equal(img.dataset.mediaSrc,base+entry.photo.src,entry.id);
  assert.equal(img.getAttribute('style'),'object-fit:contain;object-position:center;filter:none;clip-path:none;transform:none;border-radius:0;opacity:1',entry.id);
  assert.equal(figure.dataset.photoUnaltered,String(entry.photo.noDerivatives===true),entry.id);assert.equal(img.alt,entry.photo.alt,entry.id);
  assert.ok(caption.textContent.includes(entry.photo.creator),entry.id);assert.ok(caption.textContent.includes(entry.photo.license),entry.id);assert.ok(caption.textContent.includes(entry.photo.modifications),entry.id);
  assert.equal(links[0].getAttribute('href'),entry.photo.source,entry.id);assert.equal(links[1].getAttribute('href'),entry.photo.licenseUrl,entry.id);
 }
 assert.equal(JSON.stringify(world),before);
});
test('reused bytes adopt the new discovery, alt and pose presentation',async()=>{
 const {win,root,media}=setup('<span class="finch-media" data-media-state="pending"><img src="/same.webp" data-media-src="/same.webp" class="finch-art is-silhouette" alt="" style="left:-10px"></span>');media.refresh();const old=root.querySelector('img');load(win,old);await Promise.resolve();
 media.preserve();root.innerHTML='<span class="finch-media" data-media-state="pending"><img src="/same.webp" data-media-src="/same.webp" class="finch-art" alt="コキンチョウ" style="left:-20px"></span>';media.refresh();
 assert.equal(root.querySelector('img'),old);assert.equal(old.className,'finch-art');assert.equal(old.alt,'コキンチョウ');assert.equal(old.style.left,'-20px');assert.equal(old.dataset.mediaResult,'ready');media.destroy();
});
test('decode deadline survives redraw even after all response bytes arrived',()=>{
 const {win,root,media}=setup(frame('/slow-decode.webp'));const img=root.querySelector('img');img.src=img.dataset.mediaSrc;Object.defineProperty(img,'naturalWidth',{value:384});Object.defineProperty(img,'complete',{value:true});img.decode=()=>new Promise(()=>{});
 let deadline;const oldSet=win.setTimeout,oldClear=win.clearTimeout;win.setTimeout=fn=>{deadline=fn;return 1;};win.clearTimeout=()=>{};
 media.refresh();assert.equal(typeof deadline,'function');media.preserve();root.innerHTML=frame('/slow-decode.webp');deadline=null;media.refresh();assert.equal(typeof deadline,'function');deadline();assert.equal(root.querySelector('.finch-media').dataset.mediaState,'error');media.destroy();win.setTimeout=oldSet;win.clearTimeout=oldClear;
});

test('pending original photo keeps its wrapper keyboard control and records one pet',async()=>{
 const win=new Window(),root=win.document.createElement('div');win.document.body.append(root);
 const style=win.document.createElement('style');style.textContent=await readFile(new URL('../src/encounter-ui.css',import.meta.url),'utf8');win.document.head.append(style);
 const world=createWorld(1000,42),entry=encounterSystem.catalog[0],token=()=>({worldId:world.worldId,revision:world.revision});world.paused=true;
 inviteFixture(encounterSystem,world,entry.id);encounterSystem.open(world,entry.id,token());for(const step of entry.steps)encounterSystem.act(world,world.encounters.active.instanceId,step.action,token());
 // Keep image responses pending in the DOM fixture while exercising the real keyboard handler.
 const imagePrototype=win.HTMLImageElement.prototype,complete=Object.getOwnPropertyDescriptor(imagePrototype,'complete');Object.defineProperty(imagePrototype,'complete',{configurable:true,get:()=>false});
 const controller=mountEncounterPanel(root,{getWorld:()=>world,transact:async operation=>operation(world)});
 try{
  controller.entry(entry.id);root.querySelector('[data-encounter-view=photo]').click();
  const figure=root.querySelector('.finch-photo'),control=figure.querySelector('[data-encounter-rub]'),img=figure.querySelector('img');
  assert.equal(control.tagName,'SPAN');assert.equal(control.className,'finch-media');assert.equal(control.dataset.mediaState,'pending');assert.equal(control.getAttribute('role'),'button');assert.equal(control.tabIndex,0);
  assert.equal(img.hasAttribute('data-encounter-rub'),false);assert.equal(img.hasAttribute('tabindex'),false);assert.equal(win.getComputedStyle(img).visibility,'hidden');assert.notEqual(win.getComputedStyle(control).visibility,'hidden');
  assert.equal(img.getAttribute('src'),'/buncho-ureshi/'+entry.photo.src);assert.equal(img.getAttribute('style'),'object-fit:contain;object-position:center;filter:none;clip-path:none;transform:none;border-radius:0;opacity:1');
  assert.deepEqual([...figure.children].map(child=>child.tagName),['SPAN','FIGCAPTION']);assert.deepEqual([...control.children].map(child=>child.tagName),['IMG','SPAN']);assert.ok(figure.querySelector('figcaption').textContent.includes(entry.photo.creator));
  assert.equal(encounterSystem.status(world,entry.id).points,10);control.focus();assert.equal(win.document.activeElement,control);
  control.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await Promise.resolve();await Promise.resolve();
  assert.equal(encounterSystem.status(world,entry.id).points,11);assert.equal(root.querySelector('[data-finch-points]').textContent,'11');assert.equal(win.document.activeElement,root.querySelector('.finch-photo [data-encounter-rub]'));
 }finally{controller.destroy();if(complete)Object.defineProperty(imagePrototype,'complete',complete);else delete imagePrototype.complete;await win.happyDOM.abort();}
});
