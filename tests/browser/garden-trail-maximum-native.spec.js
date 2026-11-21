import {test,expect} from '@playwright/test';
import {worldFor,NOW,engine,crow,raptor} from '../fixtures/garden-about-world.js';
import {encounterSystem,getGardenVisitingBird} from '../../src/encounters.js';
import {recordGardenVisit} from '../../src/garden-friends.js';
import {GARDEN_TRAIL_TERRAIN} from '../../src/data/garden-trail-terrain.js';

// Formal release regression. No page.route(), JS replacement, preview option,
// synthetic click, input forwarding, or changes to the rendered app.
test.use({hasTouch:true});
test.setTimeout(120000);
const portrait={width:402,height:874};
const exact=[['bird-zebra-finch',7],['bird-red-avadavat',8],['bird-tricolored-munia',10],
 ['bird-black-rumped-waxbill',12],['bird-long-tailed-paradise-whydah',14],['bird-long-tailed-rosefinch',28],['bird-masked-finch',34]];
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
function verify(s,garden,ids){
 expect(s.ready,'one sample only: no wait for good geometry').toBe('ready');
 expect(s.garden).toBe(garden);expect(s.birds).toHaveLength(10);
 const own=s.birds.map(b=>b.kind+':'+b.id);
 expect(new Set(own).size).toBe(10);
 if(ids)expect(own).toEqual(ids);
 for(const b of s.birds){
  expect(b.id,'native control identity missing').toBeTruthy();
  expect(b.w,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);expect(b.h,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
  expect(b.inViewport,JSON.stringify(b)).toBe(true);
  expect(b.hit,JSON.stringify(b)).toBe(true);
 }
 return own;
}

for(const [garden,number] of exact)test(`#${number} production portrait: ten safe native actors through a complete route and real taps`,async({page},info)=>{
 expect(GARDEN_TRAIL_TERRAIN[garden]?.number).toBe(number);
 const {w,guest}=seed(garden),samples=[];
 const take=async()=>{const s=await sample(page);samples.push(s);return s;};
 await page.setViewportSize(portrait);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 await page.goto('');await page.clock.install({time:NOW});await page.clock.pauseAt(NOW+1000);await save(page,w);
 await page.goto('game/');await page.clock.runFor(2500);
 await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-panel=outdoors]').click();
 await expect(stage(page)).toHaveAttribute('data-scene-state','ready'); // readiness, not retrying blocked hit
 try{
  const first=await take(),ids=verify(first,garden);
  expect(first.motion,'real default-enabled trail, no preview plumbing').toMatch(/^trail-(active|held|standing)$/);
  expect(first.birds.map(b=>b.kind)).toEqual(expect.arrayContaining(['household','friend','waiting','returning']));
  let route=null,completed=null,after=0,previous=first;
  // 36 simulated seconds, checking every frame sample regardless of actor state.
  // A position/style jump alone or a crouch with a status flag cannot pass.
  for(let frame=0;frame<360;frame++){
   await page.clock.runFor(100);
   const s=await take();verify(s,garden,ids);
   expect(s.plane).toEqual(first.plane);expect(s.viewport).toEqual([402,874]);
   if(completed){if(++after===5)break;continue;}
   if(!route){
    const mover=s.birds.find(b=>['hop','fly'].includes(b.state)&&b.target&&b.station&&b.target!==b.station);
    const origin=mover&&previous.birds.find(b=>b.kind===mover.kind&&b.id===mover.id);
    if(mover&&origin?.phase==='ground'&&origin.station===mover.station){
     route={key:mover.kind+':'+mover.id,source:mover.station,dest:mover.target,origin,points:new Set(),intermediate:false};
    }
   }
   if(route){
    const mover=s.birds.find(b=>b.kind+':'+b.id===route.key);
    if(mover.target){
     expect(mover.station,'origin remains owned while the route is reserved').toBe(route.source);
     expect(mover.target,'landing reservation changed during normal portrait route').toBe(route.dest);
     if(['fly','hop'].includes(mover.state)){
      route.points.add(`${mover.left},${mover.top}`);
      route.intermediate||=mover.phase!=='ground'&&Math.hypot(mover.x-route.origin.x,mover.y-route.origin.y)>2;
     }
    }else{
     expect(mover.phase).toBe('ground');
     expect(mover.station,'same actor must ground at reserved destination').toBe(route.dest);
     expect(route.points.size,'distinct real projected locations while moving').toBeGreaterThanOrEqual(2);
     expect(route.intermediate,'path must have a visible intermediate displacement').toBe(true);
     expect(Math.hypot(mover.x-route.origin.x,mover.y-route.origin.y)).toBeGreaterThan(2);
     completed={...route,points:[...route.points],mover};
    }
   }
   previous=s;
  }
  expect(completed,'a natural reserved route must finish without losing any of ten native controls').toBeTruthy();
  await info.attach('completed-reserved-route',{body:JSON.stringify(completed),contentType:'application/json'});

  // After proof of motion, exercise real touch. A fresh, straight snapshot is
  // asserted first, then the browser performs a single touch at that center.
  const tap=async(kind,id)=>{
   const s=await take();verify(s,garden,ids);
   const b=s.birds.find(a=>a.kind===kind&&(!id||a.id===id));
   expect(b,'missing '+kind).toBeTruthy();await page.touchscreen.tap(b.x,b.y);return b;
  };
  await tap('household','b1');
  await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).tap();
  const f=(await take()).birds.find(b=>b.kind==='friend');
  expect(f).toBeTruthy();
  const before=await readFriend(page,f.id);expect(before).toBeTruthy();
  await tap('friend',f.id);
  await expect.poll(async()=>await readFriend(page,f.id)).not.toEqual(before); // action settlement only
  const afterFriend=await readFriend(page,f.id);
  expect(afterFriend.memories.at(-1)).toMatchObject({kind:'chat',gardenId:garden});
  await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
  await tap('waiting',guest.id);
  await expect(page.locator('[data-encounter-instance] h3')).toHaveText(guest.eventTitle);
 }finally{
  await info.attach('all-maximum-frame-samples',{body:JSON.stringify(samples),contentType:'application/json'});
 }
});
