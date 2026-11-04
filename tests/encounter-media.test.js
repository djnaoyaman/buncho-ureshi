import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountEncounterMedia} from '../src/encounter-media.js';
import {renderEncounterNotebook,renderEncounterPage,renderGardenStage} from '../src/encounter-ui.js';
import {createWorld} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {readFile} from 'node:fs/promises';

const frame = src => `<span class="finch-media" data-media-state="pending"><img data-media-src="${src}" data-media-lazy="true" width="384" height="384"><span data-media-label>読み込み中…</span></span>`;
function setup(html) {
  const win=new Window(),root=win.document.createElement('div');win.document.body.append(root);root.innerHTML=html;
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
  const {win,root,media}=setup('<div class="finch-garden-stage"><img src="/bg.webp"><img src="/bird.webp"><div class="finch-garden-loading"><span data-media-label></span><button data-media-retry hidden></button></div></div>');media.refresh();const imgs=[...root.querySelectorAll('img')];
  load(win,imgs[0]);await Promise.resolve();assert.equal(root.firstElementChild.dataset.sceneState,'loading');load(win,imgs[1]);await Promise.resolve();assert.equal(root.firstElementChild.dataset.sceneState,'ready');assert.equal(root.querySelector('.finch-garden-loading').hidden,true);
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
  assert.equal(gardens.length,9);assert.ok(total(gardens,'screenBytes')<total(gardens,'originalBytes')*.25);
  assert.ok(total(birds,'thumbnailBytes')<total(birds,'originalBytes')*.05);assert.ok(records.every(x=>x.width>0&&x.height>0&&!x.source.includes('/photos/')));
});
