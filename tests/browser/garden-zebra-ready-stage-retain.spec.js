import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';

const read=page=>page.locator('.finch-garden-stage').evaluate(stage=>{
 const actor=[...stage.querySelectorAll('[data-actor-landing]')].find(n=>/^shared-gate-[01]$/.test(n.dataset.actorLanding));
 const air=actor?.querySelector('.garden-actor-flight'),r=actor?.getBoundingClientRect(),contains=!!r&&actor.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));
 return {ready:stage.dataset.sceneState,id:actor?.dataset.gardenActorId,landing:actor?.dataset.actorLanding,phase:actor?.dataset.actorPhase,
   air:!!air&&getComputedStyle(air).visibility==='visible',own:contains};
});

test('zebra companion UI redraw retains the original ready stage and shared flight',async({page},info)=>{
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
   stage,actor,paint:actor.querySelector('.garden-actor-flight'),book:document.querySelector('[data-encounter-back]'),states:[],opened:false,closed:false
  };
  const capture=window.__readyRedraw;
  const host=stage.closest('.game-encounter-host');
  const panel=host.querySelector('.finch-companion-settings');
  const closed=e=>e.target===panel&&(e.newState==='closed'||e.newState==null&&!panel.open);
  document.addEventListener('toggle',e=>{
   if(e.target!==panel)return;
   if(e.newState==='open'||e.newState==null&&panel.open)capture.opened=true;
   if(!closed(e))return;
   capture.closed=true;
   const owner=stage.closest('.finch-garden'),status=owner?.dataset.gardenSharedStatus;
   const flag=new Set(['admitted','measuring','retained-invalid','projection','chrome','seat','hit','route','roster']);
   capture.authority=live=>{
    const o=live?.closest('.finch-garden');
    const ids=[...live?.querySelectorAll('.finch-garden-image-plane > button')??[]]
     .map(n=>n.dataset.gardenActorId||n.dataset.gardenVisitingFriend||n.dataset.encounterOpen||n.dataset.encounterPage).sort();
    return {world:o?.dataset.gardenWorld,garden:live?.dataset.gardenId,source:live?.querySelector('.finch-garden-background')?.getAttribute('src'),ids:JSON.stringify(ids)};
   };
   capture.oldAuthority=capture.authority(stage);
   capture.beforeClose=[
    flag.has(status)?status:'unknown',
    stage.dataset.sceneState==='ready'?'ready':'other-media',
    host.getAttribute('aria-busy')==='true'?'busy':'idle',
    document.querySelector('dialog:modal,.game-bird-sheet[open]')?'modal':'no-modal',
    document.body.hasAttribute('data-game-view-blocked')?'blocked':'unblocked',
    document.querySelector('[data-crow-phase],[data-raptor-phase],.finch-raptor-scale-scene,.finch-crow-scale-scene')?'risk':'no-risk'
   ].join(':');
  },true);
  // Controller's capture listener was registered on this same native host
  // before this listener. Its synchronous close rerender has returned when
  // the promise resolves. There is no film-clock advance or arbitrary wait.
  capture.afterClose=new Promise(resolve=>{
   const listener=e=>{
    if(!closed(e))return;
    host.removeEventListener('toggle',listener,true);
    resolve();
   };
   host.addEventListener('toggle',listener,true);
  });
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
 await page.evaluate(()=>window.__readyRedraw.afterClose);
 const nativeReceipt=await page.evaluate(()=>{
  const q=window.__readyRedraw,stage=document.querySelector('.finch-garden-stage');
  const same=stage===q.stage,book=q.book!==document.querySelector('[data-encounter-back]'),actor=q.actor.isConnected,
    paint=q.actor.contains(q.paint),neverLost=q.states.every(s=>s==='ready'),ready=stage.dataset.sceneState==='ready';
  return {ok:same&&book&&actor&&paint&&neverLost&&ready,
   blockedStage:q.beforeClose?(q.beforeClose+':'+['world','garden','source','ids']
    .map(k=>q.oldAuthority[k]===q.authority(stage)[k]?'same':'changed').join(':')):'unobserved',
   flags:[same?'same-stage':'new-stage',book?'new-book':'same-book',actor?'actor-live':'actor-gone',
    paint?'art-kept':'art-gone',neverLost?'no-reset':'reset',ready?'ready':'not-ready',
    q.opened?'saw-open':'no-open',q.closed?'saw-close':'no-close'].join(':')};
 });
 if(!nativeReceipt.ok){
  info.annotations.push({type:'qa-07-shared-close',description:nativeReceipt.flags});
  info.annotations.push({type:'qa-07-close-prior',description:nativeReceipt.blockedStage});
 }
 expect(nativeReceipt.ok).toBe(true);
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
