import test from 'node:test';
import assert from 'node:assert/strict';
import {GARDEN_TRAIL_TERRAIN} from '../src/data/garden-trail-terrain.js';
import {GARDEN_ACTOR_TERRAIN} from '../src/data/garden-actor-terrain.js';
import {createGardenTrailAdapter} from '../src/garden-trail-adapter.js';
import {inside} from '../src/garden-terrain-plan.js';
const point=(id,p)=>({id,p,phase:'ground',height:0,route:null,movable:true,canFly:true});
const geometry={intersectsLane:()=>false,validate:()=>true,protects:(p,{lock})=>!!lock&&p.slot===lock.to};
test('all seven archived trail profiles preserve their authored polygons after switching to Type I',()=>{
 assert.deepEqual(Object.values(GARDEN_TRAIL_TERRAIN).map(g=>g.number),[7,8,10,12,14,28,34]);
 for(const [id,g] of Object.entries(GARDEN_TRAIL_TERRAIN)){
  assert.ok(GARDEN_ACTOR_TERRAIN[id],id);
  const [A,B]=g.entryCandidates,p=[A,...g.lane,B];
  for(let i=1;i<p.length;i++)for(let j=0;j<=100;j++)assert(inside(p[i-1].map((v,k)=>v+(p[i][k]-v)*j/100),g.surface),id);
 }
});
test('no fabricated bays in 08/34; each of the other five uses its own surveyed branch under live geometry checks',()=>{
 for(const [id,g] of Object.entries(GARDEN_TRAIL_TERRAIN)){
  const [p,q]=g.entryCandidates, A=point('lead',p),B=point('resident',q);
  const a=createGardenTrailAdapter(id,geometry);
  a.sync({epoch:1,actors:[A,B]});assert(a.enqueue(A.id,'walk'));const command=a.admit();
  if(!g.pullouts.length){assert.equal(command,null,id);continue;}
  assert.equal(command.kind,'yield');assert.deepEqual(command.path,[q,g.pullouts[0]]);
  assert.equal(a.finish(command.token,false,B),true);
 }
});

test('measured geometry refuses occluded reservations, peer sweeps and missing footprints without model mutations',async()=>{
 const {createTrailClearance}=await import('../src/garden-trail-clearance.js');
 const [p,q]=GARDEN_TRAIL_TERRAIN['bird-zebra-finch'].entryCandidates;
 const pose={left:-22,right:22,top:-60,bottom:22};
 const plane={left:-10,top:0,width:400,height:740},clip={left:0,top:0,right:380,bottom:740};
 const footprints=new Map([['owner',pose],['guest',pose]]);
 const safe=createTrailClearance('bird-zebra-finch',{plane,clip,controls:[],footprints});
 const guest=point('guest',GARDEN_TRAIL_TERRAIN['bird-zebra-finch'].lane[1]);
 const origin=point('owner',p),dest={id:'B',p:q};
 const owner={...origin,route:{from:p,to:q,hops:[p,...GARDEN_TRAIL_TERRAIN['bird-zebra-finch'].lane,q],height:.012}};
 assert.equal(safe.safe(owner,dest,'hop',new Map()),true);
 assert.equal(safe.safe(owner,dest,'hop',new Map([[guest.id,guest]])),false);
 assert.equal(safe.intersectsLane(guest,pose),true);
 assert.equal(safe.safe({...owner,id:'missing'},dest,'hop',new Map()),false);
 const withUI=createTrailClearance('bird-zebra-finch',{plane,clip,controls:[{left:145,right:215,top:500,bottom:535}],footprints});
 assert.equal(withUI.safe(owner,dest,'hop',new Map()),false);
 assert.equal(owner.p,p);
});

