import {writeFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';

const control='java-rice',trail='bird-zebra-finch';
const stage=page=>page.locator('.finch-garden-stage');
const viewport={height:874,afterOpenMs:0};
const config={...viewport,trailPreview:true};
test.use({hasTouch:true});
test.setTimeout(45000);

test('01 served game module contains exactly one opt-in replacement token', {tag:'@causal-module'},async({request})=>{
 const r=await request.get('src/game.js');expect(r.ok()).toBe(true);
 const source=await r.text();
 expect(source.split('previewGardenTrail = false')).toHaveLength(2);
 expect(source.split('predatorRandom = Math.random')).toHaveLength(2);
});

test('02 unmodified Type I #01 control page opens the intended ready garden', {tag:'@causal-control-ready'},async({page})=>{
 await setup(page,control,402,true,true,viewport);
 await expect(stage(page)).toHaveAttribute('data-garden-id',control);
 await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
 await expect(stage(page)).not.toHaveAttribute('data-garden-trail-preview','true');
});

test('03 unmodified Type I #01 control exposes a genuine native tap', {tag:'@causal-control-tap'},async({page})=>{
 await setup(page,control,402,true,true,viewport);
 await page.clock.runFor(1000);
 const snap=await snapshotGarden(page),b=snap.birds[0];
 assertGardenIdentities(snap.birds,1,['b1']);
 expect(snap.motion).toBe('active');expect(b.hit).toBe(true);
 await page.touchscreen.tap(b.point.x,b.point.y);
 await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
});

test('04 #07 without opt-in opens its ready native stage', {tag:'@causal-trail-ordinary'},async({page})=>{
 await setup(page,trail,402,true,true,viewport);
 await expect(stage(page)).toHaveAttribute('data-garden-id',trail);
 await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
 await expect(stage(page)).not.toHaveAttribute('data-garden-trail-preview','true');
});

test('05 opt-in #07 receives the browser route replacement', {tag:'@causal-gate'},async({page})=>{
 await setup(page,trail,402,true,true,config);
 await expect(stage(page)).toHaveAttribute('data-garden-id',trail);
 await expect(stage(page)).toHaveAttribute('data-garden-trail-preview','true');
});
test('06 #07 test clock drives exact browser-wall time without native mutation', {tag:'@causal-clock'},async({page})=>{
 await setup(page,trail,402,true,true,config);
 const before=await page.evaluate(()=>Date.now());
 await page.clock.runFor(500);
 expect(await page.evaluate(()=>Date.now())).toBe(before+500);
});

function checkHit(b){
 expect(b.rect.width,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
 expect(b.rect.height,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
 expect(b.centerInViewport,JSON.stringify(b)).toBe(true);
 expect(b.hit,JSON.stringify(b)).toBe(true);
}
test('07 opt-in #07 single native actor retains tap after measured seat allocation', {tag:'@causal-solo-fit'},async({page})=>{
 await setup(page,trail,402,true,true,config);await page.clock.runFor(1000);
 const snap=await snapshotGarden(page),b=snap.birds[0];
 assertGardenIdentities(snap.birds,1,['b1']);
 expect(snap.motion).toMatch(/^trail-(active|held|standing)$/);
 checkHit(b);
 await page.touchscreen.tap(b.point.x,b.point.y);
 await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
});

test('08 opt-in #07 reaches all ten real native identities', {tag:'@causal-maximum-id'},async({page})=>{
 await setup(page,trail,375,true,'maximum',{...config,height:667});await page.clock.runFor(1000);
 const s=await snapshotGarden(page);
 assertGardenIdentities(s.birds,10);
});
async function instrumentMaximum(page,notes){
 await page.addInitScript(()=>{globalThis.__trailMaxProbe={runs:[],current:null};});
 const files={
  'garden-actor-motion':[
   ["planned=peers.size?assignTrailSeats(input):packTrailStandingSeats(input);",
    "const trace=globalThis.__trailMaxProbe; const probe={actors:roster.length,seats:input.seats.length,peers:peers.size, causes:{}, choices:[], native:[]}; trace.runs.push(probe); if(trace.runs.length>12)trace.runs.shift(); trace.current=probe; try{planned=peers.size?assignTrailSeats(input):packTrailStandingSeats(input);}finally{trace.current=null;} probe.planned=planned?.size??0;"],
   ["if(trailRuntime&&model.actors.size!==roster.length)return reject('trail-blocked-placement');",
    "if(trailRuntime&&planned){const last=globalThis.__trailMaxProbe.runs.at(-1); if(last)last.reconciled=model.actors.size;} if(trailRuntime&&model.actors.size!==roster.length)return reject('trail-blocked-placement');"],
   ["if(r.width<43.99||r.height<43.99||!hit||!node.contains(hit))return false;",
    "if(r.width<43.99||r.height<43.99||!hit||!node.contains(hit)){globalThis.__trailMaxProbe.current?.native.push(r.width<43.99||r.height<43.99?'size':!hit?'no-hit':hit.closest('.finch-garden-image-plane > button')?'bird-hit':'other-hit'); return false;}"],
   ["return true;\n   }finally{\n    for(const [node,style]of saved)",
    "globalThis.__trailMaxProbe.current?.native.push('accepted'); return true;\n   }finally{\n    for(const [node,style]of saved)"],
  ],
  'garden-trail-clearance':[
   ['choices.set(a.id,ordered.filter(n=>check(a,n,safe)));',
    'choices.set(a.id,ordered.filter(n=>check(a,n,safe))); globalThis.__trailMaxProbe.current?.choices.push(choices.get(a.id).length);'],
   ['return fill(actors)?plan:null;',
    'const result=fill(actors)?plan:null; const t=globalThis.__trailMaxProbe.current;if(t)Object.assign(t,{checks,probes,maxChecks,maxProbes}); return result;'],
   ['return assign(0)?plan:null;',
    'const result=assign(0)?plan:null; const t=globalThis.__trailMaxProbe.current;if(t)Object.assign(t,{checks:tries,probes,maxChecks:maxTries,maxProbes}); return result;'],
  ],
  'garden-trail-runtime':[
   ['if(!proven||!proven.canStand(actor,node.p))return false;',
    "const mark=kind=>{const t=globalThis.__trailMaxProbe.current;if(t){const k=(peers.size?'partial-':'empty-')+kind;t.causes[k]=(t.causes[k]??0)+1;}}; if(!proven||!proven.canStand(actor,node.p)){mark('canStand'); return false;}"],
   ['if(!s)return false;','if(!s){mark("swept"); return false;}'],
   ['for(const p of peers.values())if(p.id!==actor.id&&proven.placementConflicts(candidate,p))return false;',
    "for(const p of peers.values())if(p.id!==actor.id&&proven.placementConflicts(candidate,p)){mark('peer'); return false;}"],
   ['return adapter.canPlace({spans:s});',
    "const ok=adapter.canPlace({spans:s}); mark(ok?'accepted':'lane'); return ok;"],
  ],
 };
 for(const [name,replacements] of Object.entries(files))await page.route(new RegExp('/src/'+name+'\\.js(?:\\?.*)?$'),async route=>{
  const seen=notes.routes[name]??={seen:0,fulfilled:0,bad:false}; seen.seen++;
  const response=await route.fetch();let body=await response.text();
  for(const [before,after] of replacements){
   if(body.split(before).length!==2){seen.bad=true; break;}
   body=body.replace(before,after);
  }
  if(seen.bad){await route.fulfill({response});return;}
  await route.fulfill({response,body});seen.fulfilled++;
 });
}

test('09 opt-in #07 maximum measured unobstructed 44px hits', {tag:'@causal-maximum-fit'},async({page})=>{
 const observed=process.env.TRAIL_STAGE_TELEMETRY==='1';
 const info=test.info(), notes={project:info.project.name,routes:{},trace:false,setup:false,snapshot:false,strict:false};
 try{
  if(observed)await instrumentMaximum(page,notes);
  await setup(page,trail,375,true,'maximum',{...config,height:667});notes.setup=true;
  await page.clock.runFor(1000);
  const s=await snapshotGarden(page);notes.snapshot=true;
  assertGardenIdentities(s.birds,10);
  expect(s.motion).toMatch(/^trail-(active|held|standing)$/);
  for(const b of s.birds)checkHit(b);
  notes.strict=true;
 }finally{
  if(observed){
   try{
    if(!page.isClosed()){
     const sample=await page.evaluate(()=>{
      const stage=document.querySelector('.finch-garden-stage'), t=globalThis.__trailMaxProbe;
      const probe=t?.runs.at(-1);
      return {trace:!!t,motion:(stage?.dataset.actorMotion||stage?.dataset.terrainMotion)??null,probe:probe??null};
     });
     Object.assign(notes,sample);
    }
   }finally{
    info.annotations.push({type:'trail-stage',description:JSON.stringify(notes)});
    if(['chrome','webkit'].includes(notes.project))writeFileSync('/tmp/type-ii-stage-'+notes.project+'.json',JSON.stringify(notes),'utf8');
   }
  }
 }

});

test('10 opt-in #07 single bird performs a genuine rise, flap and contact', {tag:'@causal-flight'},async({page})=>{
 await setup(page,trail,402,true,true,config);await page.clock.runFor(1000);
 const phases=new Set(),bird=page.locator('[data-garden-household=b1]');
 for(let i=0;i<200;i++){
  await page.clock.runFor(100);
  const value=await bird.evaluate(b=>({state:b.dataset.actorState,phase:b.dataset.actorPhase,kind:b.querySelector('.garden-bird-sprite')?.dataset.color}));
  expect(value.kind).toBe('white');
  if(value.state==='fly')phases.add(value.phase);
  if(['rise','flap','contact'].every(p=>phases.has(p)))break;
 }
 expect([...phases]).toEqual(expect.arrayContaining(['rise','flap','contact']));
});

async function maximum(page){
 await setup(page,trail,375,true,'maximum',{...config,height:667});await page.clock.runFor(1000);
 const result=await snapshotGarden(page);
 assertGardenIdentities(result.birds,10);
 return result;
}
async function hitsFor(page,role){
 await maximum(page);
 const results=await page.evaluate(()=>{
  const plane=document.querySelector('.finch-garden-image-plane');
  return [...plane.querySelectorAll(':scope > button')].map(button=>{
   const r=button.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
   const hit=document.elementFromPoint(x,y);
   const role=button.matches('.finch-garden-household')?'household':button.matches('.finch-garden-friend')?'friend':button.matches('.finch-garden-visitor')?'visitor':'unknown';
   return {role,hit:!!hit&&button.contains(hit)};
  });
 });
 expect(results).toHaveLength(10);
 expect(results.some(b=>b.role==='unknown')).toBe(false);
 const chosen=results.filter(b=>b.role===role);
 expect(chosen.length).toBeGreaterThan(0);
 for(const b of chosen)expect(b.hit).toBe(true);
}
test('#07 maximum: qualified measured layout, rather than native fallback', {tag:'@causal-max-layout-valid'},async({page})=>{const s=await maximum(page); expect(s.motion).toMatch(/^trail-(active|held|standing)$/);});
test('#07 maximum: every native control is at least 44px wide', {tag:'@causal-max-width'},async({page})=>{const {birds}=await maximum(page);for(const b of birds)expect(b.rect.width).toBeGreaterThanOrEqual(43.99);});
test('#07 maximum: every native control is at least 44px high', {tag:'@causal-max-height'},async({page})=>{const {birds}=await maximum(page);for(const b of birds)expect(b.rect.height).toBeGreaterThanOrEqual(43.99);});
test('#07 maximum: all native control centers are within viewport', {tag:'@causal-max-centers'},async({page})=>{const {birds}=await maximum(page);for(const b of birds)expect(b.centerInViewport).toBe(true);});
test('#07 maximum: all household centers resolve to their native control', {tag:'@causal-max-household-hit'},async({page})=>{await hitsFor(page,'household');});
test('#07 maximum: all regular friend centers resolve to their native control', {tag:'@causal-max-friend-hit'},async({page})=>{await hitsFor(page,'friend');});
test('#07 maximum: all waiting or returning visitor centers resolve to their native control', {tag:'@causal-max-visitor-hit'},async({page})=>{await hitsFor(page,'visitor');});

test('#07 maximum records a Type II motion result', {tag:'@causal-reason-present'},async({page})=>{
 const s=await maximum(page);
 expect(s.motion).toMatch(/^(?:trail-|insufficient-space$|geometry-blocked$)/);
});
for(const reason of ['insufficient-space','trail-blocked-placement','trail-blocked-geometry','trail-needs-recovery','geometry-blocked']){
 test(`#07 maximum does not enter ${reason}`,{tag:`@causal-reason-${reason}`},async({page})=>{
  const s=await maximum(page);
  expect(s.motion).not.toBe(reason);
 });
}
