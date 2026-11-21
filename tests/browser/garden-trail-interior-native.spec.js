import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';

test.use({hasTouch:true});
const cfg={trailPreview:true,leadColor:'white',height:874,afterOpenMs:0};
for(const [number,id] of [[10,'bird-tricolored-munia'],[14,'bird-long-tailed-paradise-whydah']]){
 test(`#${number} one native white flight: ready, actual decode, unique route and same-target landing`,{tag:`@interior-${number}`},async({page})=>{
  await setup(page,id,402,true,true,cfg);
  const sample=()=>page.evaluate(()=>{
   const stage=document.querySelector('.finch-garden-stage'),bird=stage?.querySelector('[data-garden-household=b1]');
   const r=bird?.getBoundingClientRect(),hit=r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   const art=bird?.querySelector('.garden-actor-flight'),white=art?.querySelector('img[data-white-flight-frame]');
   return {ready:stage?.dataset.sceneState==='ready',mode:stage?.dataset.actorMotion,id:bird?.dataset.gardenActorId,
    phase:bird?.dataset.actorPhase,state:bird?.dataset.actorState,site:bird?.dataset.actorNode,target:bird?.dataset.actorLanding,
    single:stage?.querySelectorAll('.finch-garden-image-plane > button').length===1,hit:!!hit&&bird.contains(hit),
    frame:art&&white&&getComputedStyle(art).visibility==='visible'&&getComputedStyle(white).visibility==='visible'&&white.complete&&white.naturalWidth>0?white.getAttribute('data-frame'):null};
  });
  const phases=new Set(),frames=new Set();
  let reservation=null,landed=false;
  for(let n=0;n<240;n++){
   await page.clock.runFor(100);const s=await sample();
   expect(s.ready&&s.single&&s.hit&&s.id==='b1','ready with one actual native hittable actor').toBe(true);
   expect(s.mode).toMatch(/^trail-(active|held)$/);
   if(!reservation&&s.state==='fly'&&s.target&&s.site!==s.target)reservation={source:s.site,target:s.target};
   if(!reservation)continue;
   if(s.state==='fly'){
    expect([s.site,s.target]).toEqual([reservation.source,reservation.target]);
    phases.add(s.phase);
    if(s.frame&&['rise','flap'].includes(s.phase))frames.add(s.frame);
   }else if(!s.target&&s.phase==='ground'){
    expect(s.site).toBe(reservation.target);landed=true;break;
   }
  }
  expect(reservation,'a distinct native flight reservation was actually made').toBeTruthy();
  expect([...phases]).toEqual(expect.arrayContaining(['rise','flap','contact']));
  expect(frames.size,'at least two truly visible and decoded white WebPs').toBeGreaterThan(1);
  expect(landed).toBe(true);
 });
}
