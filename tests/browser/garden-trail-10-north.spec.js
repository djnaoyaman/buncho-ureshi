import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';
import {engine} from '../fixtures/garden-about-world.js';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
test.use({hasTouch:true,trace:'off',screenshot:'off',video:'off'});
test.setTimeout(150000);
const garden='bird-tricolored-munia';
async function overlay(page,pattern,edit){await page.route(pattern,async request=>{
 const response=await request.fetch();expect(response.ok()).toBe(true);
 await request.fulfill({response,body:edit(await response.text())});
});}
test('#10 pair on the measured north gates',async({page},info)=>{
 let early='setup',late='setup',mapped={terrain:0,order:0};
 try{
  await overlay(page,/\/src\/data\/garden-trail-terrain\.js(?:\?.*)?$/,source=>{
   const decl=/^export const GARDEN_TRAIL_TERRAIN=Object\.freeze\((\{[^\n]+\})\);$/gm;
   const entries=[...source.matchAll(decl)];expect(entries).toHaveLength(1);
   const data=JSON.parse(entries[0][1]),g=data[garden];expect(g.number).toBe(10);
   expect(g.entryCandidates).toEqual([[.225,.646],[.777,.634]]);expect(g.pullouts).toEqual([[.52,.736]]);
   expect(g.lane).toEqual([[.683,.632],[.5,.65],[.316,.685]]);
   data[garden]={...g,entryCandidates:[[.30,.607],[.70,.603]],lane:[[.50,.596]]};mapped.terrain++;
   return source.replace(decl,'export const GARDEN_TRAIL_TERRAIN=Object.freeze('+JSON.stringify(data)+');');
  });
  await overlay(page,/\/src\/garden-actor-motion\.js(?:\?.*)?$/,source=>{
   const a='if(!started&&!lane&&terrain.number===28&&bay&&roster.length===2){';
   expect(source.split(a)).toHaveLength(2);mapped.order++;
   return source.replace(a,'if(!started&&!lane&&[10,28].includes(terrain.number)&&bay&&roster.length===2){');
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
   });return {world:g?.dataset.gardenWorld,id:s?.dataset.gardenId,ready:s?.dataset.sceneState,motion:s?.dataset.actorMotion,birds};
  });
  const classify=s=>{
    if(s.ready!=='ready')return 'not-ready';
    if(s.id!==garden||!s.world)return 'scene-identity';
    if(s.birds.length!==2||s.birds.some(b=>!b.id)||new Set(s.birds.map(b=>b.id)).size!==2||!s.birds.some(b=>b.id==='b1'))return 'roster-mismatch';
    if(s.birds.some(b=>!b.node)){
     const states={'trail-blocked-placement':'unbound-placement','trail-blocked-geometry':'unbound-geometry','geometry-blocked':'unbound-frame','insufficient-space':'unbound-space','trail-needs-recovery':'unbound-recovery'};
     return states[s.motion]??'actor-unbound';
    }
    if(s.birds.some(b=>b.node==='bay'))return 'already-bay';
    const a=s.birds.find(b=>b.node==='A'),b=s.birds.find(b=>b.node==='B');
    if(!a||!b)return !a&&!b?'both-gates-missing':!a?'gate-a-missing':'gate-b-missing';
    const usable=b=>b.hit&&b.w>=43.99&&b.h>=43.99;
    if(!usable(a)||!usable(b))return !usable(a)&&!usable(b)?'both-hits-denied':!usable(a)?'gate-a-hit-denied':'gate-b-hit-denied';
    return 'pass';
   };
   let spent=0;
   for(;spent<=320;spent+=16){
    early=classify(await sample());
    if(!['not-ready','actor-unbound','roster-mismatch'].includes(early)||spent===320)break;
    await page.clock.runFor(16);
   }
   await page.clock.runFor(1000-spent);
   late=classify(await sample());
 }finally{
  const out=process.env.TYPE2_CHECKPOINT_DIR;
  if(!out||!['chrome','webkit'].includes(info.project.name))throw Error('Named diagnostic');
  for(const [t,v] of [['early',early],['late',late]])writeFileSync(join(out,info.project.name+'-10-'+t),v+'\n',{mode:0o600,flag:'wx'});
 }
});
