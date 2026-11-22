import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';
import {NOW,worldFor,load} from '../fixtures/garden-about-world.js';

const garden='bird-masked-finch', stage='.finch-garden-stage';
const pairs=[
 [{width:375,height:667},{width:667,height:375}],
 [{width:667,height:375},{width:402,height:874}],
 [{width:402,height:874},{width:874,height:402}]
];
async function seedMissedAmbientDraw(page){
 const {createGardenPredatorClock,PREDATOR_ENTRY_RULES}=await load('garden-predator-clock.js');
 const wallNow=NOW+1000,rule=PREDATOR_ENTRY_RULES;
 let journal;
 // A real historical miss, with no visit, companion mutation or warning.
 // The native game still runs its own real clocks and guarded future draws.
 const clock=createGardenPredatorClock({random:()=>1,persist:value=>{journal=value;return true;}});
 const steps=Math.ceil(rule.dwellMs/rule.maxSampleGapMs);
 for(let i=0;i<=steps;i++){
  const now=rule.dwellMs*i/steps;
  expect(clock.sample({key:'masked-courtyard-historical-miss',eligible:true,now,wallNow:wallNow-rule.dwellMs+now})).toBeNull();
 }
 expect(journal).toEqual({version:1,lastDraw:wallNow,pending:null});
 const {worldId}=worldFor('attending',garden);
 await page.addInitScript(({worldId,journal})=>{
  const key='buncho-predator-attempt-v1:'+worldId;
  if(!sessionStorage.getItem(key))sessionStorage.setItem(key,JSON.stringify(journal));
 },{worldId,journal});
 return w=>expect(w.worldId).toBe(worldId);
}
const snapshot=page=>page.evaluate(()=>{
 const stage=document.querySelector('.finch-garden-stage'),root=stage.closest('.finch-garden');
 const pane=stage.querySelector('.finch-garden-slide'),plane=pane.querySelector('.finch-garden-image-plane'),p=pane.getBoundingClientRect(),a=plane.getBoundingClientRect();
 const source=plane.querySelector('.finch-garden-background'),bound=n=>n.getBoundingClientRect();
 const own=(n,r,x=.5,y=.5)=>n.contains(document.elementFromPoint(r.left+r.width*x,r.top+r.height*y));
 const selectors=['[data-garden-scroll=previous]','[data-garden-scroll=next]','[data-jog-center]', '[data-garden-jog]',
  '[data-garden-details=observe]>summary','[data-encounter-back]','.game-scene-controls-toggle',
  '.game-overlay-head [data-game-close-panel]'];
 const controls=selectors.map(s=>{
  const n=document.querySelector(s),r=n&&bound(n),css=n&&getComputedStyle(n);
  if(!r||!r.width||!r.height||css.visibility!=='visible')return {s,hidden:true};
  return {s,w:r.width,h:r.height,own:(s==='[data-garden-jog]'?[.15,.5,.85]:[.5]).every(y=>own(n,r,.5,y)),
   disjoint:r.right<=p.left||r.left>=p.right||r.bottom<=p.top||r.top>=p.bottom};
 });
 const native=[...plane.querySelectorAll(':scope > button')], birds=native.map(n=>{
  const r=bound(n),d=n.dataset,wing=n.querySelector('.garden-actor-flight');
  return {id:d.gardenActorId||d.gardenVisitingFriend||d.encounterOpen||d.encounterPage,
   color:n.querySelector('.garden-bird-sprite')?.dataset.color,
   node:d.actorNode,state:d.actorState,phase:d.actorPhase,target:d.actorLanding,
   x:n.style.left,y:n.style.top,left:r.left,top:r.top,w:r.width,h:r.height,hit:own(n,r),
   contained:r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom,
   wing:!!wing&&getComputedStyle(wing).visibility==='visible'};
 });
 return {ready:stage.dataset.sceneState,mode:root.dataset.gardenMaskedPlay,status:root.dataset.gardenSharedStatus,
  imageReady:source.complete&&source.naturalWidth>0,source:source.currentSrc,world:root.dataset.gardenWorld,
  activeBefore:!window.__masked34||(window.__masked34.stage===stage&&window.__masked34.native.every((n,i)=>n===native[i])),
  camera:[p.width,p.height,a.width,a.height,a.left-p.left,a.top-p.top].map(x=>Math.round(x*100)/100),controls,birds};
});
function verify(s,expectedIds,expectedSource){
 expect(s.mode).toBe('candidate');expect(s.status).toBe('admitted');expect(s.ready).toBe('ready');expect(s.imageReady).toBe(true);
 expect(s.camera).toEqual([375,157,750,1334.04,-180,-731.33]);
 expect(s.activeBefore).toBe(true);
 if(expectedSource)expect(s.source).toBe(expectedSource);
 const ids=s.birds.map(b=>b.id);
 expect(s.birds).toHaveLength(10);expect(ids.every(Boolean)).toBe(true);expect(new Set(ids).size).toBe(10);
 if(expectedIds)expect(ids).toEqual(expectedIds);
 expect(s.birds.map(b=>b.color)).toEqual(expect.arrayContaining(['white','sakura','cinnamon','silver']));
 for(const b of s.birds){
  expect(b.w).toBeGreaterThanOrEqual(43.99);expect(b.h).toBeGreaterThanOrEqual(43.99);expect(b.hit).toBe(true);expect(b.contained).toBe(true);
 }
 for(const c of s.controls.filter(c=>!c.hidden)){
  expect(c.w,c.s).toBeGreaterThanOrEqual(43.99);expect(c.h,c.s).toBeGreaterThanOrEqual(43.99);
  expect(c.own,c.s).toBe(true);expect(c.disjoint,c.s).toBe(true);
 }
 for(const s0 of ['[data-garden-scroll=previous]','[data-garden-scroll=next]','[data-jog-center]','[data-garden-jog]'])
  expect(s.controls.find(c=>c.s===s0).hidden).not.toBe(true);
 expect(s.controls.find(c=>c.s==='[data-garden-jog]').h).toBeCloseTo(62,1);
 return ids;
}