test('native runtime chooses and commits actual #07 flight, prevents a new tap box taking its corridor',async()=>{
 const {createGardenActors}=await import('../src/garden-actor-state.js');
 const {createGardenTrailRuntime}=await import('../src/garden-trail-runtime.js');
 const m=createGardenActors('trail browser-pending'),rt=createGardenTrailRuntime('bird-zebra-finch',m);
 const def={id:'white-resident',movable:true,canFly:true};
 m.reconcile([def],rt.nodes);
 const a=m.actors.get(def.id), envelope={left:-14,top:-28,right:14,bottom:10};
 const measurement={plane:{left:-15,top:0,width:420,height:740},clip:{left:0,top:0,right:390,bottom:740},
  controls:[],footprints:new Map([[a.id,envelope],['guest',envelope]]),envelope};
 assert.equal(rt.request(a.id,'fly'),false); // no measured generation
 rt.sync({generation:1,measurement});
 assert.equal(rt.request(a.id,'fly'),true);assert.equal(rt.run().action,'fly');
 assert.equal(a.state,'fly');assert.equal(m.reservations.get('B'),a.id);
 assert.equal(rt.canPlace({id:'guest'},rt.nodes[1],m.actors),false);
 assert.equal(rt.sync({generation:1,measurement,predator:true}).disposition[0]?.id,a.id);
 assert.equal(rt.run(),null);
});

test('ten-slot seating keeps current nine slots untouched or refuses the arrival atomically',async()=>{
 const {assignTrailSeats}=await import('../src/garden-trail-clearance.js');
 const slots=Array.from({length:10},(_,i)=>({id:'n'+i,p:[.4+i*.02,.74]}));
 const actors=Array.from({length:10},(_,i)=>({id:'b'+i,movable:true}));
 const retained=new Map(actors.slice(0,9).map((a,i)=>[a.id,slots[i]]));
 const granted=assignTrailSeats({actors,seats:slots,retained,canPlace:()=>true});
 assert.equal(granted.get('b9'),slots[9]);
 for(const [id,slot] of retained)assert.equal(granted.get(id),slot);
 assert.equal(assignTrailSeats({actors,seats:slots,retained,canPlace:()=>false}),null);
 assert.equal(retained.size,9);
});

test('production routes all seven former trail gardens through their own flat profile with native controls',async()=>{
 const {renderGardenStage,renderFinchGarden}=await import('../src/encounter-ui.js');
 const {worldFor,GARDENS}=await import('./fixtures/garden-about-world.js');
 const {actorTerrainForStage}=await import('../src/garden-actor-motion.js');
 assert.equal(Object.keys(GARDEN_ACTOR_TERRAIN).length,35);
 const converted=[];
 for(const {id} of GARDENS){
  const world=worldFor('attending',id),before=JSON.stringify(world),former=GARDEN_TRAIL_TERRAIN[id];
  const html=renderGardenStage(world),oldMode=html.includes('data-garden-trail="true"');
  const profile=GARDEN_ACTOR_TERRAIN[id]||null;
  assert.equal(oldMode,!profile&&!!former,id);
  assert.equal(actorTerrainForStage({dataset:{gardenId:id}}),profile,id);
  if(former){
   converted.push(former.number);
   assert.ok(profile&&!profile.trail,id);
   assert.notEqual(profile.surface,former.surface,id);
   assert.ok(profile.entries.every(p=>inside(p,profile.surface)),id);
   assert.match(html,/data-garden-actor-id="b1"/);
   assert.doesNotMatch(renderFinchGarden(world),/data-garden-(?:shared-play|masked-play|masked-pane)=/);
  }
  assert.equal(JSON.stringify(world),before,id);
 }
 assert.deepEqual(converted,[7,8,10,12,14,28,34]);
 assert.equal(actorTerrainForStage({dataset:{gardenId:'unknown-garden',gardenTrail:'true'}}),null);
});

