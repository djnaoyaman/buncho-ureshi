import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {LONG_TAIL_ART,ENCOUNTER_BODY_ART,encounterBodyArt} from '../src/encounter-body-art.js';
import {renderEncounterActorArt,renderEncounterCageGuest} from '../src/encounter-ui.js';
import {ENCOUNTER_CATALOG} from '../src/data/encounter-catalog.js';

test('long-tail bodies share a head-to-feet size and keep the standing foot fixed at multiple actor sizes',()=>{
 for(const [id,p] of Object.entries(LONG_TAIL_ART)){
  const entry=ENCOUNTER_CATALOG.find(e=>e.id===id),g=encounterBodyArt(entry);
  for(const height of [44,52,80,110]){
   const actorWidth=height*7/8;
   const imageWidth=g.width*actorWidth;
   const imageHeight=imageWidth*entry.art.height/entry.art.width;
   assert.ok(imageWidth>0 && imageHeight>0,'width-based intrinsic image has size without a parent height');
   assert.ok(Math.abs(imageHeight*(p.footY-p.headY)-height*.78)<1e-8);
   const top=height-p.footY*imageHeight;
   assert.ok(Math.abs(top+p.footY*imageHeight-height)<1e-8);
   assert.ok(top+imageHeight>height,'tail extends past the feet without cropping');
   assert.ok(g.height>1,'full-image fitting would make this body smaller');
  }
 }
 assert.equal(encounterBodyArt({id:"unknown"}),null);
});

test('full CSS preserves long-tail geometry in garden and home, including media loading hooks',t=>{
 const win=new Window();t.after(()=>win.happyDOM.close());const doc=win.document;
 doc.body.dataset.world='buncho';
 for(const f of ['encounter-ui.css','game.css']){const style=doc.createElement('style');style.textContent=readFileSync(new URL('../src/'+f,import.meta.url),'utf8');doc.head.append(style);}
 for(const id of Object.keys(ENCOUNTER_BODY_ART)){
  const entry=ENCOUNTER_CATALOG.find(e=>e.id===id);
  doc.body.innerHTML=`<div class="game-app"><div class="finch-garden"><div class="finch-garden-stage"><button class="finch-garden-visitor">${renderEncounterActorArt(entry)}</button></div></div>${renderEncounterCageGuest(entry)}</div>`;
  for(const wrapper of doc.querySelectorAll('[data-body-art]')){
   const image=wrapper.querySelector('img'),style=win.getComputedStyle(image);
   assert.equal(win.getComputedStyle(wrapper).overflow,'visible');
   assert.equal(win.getComputedStyle(wrapper).top,'auto');
   assert.equal(win.getComputedStyle(wrapper).maxWidth,'none');
   assert.equal(style.width,`${encounterBodyArt(entry).width*100}%`);assert.equal(style.height,'auto');assert.equal(style.top,'100%');
   assert.equal(style.left,'50%');assert.equal(style.transform,encounterBodyArt(entry).style.match(/transform:([^;]+)/)[1]);
   assert.equal(style.maxHeight,'none');assert.equal(image.getAttribute('width'),String(entry.art.width));
   assert.equal(image.getAttribute('height'),String(entry.art.height));assert.ok(image.dataset.mediaSrc);
  }
 }
 const home=doc.querySelector('.finch-cage-guest .finch-media');
 assert.equal(home.dataset.mediaState,'ready');
 assert.equal(home.style.height,'auto');
 assert.equal(home.style.aspectRatio,'7 / 8');
 assert.equal(doc.querySelector('.finch-garden-visitor .finch-media').style.height,'100%');
 const normal=renderEncounterActorArt({...ENCOUNTER_CATALOG[0],id:'unknown'});
 assert.ok(!normal.includes('data-body-art'));assert.ok(!normal.includes('transform:'));
});

 test('all 35 approved illustrations have shared garden/home proportions and grounded feet',()=>{
 assert.equal(ENCOUNTER_CATALOG.length,35);
 assert.deepEqual(Object.keys(ENCOUNTER_BODY_ART).sort(),ENCOUNTER_CATALOG.map(e=>e.id).sort());
 for(const e of ENCOUNTER_CATALOG){
  const p=ENCOUNTER_BODY_ART[e.id],g=encounterBodyArt(e);
  assert.ok(p.headY>=0 && p.footY>p.headY && p.footY<=1);
  assert.ok(p.footX>0 && p.footX<1 && p.ratio>=.75 && p.ratio<=1.3);
  for(const h of [52,75.3,80,117.65]){
   const ih=g.width*h*7/8*e.art.height/e.art.width;
   assert.ok(Math.abs(ih*(p.footY-p.headY)-h*.78*p.ratio)<1e-8);
   const [,tx,ty]=g.style.match(/translate\(([-.0-9]+)%,([-.0-9]+)%\)/);
   assert.ok(Math.abs(h+Number(ty)/100*ih+p.footY*ih-h)<1e-8);
   assert.ok(Math.abs(Number(tx)/100+p.footX)<1e-8);
  }
  for(const html of [renderEncounterActorArt(e),renderEncounterCageGuest(e)]){
   assert.ok(html.includes(`data-body-art="${e.id}"`));
   assert.ok(html.includes(g.style));
  }
 }
});

test('garden tail reserve covers measured pixels below standing feet at all frame sizes',()=>{
 const css=readFileSync(new URL('../src/encounter-ui.css',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.css',import.meta.url),'utf8');
 for(const [id,bottom,factor] of [['pin-tailed-whydah',.824,.38],['long-tailed-paradise-whydah',.964,.754]]){
  const p=ENCOUNTER_BODY_ART[id];
  assert.ok(css.includes(`--encounter-frame-height) * ${String(factor).replace(/^0/,'')}`));
  for(const h of [52,70.6,75.3,80,117.65]) assert.ok(h*factor >= h*.78/(p.footY-p.headY)*(bottom-p.footY));
 }
 assert.ok(game.includes('max(27px,calc(var(--garden-tail-reserve,0px) + 6px))'));
});
