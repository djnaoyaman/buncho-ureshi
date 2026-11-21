import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';

const cases=[['08','bird-red-avadavat'],['10','bird-tricolored-munia'],['34','bird-masked-finch']];
const pilot={trailPreview:true,height:874,afterOpenMs:0},stage=page=>page.locator('.finch-garden-stage');
const knownMotion=new Set(['trail-active','trail-held','trail-standing','insufficient-space','trail-blocked-placement','trail-blocked-geometry','trail-needs-recovery','geometry-blocked','active','held']);
const mode=s=>knownMotion.has(s)?s:'other';
test.use({hasTouch:true,trace:'off',screenshot:'off',video:'off'});
test.setTimeout(150000);
function assertNative(s,count,ids=null){
 assertGardenIdentities(s.birds,count,ids);
 for(const b of s.birds){
  expect(b.rect.width,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
  expect(b.rect.height,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
  expect(b.centerInViewport,JSON.stringify(b)).toBe(true);
  expect(b.hit,JSON.stringify({bird:b,motion:s.motion})).toBe(true);
 }
}
async function stable(page,width=402,height=874){
 await page.setViewportSize({width,height});await page.clock.runFor(1000);
 await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
 return snapshotGarden(page);
}
// Count original decisions. No hook changes a candidate, native verdict,
// scheduler branch, route reservation, or any layout styles.
async function install(page,notes){
 await page.addInitScript(()=>{globalThis.__type2dense={pack:null,scheduler:0,local:0,options:0,tries:0,accepted:0};});
 const hooks={
  'garden-actor-motion':[
   ['  let planned=null;', '  let planned=null;let denseTrace=null;'],
   ['   if(peers.size){\n    planned=assignTrailSeats(input);',
    '   if(roster.length===10){denseTrace={retained:peers.size,unary:null,nativeOffered:0,nativeChecked:0,nativePassed:0,planned:0};globalThis.__type2dense.pack=denseTrace;}\n   if(peers.size){\n    planned=assignTrailSeats(input);'],
   ['accept:nativeTrailHits,maxTries:3500,canPlace(d,n,partial){',
    'accept:plan=>{const measure=active&&typeof root.ownerDocument.elementFromPoint==="function";if(denseTrace){denseTrace.nativeOffered++;if(measure)denseTrace.nativeChecked++;}const ok=nativeTrailHits(plan);if(denseTrace&&measure&&ok)denseTrace.nativePassed++;return ok;},maxTries:3500,canPlace(d,n,partial){'],
   ["   if(!planned)return reject('trail-blocked-placement');",
    "   if(denseTrace){denseTrace.planned=planned?.size??0;if(!planned&&!peers.size){denseTrace.unary=input.actors.filter(a=>input.seats.some(n=>input.canPlace(a,n,new Map()))).length;}}\n   if(!planned)return reject('trail-blocked-placement');"],
   ['     if(elapsed>=nextTrail){','     if(elapsed>=nextTrail){if(roster.length===10)globalThis.__type2dense.scheduler++;'],
  ],
  'garden-trail-runtime':[
   ['  localHop(seats,{minDistance=16,maxDistance=68,singletonIngress=false}={}){\n   if(!proven)return null;\n   const roster=[...model.actors.values()];',
    '  localHop(seats,{minDistance=16,maxDistance=68,singletonIngress=false}={}){\n   if(!proven)return null;\n   const roster=[...model.actors.values()];const denseTrace=roster.length===10?globalThis.__type2dense:null;if(denseTrace)denseTrace.local++;'],
   ["    for(const n of alternatives)if(model.beginHopPath(a.id,n,[a.p,n.p],env)){lastLocal=a.id;return {id:a.id,target:n.id,action:'hop'};}",
    "    if(denseTrace)denseTrace.options+=alternatives.length;for(const n of alternatives){if(denseTrace)denseTrace.tries++;if(model.beginHopPath(a.id,n,[a.p,n.p],env)){if(denseTrace)denseTrace.accepted++;lastLocal=a.id;return {id:a.id,target:n.id,action:'hop'};}}"],
  ],
 };
 for(const [name,edits] of Object.entries(hooks))await page.route(new RegExp('/src/'+name+'\\.js(?:\\?.*)?$'),async route=>{
  const response=await route.fetch();let body=await response.text();
  const note=notes[name]??={served:0,mismatches:0};note.served++;
  for(const [before,after] of edits){
   if(body.split(before).length!==2){note.mismatches++;await route.fulfill({response});return;}
   body=body.replace(before,after);
  }
  await route.fulfill({response,body});
 });
}
for(const [garden,id] of cases)test('#'+garden+' dense 10 first failed checkpoint',{tag:'@dense-10-first'},async({page},info)=>{
 const note={engine:info.project.name,garden,first:'setup',checks:{},routes:{},motion:{},sample:null,trace:null,traceAtReturn:null};
 const at=async(k,fn)=>{note.first=k;const result=await fn();note.checks[k]=true;return result;};
 const snap=(k,w,h)=>at(k,async()=>{const s=await stable(page,w,h);note.motion[k]=mode(s.motion);return s;});
 try{
  await at('setup',async()=>{await install(page,note.routes);await setup(page,id,375,true,'maximum',{...pilot,height:667});await expect(stage(page)).toHaveAttribute('data-garden-trail-preview','true');});
  const first=await snap('portrait1-ready',375,667),ids=first.birds.map(b=>b.id);
  await at('portrait1-native',()=>assertNative(first,10));
  await at('portrait1-qualified',()=>expect(first.motion).toMatch(/^trail-(active|held|standing)$/));
  await at('tap-open',async()=>{const b=first.birds.find(b=>b.id==='b1');await page.touchscreen.tap(b.point.x,b.point.y);await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();});
  await at('tap-close',()=>page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).tap());
  const landscape=await snap('landscape-ready',667,375);
  await at('landscape-native',()=>assertNative(landscape,10,ids));
  const returned=await snap('portrait2-ready',402,874);
  await at('portrait2-native',()=>assertNative(returned,10,ids));
  note.traceAtReturn=await page.evaluate(()=>globalThis.__type2dense??null);
  let moving=false;
  for(let i=0;i<90;i++){
   note.first='sample-read';
   await page.clock.runFor(180);const sample=await snapshotGarden(page);
   note.sample=i;note.motion.sample=mode(sample.motion);
   await at('sample-native',()=>assertNative(sample,10,ids));
   if(sample.birds.some(b=>['hop','fly'].includes(b.actorState))){moving=true;break;}
  }
  await at('real-motion',()=>expect(moving,'real safe movement required, not static fallback').toBe(true));
  note.first='pass';
 }finally{
  try{if(!page.isClosed())note.trace=await page.evaluate(()=>globalThis.__type2dense??null);}catch{}
  const dir=process.env.TYPE2_CHECKPOINT_DIR;
  if(!dir||!['chrome','webkit'].includes(note.engine))throw Error('Draft targeted run only');
  const p=note.trace?.pack;
  const hookOk=['garden-actor-motion','garden-trail-runtime'].every(name=>note.routes[name]?.served>0&&note.routes[name]?.mismatches===0);
  let code=note.first;
  if(!hookOk)code='hook-unverified';
  else if(code==='portrait1-qualified'){
   const q=note.motion['portrait1-ready'];
   if(q==='trail-blocked-placement'&&p){
    code=p.retained?'placement-retained':p.unary!==10?'placement-unary':p.nativeChecked>0&&p.nativePassed===0?'placement-native':'placement-no-pack';
   }else code='portrait-'+q;
  }else if(code==='real-motion'){
   const q=note.motion.sample;
   const x=note.trace??{},before=note.traceAtReturn??{};
   code=q!=='trail-active'?'motion-'+q:x.scheduler===(before.scheduler??0)?'motion-no-scheduler':x.local===(before.local??0)?'motion-no-local':x.options===(before.options??0)?'motion-no-candidates':x.accepted===(before.accepted??0)?'motion-sweep-denied':'motion-route-not-painted';
  }
  writeFileSync(join(dir,note.engine+'-'+garden+'-dense'),code+'\n',{mode:0o600,flag:'wx'});
 }
});
