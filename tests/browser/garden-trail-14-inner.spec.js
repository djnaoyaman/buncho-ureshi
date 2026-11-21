import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';
import {engine} from '../fixtures/garden-about-world.js';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
test.use({hasTouch:true,trace:'off',screenshot:'off',video:'off'});
test.setTimeout(150000);
const garden='bird-long-tailed-paradise-whydah';
async function overlay(page,pattern,edit){await page.route(pattern,async request=>{
 const response=await request.fetch();expect(response.ok()).toBe(true);
 await request.fulfill({response,body:edit(await response.text())});
});}
test('#14 pair on the inward dry gates',async({page},info)=>{
 let code='setup',mapped={terrain:0,order:0};
 try{
  await overlay(page,/\/src\/data\/garden-trail-terrain\.js(?:\?.*)?$/,source=>{
   const decl=/^export const GARDEN_TRAIL_TERRAIN=Object\.freeze\((\{[^\n]+\})\);$/gm;
   const entries=[...source.matchAll(decl)];expect(entries).toHaveLength(1);
   const data=JSON.parse(entries[0][1]),g=data[garden];expect(g.number).toBe(14);
   expect(g.entryCandidates).toEqual([[.823,.462],[.438,.775]]);expect(g.pullouts).toEqual([[.367,.611]]);
   expect(g.lane).toEqual([[.821,.466],[.713,.516],[.618,.565],[.511,.656],[.459,.754]]);
   data[garden]={...g,entryCandidates:[[.735,.535],[.438,.787]],pullouts:[[.317,.611]],lane:[[.675,.577],[.603,.637],[.552,.716],[.514,.783]]};mapped.terrain++;
   return source.replace(decl,'export const GARDEN_TRAIL_TERRAIN=Object.freeze('+JSON.stringify(data)+');');
  });
  await overlay(page,/\/src\/garden-actor-motion\.js(?:\?.*)?$/,source=>{
   const a='if(!started&&!lane&&terrain.number===28&&bay&&roster.length===2){';
   expect(source.split(a)).toHaveLength(2);mapped.order++;
   source=source.replace(a,'if(!started&&!lane&&[14,28].includes(terrain.number)&&bay&&roster.length===2){');
   const gateAnchor='if(!planned)planned=packTrailStandingSeats(measured);';
   expect(source.split(gateAnchor)).toHaveLength(2);
   return source.replace(gateAnchor,"if(!planned&&terrain.number===14&&peers.size===0&&roster.length===2&&roster.every(d=>d.movable)){const gates=input.seats.filter(n=>n.id==='A'||n.id==='B');let outcome='nominal-gate-missing';if(gates.length===2&&new Set(gates.map(n=>n.id)).size===2){outcome='measured-pair-denied';planned=assignTrailSeats({...input,seats:gates,accept(formalPlan){if(!roster.every(d=>formalPlan.has(d.id)&&input.canPlace(d,formalPlan.get(d.id),formalPlan)))return false;outcome='native-hit-denied';const okay=input.accept(formalPlan);if(okay)outcome='north-pair-accepted';return okay;}});}globalThis.__qa14GatePlacement??=outcome;} if(!planned)planned=packTrailStandingSeats(measured);");
  });
  await setup(page,garden,402,true,true,{trailPreview:true,height:874,afterOpenMs:0,prepareWorld:w=>{
   const bird=engine.createBird(w,{home:'resident',stage:'adult',color:'cinnamon'});
   w.encounters.gardenFriends.attendees.push(bird.id);
  }});
  expect(mapped.terrain).toBeGreaterThan(0);expect(mapped.order).toBeGreaterThan(0);
  const sample=()=>page.evaluate(()=>{
   const s=document.querySelector('.finch-garden-stage'),g=s?.closest('.finch-garden');
   const birds=[...(s?.querySelectorAll('.finch-garden-image-plane > button')||[])].map(b=>{
    const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,d=b.dataset;
    const wing=b.querySelector('.garden-actor-flight');
    return {id:d.gardenActorId,node:d.actorNode,target:d.actorLanding,state:d.actorState,phase:d.actorPhase,x,y,w:r.width,h:r.height,
     hit:b.contains(document.elementFromPoint(x,y)),paint:!!wing&&getComputedStyle(wing).visibility==='visible'&&!!b.querySelector('[data-terrain-flight-active]')};
   });return {world:g?.dataset.gardenWorld,id:s?.dataset.gardenId,ready:s?.dataset.sceneState,birds};
  });
  let first;
  for(let i=0;i<=32;i++){
   first=await sample();
   if(first.ready==='ready'&&first.birds.map(b=>b.node).sort().join(',')==='A,B')break;
   if(i!==32)await page.clock.runFor(16);
  }
  const ids=first.birds.map(b=>b.id);
  if(first.birds.map(b=>b.node).sort().join(',')!=='A,B'){
   const stage=await page.evaluate(()=>globalThis.__qa14GatePlacement);
   code=['nominal-gate-missing','measured-pair-denied','native-hit-denied','north-pair-accepted'].includes(stage)?stage==='north-pair-accepted'?'accepted-but-not-seen':stage:'not-attempted';
   throw Error(code);
  }
  code='native-gates';expect(first.ready).toBe('ready');expect(first.id).toBe(garden);
  expect(first.birds.map(b=>b.node).sort()).toEqual(['A','B']);expect(new Set(ids).size).toBe(2);expect(ids.every(Boolean)).toBe(true);
  let parked=null,flight=null,landed=null;const phases=new Set();let paint=false,moved=false;
  for(let i=0;i<160;i++){
   const now=await sample();code='native-hits';
   expect([now.id,now.world,now.ready]).toEqual([garden,first.world,'ready']);expect(now.birds.map(b=>b.id)).toEqual(ids);
   for(const b of now.birds){const f=first.birds.find(q=>q.id===b.id);expect(b.hit).toBe(true);expect(b.w).toBeGreaterThanOrEqual(43.99);expect(b.h).toBeGreaterThanOrEqual(43.99);expect(b.w).toBeCloseTo(f.w,2);expect(b.h).toBeCloseTo(f.h,2);}
   const p=now.birds.find(b=>b.node==='bay'&&b.phase==='ground'&&!b.target),a=now.birds.find(b=>b.state==='fly'&&b.target);
   if(p&&!parked)parked=p.id;
   if(a){
    code='fly-after-bay';expect(parked).toBeTruthy();expect(p?.id).toBe(parked);expect(a.id).not.toBe(parked);
    if(!flight)flight={id:a.id,source:a.node,target:a.target,x:a.x,y:a.y};
    expect([a.id,a.node,a.target]).toEqual([flight.id,flight.source,flight.target]);phases.add(a.phase);paint||=a.paint;moved||=Math.hypot(a.x-flight.x,a.y-flight.y)>2;
   }
   if(flight&&now.birds.some(b=>b.id===flight.id&&b.node===flight.target&&b.phase==='ground'&&!b.target)){landed=now;break;}
   await page.clock.runFor(100);
  }
  code='bay-missing';expect(parked).toBeTruthy();
  code='fly-missing';expect(flight).toBeTruthy();expect([flight.source,flight.target].sort()).toEqual(['A','B']);
  code='fly-phases';expect([...phases]).toEqual(expect.arrayContaining(['rise','flap','contact']));expect(paint&&moved).toBe(true);
  code='same-landing';expect(landed).toBeTruthy();expect(landed.birds.find(b=>b.id===parked)).toMatchObject({node:'bay',phase:'ground',hit:true});
  code='landing-tap';const edo=landed.birds.find(b=>b.id==='b1');await page.touchscreen.tap(edo.x,edo.y);
  await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();code='pass';
 }finally{
  const out=process.env.TYPE2_CHECKPOINT_DIR;
  if(out&&['chrome','webkit'].includes(info.project.name))writeFileSync(join(out,info.project.name+'-14-inner'),code+'\n',{mode:0o600,flag:'wx'});
 }
});