test('reduced motion lands the affected bird at its same target with no unrelated state or RNG mutation',async()=>{
 const {createGardenActors}=await import('../src/garden-actor-state.js');
 const {createGardenTrailRuntime}=await import('../src/garden-trail-runtime.js');
 const model=createGardenActors('recovery'),rt=createGardenTrailRuntime('bird-zebra-finch',model);
 const def={id:'lead',movable:true,canFly:true},peer={id:'observer',movable:false};
 model.reconcile([def],rt.nodes);
 model.reconcile([def,peer],[{id:'stand',p:[.76,.8]},...rt.nodes]);
 const a=model.actors.get(def.id),observer=model.actors.get(peer.id),before=structuredClone(observer);
 const envelope={left:-10,top:-25,right:10,bottom:5},geometry={plane:{left:0,top:0,width:430,height:740},clip:{left:0,top:0,right:430,bottom:740},controls:[],
  footprints:new Map([[def.id,envelope],[peer.id,envelope]]),envelope};
 rt.sync({generation:1,measurement:geometry});assert(rt.request(def.id,'fly'));assert(rt.run());
 const actual=a.route.target,occupied={...geometry,controls:[{left:245,top:524,right:295,bottom:602}]};
 rt.sync({generation:1,measurement:occupied});assert.deepEqual(rt.recover([def.id],{reduced:true}),[def.id]);
 assert.equal(model.reservations.get(actual),def.id);
 rt.sync({generation:1,measurement:geometry});assert.deepEqual(rt.recover([def.id],{reduced:true}),[]);
 assert.equal(a.node,actual);assert.equal(model.reservations.size,0);
 assert.equal(model.actors.get(peer.id),observer);assert.deepEqual(observer,before);
});

test('strict dry-ground gate rejects #28 shortcut across the recess; adapter routes through both surveyed turn points',async()=>{
 const {trailSegmentInside}=await import('../src/garden-trail-clearance.js');
 const g=Object.values(GARDEN_TRAIL_TERRAIN).find(g=>g.number===28);
 const id='bird-long-tailed-rosefinch',[A,B]=g.entryCandidates,[bay]=g.pullouts;
 assert.equal(trailSegmentInside(A,bay,g.surface),false);
 const owner=point('atB',B),yielder=point('atA',A);
 const lane=createGardenTrailAdapter(id,geometry);
 lane.sync({epoch:1,actors:[owner,yielder]});assert(lane.enqueue(owner.id,'walk'));
 const cmd=lane.admit();assert.equal(cmd.kind,'yield');
 assert.deepEqual(cmd.path,[A,...g.lane.slice(0,2),bay]);
 for(let i=1;i<cmd.path.length;i++)assert.equal(trailSegmentInside(cmd.path[i-1],cmd.path[i],g.surface),true);
});

test('walking and stationary native boxes are measured separately; fully spread wings still reject UI conflicts',async()=>{
 const {createTrailClearance}=await import('../src/garden-trail-clearance.js');
 const g=GARDEN_TRAIL_TERRAIN['bird-zebra-finch'],[A,B]=g.entryCandidates;
 const dims={left:-22,top:-35,right:22,bottom:9},spread={left:-37,top:-51,right:37,bottom:13};
 const checker=createTrailClearance('bird-zebra-finch',{plane:{left:0,top:0,width:430,height:740},clip:{left:0,top:0,right:430,bottom:740},
   controls:[{left:112,right:118,top:450,bottom:467}],footprints:new Map([['p',dims]]),flightFootprints:new Map([['p',spread]])});
 const actor={id:'p',p:A,route:{from:A,to:B,hops:[A,...g.lane,B],height:.012}};
 assert.equal(checker.safe({...actor,state:'hop'},{p:B},'hop',new Map()),true);
 assert.equal(checker.safe({...actor,state:'fly'},{p:B},'fly',new Map()),false);
});

test('dense/narrow fallback uses a guarded short alternate contact and never touches a locked bay or existing identity',async()=>{
 const {createGardenActors}=await import('../src/garden-actor-state.js');
 const {createGardenTrailRuntime}=await import('../src/garden-trail-runtime.js');
 const m=createGardenActors('local-jump'),rt=createGardenTrailRuntime('bird-zebra-finch',m);
 const id='lead',peer='still';
 const n={id:'local-pad',p:[.395,.613]},far={id:'peer-seat',p:[.66,.825]};
 m.reconcile([{id,movable:true,canFly:true}],[rt.nodes[0]]);
 m.reconcile([{id,movable:true,canFly:true},{id:peer,movable:false}],[far,...rt.nodes]);
 const measuredShape={left:-12,top:-23,right:12,bottom:12};
 const geometry={plane:{left:0,top:0,width:430,height:740},clip:{left:0,top:0,right:430,bottom:740},controls:[],
  envelope:measuredShape,footprints:new Map([[id,measuredShape],[peer,measuredShape]])};
 rt.sync({generation:1,measurement:geometry});
 const staticActor=m.actors.get(peer),before=structuredClone(staticActor);
 assert.equal(rt.localHop(rt.nodes),null); // cannot treat main traverse/bay as local
 assert.equal(rt.localHop([n]).target,n.id);
 assert.equal(m.reservations.get(n.id),id);assert.equal(m.actors.get(id).node,'A');
 assert.equal(rt.localHop([n]),null);
 assert.equal(m.actors.get(peer),staticActor);assert.deepEqual(staticActor,before);
});