test.use({hasTouch:true});
test.setTimeout(120000);
for(const [first,second] of pairs)test(`#34 fixed courtyard, ${first.width}×${first.height} to ${second.width}×${second.height}, real flight and taps`,async({page},info)=>{
 const capture=[];
 const prepareWorld=await seedMissedAmbientDraw(page);
 await setup(page,garden,first.width,true,'maximum',{height:first.height,nativeSource:true,afterOpenMs:0,prepareWorld});
 // One authored frame after scene media readiness; never poll for a hit.
 await page.clock.runFor(34);
 const take=async()=>{const s=await snapshot(page);capture.push(s);return s;};
 try{
  const initial=await take(), ids=verify(initial);
  await page.locator(stage).evaluate(n=>{window.__masked34={stage:n,native:[...n.querySelectorAll('.finch-garden-image-plane > button')]};});
  let before;
  for(let i=0;i<100&&!before;i++){
   await page.clock.runFor(80);
   const s=await take();verify(s,ids,initial.source);
   const b=s.birds.find(b=>b.phase==='rise'&&b.state==='fly'&&/^shared-gate-/.test(b.target)&&b.wing);
   if(b)before=b;
  }
  expect(before,'a bird should be visibly in flight before rotation').toBeTruthy();
  await page.setViewportSize(second);
  const exact=await take();verify(exact,ids,initial.source);expect(exact.world).toBe(initial.world);
  const current=exact.birds.find(b=>b.id===before.id);
  expect([current.phase,current.node,current.target,current.x,current.y,current.wing]).toEqual([before.phase,before.node,before.target,before.x,before.y,true]);
  const phases=[], samples=[];
  let landed;
  for(let i=0;i<75&&!landed;i++){
   await page.clock.runFor(40);
   const s=await take();verify(s,ids,initial.source);
   const b=s.birds.find(b=>b.id===before.id);
   if(b.target){expect(b.target).toBe(before.target);expect(b.node).toBe(before.node);phases.push(b.phase);samples.push(b.x+':'+b.y);}
   else if(b.phase==='ground'){expect(b.node).toBe(before.target);landed=b;}
  }
  expect(landed).toBeTruthy();
  let last=-1;
  for(const p of ['flap','brake','feet','contact','fold']){
   const i=phases.indexOf(p);expect(i,p).toBeGreaterThan(last);last=i;
  }
  expect(new Set(samples).size).toBeGreaterThan(2);
  expect(landed.id).toBe('b1');
  await page.touchscreen.tap(landed.left+landed.w/2,landed.top+landed.h/2);
  await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).tap();
  await page.locator('[data-garden-scroll=previous]').tap();
  await expect(page.locator(stage)).not.toHaveAttribute('data-garden-id',garden);
  await page.locator('[data-garden-scroll=next]').tap();
  await expect(page.locator(stage)).toHaveAttribute('data-garden-id',garden);
 }finally{
  const receipt=capture.find(s=>s.status!=='admitted'||s.birds.some(b=>!b.hit)||s.controls.some(c=>!c.hidden&&(!c.own||!c.disjoint)))??capture.at(-1);
  if(receipt){
   const failed=receipt.controls.find(c=>!c.hidden&&(!c.own||!c.disjoint));
   const names=['previous','next','jog-action','jog-surface','observe','book','scene','home'];
   const token=failed?names[receipt.controls.indexOf(failed)]:'none';
   info.annotations.push({type:'qa-34-fixed-room',description:`${receipt.status||'unknown'}:${receipt.birds.filter(b=>b.hit).length}:${token}`});
   await info.attach('masked-fixed-native-samples',{body:JSON.stringify(capture),contentType:'application/json'});
  }
 }
});
