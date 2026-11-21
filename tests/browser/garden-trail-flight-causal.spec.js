import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';

test.use({hasTouch:true});
test.setTimeout(55000);
const profiles=[['10','bird-tricolored-munia'],['14','bird-long-tailed-paradise-whydah']];
const cfg={trailPreview:true,leadColor:'white',height:874,afterOpenMs:0};
const roots=[
 ['const terrain=trailTerrainFor(id);if(!terrain)throw Error(\'Unsuitable garden\');',
  "const terrain=trailTerrainFor(id);if(!terrain)throw Error('Unsuitable garden');\n const record=globalThis.__trailFlightProbes={setup:0,eligible:0,offered:0,measured:0,paintable:0,laneAdmitted:0,laneCommitted:0};"],
 ['const d=adapter.admit();if(!d)return null;',
  'const d=adapter.admit();if(!d)return null;record.laneAdmitted++;'],
 ['return adapter.commit(d,start,id=>model.actors.get(id))?d:null;',
  'const admitted=adapter.commit(d,start,id=>model.actors.get(id));if(admitted)record.laneCommitted++;return admitted?d:null;'],
 ['const roster=[...model.actors.values()],a=roster[0];',
  'const roster=[...model.actors.values()],a=roster[0];record.setup++;'],
 ['const targets=seats.filter(n=>n.id!==a.node&&n.id!==\'bay\'&&distance(n)>=64&&distance(n)<=148);',
  "record.eligible++;const targets=seats.filter(n=>n.id!==a.node&&n.id!=='bay'&&distance(n)>=64&&distance(n)<=148);record.offered+=targets.length;"],
 ['if(!proven.safe(candidate,node,k,others)||!paintable(candidate))return false;',
  'if(!proven.safe(candidate,node,k,others))return false;record.measured++;if(!paintable(candidate))return false;record.paintable++;'],
];
function instrument(source){
 for(const [before,after] of roots){
  expect(source.split(before).length, 'exactly one instrumentation anchor').toBe(2);
  source=source.replace(before,after);
 }
 return source;
}
async function run(page,garden,{quick=false}={}){
 await page.route(/\/src\/garden-trail-runtime\.js(?:\?.*)?$/,async route=>{
  const response=await route.fetch(),source=await response.text();
  await route.fulfill({response,body:instrument(source)});
 });
 await setup(page,garden,402,true,true,cfg);
 const phases=new Set(),visibleFrames=new Set();
 let reserved=null,landing=false,seenReady=false,seenActive=false,s;
 for(let i=0;i<(quick?16:210);i++){
  await page.clock.runFor(100);
  s=await page.evaluate(()=>{
   const stage=document.querySelector('.finch-garden-stage'),bird=stage?.querySelector('[data-garden-household=b1]');
   const art=bird?.querySelector('.garden-actor-flight'),white=art?.querySelector('[data-white-flight-frame]'),r=bird?.getBoundingClientRect();
   const hit=r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   const shown=art&&getComputedStyle(art).visibility==='visible';
   const decoded=white&&getComputedStyle(white).visibility==='visible'&&white.complete&&white.naturalWidth>0;
   return {ready:stage?.dataset.sceneState==='ready',active:stage?.dataset.actorMotion==='trail-active',type:stage?.dataset.gardenTrailPreview==='true',
    state:bird?.dataset.actorState,phase:bird?.dataset.actorPhase,source:bird?.dataset.actorNode,goal:bird?.dataset.actorLanding,
    hit:!!hit&&bird.contains(hit),single:stage?.querySelectorAll('.finch-garden-image-plane > button').length===1,
    white:bird?.querySelector('.garden-bird-sprite')?.dataset.color==='white',
    frame:shown&&decoded&&white?.dataset.frame?white.dataset.frame:null,
    counters:globalThis.__trailFlightProbes??null};
  });
  seenReady||=s.ready&&s.type&&s.single&&s.white&&s.hit;
  seenActive||=s.active;
  if(!reserved&&s.state==='fly'&&s.goal&&s.source!==s.goal)reserved={source:s.source,goal:s.goal};
  if(reserved&&s.state==='fly'&&s.goal===reserved.goal&&s.source===reserved.source&&s.hit){
   phases.add(s.phase);
   if(s.frame&&(s.phase==='rise'||s.phase==='flap'))visibleFrames.add(s.frame);
  }
  if(reserved&&s.phase==='ground'&&!s.goal&&s.source===reserved.goal&&s.hit)landing=true;
  if(!quick&&landing)break;
 }
 expect(s.counters,'exact draft runtime diagnostic hook loaded').not.toBeNull();
 return {valid:seenReady,active:seenActive,reserved,landing,phases:[...phases],visibleFrames:[...visibleFrames],counters:s.counters};
}
for(const [number,garden] of profiles){
 const phases=['preflight','target-offered','measured-clearance','legacy-envelope','natural-route','phases-visible'];
 for(const phase of phases)test(`#${number} ${phase}`,{tag:`@flight-${number}-${phase}`},async({page})=>{
  const s=await run(page,garden,{quick:phase==='preflight'});
  expect(s.valid&&s.active,'one ready active hittable white singleton').toBe(true);
  if(phase==='preflight')return;
  if(phase==='target-offered')expect(!!s.reserved||s.counters.offered>0,'natural route or a singleton target in 64–148px range').toBe(true);
  if(phase==='measured-clearance')expect(!!s.reserved||s.counters.measured>0,'natural route or measured full-wing/foot/UI-clear candidate').toBe(true);
  if(phase==='legacy-envelope')expect(!!s.reserved||s.counters.paintable>0,'natural route or a candidate also passing legacy paint bounds').toBe(true);
  if(phase==='natural-route')expect(s.reserved,'natural fly with distinct reserved landing').toBeTruthy();
  if(phase==='phases-visible'){
   expect(s.reserved,'natural fly with reserved landing').toBeTruthy();
   expect(s.phases).toEqual(expect.arrayContaining(['rise','flap','contact']));
   expect(s.visibleFrames.length,'real decoded white raster changes while airborne').toBeGreaterThan(1);
   expect(s.landing,'same route lands visibly at its reservation').toBe(true);
  }
 });
}
