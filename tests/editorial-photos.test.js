import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { photos } from '../src/data/photos.js';
import { editorialPhotoFocus } from '../src/editorial-photo-focus.js';
import { photoDrift, photoMotionPlan, bindEditorialParallax } from '../src/editorial-parallax.js';
const read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');
test('fixed photo masks and credits preserve all sources and individual color profiles',async()=>{
 const css=await read('src/style.css'),section=css.split('/* Editorial index only.')[1];assert(section);
 const profiles=[...section.matchAll(/#article-grid img\[src\$="(photo-\d+)\.webp"\]/g)].map(m=>m[1]);
 assert.equal(profiles.length,33);assert.equal(new Set(profiles).size,33);
 assert.deepEqual(Object.keys(editorialPhotoFocus).sort(),profiles.sort());
 for(const p of photos){const file=await readFile(new URL('../public'+p.src,import.meta.url));assert.equal(createHash('sha256').update(file).digest('hex'),p.sha256,p.id);}
 assert(!section.includes('hue-rotate'));assert(!section.includes('sepia'));assert(!section.includes('.article-hero'));assert(!section.includes('.photo-row'));
 assert(section.includes('.article-cover-window{overflow:hidden'));assert(section.includes('aspect-ratio:var(--photo-source-ratio)'));
 assert(!section.includes('.article-cover-frame{transform:translate'));assert(!section.includes('margin-block:60px'));
 const app=await read('src/app.js');assert(app.includes('style="--photo-source-ratio:${p.width}/${p.height}">${image(id)}</div><small class="article-cover-credit">'));
 assert(app.includes('元写真・作者・利用条件'));
});
test('all photo plans keep the source bird bounds inside the fixed window at both extremes',()=>{
 let moving=0;
 for(const [id,bounds] of Object.entries(editorialPhotoFocus))for(const width of [280,300,350,365,480]){
  const p=photos.find(p=>p.id===id),height=width*p.height/p.width,plan=photoMotionPlan(width,height,bounds,width<=350?28:32);
  assert(plan.scale>=1&&plan.scale<=1.24);assert(plan.limit>=0&&plan.limit<=32);
  if(plan.limit>=4)moving++;
  for(const direction of [-1,0,1]){
   const x=plan.x+(plan.axis==='x'?direction*plan.limit:0),y=plan.y+(plan.axis==='y'?direction*plan.limit:0);
   for(const [size,lo,hi,offset] of [[width,bounds[0],bounds[2],x],[height,bounds[1],bounds[3],y]]){
    const imageStart=size*(1-plan.scale)/2+offset,imageEnd=imageStart+size*plan.scale;
    assert(imageStart<=.001&&imageEnd>=size-.001,id+' covers the mask');
    assert(imageStart+lo*size*plan.scale>=-.001,id+' preserves leading anatomy');
    assert(imageStart+hi*size*plan.scale<=size+.001,id+' preserves trailing anatomy');
   }
  }
 }
 assert(moving>=120,'most images retain noticeable motion without anatomical crop');
});
test('the opening photograph has visible internal travel while edge-tight images remain safe',()=>{
 for(const width of [300,350,365]){
  const p=photos.find(p=>p.id==='photo-29'),plan=photoMotionPlan(width,width*p.height/p.width,editorialPhotoFocus[p.id],28);
  assert.equal(plan.axis,'y');assert(plan.limit>=20);
 }
 for(const id of ['photo-14','photo-16','photo-18','photo-21','photo-43'])assert(editorialPhotoFocus[id]);
 assert.deepEqual(photoMotionPlan(300,200,[0,0,1,1]),{scale:1,x:0,y:0,limit:0,axis:'static'});
});
test('scroll depth is bounded and invalid/disabled documents are safe',()=>{
 assert.equal(photoDrift(330,900,28,.16),19.2);assert.equal(photoDrift(570,900,28,.16),-19.2);
 assert.equal(photoDrift(0,0),0);assert.equal(photoDrift(NaN,900),0);
 assert.equal(typeof bindEditorialParallax(null),'function');assert.equal(typeof bindEditorialParallax({}, {enabled:false}),'function');
 assert.equal(photoMotionPlan(0,200,[.2,.2,.8,.8]).limit,0);assert.equal(photoMotionPlan(300,200,null).limit,0);
});