test('single off-gate actor takes a short measured ingress, preferring the available authored gate before native flight',async()=>{
 const {createGardenActors}=await import('../src/garden-actor-state.js');
 const {createGardenTrailRuntime}=await import('../src/garden-trail-runtime.js');
 const m=createGardenActors('off-gate-ingress'),rt=createGardenTrailRuntime('bird-zebra-finch',m);
 const id='lead',start={id:'safe-ordinary-seat',p:[.391,.612]},pad={id:'closer-ordinary',p:[.432,.612]},A=rt.nodes.find(n=>n.id==='A');
 const a={id,movable:true,canFly:true},shape={left:-10,top:-23,right:10,bottom:12};
 const geometry={plane:{left:0,top:0,width:430,height:740},clip:{left:0,top:0,right:430,bottom:740},controls:[],envelope:shape,footprints:new Map([[id,shape]])};
 m.reconcile([a],[start]);rt.sync({generation:1,measurement:geometry});
 assert.equal(rt.request(id,'fly'),false);
 assert.equal(rt.localHop([pad,A],{singletonIngress:true}).target,'A');
 assert.equal(m.reservations.get('A'),id);
 assert.equal(m.actors.get(id).node,start.id);
 assert.deepEqual(rt.recover([id],{reduced:true}),[]);
 assert.equal(m.actors.get(id).node,'A');
 assert.equal(rt.localHop([pad,A],{singletonIngress:true}),null);
 rt.sync({generation:1,measurement:geometry});m.advance(9000,[],{safe:()=>false});
 rt.sync({generation:1,measurement:geometry});assert.equal(rt.request(id,'fly'),true);
 assert.equal(rt.run()?.action,'fly');
});

test('single off-gate actor refuses an unsafe hop, then accepts a measured dry pad and preserves same-target reduced-motion recovery',async()=>{
 const {createGardenActors}=await import('../src/garden-actor-state.js');
 const {createGardenTrailRuntime}=await import('../src/garden-trail-runtime.js');
 const m=createGardenActors('unsafe-off-gate'),rt=createGardenTrailRuntime('bird-zebra-finch',m);
 const id='lead',start={id:'safe-ordinary-seat',p:[.391,.612]},pad={id:'ordinary-pad',p:[.432,.612]},
   unsafe={id:'above-dry-surface',p:[.4,.53]},A=rt.nodes.find(n=>n.id==='A');
 const a={id,movable:true,canFly:true},shape={left:-10,top:-23,right:10,bottom:12};
 const geometry={plane:{left:0,top:0,width:430,height:740},clip:{left:0,top:0,right:430,bottom:740},controls:[{left:130,top:440,right:156,bottom:482}],envelope:shape,footprints:new Map([[id,shape]])};
 m.reconcile([a],[start]);rt.sync({generation:1,measurement:geometry});
 const prior=structuredClone(m.actors.get(id));
 assert.equal(rt.localHop([unsafe,A],{singletonIngress:true}),null);
 assert.deepEqual(m.actors.get(id),prior);
 assert.equal(m.reservations.size,0);
 assert.equal(rt.localHop([unsafe,A,pad],{singletonIngress:true}).target,pad.id);
 assert.equal(m.reservations.get(pad.id),id);
 assert.deepEqual(rt.recover([id],{reduced:true}),[]);
 assert.equal(m.actors.get(id).node,pad.id);
 assert.equal(m.reservations.size,0);
});

