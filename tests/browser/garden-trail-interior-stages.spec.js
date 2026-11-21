import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {setup} from '../fixtures/garden-terrain-browser.js';

test.use({hasTouch:true,trace:'off',screenshot:'off',video:'off'});
test.setTimeout(65000);
const gardens=[['10','bird-tricolored-munia'],['14','bird-long-tailed-paradise-whydah']];
const hooks=[
 ['let current=null,proven=null,epoch=null,lastLocal=null,localFlightId=null,interior=null,interiorMiss=null;',
  "let current=null,proven=null,epoch=null,lastLocal=null,localFlightId=null,interior=null,interiorMiss=null;\n const marks=globalThis.__trialStageMarks={called:false,eligible:false,pair:false,sweep:false,sampled:false,adapter:false,ingress:false,flight:false};"],
 ['singletonInterior({paintable=()=>true}={}){\n   const [a]=model.actors.values();',
  'singletonInterior({paintable=()=>true}={}){\n   marks.called=true;const [a]=model.actors.values();'],
 ['   const plane=current.plane,here={id:a.node,p:a.p};',
  '   marks.eligible=true;const plane=current.plane,here={id:a.node,p:a.p};'],
 ['if(!proven.safe(c,n,k,peers)||!paintable(c))return false;\n    const spans=proven.sweptRoute(c);\n    return !!spans&&adapter.canPlace({spans});',
  'if(!proven.safe(c,n,k,peers))return false;if(k==="fly")marks.sweep=true;\n    if(!paintable(c))return false;if(k==="fly")marks.sampled=true;\n    const spans=proven.sweptRoute(c);\n    const accepted=!!spans&&adapter.canPlace({spans});if(k==="fly"&&accepted)marks.adapter=true;return accepted;'],
 ['    if(!model.beginFlightPath(a.id,n,[a.p,n.p],env))return null;\n    localFlightId=a.id;',
  '    marks.pair=true;if(!model.beginFlightPath(a.id,n,[a.p,n.p],env))return null;\n    marks.flight=true;localFlightId=a.id;'],
 ['    for(const target of targets(ingress)){\n     const flight=',
  '    for(const target of targets(ingress)){\n     marks.pair=true;const flight='],
 ['     if(!model.beginHopPath(a.id,ingress,[a.p,ingress.p],env))continue;\n     localFlightId=a.id;',
  '     if(!model.beginHopPath(a.id,ingress,[a.p,ingress.p],env))continue;\n     marks.ingress=true;localFlightId=a.id;'],
];
function overlay(source){
 for(const [before,after] of hooks){
  expect(source.split(before).length,'exact reviewed runtime hook').toBe(2);
  source=source.replace(before,after);
 }
 return source;
}
for(const [n,garden] of gardens)test(`#${n} one play, bounded private stage verdicts only`,{tag:`@interior-stages-${n}`},async({page},info)=>{
 const dir=process.env.TYPE2_STAGE_STATUS_DIR;
 if(!dir||!['chrome','webkit'].includes(info.project.name))throw Error('Run only the named scratch diagnostics');
 let ready=false,native=true,ingress=null,ingressGrounded=false,flight=null,landed=false;
 const phases=new Set(),frames=new Set();
 let marks={};
 await page.route(/\/src\/garden-trail-runtime\.js(?:\?.*)?$/,async route=>{
  const response=await route.fetch();await route.fulfill({response,body:overlay(await response.text())});
 });
 await setup(page,garden,402,true,true,{trailPreview:true,leadColor:'white',height:874,afterOpenMs:0});
 for(let step=0;step<240;step++){
  await page.clock.runFor(100);
  const s=await page.evaluate(()=>{
   const stage=document.querySelector('.finch-garden-stage'),bird=stage?.querySelector('[data-garden-household=b1]');
   const rect=bird?.getBoundingClientRect(),hit=rect&&document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
   const art=bird?.querySelector('.garden-actor-flight'),white=art?.querySelector('img[data-white-flight-frame]');
   return {ready:stage?.dataset.sceneState==='ready'&&stage?.dataset.actorMotion==='trail-active',
    native:!!hit&&bird.contains(hit)&&bird.dataset.gardenActorId==='b1'&&rect.width>=43.99&&rect.height>=43.99&&stage.querySelectorAll('.finch-garden-image-plane > button').length===1,
    state:bird?.dataset.actorState,phase:bird?.dataset.actorPhase,site:bird?.dataset.actorNode,target:bird?.dataset.actorLanding,
    frame:art&&white&&getComputedStyle(art).visibility==='visible'&&getComputedStyle(white).visibility==='visible'&&white.complete&&white.naturalWidth>0?white.getAttribute('data-frame'):null,
    marks:globalThis.__trialStageMarks};
  });
  for(const [key,v] of Object.entries(s.marks??{}))marks[key] ||= v===true;
  ready ||= s.ready===true;
  if(ready)native &&= s.native===true;
  if(!ingress&&s.state==='hop'&&s.target?.startsWith('interior:'))ingress=s.target;
  if(ingress&&s.phase==='ground'&&!s.target&&s.site===ingress)ingressGrounded=true;
  if(!flight&&s.state==='fly'&&s.target&&s.site!==s.target)flight={source:s.site,target:s.target};
  if(flight&&s.state==='fly'&&s.site===flight.source&&s.target===flight.target){
   phases.add(s.phase);if(s.frame&&['rise','flap'].includes(s.phase))frames.add(s.frame);
  }
  if(flight&&s.phase==='ground'&&!s.target&&s.site===flight.target){landed=true;break;}
 }
 expect(Object.hasOwn(marks,'called'),'diagnostic overlay ran').toBe(true);
 // Fixed enum statuses only, consumed within this job; never write/attach
 // raw coordinates, per-frame samples, counters, source or user data.
 const status=(passes,reached=true)=>passes?'pass':reached?'fail':'not-reached';
 const direct=flight&&!ingress&&!marks.ingress;
 const result={
  ready:status(ready),native:status(ready&&native,ready),
  eligible:status(marks.eligible||direct,ready),
  'pair-offered':status(marks.pair||direct,marks.eligible),
  swept:status(marks.sweep||direct,marks.pair),
  sampled:status(marks.sampled||direct,marks.sweep),
  adapter:status(marks.adapter||direct,marks.sampled),
  'ingress-reserved':direct?'direct':status(!!ingress,marks.adapter),
  'ingress-grounded':direct?'direct':status(ingressGrounded,!!ingress),
  'flight-reserved':status(!!flight,marks.adapter||ingressGrounded),
  phases:status(['rise','flap','contact'].every(p=>phases.has(p)),!!flight),
  paint:status(frames.size>=2,!!flight),
  landing:status(landed,!!flight),
 };
 writeFileSync(join(dir,`${n}-${info.project.name}.json`),JSON.stringify(result)+'\n',{mode:0o600});
});
