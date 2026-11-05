import sharp from 'sharp';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {GARDENS,gardenBackgroundForStage,gardenStageGeometry} from '../src/data/gardens.js';
import {renderGardenStage} from '../src/encounter-ui.js';
import {mountEncounterMedia} from '../src/encounter-media.js';
import {createWorld} from '../src/engine.js';

const ids=['java-rice','bali-terrace','paris-unrest'];
test('three revised gardens have verified portrait and landscape sources without new save IDs',async()=>{
 assert.equal(GARDENS.length,12);
 for(const id of ids){
  const original=gardenBackgroundForStage(id,399,500),wide=gardenBackgroundForStage(id,400,500);
  assert.ok(!original.src.includes('-wide'));assert.ok(wide.src.includes('-wide'));
  assert.equal(gardenBackgroundForStage(id,401,500).src,wide.src);
  for(const b of [original,wide]){const bytes=readFileSync(new URL('../public/'+b.src,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),b.sha256);const metadata=await sharp(bytes).metadata();assert.equal(metadata.width,b.width);assert.equal(metadata.height,b.height);}
  for(const [width,height] of [[390,690],[320,420],[900,440],[1024,768],[660,160]]){const b=gardenBackgroundForStage(id,width,height),g=gardenStageGeometry(id,width,height);assert.ok(Math.abs(g.drawWidth/g.drawHeight-b.width/b.height)<1e-12);assert.equal(b.friendFeet[1].x,.5);}
 }
 assert.equal(gardenBackgroundForStage('komorebi',900,440).landscape,undefined);
});

function fixture(t){
 const win=new Window({url:'http://localhost/'}),root=win.document.body,world=createWorld(1000);world.encounters.garden.id='java-rice';
 let size={width:900,height:440};const observers=new Set();
 win.ResizeObserver=class{constructor(fn){this.fn=fn;}observe(){observers.add(this);}disconnect(){observers.delete(this);}};
 const render=()=>{root.innerHTML=renderGardenStage(world);root.querySelector('.finch-garden-stage').getBoundingClientRect=()=>size;for(const img of root.querySelectorAll('img'))Object.defineProperty(img,'complete',{value:false,configurable:true});};
 render();const media=mountEncounterMedia(root);
 t.after(()=>{media.destroy();win.happyDOM.close();});
 const load=img=>{Object.defineProperty(img,'naturalWidth',{value:941,configurable:true});Object.defineProperty(img,'complete',{value:true,configurable:true});img.decode=()=>Promise.resolve();img.dispatchEvent(new win.Event('load'));};
 return {root,world,media,render,load,win,observers,resize:(width,height)=>{size={width,height};for(const o of [...observers])o.fn();}};
}
test('wide decoded art survives redraw; rotation replaces only the source, not birds or save state',async t=>{
 const f=fixture(t),before=structuredClone(f.world);f.media.refresh();const bg=f.root.querySelector('.finch-garden-background');assert.match(bg.getAttribute('src'),/java-rice-wide-v2.webp\?v=/);
 for(const img of f.root.querySelectorAll('img'))f.load(img);await Promise.resolve();assert.equal(f.root.firstElementChild.dataset.sceneState,'ready');
 f.media.preserve();f.render();f.media.refresh();assert.equal(f.root.querySelector('.finch-garden-background'),bg);assert.equal(f.root.firstElementChild.dataset.sceneState,'ready');
 const birds=[...f.root.querySelectorAll('[data-garden-friend],[data-garden-household]')];
 f.resize(390,690);assert.match(bg.getAttribute('src'),/java-rice-v2.webp\?v=/);assert.equal(f.root.firstElementChild.dataset.sceneState,'loading');assert.deepEqual([...f.root.querySelectorAll('[data-garden-friend],[data-garden-household]')],birds);
 f.load(bg);await Promise.resolve();assert.equal(f.root.firstElementChild.dataset.sceneState,'ready');assert.equal(f.root.querySelector('.finch-garden-image-plane').style.getPropertyValue('--garden-anchor-y'),'0.68');assert.deepEqual(f.world,before);
 f.media.preserve();assert.equal(f.observers.size,0);f.root.innerHTML='';f.media.refresh();assert.equal(f.observers.size,0);
});
test('old decode cannot mark rotated art ready; failed active source can retry and navigate away',async t=>{
 const f=fixture(t);f.media.refresh();const bg=f.root.querySelector('.finch-garden-background');for(const img of f.root.querySelectorAll('img'))if(img!==bg)f.load(img);
 Object.defineProperty(bg,'naturalWidth',{value:1672,configurable:true});let finish;bg.decode=()=>new Promise(resolve=>{finish=resolve;});bg.dispatchEvent(new f.win.Event('load'));
 f.resize(390,690);finish();await Promise.resolve();assert.equal(f.root.firstElementChild.dataset.sceneState,'loading');
 bg.dispatchEvent(new f.win.Event('error'));assert.equal(f.root.firstElementChild.dataset.sceneState,'error');f.root.querySelector('[data-media-retry]').click();assert.equal(f.root.firstElementChild.dataset.sceneState,'loading');f.load(bg);await Promise.resolve();assert.equal(f.root.firstElementChild.dataset.sceneState,'ready');
 f.resize(900,440);f.resize(390,690);f.media.preserve();f.root.innerHTML='<p>Notebook</p>';f.media.refresh();bg.dispatchEvent(new f.win.Event('error'));assert.equal(f.root.textContent,'Notebook');
});
