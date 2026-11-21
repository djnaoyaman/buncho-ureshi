import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {test,expect} from '@playwright/test';
import {worldFor,NOW,engine,crow,raptor} from '../fixtures/garden-about-world.js';
import {encounterSystem,getGardenVisitingBird} from '../../src/encounters.js';
import {recordGardenVisit} from '../../src/garden-friends.js';
import {GARDEN_TRAIL_TERRAIN} from '../../src/data/garden-trail-terrain.js';

// Formal release regression. No page.route(), JS replacement, preview option,
// synthetic click, input forwarding, or changes to the rendered app.
test.use({hasTouch:true,trace:'off',screenshot:'off',video:'off'});
test.setTimeout(120000);
const portrait={width:402,height:874};
const exact=[['bird-masked-finch',34]];
const stage=p=>p.locator('.finch-garden-stage');

function seed(garden){
 // Established genuine cooldown fixture prevents unrelated predator arrivals,
 // without replacing a source file or random generator at runtime.
 const w=worldFor('solo',garden),past=NOW-60000;
 const token=()=>({...raptor.raptorToken(w),gardenId:garden});
 if(!raptor.arriveGardenRaptor(w,'black-kite',past,token()).changed)throw Error('raptor cooldown setup failed');
 for(let elapsed=2000;elapsed<=raptor.RAPTOR_RULES.visitMs;elapsed+=2000)
  if(!engine.advanceGardenRaptor(w,2000,past+elapsed,raptor.raptorToken(w)).changed)throw Error('raptor visit did not complete');
 if(!crow.arriveGardenCrow(w,'large-billed-crow',past,token()).changed)throw Error('crow cooldown setup failed');
 expect(crow.crowScene(w,NOW)).toBeNull();expect(raptor.raptorScene(w)).toBeNull();
 w.settings.motion=true;
 Object.assign(w.encounters.gardenFriends,{accompany:true,companions:['b1'],attendees:['b1'],visits:[]});
 for(const color of ['sakura','cinnamon','silver']){
  const bird=engine.createBird(w,{home:'resident',stage:'adult',color});
  w.encounters.gardenFriends.attendees.push(bird.id);
 }
 const guest=encounterSystem.catalog.find(e=>e.gardenEvent.gardenIds.includes(garden));
 const returning=encounterSystem.catalog.find(e=>!e.gardenEvent.gardenIds.includes(garden));
 if(!guest||!returning)throw Error('Maximum fixture requires both visiting bird types');
 w.encounters.discoveries.push({id:returning.id,firstTick:w.tick,lastTick:w.tick,visits:6,instanceId:w.encounters.nextId++});
 w.encounters.garden.guestGardenId=garden;w.encounters.queue=[guest.id];
 for(let visit=0;visit<100;visit++){
  w.encounters.garden.visits[garden]=visit;recordGardenVisit(w,[returning.id]);
  if(getGardenVisitingBird(w))break;
 }
 if(!getGardenVisitingBird(w))throw Error('Maximum fixture has no returning bird');
 engine.validateWorld(w);
 expect(crow.crowCoolingDown(w,NOW+42000)).toBe(true);
 expect(raptor.raptorCoolingDown(w,NOW+42000)).toBe(true);
 return {w,guest,returning};
}

