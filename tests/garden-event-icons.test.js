import test from 'node:test';
import {readFile,stat} from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {encounterSystem} from '../src/encounters.js';
import {createWorld} from '../src/engine.js';
import {renderLeafGift} from '../src/garden-leaf-event-ui.js';
import {renderExpedition} from '../src/garden-expedition-ui.js';
import {renderShowcase} from '../src/garden-showcase-ui.js';
test('selected event entrance artwork stays decorative, text-free and save-neutral',async()=>{
 const w=createWorld(Date.UTC(2026,10,15,12));encounterSystem.selectGarden(w,'komorebi',{worldId:w.worldId,revision:w.revision});
 const before=JSON.stringify(w),win=new Window();
 try{for(const [render,choice] of [[renderLeafGift,'leaf'],[renderExpedition,'compass'],[renderShowcase,'showcase']]){
  win.document.body.innerHTML=render(w);
  const summary=win.document.querySelector('summary'),img=summary.querySelector('img');
  assert.equal(summary.textContent,'');assert.ok(summary.getAttribute('aria-label'));
  assert.equal(img.getAttribute('data-event-icon'),'06-'+choice);
  assert.equal(img.getAttribute('src'),`/buncho-ureshi/game-art/event-icons/botanical-${choice}-v1.png`);
  assert.equal(img.getAttribute('aria-hidden'),'true');assert.equal(img.getAttribute('alt'),'');
  assert.equal(img.getAttribute('draggable'),'false');assert.equal(img.getAttribute('width'),'192');
  assert.equal(summary.querySelectorAll('svg,script').length,0);
  assert.ok(win.document.querySelector('[data-garden-story-close]'));
 }
 assert.equal(JSON.stringify(w),before);
 }finally{await win.happyDOM.close();}
});

test('botanical specimens are compact transparent PNG assets supported by iOS 15',async()=>{
 for(const name of ['leaf','compass','showcase']){
  const file=`public/game-art/event-icons/botanical-${name}-v1.png`;
  const meta=await sharp(await readFile(file)).metadata();
  assert.equal(meta.format,'png');assert.equal(meta.width,192);assert.equal(meta.height,192);assert.equal(meta.hasAlpha,true);
  assert.ok((await stat(file)).size<100000);
 }
});
test('all three entrance URLs honor the supplied site base',async()=>{
 const w=createWorld(Date.UTC(2026,10,15,12));encounterSystem.selectGarden(w,'komorebi',{worldId:w.worldId,revision:w.revision});
 const win=new Window();try{for(const render of [renderLeafGift,renderExpedition,renderShowcase]){
  win.document.body.innerHTML=render(w,{base:'/preview/'});
  assert.match(win.document.querySelector('summary img').getAttribute('src'),/^\/preview\/game-art\/event-icons\//);
 }}finally{await win.happyDOM.close();}
});
