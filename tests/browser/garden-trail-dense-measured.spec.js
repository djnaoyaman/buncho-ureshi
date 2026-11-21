import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';

const cases=[['08','bird-red-avadavat'],['10','bird-tricolored-munia']];
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
 await page.addInitScript(()=>{globalThis.__type2dense={pack:null,variant:'original',options:{}};});
 const hooks={
  'garden-actor-motion':[
   ['  let planned=null;', '  let planned=null;let denseTrace=null;'],
   ['   if(peers.size){\n    planned=assignTrailSeats(input);',
    '   if(roster.length===10&&window.innerWidth===375&&window.innerHeight===667){const rootTrace=globalThis.__type2dense;denseTrace={retained:peers.size,originalSeats:input.seats.length,nativeSeeds:nativePreferred.size,solvers:{}};rootTrace.pack=denseTrace;}\n   if(peers.size){\n    planned=assignTrailSeats(input);'],
   ['accept:nativeTrailHits,maxTries:3500,canPlace(d,n,partial){',
    'accept:plan=>{const phase=globalThis.__type2dense.variant;const q=denseTrace?.solvers?.[phase];const activeNative=active&&typeof root.ownerDocument.elementFromPoint==="function";if(q){q.offered++;if(activeNative)q.checked++;}const ok=nativeTrailHits(plan);if(q&&activeNative&&ok)q.domPassed++;return ok;},maxTries:3500,canPlace(d,n,partial){'],
   ['     planned=pitchTrailStandingSeats({', '     globalThis.__type2dense.variant="pitch";if(denseTrace)denseTrace.solvers.pitch={offered:0,checked:0,domPassed:0};\n     planned=pitchTrailStandingSeats({'],
   ['     if(!planned&&roster.length===10&&(terrain.number===8||terrain.number===10))\n      planned=contourTrailStandingSeats(',
    '     if(!planned&&roster.length===10&&(terrain.number===8||terrain.number===10)){\n      globalThis.__type2dense.variant="contour";if(denseTrace)denseTrace.solvers.contour={offered:0,checked:0,domPassed:0};\n      planned=contourTrailStandingSeats('],
   ['       safePoint:q=>safePoint(q,actorWidth,actorWidth*1000/850)});\n     if(planned){',
    '       safePoint:q=>safePoint(q,actorWidth,actorWidth*1000/850)});}\n     if(planned){'],
   ['    if(!planned)planned=packTrailStandingSeats(measured);',
    '    if(!planned){globalThis.__type2dense.variant="fine";if(denseTrace)denseTrace.solvers.fine={offered:0,checked:0,domPassed:0};planned=packTrailStandingSeats(measured);}'],
   ["   if(!planned)return reject('trail-blocked-placement');",
    "   if(denseTrace){denseTrace.planned=planned?.size??0;if(!planned&&!peers.size){denseTrace.unary=input.actors.filter(a=>input.seats.some(n=>input.canPlace(a,n,new Map()))).length;const t=globalThis.__type2dense;t.variant='replay';denseTrace.solvers.replay={offered:0,checked:0,domPassed:0};const replay=contourTrailStandingSeats({...input,...measurement,standingPairFits:trailRuntime.standingPairFits,knownSeats:input.seats,surface:terrain.surface,safePoint:q=>safePoint(q,actorWidth,actorWidth*1000/850),grid:6,maxChecks:105000,maxWork:1800000,maxStates:6000,maxProbes:1,accept:()=>true});denseTrace.replayTen=!!replay;denseTrace.replayRealTap=replay&&active&&typeof root.ownerDocument.elementFromPoint==='function'?nativeTrailHits(replay):null;}}\n   if(!planned)return reject('trail-blocked-placement');"],
  ],
  'garden-trail-clearance':[
   ['safePoint,knownSeats=[],maxChecks=64000','safePoint,knownSeats=[],grid=8,maxChecks=64000'],
   ['for(const [shiftX,shiftY] of [[3,4],[1,0],[5,2],[7,6]]){',
    'const trace=globalThis.__type2dense;const stats=trace.pack?.solvers[trace.variant];const info={phases:0,slots:0,groups:0,best:0,checks:0,work:0,states:0,checksCap:false,workCap:false,stateCap:false};if(stats)stats.geometry=info;\n for(const [shiftX,shiftY] of grid===8?[[3,4],[1,0],[5,2],[7,6]]:[[0,0],[2,2],[4,4]]){'],
   ['Math.floor(bounds[2]/8)*8+shiftY;y<=bounds[3]&&seats.length<440;y+=8','Math.floor(bounds[2]/grid)*grid+shiftY;y<=bounds[3]&&seats.length<440;y+=grid'],
   ['Math.floor(bounds[0]/8)*8+shiftX;x<=bounds[1]&&seats.length<440;x+=8','Math.floor(bounds[0]/grid)*grid+shiftX;x<=bounds[1]&&seats.length<440;x+=grid'],
   ['  if(seats.length<actors.length)continue;\n  const groups=new Map();',
    '  info.phases++;info.slots=Math.max(info.slots,seats.length);\n  if(seats.length<actors.length)continue;\n  const groups=new Map();'],
   ['  const verts=[...groups.values()].flatMap(g=>g.ns.map(n=>({g,n})));',
    '  info.groups=Math.max(info.groups,groups.size);\n  const verts=[...groups.values()].flatMap(g=>g.ns.map(n=>({g,n})));'],
   ['  function seek(path,list){','  function seek(path,list){info.best=Math.max(info.best,path.length);'],
   ['  const result=seek([],verts.map((_,i)=>i));\n  if(result)return result;',
    '  const result=seek([],verts.map((_,i)=>i));\n  Object.assign(info,{checks,work,states,seatCap:seats.length>=440,checksCap:checks>=maxChecks,workCap:work>=maxWork,stateCap:states>=maxStates});\n  if(result)return result;'],
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
for(const [garden,id] of cases)test('#'+garden+' dense 10 first failed checkpoint',{tag:'@dense-actual-measured'},async({page},info)=>{
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
  const p=note.trace?.pack, c=p?.solvers?.contour, r=p?.solvers?.replay?.geometry;
  const hooks=['garden-actor-motion','garden-trail-clearance'].every(n=>note.routes[n]?.served>0&&note.routes[n]?.mismatches===0);
  let code=note.first==='pass'?'pass':note.first==='portrait1-qualified'?'placement-unclassified':'other-assertion';
  if(!hooks)code='hook-unverified';
  else if(note.first==='portrait1-qualified'&&p){
   if(p.replayTen)code=p.replayRealTap===true?'measured-ten-real-hits':p.replayRealTap===false?'measured-ten-hit-rejected':'measured-ten-native-not-ready';
   else if(c?.checked&&c.domPassed===0)code='contour-native-rejected';
   else if(p.retained)code='retained';
   else if(p.unary!==10)code='unary-not-ten';
   else if(r?.checksCap||r?.workCap||r?.stateCap||r?.seatCap)code='sample-budget-ended';
   else if(r?.phases===3)code='sample-no-ten';
   else code='replay-not-reached';
  }
  writeFileSync(join(dir,note.engine+'-'+garden+'-dense-measured'),code+'\n',{mode:0o600,flag:'wx'});
 }
});