const save=(page,world)=>page.evaluate(w=>new Promise((resolve,reject)=>{
 const request=indexedDB.open('buncho-ureshi-garden-v1',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('world');
 request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{
  const db=request.result, tx=db.transaction('world','readwrite');
  tx.objectStore('world').put(w,'current');
  tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
 };
}),world);
const readFriend=(page,id)=>page.evaluate(id=>new Promise((resolve,reject)=>{
 const request=indexedDB.open('buncho-ureshi-garden-v1',1);
 request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{
  const db=request.result, tx=db.transaction('world','readonly'), get=tx.objectStore('world').get('current');
  get.onerror=()=>reject(get.error);
  get.onsuccess=()=>{
   const f=get.result?.encounters?.gardenFriends;
   const record=[...(f?.regulars||[]),...(f?.references||[])].find(x=>x.id===id);
   resolve(record?{affinity:record.affinity,last:record.lastInteractionTick,memories:record.memories}:null);
  };
  tx.oncomplete=()=>db.close();
 };
}),id);

const sample=page=>page.evaluate(()=>{
 const stage=document.querySelector('.finch-garden-stage'),plane=stage?.querySelector('.finch-garden-image-plane');
 const p=plane?.getBoundingClientRect();
 const birds=[...(plane?.querySelectorAll(':scope > button')||[])].map(n=>{
  const d=n.dataset,r=n.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,h=document.elementFromPoint(x,y);
  const kind=d.gardenHousehold?'household':d.gardenFriend?'friend':d.encounterOpen?'waiting':'returning';
  return {id:d.gardenHousehold||d.gardenFriend||d.encounterOpen||d.gardenVisitingFriend||d.encounterPage,kind,actor:d.gardenActorId||null,
   station:d.actorNode||null,target:d.actorLanding||null,state:d.actorState||null,phase:d.actorPhase||null,left:n.style.left,top:n.style.top,
   x,y,w:r.width,h:r.height,hit:!!h&&n.contains(h),front:h?.closest('button,summary')?.outerHTML.split('>')[0]||null,
   inViewport:x>=0&&x<innerWidth&&y>=0&&y<innerHeight};
 });
 return {birds,time:performance.now(),garden:stage?.dataset.gardenId,ready:stage?.dataset.sceneState,motion:stage?.dataset.actorMotion,
  revision:stage?.closest('[data-garden-revision]')?.dataset.gardenRevision,viewport:[innerWidth,innerHeight],plane:p?[p.left,p.top,p.width,p.height]:null};
});
function verify(s,garden,ids,mark){
 mark("ready");
 expect(s.ready,'one sample only: no wait for good geometry').toBe('ready');
 mark('garden');expect(s.garden).toBe(garden);mark('count');expect(s.birds).toHaveLength(10);
 const own=s.birds.map(b=>b.kind+':'+b.id);
 mark('unique');expect(new Set(own).size).toBe(10);
 mark('order');if(ids)expect(own).toEqual(ids);
 for(const b of s.birds){
  mark('id-'+b.kind);expect(b.id,'native control identity missing').toBeTruthy();
  mark('size-'+b.kind);expect(b.w).toBeGreaterThanOrEqual(43.99);expect(b.h).toBeGreaterThanOrEqual(43.99);
  mark('viewport-'+b.kind);expect(b.inViewport).toBe(true);
  mark('hit-'+b.kind);expect(b.hit).toBe(true);
 }
 return own;
}

for(const [garden,number] of exact)test(`#${number} production portrait: ten safe native actors through a complete route and real taps`,async({page},info)=>{
 let status='seed',sawMover=false,sawGroundedStart=false,stageMode='unknown';
 const mark=prefix=>part=>{status=prefix+'-'+part;};
 try{
 expect(GARDEN_TRAIL_TERRAIN[garden]?.number).toBe(number);
 const {w,guest}=seed(garden),samples=[];
 const take=async()=>{const s=await sample(page);samples.push(s);return s;};
 status='viewport-setup';await page.setViewportSize(portrait);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 status='storage-setup';await page.goto('');await page.clock.install({time:NOW});await page.clock.pauseAt(NOW+1000);await save(page,w);
 status='game-setup';await page.goto('game/');await page.clock.runFor(2500);
 status='open-setup';await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-panel=outdoors]').click();
 await expect(stage(page)).toHaveAttribute('data-scene-state','ready'); // readiness, not retrying blocked hit
  status='first-read';const first=await take();
  stageMode=new Set(['trail-active','trail-held','trail-standing','insufficient-space','trail-blocked-placement','trail-blocked-geometry','trail-needs-recovery','geometry-blocked','active','held']).has(first.motion)?first.motion:'unknown';
  const ids=verify(first,garden,null,mark('first'));status='first-'+stageMode;
  expect(first.motion,'real default-enabled trail, no preview plumbing').toMatch(/^trail-(active|held|standing)$/);
  status='first-kinds';expect(first.birds.map(b=>b.kind)).toEqual(expect.arrayContaining(['household','friend','waiting','returning']));
  let route=null,completed=null,after=0,previous=first;
  // 36 simulated seconds, checking every frame sample regardless of actor state.
  // A position/style jump alone or a crouch with a status flag cannot pass.
  for(let frame=0;frame<360;frame++){
   status='frame-tick';await page.clock.runFor(100);
   status='frame-read';const s=await take();verify(s,garden,ids,mark(completed?'after':'frame'));
   status='frame-plane';expect(s.plane).toEqual(first.plane);expect(s.viewport).toEqual([402,874]);
   if(completed){if(++after===5)break;continue;}
   if(!route){
    const mover=s.birds.find(b=>['hop','fly'].includes(b.state)&&b.target&&b.station&&b.target!==b.station);
    const origin=mover&&previous.birds.find(b=>b.kind===mover.kind&&b.id===mover.id);
    sawMover||=!!mover;sawGroundedStart||=!!mover&&origin?.phase==='ground';
    if(mover&&origin?.phase==='ground'&&origin.station===mover.station){
     route={key:mover.kind+':'+mover.id,source:mover.station,dest:mover.target,origin,points:new Set(),intermediate:false};
    }
   }
   if(route){
    const mover=s.birds.find(b=>b.kind+':'+b.id===route.key);
    if(mover.target){
     status='route-origin';expect(mover.station,'origin remains owned while the route is reserved').toBe(route.source);
     status='route-retarget';expect(mover.target,'landing reservation changed during normal portrait route').toBe(route.dest);
     if(['fly','hop'].includes(mover.state)){
      route.points.add(`${mover.left},${mover.top}`);
      route.intermediate||=mover.phase!=='ground'&&Math.hypot(mover.x-route.origin.x,mover.y-route.origin.y)>2;
     }
    }else{
     status='route-settlement';expect(mover.phase).toBe('ground');
     status='route-destination';expect(mover.station,'same actor must ground at reserved destination').toBe(route.dest);
     status='route-projected-points';expect(route.points.size,'distinct real projected locations while moving').toBeGreaterThanOrEqual(2);
     status='route-visible-intermediate';expect(route.intermediate,'path must have a visible intermediate displacement').toBe(true);
     status='route-visible-landing';expect(Math.hypot(mover.x-route.origin.x,mover.y-route.origin.y)).toBeGreaterThan(2);
     completed={...route,points:[...route.points],mover};
    }
   }
   previous=s;
  }
  status=route?'route-not-completed':sawGroundedStart?'route-origin-station-mismatch':sawMover?'route-no-ground-before':'route-no-live-mover';
  expect(completed,'a natural reserved route must finish without losing any of ten native controls').toBeTruthy();


  // After proof of motion, exercise real touch. A fresh, straight snapshot is
  // asserted first, then the browser performs a single touch at that center.
  const tap=async(kind,id)=>{
   status='tap-read-'+kind;const s=await take();verify(s,garden,ids,mark('tap-'+kind));
   status='tap-dispatch-'+kind;
   const b=s.birds.find(a=>a.kind===kind&&(!id||a.id===id));
   expect(b,'missing '+kind).toBeTruthy();await page.touchscreen.tap(b.x,b.y);return b;
  };
  await tap('household','b1');
  status='tap-household-dialog';await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
  status='tap-household-close';await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).tap();
  status='tap-friend-read-before';const f=(await take()).birds.find(b=>b.kind==='friend');
  expect(f).toBeTruthy();
  const before=await readFriend(page,f.id);expect(before).toBeTruthy();
  await tap('friend',f.id);
  status='tap-friend-persistence';await expect.poll(async()=>await readFriend(page,f.id)).not.toEqual(before); // action settlement only
  status='tap-friend-memory';const afterFriend=await readFriend(page,f.id);
  expect(afterFriend.memories.at(-1)).toMatchObject({kind:'chat',gardenId:garden});
  status='tap-friend-stage-ready';await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
  await tap('waiting',guest.id);
  status='tap-waiting-title';await expect(page.locator('[data-encounter-instance] h3')).toHaveText(guest.eventTitle);
  status='pass';
 }finally{
  const out=process.env.TYPE2_CHECKPOINT_DIR;
  if(!out||!['chrome','webkit'].includes(info.project.name))throw Error('Targeted private receipt only');
  writeFileSync(join(out,info.project.name+'-34-max'),status+'\n',{mode:0o600,flag:'wx'});

 }
});