test('native snapshot identifies returning and previously met visitors, but rejects anonymous, duplicate, or swapped controls',async()=>{
 const {Window}=await import('happy-dom');
 const {runInNewContext}=await import('node:vm');
 const {snapshotGarden,assertGardenIdentities}=await import('./fixtures/garden-terrain-browser.js');
 const win=new Window({width:402,height:874});
 const doc=win.document;
 const buttons=attrs=>`<div class="finch-garden-stage"><div class="finch-garden-image-plane">${attrs.map(a=>`<button ${a}></button>`).join('')}</div></div>`;
 const sandbox={
  document:doc,getComputedStyle:el=>win.getComputedStyle(el),visualViewport:null,
  innerWidth:402,innerHeight:874,performance:{now:()=>123},
 };
 doc.elementFromPoint=()=>null;
 doc.elementsFromPoint=()=>[];
 const page={evaluate:fn=>runInNewContext('('+fn.toString()+')()',sandbox)};
 try{
  doc.body.innerHTML=buttons(['data-garden-household="b1"','data-garden-friend="f2"',
    'data-encounter-open="pending-guest"','data-garden-visiting-friend="returning-guest" data-encounter-page="returning-guest"',
    'data-encounter-page="known-guest"']);
  const valid=await snapshotGarden(page);
  const ids=['b1','f2','pending-guest','returning-guest','known-guest'];
  // Serialize only to normalize VM realm prototypes; values stay untouched.
  const normalized=JSON.parse(JSON.stringify(valid.birds));
  assert.doesNotThrow(()=>assertGardenIdentities(normalized,5,ids));
  assert.throws(()=>assertGardenIdentities(normalized,5,[...ids].reverse()),/identities or order/);
  doc.body.innerHTML=buttons(['data-garden-household="b1"','']);
  const anonymous=awaitedIdentity(await snapshotGarden(page));
  assert.throws(()=>assertGardenIdentities(anonymous,2),/anonymous native bird control/);
  doc.body.innerHTML=buttons(['data-garden-household="b1"','data-encounter-page="b1"']);
  const duplicate=awaitedIdentity(await snapshotGarden(page));
  assert.throws(()=>assertGardenIdentities(duplicate,2),/duplicate native bird identity/);
 }finally{await win.happyDOM.close();}
 function awaitedIdentity(snapshot){return JSON.parse(JSON.stringify(snapshot.birds));}
});

test('the twelve new flat surfaces apply their own source polygon without adding other gardens or changing the save',async()=>{
 const {GARDEN35_PLAN}=await import('../src/data/garden35-plan.js');
 const {renderGardenStage}=await import('../src/encounter-ui.js');
 const {actorTerrainForStage}=await import('../src/garden-actor-motion.js');
 const {worldFor}=await import('./fixtures/garden-about-world.js');
 const add=[2,5,9,13,17,19,22,23,24,25,30,35];
 const hold=[];
 const distinct=new Set();
 for(const item of GARDEN35_PLAN){
  const p=GARDEN_ACTOR_TERRAIN[item.id];
  if(hold.includes(item.number))assert.equal(p,undefined,item.name);
  if(!add.includes(item.number))continue;
  assert.ok(p && !p.trail,item.name);
  const encoded=JSON.stringify(p.surface);
  assert.ok(!distinct.has(encoded),item.name);distinct.add(encoded);
  for(const point of p.surface)for(const c of point)assert.ok(c>0&&c<1,item.name);
  assert.ok(p.entries.every(point=>inside(point,p.surface)),item.name);
  assert.ok(p.rows.every(y=>inside([p.columns[2],y],p.surface)),item.name);
  const w=worldFor('attending',item.id), before=JSON.stringify(w);
  assert.match(renderGardenStage(w),/data-garden-actor-id="b1"/,item.name);
  assert.equal(actorTerrainForStage({dataset:{gardenId:item.id}}),p,item.name);
  assert.equal(JSON.stringify(w),before,item.name);
 }
 assert.equal(distinct.size,12);
});


