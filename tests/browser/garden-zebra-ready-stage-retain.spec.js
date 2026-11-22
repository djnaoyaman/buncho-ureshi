import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';

const read=page=>page.locator('.finch-garden-stage').evaluate(stage=>{
 const actor=[...stage.querySelectorAll('[data-actor-landing]')].find(n=>/^shared-gate-[01]$/.test(n.dataset.actorLanding));
 const air=actor?.querySelector('.garden-actor-flight'),r=actor?.getBoundingClientRect(),contains=!!r&&actor.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));
 return {ready:stage.dataset.sceneState,id:actor?.dataset.gardenActorId,landing:actor?.dataset.actorLanding,phase:actor?.dataset.actorPhase,
   air:!!air&&getComputedStyle(air).visibility==='visible',own:contains};
});

test('zebra companion UI redraw retains the original ready stage and shared flight',async({page})=>{
 await setup(page,'bird-zebra-finch',390,true,'dense',{nativeSource:true,afterOpenMs:0});
 await page.clock.runFor(34);
 await expect(page.locator('.finch-garden')).toHaveAttribute('data-garden-shared-status','admitted');
 let airborne;
 for(let i=0;i<60&&!airborne;i++){
  await page.clock.runFor(80);
  const a=await read(page);
  if(a.ready==='ready'&&a.phase==='rise'&&a.air&&a.own)airborne=a;
 }
 expect(airborne).toBeTruthy();
 await page.locator('.finch-garden-stage').evaluate(stage=>{
  const actor=stage.querySelector('[data-actor-phase=rise][data-actor-landing]');
  window.__readyRedraw={
   stage,actor,paint:actor.querySelector('.garden-actor-flight'),book:document.querySelector('[data-encounter-back]'),states:[]
  };
  const capture=window.__readyRedraw;
  new MutationObserver(records=>{for(const record of records)capture.states.push(record.oldValue);})
   .observe(stage,{attributes:true,attributeFilter:['data-scene-state'],attributeOldValue:true});
 });
 const panel=page.locator('.finch-companion-settings'),summary=panel.locator(':scope > summary');
 await summary.click();
 await expect(panel).toHaveAttribute('open','');
 // Overlay keeps motion deliberately held; visual and route should not
 // restart merely when the existing native menu is then closed unsaved.
 await page.clock.runFor(34);
 const held=await read(page);
 expect(held.id).toBe(airborne.id);expect(held.landing).toBe(airborne.landing);
 await summary.click();
 await expect(panel).not.toHaveAttribute('open','');
 expect(await page.evaluate(()=>{
  const q=window.__readyRedraw,stage=document.querySelector('.finch-garden-stage');
  return stage===q.stage&&q.book!==document.querySelector('[data-encounter-back]')&&q.actor.isConnected&&q.actor.contains(q.paint)&&q.states.every(s=>s==='ready')&&stage.dataset.sceneState==='ready';
 })).toBe(true);
 const rebound=await read(page);
 expect(rebound.id).toBe(airborne.id);expect(rebound.landing).toBe(airborne.landing);
 let contact=false,fold=false;
 for(let i=0;i<55&&!fold;i++){
  await page.clock.runFor(40);
  const a=await read(page);
  if(a.id!==airborne.id||a.landing!==airborne.landing)continue;
  if(a.phase==='contact'&&a.own)contact=true;
  if(a.phase==='fold'&&a.own)fold=true;
 }
 expect(contact).toBe(true);expect(fold).toBe(true);
});

test('zebra busy garden action replaces the stage and reenables every native bird',async({page})=>{
 await setup(page,'bird-zebra-finch',390,true,'dense',{nativeSource:true,afterOpenMs:0});
 await page.clock.runFor(34);
 await expect(page.locator('.finch-garden')).toHaveAttribute('data-garden-shared-status','admitted');
 const observe=page.locator('details[data-garden-details=observe]');
 await observe.locator(':scope > summary').click();
 const act=observe.locator('[data-garden-observe=quiet]');
 await expect(act).toBeEnabled();
 await page.locator('.finch-garden-stage').evaluate(stage=>{
  const read=stage=>[...stage.querySelectorAll('.finch-garden-image-plane > button')].map(node=>node.disabled);
  const receipt={initial:stage,modes:[]};
  window.__zebraBusyReceipt=receipt;
  document.addEventListener('buncho-game-encounter-view',()=>{
   const current=document.querySelector('.finch-garden-stage');
   const root=current?.closest('.finch-overlay-content');
   if(!root||!current)return;
   if(root.getAttribute('aria-busy')==='true'){
    receipt.busy=current;
    receipt.modes.push({mode:'busy',replaced:current!==receipt.initial,enabled:read(current).filter(x=>!x).length,count:read(current).length});
   }else if(root.getAttribute('aria-busy')==='false'&&receipt.busy&&!receipt.idle){
    receipt.idle=current;
    receipt.modes.push({mode:'idle',replaced:current!==receipt.busy,enabled:read(current).filter(x=>!x).length,count:read(current).length});
   }
  });
 });
 await act.click();
 await expect.poll(()=>page.evaluate(()=>window.__zebraBusyReceipt.modes.some(r=>r.mode==='idle'))).toBe(true);
 const frames=await page.evaluate(()=>window.__zebraBusyReceipt.modes);
 expect(frames.find(r=>r.mode==='busy')).toEqual({mode:'busy',replaced:true,count:8,enabled:0});
 expect(frames.find(r=>r.mode==='idle')).toEqual({mode:'idle',replaced:true,count:8,enabled:8});
 if(await observe.getAttribute('open')!==null)await observe.locator(':scope > summary').click();
 await page.clock.runFor(34);
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 const birds=page.locator('.finch-garden-image-plane > button');
 await expect(birds).toHaveCount(8);
 for(const bird of await birds.all())await expect(bird).toBeEnabled();
});