test('the stone shelf profile keep original art and a grounded native presentation',async()=>{
 const {terrainFor}=await import('../src/garden-terrain-plan.js');
 const {renderGardenStage}=await import('../src/encounter-ui.js');
 const {worldFor}=await import('./fixtures/garden-about-world.js');
 const slab=GARDEN_ACTOR_TERRAIN['bird-eurasian-bullfinch'];
 assert.deepEqual(slab.surface,terrainFor('bird-eurasian-bullfinch').surfaces.slab);
 for(const id of ['bird-eurasian-bullfinch']){
  const p=GARDEN_ACTOR_TERRAIN[id], w=worldFor('attending',id), before=JSON.stringify(w);
  assert.ok(p.entries.every(q=>inside(q,p.surface)),id);
  assert.ok(p.rows.every(y=>inside([p.columns[2],y],p.surface)),id);
  assert.match(renderGardenStage(w),/data-garden-actor-id="b1"/,id);
  assert.equal(JSON.stringify(w),before,id);
 }
});


test('the surveyed log never uses its side, roots, or lower soil as an authored contact',async()=>{
 const {terrainFor}=await import('../src/garden-terrain-plan.js');
 const log=GARDEN_ACTOR_TERRAIN.yuyake;
 assert.equal(terrainFor('yuyake').primary,'log');
 assert.ok([...log.contacts,...log.denseContacts,...log.entries].every(p=>inside(p,log.surface)));
 assert.equal(inside([.45,.8],log.surface),false);
 assert.equal(new Set(log.denseContacts.map(p=>p.join(':'))).size,log.denseContacts.length);
 assert.ok(log.denseContacts.length>10);
 assert.equal(GARDEN_ACTOR_TERRAIN.yuyake.denseContacts.length,16);
});


test('stepped gardens keep both approved supports, reject a sheer gap, and never manufacture a contact',async()=>{
 const {terrainFor}=await import('../src/garden-terrain-plan.js');
 const {actorSupports, actorSupportAt}=await import('../src/garden-actor-motion.js');
 for(const id of ['bird-white-winged-crossbill','bali-terrace']){
  const active=GARDEN_ACTOR_TERRAIN[id], old=terrainFor(id);
  assert.equal(actorSupports(active).length,2,id);
  assert.deepEqual(actorSupports(active).map(s=>s.surface),Object.values(old.surfaces),id);
  assert.equal(actorSupportAt(active,[.5,.69]),active,id);
  assert.equal(actorSupportAt(active,[.6,.90]),active.additionalSurfaces[0],id);
  assert.equal(actorSupportAt(active,[.5,.795]),null,id);
  assert.ok(active.foregroundClearance.every(a=>a.left<a.right&&a.top<a.bottom),id);
 }
 assert.equal(actorSupports(GARDEN_ACTOR_TERRAIN['java-rice']).length,1);
});

test('only the Yoriso-i original foreground is repainted, without changing the source background, tap identity, or save',async()=>{
 const {renderGardenStage}=await import('../src/encounter-ui.js');
 const {GARDEN35_PLAN}=await import('../src/data/garden35-plan.js');
 const {worldFor}=await import('./fixtures/garden-about-world.js');
 const profile=GARDEN_ACTOR_TERRAIN.onsen;
 assert.ok(profile.height>=.01,'do not pass the branch gate by suppressing flight height');
 assert.ok(profile.entries.every(q=>inside(q,profile.surface)));
 assert.ok(inside([.5,.661],profile.foreground));
 assert.ok(!inside([.5,.704],profile.foreground));
 assert.ok(!profile.denseRows.some(y=>inside([.5,y],profile.foreground)));
 for(const item of GARDEN35_PLAN){
  const w=worldFor('attending',item.id),save=JSON.stringify(w),html=renderGardenStage(w);
  assert.equal(JSON.stringify(w),save,item.id);
  const paint=html.match(/<span class="garden-actor-foreground"[^>]*><\/span>/g)||[];
  if(item.id!=='onsen'){assert.equal(paint.length,0,item.id);continue;}
  assert.equal(paint.length,1);
  const original=html.match(/<img class="finch-garden-background"[^>]* src="([^"]+)"/)[1];
  assert.equal(paint[0].match(/background-image:url\(&quot;([^&]+)&quot;\)/)[1],original);
  assert.match(paint[0],/aria-hidden="true"/);
  assert.match(paint[0],/pointer-events:none/);
  assert.match(html,/data-garden-actor-id="b1"/);
 }
});
