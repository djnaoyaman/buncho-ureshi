import {actorTerrainFor} from './data/garden-actor-terrain.js';
import {inside} from './garden-terrain-plan.js';
import {createGardenActors} from './garden-actor-state.js';
import {pairedHouseholdTrailTerrainFor,trailTerrainFor} from './data/garden-trail-terrain.js';
import {createGardenTrailRuntime} from './garden-trail-runtime.js';
import {assignTrailSeats,contourTrailStandingSeats,landscapeTrailStandingSeats,measuredNativeFoot,packTrailStandingSeats,pitchTrailStandingSeats,surveyedBandTrailSeats} from './garden-trail-clearance.js';
import {createActorFlight} from './garden-actor-flight.js';

// Proof of prior successful native placement on this exact connected stage,
// not proof of a currently exposed hit or cleared live flight.
const sharedStageLeases=new WeakSet();
export const hasSharedStageLease=stage=>!!stage&&sharedStageLeases.has(stage);


// Distinct #34 cold policy: the nominated actor starts at its authored
// gate and the destination remains open. Dissimilar guest and resident
// sprites are packed with measured per-actor domains, not roster order.
export function planMaskedPaneSeats({actors,lead,gate,parking,preferred,canPlace,standingPairFits,standingClass,admit}){
 if(actors.length!==10||!lead||!actors.includes(lead)||!gate||parking.length<9)return null;
 const prefers=new Map(preferred);prefers.set(lead.id,gate);
 return packTrailStandingSeats({actors,seats:[gate,...parking],preferred:prefers,standingPairFits,standingClass,
  canPlace(a,n,partial){
   return (a===lead?n===gate:n!==gate)&&canPlace(a,n,partial);
  },
  accept:admit,maxChecks:26000,maxBranches:2200,maxProbes:5
 });
}

// Cold #34 only: a tap-safe standing pack can still leave no pocket because
// native motion uses the larger swept shapes. Try a bounded one-seat
// alternative before first paint, and never displace a live occupant.
export function preferColdPocketPlan(plan,actors,seats,{canPlace,nativeHits,hasPocket,maxTrials=24}){
 if(!plan||actors.length!==10||hasPocket(plan))return plan;
 const selected=new Set([...plan.values()].map(n=>n.id));
 const entries=new Map(plan);
 const spacing=n=>Math.min(...[...plan.values()].map(q=>Math.hypot(q.p[0]-n.p[0],q.p[1]-n.p[1])));
 const open=seats.filter(n=>!selected.has(n.id)).map(n=>({n,gap:spacing(n)}))
  .sort((a,b)=>b.gap-a.gap);
 let trials=0,nativeTrials=0;
 // A single different contact preserves the other nine positions and each
 // solver verdict. Only inspect geometrically feasible standing candidates.
 for(const {n} of open)for(const a of actors){
  if(!a.movable)continue;
  entries.delete(a.id);
  const fits=canPlace(a,n,entries);
  entries.set(a.id,n);
  if(fits){
   if(++trials>maxTrials)return plan;
   if(hasPocket(entries,a.id)){
    if(++nativeTrials>3)return plan;
    if(nativeHits(entries))return new Map(entries);
   }
  }
  entries.set(a.id,plan.get(a.id));
 }
 return plan;
}

export function actorTerrainForStage(stage){
 const existing=actorTerrainFor(stage?.dataset.gardenId);
 if(existing)return existing;
 if(stage?.dataset.gardenTrail!=='true')return null;
 const trail=trailTerrainFor(stage.dataset.gardenId);
 if(!trail)return null;
 // Keep the exact #07 representative inputs; the other surveyed footprints
 // have their own seating bands, and every candidate still passes the actual
 // stage clip, labels and UI checks, never assuming survey points imply fit.
 const seating={
  7:[[.61,.70,.79],[.59,.66,.73,.80,.83],[.30,.39,.48,.57,.66]],
  8:[[.62,.69,.77],[.59,.64,.70,.75,.79],[.28,.39,.50,.61,.72]],
  10:[[.60,.67,.74],[.59,.63,.67,.71,.75],[.22,.36,.50,.64,.78]],
  12:[[.49,.62,.77],[.48,.574,.64,.70,.78],[.31,.405,.50,.595,.69]],
  14:[[.54,.67,.78],[.51,.58,.64,.70,.77],[.30,.42,.54,.66,.77]],
  28:[[.54,.65,.80],[.49,.55,.62,.71,.81],[.30,.41,.52,.63,.72]],
  34:[[.61,.69,.76],[.59,.63,.68,.73,.77],[.30,.405,.51,.615,.72]],
 }[trail.number];
 const [rows,denseRows,columns]=seating;
 return {...trail,trail:true,height:.043,rows,denseRows,columns};
}
const selector=':scope > .finch-garden-friend,:scope > .finch-garden-household,:scope > .finch-garden-visitor';
const rect=n=>n.getBoundingClientRect();
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const facedLeft=a=>a.route?.flightPath||a.route?.hops?Math.abs(a.dx??0)>.00004?a.dx<0:a.route.to[0]<a.route.from[0]:a.route?.to[0]<a.route?.from[0];
const poseFor=a=>({rest:'rest',look:'tilt',peck:'peck',preen:'preen'})[a.state]||(facedLeft(a)?'left':'right');
const reset='display:block;position:absolute;margin:0;padding:0;border:0;box-shadow:none;pointer-events:none;';
// Keep the authored preference when it already fits. Explore the small
// regular grid exactly only if the preferred greedy packing misses capacity.
export function selectFootholds(candidates,capacity,compatible){
 const greedy=[];
 for(const n of candidates)if(greedy.every(q=>compatible(n,q)))greedy.push(n);
 if(greedy.length>=capacity||candidates.length>15||candidates.length<capacity)return greedy;
 const chosen=[];
 function solve(from){
  if(chosen.length===capacity)return true;
  for(let i=from;i<=candidates.length-(capacity-chosen.length);i++){
   if(!chosen.every(q=>compatible(candidates[i],q)))continue;
   chosen.push(candidates[i]);if(solve(i+1))return true;chosen.pop();
  }
  return false;
 }
 return solve(0)?chosen:greedy;
}
/** DOM adapter for the explicitly surveyed open-ground gardens. Owns no game state. */
// Layout re-housing is only valid at a genuine cover-axis boundary where
// no old active route can still paint and at least one current bird is
// already hidden by the new clip/controls. Never snap a visibly valid route.
export function clippedDenseCoverRecovery({changedAxis,actors,routeFits,currentFits,replace}){
 if(!changedAxis||actors.length!==10)return false;
 const moving=actors.filter(a=>!!a.route);
 if(!moving.length||moving.some(routeFits)||!actors.some(a=>!currentFits(a)))return false;
 return replace();
}

// #07's existing eight-bird layout can rehouse only after landscape already
// clipped the moving controls. Do not cancel any route still paintable or
// visibly tracked at its live center. All placements must commit together.
export function clippedTrail7CoverRecovery({gardenNumber,changedAxis,actors,routeFits,currentCenterVisible,replace}){
 if(gardenNumber!==7||!changedAxis||actors.length!==8)return false;
 const moving=actors.filter(a=>!!a.route);
 if(!moving.length||moving.some(a=>routeFits(a)||currentCenterVisible(a)))return false;
 return replace();
}

// Classification uses real control clipping/ownership, not the nominal label
// skirt. Only already offscreen grounded centers may receive a new contact.
export function trail7IdleDisposition({ground,nominal,centerOutside,controlContained,nativeHit}){
 if(!ground)return 'deny';
 if(nominal)return 'retain';
 if(centerOutside)return 'rehome';
 return controlContained&&nativeHit?'hold':'deny';
}

export function createGardenActorMotion(root){
 let axisIdleHold=null,sharedAdmission=null,maskedLegacy=null;
 const samePoint=(a,b)=>a?.length===2&&b?.length===2&&a.every((x,i)=>Math.abs(x-b[i])<1e-8);
 let trailRuntime=null,nextTrail=0,trailRetry=false,trailMeasurement=null,trailPads=[];
 const bindings=new Map(),routeCache=new WeakMap();let model=null,key='',canonicalRetryKey=null,pinnedTrail=null,geometryKey='',rosterKey='',footholds=[],layoutWidth=64,standingOnly=false,geometry=null,terrain=null,overlayStyle=null,rejected=null,paintedWideCrop=null;
 const routeSamples=a=>{
  let samples=routeCache.get(a.route);
  if(!samples){samples=model.sampleRoute(a);routeCache.set(a.route,samples);}
  return samples;
 };
 const restore=b=>{
  b.flight?.node.remove();b.shadow?.remove();
  for(const [node,style]of b.styles)style===null?node.removeAttribute('style'):node.setAttribute('style',style);
  if(b.pose){b.pose.style.visibility=b.poseVisibility;b.pose.removeAttribute('data-terrain-flight-active');}
  for(const attr of ['data-actor-state','data-actor-phase','data-actor-node','data-actor-landing'])b.node.removeAttribute(attr);
 };
 const dispose=()=>{axisIdleHold=null;if(sharedAdmission?.stage)sharedStageLeases.delete(sharedAdmission.stage);sharedAdmission=null;if(overlayStyle){const [node,value]=overlayStyle;value?node.style.setProperty('--game-viewport-height',value):node.style.removeProperty('--game-viewport-height');overlayStyle=null;}for(const b of bindings.values())restore(b);bindings.clear();model?.clear();model=null;trailRuntime=null;nextTrail=0;trailRetry=false;trailMeasurement=null;trailPads=[];key='';canonicalRetryKey=null;pinnedTrail=null;geometryKey='';rosterKey='';rejected=null;paintedWideCrop=null;};
 const body=(p,width,height,lift=0)=>({left:geometry.plane.left+p[0]*geometry.plane.width-width*.54,top:geometry.plane.top+p[1]*geometry.plane.height-height*.975-lift,
  right:geometry.plane.left+p[0]*geometry.plane.width+width*.46,bottom:geometry.plane.top+p[1]*geometry.plane.height+height*.025-lift});
 function safePoint(p,width,height,lift=0,flight=false){
  if(!inside(p,terrain.surface))return false;
  const r=body(p,width,height,lift),pad=flight?width*.65:0,c=geometry.clip;
  return r.left-pad>=c.left+2&&r.right+pad<=c.right-2&&r.top-(flight?height*.12:0)>=c.top+2&&r.bottom+20<=c.bottom-2
   &&!geometry.obstacles.some(o=>overlap({...r,left:r.left-pad,right:r.right+pad,bottom:r.bottom+20},o));
 }
 // Footprint ownership is separate from image overlap. Keep an exposed central
 // tap area; full art rectangles may overlap across depth layers.
 function separated(p,q,width,height){
  return Math.abs((p[0]-q[0])*geometry.plane.width)>=width*.76||Math.abs((p[1]-q[1])*geometry.plane.height)>=height*.64;
 }
 function safeRoute(actor,node,kind,actors){
  const b=bindings.get(actor.id);if(!b)return false;
  const candidate=actor.route?.reroute?actor:{...actor,state:kind,since:0,route:{from:actor.p,to:node.p,duration:2800,height:kind==='fly'?terrain.height:.012,steps:Math.max(1,Math.ceil(Math.hypot(actor.p[0]-node.p[0],actor.p[1]-node.p[1])*geometry.plane.width/24))}};
  // Other trajectories do not change during this synchronous admission check.
  // Project each once instead of allocating them again at every sample.
  const obstacles=[...actors.values()].filter(other=>other.id!==actor.id).flatMap(other=>[
   other.p,...(other.route?routeSamples(other).flatMap(f=>[f.p,[f.p[0],f.p[1]-f.height]]):[]),
  ]);
  for(let i=0;i<=48;i++){
   const t=i/48,q=model.frame(candidate,candidate.since+t*candidate.route.duration),p=q.p,h=q.height*geometry.plane.height;
   if(!safePoint(p,b.width,b.height,h,kind==='fly'))return false;
   for(const q of obstacles){
    // The native tap target follows altitude, not just the ground projection.
    const lifted=[p[0],p[1]-h/geometry.plane.height];
    if((kind!=='fly'||t<.15||t>.85)&&!separated(p,q,b.width,b.height))return false;
    if(!separated(lifted,q,b.width,b.height))return false;
   }
  }
  return true;
 }
 function binding(node,id){
  const sprite=node.querySelector('.garden-bird-sprite'),pose=sprite?.querySelector('.garden-bird-pose-window'),label=node.querySelector('.finch-friend-name')||node.lastElementChild;
  const styles=new Map([[node,node.getAttribute('style')]]);if(sprite)styles.set(sprite,sprite.getAttribute('style'));if(label)styles.set(label,label.getAttribute('style'));
  const r=rect(node),b={node,sprite,pose,poseVisibility:pose?.style.visibility,label,styles,width:r.width,height:r.height,flight:null,shadow:null};
  if(sprite&&node.dataset.gardenActorFlight==='adult')b.flight=createActorFlight(sprite,sprite.dataset.color);
  const shadow=root.ownerDocument.createElement('i');shadow.className='garden-actor-shadow';shadow.setAttribute('aria-hidden','true');
  shadow.style.cssText=reset+'border-radius:50%;background:rgba(40,36,27,.18);z-index:1;';node.parentElement.append(shadow);b.shadow=shadow;
  bindings.set(id,b);return b;
 }
 return {dispose,step(elapsed,active,overrides,{settle=false,geometryOnly=false,predator=false}={}){
  const stage=root.querySelector('.finch-garden-stage');terrain=actorTerrainForStage(stage);if(!terrain){dispose();return false;}
  if(stage.dataset.sceneState!=='ready')return false;
  const view=root.ownerDocument.defaultView;
  const plane=stage.querySelector('.finch-garden-image-plane'),slide=stage.querySelector('.finch-garden-slide');if(!plane||!slide)return false;
  const world=root.querySelector('.finch-garden')?.dataset.gardenWorld||root.dataset.gardenWorld||'',nextKey=world+':'+stage.dataset.gardenId;
  if(key!==nextKey){
   const canonical=canonicalRetryKey===nextKey;
   dispose();key=nextKey;if(canonical)canonicalRetryKey=nextKey;
   model=createGardenActors(key,elapsed);
   if(terrain.trail){
    const sceneBirds=[...plane.querySelectorAll(selector)];
    const households=sceneBirds.filter(n=>n.matches('.finch-garden-household')&&n.querySelector('.garden-bird-sprite')).length;
    pinnedTrail=canonical?null:pairedHouseholdTrailTerrainFor(stage.dataset.gardenId,households,sceneBirds.length);
    trailRuntime=createGardenTrailRuntime(stage.dataset.gardenId,model,pinnedTrail??undefined);
   }
  }
  // A same-world redraw can replace the section markup before the
  // runtime sees it. Keep an already chosen #34 fallback in cover before
  // the new section is sampled; do not clear or move its existing actors.
  if(maskedLegacy&&maskedLegacy.key!==nextKey)maskedLegacy=null;
  if(terrain.number===34&&maskedLegacy?.key===nextKey){
   const incoming=stage.closest('[data-garden-masked-play="candidate"]');
   if(incoming){incoming.dataset.gardenMaskedPlay='fallback';incoming.dataset.gardenSharedStatus=maskedLegacy.reason;}
  }
  const pairedVariant=!!pinnedTrail;
  // One canonical restart is allowed before binding any actor or reserving a
  // route. The chosen profile is never swapped on subsequent joins/rebinds.
  const retryCanonical=()=>{
   dispose();canonicalRetryKey=nextKey;
   return this.step(elapsed,active,overrides,{settle,geometryOnly,predator});
  };
  // Legacy dvh fallback resize events may arrive after the layout viewport.
  // Scope the measured height to this scene, never change the global shell.
  if(!view.CSS?.supports?.('height','100dvh')){
   const overlay=stage.closest('.game-panel-overlay[data-scene=true]');
   if(overlay){
    if(overlayStyle&&overlayStyle[0]!==overlay){const [old,value]=overlayStyle;value?old.style.setProperty('--game-viewport-height',value):old.style.removeProperty('--game-viewport-height');overlayStyle=null;}
    if(!overlayStyle)overlayStyle=[overlay,overlay.style.getPropertyValue('--game-viewport-height')];
    const height=(view.visualViewport?.scale===1?view.visualViewport.height:view.innerHeight)||view.innerHeight;
    const value=height+'px';if(overlay.style.getPropertyValue('--game-viewport-height')!==value)overlay.style.setProperty('--game-viewport-height',value);
   }
  }
  // A committed-world redraw can expose a new stage before mountSceneUnits'
  // next RAF. On engines without container units, project this stage from its
  // actual content box synchronously, before reading the image plane or hits.
  if(!view.CSS?.supports?.('width','1cqw')||!view.CSS?.supports?.('height','1cqh')){
   const bounds=rect(stage),css=view.getComputedStyle(stage),n=k=>parseFloat(css[k])||0;
   const width=bounds.width-n('borderLeftWidth')-n('borderRightWidth')-n('paddingLeft')-n('paddingRight');
   const height=bounds.height-n('borderTopWidth')-n('borderBottomWidth')-n('paddingTop')-n('paddingBottom');
   for(const [name,value]of [['--game-cqw',width],['--game-cqh',height]])if(value>0&&stage.style.getPropertyValue(name)!==value/100+'px')stage.style.setProperty(name,value/100+'px');
  }
  const nodes=[...plane.querySelectorAll(selector)],definitions=nodes.map(node=>({node,id:node.dataset.gardenActorId||'guest:'+(node.dataset.gardenVisitingFriend||node.dataset.encounterOpen||node.dataset.encounterPage)}));
  const ids=new Set(definitions.map(d=>d.id));
  const nextRosterKey=[...ids].sort().join('|'),populationChanged=nextRosterKey!==rosterKey;
  const p=rect(plane),s=rect(slide),r=rect(stage),win=root.ownerDocument.defaultView;
  geometry={plane:p,clip:{left:Math.max(0,s.left,r.left),right:Math.min(win.innerWidth,s.right,r.right),top:Math.max(0,s.top,r.top),bottom:Math.min(win.innerHeight,s.bottom,r.bottom)},
   obstacles:[...root.querySelectorAll('.finch-garden > header,.finch-garden-selector-wrap,.garden-jog-cylinder > button[data-jog-center],.finch-garden-dock,.finch-garden-family,.finch-garden > details > summary,.leaf-gift > summary')].map(rect)};
  if(trailRuntime){
   // Controls outside the encounter root and expanded dock panels can sit
   // above this plane. Reserve those native hit boxes too, only when visible.
   const extra=[...root.querySelectorAll('.finch-garden-dock details[open],.finch-garden [data-garden-encounter-notice] button'),
    ...root.ownerDocument.querySelectorAll('.game-scene-controls-toggle')];
   for(const n of extra){const q=rect(n),style=win.getComputedStyle(n);
    if(q.width>0&&q.height>0&&style.visibility!=='hidden'&&style.pointerEvents!=='none')geometry.obstacles.push(q);
   }
  }
  // This branch uses translation-invariant measurements because the pane,
  // backdrop and bird model share one fixed projection. Obstacles are only
  // clipped out after proving their real bounds never enter the pane.
  const masked=terrain.number===34;
  const roomOwner=masked?stage.closest('[data-garden-masked-play="candidate"]'):
   terrain.number===7?stage.closest('[data-garden-shared-play="proof"]'):null;
  const revalidateSharedOcclusion=!masked&&!!roomOwner&&hasSharedStageLease(stage)&&roomOwner.dataset.gardenSharedStatus==='retained-invalid';
  const profile=masked?{
   width:375,height:157,artWidth:750,artLeft:-180,artTop:157*.78-.64*(750*1672/940),counts:[10],minHeight:375,
   gates:[[42,125],[106,125]],
   parking:[[170,53.5],[215.2,53.5],[260.4,53.5],[305.6,53.5],[350.8,53.5],[170,125],[215.2,125],[260.4,125],[305.6,125]]
  }:{
   width:390,height:235,artWidth:700,counts:[8,10],minHeight:390,
   gates:[[90,140],[172,140]],parking:[[257,54],[305,54],[353,54],[257,129],[305,129],[353,129],[257,204],[305,204],[353,204]]
  };
  const expectedCount=profile.counts.includes(definitions.length);
  const near=(a,b)=>Math.abs(a-b)<.1;
  const shared=roomOwner&&near(s.width,profile.width)&&near(s.height,profile.height)&&near(p.width,profile.artWidth)&&
   (!masked||(near(p.left-s.left,profile.artLeft)&&near(p.top-s.top,profile.artTop)&&
    near(geometry.clip.left,s.left)&&near(geometry.clip.top,s.top)&&near(geometry.clip.right,s.right)&&near(geometry.clip.bottom,s.bottom)));
  const sharedRoom=shared&&expectedCount;
  const abandonShared=reason=>{
   roomOwner.dataset.gardenSharedStatus=reason;
   if(masked){maskedLegacy={key:nextKey,reason};roomOwner.dataset.gardenMaskedPlay='fallback';}
   else roomOwner.dataset.gardenSharedPlay='fallback';
   dispose();
   return this.step(elapsed,active,overrides,{settle,geometryOnly,predator});
  };
  if(roomOwner&&!roomOwner.dataset.gardenSharedStatus){
   roomOwner.dataset.gardenSharedStatus=!expectedCount?'roster':shared?'measuring':'projection';
  }
  const supportedRoom=roomOwner&&expectedCount&&win.innerWidth>=profile.width&&win.innerHeight>=profile.minHeight&&
   (!masked||!stage.querySelector('.finch-crow-scale-scene,.finch-raptor-scale-scene'));
  if(supportedRoom&&!shared&&!model.actors.size)return abandonShared('projection');
  // A retained ordinary pack cannot be assigned new places merely because
  // this replacement owner advertises the proof pane. No mid-session upgrade.
  if(masked&&supportedRoom&&model.actors.size&&!sharedAdmission){
   maskedLegacy={key:nextKey,reason:'retained-unproven'};
   roomOwner.dataset.gardenMaskedPlay='fallback';
   roomOwner.dataset.gardenSharedStatus=maskedLegacy.reason;
   return this.step(elapsed,active,overrides,{settle,geometryOnly,predator});
  }
  if(supportedRoom&&model.actors.size&&!sharedAdmission){
   roomOwner.dataset.gardenSharedStatus='retained-unproven';
   return false;
  }
  // Contacts for #34 are tied to this garden's source camera, not to the
  // responsive clip. CSS/native boxes still admit or reject the exact route.
  const sharedAt=([x,y])=>masked?[(x-profile.artLeft)/profile.artWidth,(y-profile.artTop)/(profile.artWidth*1672/940)]:
   [(geometry.clip.left+x-p.left)/p.width,(geometry.clip.top+y-p.top)/p.height];
  const sharedGates=sharedRoom?profile.gates.map((q,i)=>({id:'shared-gate-'+i,p:sharedAt(q)})):[];
  const sharedParking=sharedRoom?profile.parking.map((q,i)=>({id:'shared-park-'+i,p:sharedAt(q)})):[];
  if(shared)geometry.obstacles=geometry.obstacles.filter(o=>overlap(o,geometry.clip));
  const local=v=>Math.round(v*100)/100;
  const localRect=o=>[local(o.left-p.left),local(o.top-p.top),local(o.right-p.left),local(o.bottom-p.top)];
  const signature=shared?JSON.stringify([masked?'shared34':'shared07',definitions.length,p.width,p.height,localRect(geometry.clip),
   geometry.obstacles.map(localRect),trailRuntime?root.ownerDocument.fonts?.status:null]):
   JSON.stringify([definitions.length,p.width,p.height,p.left,p.top,geometry.clip,geometry.obstacles.map(o=>[o.left,o.top,o.right,o.bottom]),trailRuntime?root.ownerDocument.fonts?.status:null]);
  const resized=signature!==geometryKey;
  // Native buttons retain their identity, events and focus. On a genuine
  // unsupported footprint remove the *whole* old presentation, not just its
  // diagnostics, and only try again when the measured inputs/stage change.
  const reject=reason=>{
   sharedStageLeases.delete(stage);
   for(const b of bindings.values())restore(b);
   bindings.clear();geometryKey='';rosterKey='';
   rejected={stage,signature,roster:nextRosterKey};
   stage.dataset.actorMotion=reason;return false;
  };
  if(rejected?.stage===stage&&rejected.signature===signature&&rejected.roster===nextRosterKey)return false;
  rejected=null;
  if(resized){
   standingOnly=false;
   for(const width of definitions.length>6?[44]:[64,44]){const height=width*1000/850;
   footholds=[];
   // Dense scenes may use intermediate points on the same surveyed surface,
   // retaining the identical physical footprint and obstacle checks.
   const rows=definitions.length>6?terrain.denseRows.flatMap((y,i,all)=>i+1<all.length?[y,(y+all[i+1])/2]:[y]):terrain.rows;
   const order=definitions.length>6?rows.flatMap((_,r)=>[2,0,4,1,3].map(c=>[c,r])):[[2,0],[1,1],[3,1],[1,2],[3,2],[0,0],[4,0],[0,2],[4,2],[2,1],[2,2],[1,0],[3,0],[0,1],[4,1]];
   // An irregular but audited horizontal surface can provide explicit
   // contacts without inventing another policy for motion or button size.
   const points=(definitions.length>6?terrain.denseContacts:terrain.contacts)??order.map(([column,row])=>[terrain.columns[column],rows[row]]);
   for(const point of points)if(safePoint(point,width,height))footholds.push({id:point.join(':'),p:point});
   if(trailRuntime)footholds=[...trailRuntime.nodes.filter(n=>n.id!=='bay'&&safePoint(n.p,width,height)),...footholds];
   // Select alternating depth positions, retaining space for a second row.
   footholds=selectFootholds(footholds,definitions.length,(a,b)=>separated(a.p,b.p,width,height));layoutWidth=width;
   if(terrain.denseContacts&&definitions.length>6&&footholds.length>definitions.length){
    const [lead,...others]=footholds;
    // Existing occupants are retained. In a fresh compact roster leave one
    // nearby row contact open when present, then validate with safeRoute.
    const nearby=others.filter(n=>Math.abs(n.p[1]-lead.p[1])<.005)
     .sort((a,b)=>Math.abs(a.p[0]-lead.p[0])-Math.abs(b.p[0]-lead.p[0]))[0];
    if(nearby)footholds.push(footholds.splice(footholds.indexOf(nearby),1)[0]);
   }
   if(footholds.length>=definitions.length)break;
   }
   if(footholds.length<definitions.length){
    const width=44,height=width*1000/850,capacity=definitions.length;
    // Compact standing-only recovery: Project a few staggered screen grids
    // onto this surveyed surface; never grow the polygon to manufacture room.
    const dx=Math.ceil(width*.76)+2,dy=Math.ceil(height*.64)+2,c=geometry.clip;
    const minX=Math.max(c.left, p.left+Math.min(...terrain.surface.map(n=>n[0]))*p.width);
    const maxX=Math.min(c.right, p.left+Math.max(...terrain.surface.map(n=>n[0]))*p.width);
    const minY=Math.max(c.top, p.top+Math.min(...terrain.surface.map(n=>n[1]))*p.height);
    const maxY=Math.min(c.bottom, p.top+Math.max(...terrain.surface.map(n=>n[1]))*p.height);
    for(const iy of [0,1,2])for(const ix of [0,1,2]){
     if(footholds.length>=capacity)break;
     const slots=[];
     for(let y=minY+iy*dy/3;y<=maxY;y+=dy)for(let x=minX+ix*dx/3;x<=maxX;x+=dx){
      const point=[(x-p.left)/p.width,(y-p.top)/p.height];
      if(safePoint(point,width,height))slots.push({id:point.join(':'),p:point});
     }
     if(slots.length>=capacity){
      // Keep only the nearest legal standing slots, in deterministic order.
      const prior=[...model.actors.values()].map(a=>a.p),used=new Set();
      for(const a of prior){
       const n=slots.filter(n=>!used.has(n)).sort((u,v)=>Math.hypot((u.p[0]-a[0])*p.width,(u.p[1]-a[1])*p.height)-Math.hypot((v.p[0]-a[0])*p.width,(v.p[1]-a[1])*p.height))[0];
       if(n)used.add(n);
      }
      for(const n of slots)if(used.size<capacity)used.add(n);
      footholds=[...used];layoutWidth=width;standingOnly=true;
     }
    }
   }
  }
  if(trailRuntime&&resized){
   // A dense standing pack can consume all 10 ordinary seats. Search
   // additional surveyed landing contacts without moving other actors;
   // localHop validates the measured entire sweep and destination on commit.
   trailPads=[];
   const width=layoutWidth,height=width*1000/850;
   const used=new Set(footholds.map(n=>n.p.join(':')));
   const add=q=>{const id=q.join(':');if(!used.has(id)&&safePoint(q,width,height)){used.add(id);trailPads.push({id:'pad:'+id,p:q});}};
   for(const [row,y] of terrain.denseRows.entries())for(const x of terrain.columns){
    add([x,y]);add([x+(row%2?1:-1)*22/p.width,y+16/p.height]);
   }
   // Dense geometric contacts are checked against this actual clip, before
   // packing measured footprints. This is not an expansion of dry terrain.
   if(definitions.length>6){
    const dx=24/p.width,dy=26/p.height,polygon=terrain.surface;
    const bounds=[Math.min(...polygon.map(q=>q[0])),Math.max(...polygon.map(q=>q[0])),
     Math.min(...polygon.map(q=>q[1])),Math.max(...polygon.map(q=>q[1]))];
    for(let row=0,y=bounds[2];y<=bounds[3];y+=dy,row++)
     for(let x=bounds[0]+(row%2?dx/2:0);x<=bounds[1];x+=dx)add([x,y]);
   }
  }
  const nativePreferred=new Map();
  if(trailRuntime&&definitions.length>6){
   const width=layoutWidth,height=width*1000/850;
   const known=new Map([...footholds,...trailPads].map(n=>[n.p.join(':'),n]));
   // On a fresh world render the native markup already places real interactive
   // buttons. Seed the measured pack with those painted contacts rather than
   // discarding them in favour of a quantized grid. Existing model actors keep
   // priority during updates; never use an airborne paint as a ground anchor.
   for(const {id,node} of definitions){
    if(model.actors.has(id)||node.dataset.actorState)continue;
    const q=measuredNativeFoot(p,rect(node),f=>safePoint(f,width,height));
    if(!q)continue;
    const point=q.join(':');
    let seat=known.get(point);
    if(!seat){seat={id:'native:'+point,p:q};known.set(point,seat);trailPads.push(seat);}
    nativePreferred.set(id,seat);
   }
  }
  const denseResponsive=!!trailRuntime&&definitions.length===10&&(terrain.number===8||terrain.number===10);
  const wideCrop=geometry.clip.right-geometry.clip.left>geometry.clip.bottom-geometry.clip.top;
  if(footholds.length+(trailRuntime?trailPads.length:0)+sharedParking.length+sharedGates.length<definitions.length&&!(denseResponsive&&wideCrop)){
   if(sharedRoom&&!model.actors.size)return abandonShared('seat');
   if(pairedVariant&&!model.actors.size)return retryCanonical();
   return reject('insufficient-space');
  }
  let changedBindings=false;
  for(const [id,b]of bindings)if(!ids.has(id)||definitions.find(d=>d.id===id)?.node!==b.node){restore(b);bindings.delete(id);changedBindings=true;}
  for(const d of definitions)if(!bindings.has(d.id)){binding(d.node,d.id);changedBindings=true;}
  // A saved-world render creates fresh native CSS dimensions. Reapply the same
  // presentation size even when the image plane geometry did not change.
  const actorWidth=layoutWidth;
  for(const b of bindings.values()){b.width=actorWidth;b.height=actorWidth*1000/850;}

  const bay=trailRuntime?.nodes.find(n=>n.id==='bay');
  const layoutNodes=trailRuntime?[...footholds,...trailPads,...(bay&&safePoint(bay.p,actorWidth,actorWidth*1000/850)?[bay]:[])]:footholds;
  const fixedFlight=new Set(model.actors.keys()),roster=definitions.map(d=>({id:d.id,initialFlight:d.node.dataset.gardenActorLead==='true'&&d.node.dataset.gardenActorFlight==='adult',movable:!!bindings.get(d.id).sprite,canFly:!!bindings.get(d.id).flight?.ready}));
  const footprint=(b,inflate=null)=>{
   const r=rect(b.node),label=b.label?rect(b.label):null;
   // Include the native long-tail encounter art's real bounding box, not
   // just its button or the head-to-feet reference used for body sizing.
   const art=b.sprite||b.node.querySelector('.finch-body-art img.finch-art,.finch-media img.finch-art');
   const sprite=art?rect(art):null;
   const x=r.left+r.width*.54,y=r.top+r.height*.975,normal=.54*b.width,vertical=.975*b.height;
   // Idle birds don't have wings open. Preserve the full native hit box and
   // real label; union the larger visible art only for the moving pose.
   const box=inflate?rect(inflate):null;
   const envelope={left:Math.min(-normal,(label?.left??x)-x,(sprite?.left??x)-x,(box?.left??x)-x),
    right:Math.max(b.width-normal,(label?.right??x)-x,(sprite?.right??x)-x,(box?.right??x)-x),
    top:Math.min(-vertical,(label?.top??y)-y,(sprite?.top??y)-y,(box?.top??y)-y),
    bottom:Math.max(b.height-vertical,(label?.bottom??y)-y,(sprite?.bottom??y)-y,(box?.bottom??y)-y,20)};
   // Below seven actors keep the original geometry. For a compact pack only,
   // retain each actual stationary rectangle: do not treat empty corners
   // or the artificial clearance skirt as a second bird's painted body.
   // Clip, controls, and any route still receive the full envelope.
   if(!inflate&&definitions.length>6&&r.width>=43.99&&r.height>=43.99)
    envelope.parts=[r,label,sprite].filter(q=>q&&q.width>0&&q.height>0)
     .map(q=>({left:q.left-x,right:q.right-x,top:q.top-y,bottom:q.bottom-y}));
   return envelope;
  };
  const measureTrail=()=>{
   // Probe the actual final-size layout synchronously. Otherwise a compact
   // bird is assessed with stale larger native control, sprite and label
   // dimensions, and valid landings become false rejections.
   const saved=new Map(),probe=(n,styles)=>{
    if(!n)return;
    if(!saved.has(n))saved.set(n,n.getAttribute('style'));
    Object.assign(n.style,styles);
   };
   try{
    for(const b of bindings.values()){
     probe(b.node,{width:b.width+'px',height:b.height+'px',marginBlockStart:'0px',transform:'translate(-54%,-97.5%)',transition:'none'});
     probe(b.sprite,{transform:'none'});
     probe(b.label,{visibility:definitions.length>6?'':'visible',maxWidth:b.width+'px'});
     probe(b.flight?.node,{transform:'none'});
    }
    const footprints=new Map([...bindings].map(([id,b])=>[id,footprint(b)]));
    const flightFootprints=new Map([...bindings].map(([id,b])=>{
     const f=footprint(b,b.flight?.node);
     // Union the same measured canvas facing both directions, plus margin.
     const x=(f.right-f.left)*.06,y=(f.bottom-f.top)*.06,side=Math.max(-f.left,f.right)+x;
     return [id,{left:-side,right:side,top:f.top-y,bottom:f.bottom+y}];
    }));
    const all=[...flightFootprints.values()];
    return {...geometry,footprints,flightFootprints,controls:geometry.obstacles,envelope:{left:Math.min(-22,...all.map(q=>q.left)),top:Math.min(-51,...all.map(q=>q.top)),
     right:Math.max(22,...all.map(q=>q.right)),bottom:Math.max(20,...all.map(q=>q.bottom))}};
   }finally{
    for(const [n,value] of saved)value===null?n.removeAttribute('style'):n.setAttribute('style',value);
   }
  };
  const hadTrail=!!trailRuntime&&[...model.actors.values()].some(a=>a.route);
  if(trailRuntime&&(resized||populationChanged||changedBindings||!trailMeasurement||revalidateSharedOcclusion||shared&&(p.left!==trailMeasurement.plane.left||p.top!==trailMeasurement.plane.top)))trailMeasurement=measureTrail();
  const measurement=trailRuntime?trailMeasurement:null;
  if(trailRuntime){
   // Apply the authoritative removals even when no seat can be allocated to
   // a different newcomer. An orphaned reservation cannot block future fit.
   model.reconcile(roster.filter(d=>fixedFlight.has(d.id)),[]);
   trailRuntime.sync({generation:key,measurement,predator});
  }
  const nativeTrailHits=(plan,{requireNative=false,lifts=null,heldIds=null}={})=>{
   // Regular motion may defer while blocked. An emergency cover replacement
   // must get a real input verdict, even if the animation clock is held.
   const doc=root.ownerDocument,hitApi=typeof doc.elementFromPoint==='function';
   if(requireNative){
    if(!hitApi||doc.hidden||doc.body.hasAttribute('data-game-view-blocked')||doc.querySelector('dialog:modal')||stage.closest('[inert]'))return false;
   }else if(!active||!hitApi)return true;
   const saved=new Map();
   try{
    for(const [id,n]of plan){
     const b=bindings.get(id);if(!b)return false;
     saved.set(b.node,b.node.getAttribute('style'));
     Object.assign(b.node.style,{width:b.width+'px',height:b.height+'px',
      left:n.p[0]*100+'%',top:n.p[1]*100+'%',marginBlockStart:'0px',
      transform:'translate(-54%,-97.5%)'+(lifts?' translateY('+(-(lifts.get(id)||0)*p.height)+'px)':''),zIndex:String(Math.round(n.p[1]*1000)),transition:'none'});
    }
    for(const [id]of plan){
     const {node}=bindings.get(id),r=rect(node);
     const hit=root.ownerDocument.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
     if(r.width<43.99||r.height<43.99||!hit||!node.contains(hit))return false;
     if(heldIds?.has(id)){
      const c=geometry.clip;
      if(r.left<c.left||r.right>c.right||r.top<c.top||r.bottom>c.bottom)return false;
      const sprite=bindings.get(id)?.sprite;
      if(sprite){
       const q=rect(sprite);
       if(q.left<c.left||q.right>c.right||q.top<c.top||q.bottom>c.bottom)return false;
      }
     }
    }
    return true;
   }finally{
    for(const [node,style]of saved)style===null?node.removeAttribute('style'):node.setAttribute('style',style);
   }
  };
  const addTrailContacts=plan=>{
   const existing=new Set(layoutNodes.map(n=>n.id));
   for(const n of plan.values())if(!existing.has(n.id)){trailPads.push(n);layoutNodes.push(n);existing.add(n.id);}
  };
  const findResponsiveBands=measured=>denseResponsive&&measurement?(wideCrop?
   landscapeTrailStandingSeats(terrain.number,{...measured,...measurement,knownSeats:layoutNodes,surface:terrain.surface,
    safePoint:q=>safePoint(q,actorWidth,actorWidth*1000/850)}):
   surveyedBandTrailSeats(terrain.number,{...measured,...measurement,knownSeats:layoutNodes,
    safePoint:q=>safePoint(q,actorWidth,actorWidth*1000/850)})):null;
  if(masked&&sharedRoom)standingOnly=false; // authored seats are checked independently of the legacy cover pack
  // #34 uses a smaller stage. Its real measured mirrored art and touch box
  // need to fit, not the legacy nominal body plus an arbitrary extra wing.
  // The adapter still checks the *entire* measured route against all peers,
  // reserved controls, dry terrain and the fixed play pane before committing.
  const pointFits=(a,q,h)=>{
   const b=bindings.get(a.id);if(!b)return false;
   if(!masked||!sharedRoom||a.state!=='fly')return safePoint(q,b.width,b.height,h*p.height,a.state==='fly');
   const f=measurement?.flightFootprints.get(a.id);if(!f||!inside(q,terrain.surface))return false;
   const x=p.left+q[0]*p.width,y=p.top+(q[1]-h)*p.height,c=geometry.clip;
   const box={left:x+f.left,top:y+f.top,right:x+f.right,bottom:y+f.bottom};
   return box.left>=c.left+2&&box.right<=c.right-2&&box.top>=c.top+2&&box.bottom<=c.bottom-2&&
     !geometry.obstacles.some(o=>overlap(box,o));
  };
  const routeFits=a=>!a.route||routeSamples(a).every(f=>pointFits(a,f.p,f.height));
  if(sharedRoom){
   if(!fixedFlight.size&&geometry.obstacles.length)return abandonShared('chrome');
   if(!fixedFlight.size&&(!masked&&[...sharedGates,...sharedParking].some(n=>!safePoint(n.p,actorWidth,actorWidth*1000/850))||
     masked&&sharedGates.some(n=>!safePoint(n.p,actorWidth,actorWidth*1000/850))))
    return abandonShared('seat');
   for(const n of [...sharedGates,...sharedParking]){
    if(!trailPads.some(x=>x.id===n.id))trailPads.push(n);
    if(!layoutNodes.some(x=>x.id===n.id))layoutNodes.push(n);
   }
  }
  let planned=null,coldSharedAdmission=null,reboundShared=false;
  if(sharedAdmission&&roomOwner&&(revalidateSharedOcclusion||roomOwner!==sharedAdmission.owner||resized||changedBindings||populationChanged)){
   const current=[...model.actors.values()],plan=new Map(),lifts=new Map();
   const allowed=new Map([...sharedGates,...sharedParking,...(masked?sharedAdmission.maskedPoints?.values()??[]:[])].map(n=>[n.id,n.p]));
   const prior=sharedAdmission;
   const valid=sharedRoom&&prior.signature===JSON.stringify([p.width,p.height,localRect(geometry.clip)])&&
    current.length===prior.seats.size&&current.length===definitions.length&&
    current.every(a=>{
     if(!ids.has(a.id)||!prior.seats.has(a.id))return false;
     const lead=a.id===prior.lead;
     if(!lead&&(a.route||a.node!==prior.seats.get(a.id)))return false;
     if(lead&&!sharedGates.some(n=>n.id===a.node))return false;
     if(a.route){
      const destination=sharedGates.find(n=>n.id===a.route.target);
      if(!destination||a.state!=='fly'||a.route.target===a.node||
         model.reservations.get(destination.id)!==a.id||!samePoint(a.route.from,allowed.get(a.node))||
         !samePoint(a.route.to,destination.p)||!routeFits(a)||
         !trailRuntime.recoveryFits(a,destination,model.actors))return false;
     }else if(!samePoint(a.p,allowed.get(a.node)))return false;
     const b=bindings.get(a.id);
     if(!b||!pointFits(a,a.p,a.height))return false;
     // nativeTrailHits projects normalized actor altitude into pixels.
     plan.set(a.id,{id:a.node,p:a.p});lifts.set(a.id,a.height);
     return true;
    });
   if(!valid||!nativeTrailHits(plan,{requireNative:true,lifts})){
    roomOwner.dataset.gardenSharedStatus='retained-invalid';
    // Never silently seed another pack or certify a different placement.
    // Existing actors/reservations are untouched by failed revalidation.
    return false;
   }
   reboundShared=true;
  }
  if(trailRuntime&&roster.some(d=>!fixedFlight.has(d.id))){
   const peers=new Map([...model.actors].filter(([id])=>ids.has(id))),byId=new Map(roster.map(d=>[d.id,d]));
   const retained=new Map([...peers].map(([id,a])=>[id,{id:a.node,p:a.p}]));
   // A first paint has no actors to retain; use measured search to solve the
   // full pack together. A later arrival still preserves the existing roster
   // and route reservations, rather than moving unrelated birds.
   const input={actors:roster,seats:[...footholds,...trailPads],retained,preferred:nativePreferred,accept:nativeTrailHits,maxTries:3500,canPlace(d,n,partial){
    const placed=new Map(peers);
    for(const [id,s] of partial)if(!placed.has(id))placed.set(id,{...byId.get(id),p:s.p,route:null});
    return trailRuntime.canPlace(d,n,placed);
   }};
   if(peers.size){
    planned=assignTrailSeats(input);
   }else if(masked&&sharedRoom){
    const lead=roster.find(d=>d.initialFlight&&d.movable);
    const preferred=new Map(),parking=[],known=new Set();
    const add=point=>{
     const k=point.join(':');if(known.has(k)||!safePoint(point,actorWidth,actorWidth*1000/850))return;
     known.add(k);parking.push({id:'masked-park:'+k,p:point});
    };
    // Survey the upper dry ledge and lower bank independently. Nearby
    // shifts on one row compete for the same bird-sized space and can exhaust
    // the pack search before it considers a complete ten-bird arrangement.
    // These are hypotheses only; exact route, footprint and hit tests follow.
    for(const x of [170,215.2,260.4,305.6,350.8]){
     for(const y of [58,65,72,79])add(sharedAt([x,y]));
    }
    for(const x of [145,194,243,292,341]){
     for(const y of [124,132])add(sharedAt([x,y]));
    }
    // Filter each peer using the one exact planned native flight before
    // packing. Otherwise five near-identical shelves can all impinge on
    // the same wing sweep and spend all complete native probe slots.
    if(!lead)return abandonShared('seat');
    const gateProbe=createGardenActors(key,elapsed);
    gateProbe.reconcile([{...lead,canFly:true}],[sharedGates[0]]);
    const gateRuntime=createGardenTrailRuntime(stage.dataset.gardenId,gateProbe,terrain);
    gateRuntime.sync({generation:key,measurement});
    const [source,target]=sharedGates;
    const predicted=gateProbe.previewPath(lead.id,target,[source.p,target.p],'fly',{width:p.width,planeHeight:p.height,height:terrain.height});
    if(!predicted||!routeFits(predicted)||!gateRuntime.recoveryFits(predicted,target,new Map()))return abandonShared('route');
    const clearance=new Map();
    const canKeepRunway=(a,n)=>{
     if(a===lead)return true;
     const k=JSON.stringify([a.id,n.id]);
     if(!clearance.has(k)){
      const peer={...a,p:n.p,route:null};
      clearance.set(k,gateRuntime.recoveryFits(predicted,target,new Map([[a.id,peer]])));
     }
     return clearance.get(k);
    };
    const trialFor=plan=>{
     const probe=createGardenActors(key,elapsed);
     const probeRoster=roster.map(d=>d===lead?{...d,canFly:true}:d);
     probe.reconcile(probeRoster,[...plan.values()],(a,n)=>plan.get(a.id)===n);
     if(probe.actors.size!==roster.length)return false;
     const trial=createGardenTrailRuntime(stage.dataset.gardenId,probe,terrain);
     trial.sync({generation:key,measurement});
     return !!trial.sharedPaneFlight(sharedGates,{paintable:routeFits});
    };
    let swarmCanFly=false,completeMaskedTrials=0;
    const acceptMaskedPlan=plan=>{
     if(completeMaskedTrials>=5)return false;
     completeMaskedTrials++;
     if(!trialFor(plan))return false;
     swarmCanFly=true;
     return nativeTrailHits(plan,{requireNative:true});
    };
    // Pack broad visitor art into separated lower-bank contacts before trying
    // nearby individual alternatives. The lead and empty landing are not moved.
    // Keep the original full standing, sweep and DOM hit checks on each plan.
    const widthOf=d=>{
     const q=measurement?.footprints.get(d.id);
     return q?q.right-q.left:Infinity;
    };
    const peersInOrder=roster.filter(d=>d!==lead)
      .sort((a,b)=>widthOf(a)-widthOf(b)||a.id.localeCompare(b.id));
    for(const [upper,lower] of [[53.5,125],[55.5,128],[53.5,129],[53,130]]){
     const contacts=[...[170,215.2,260.4,305.6,350.8].map(x=>[x,upper]),
      ...[170,224,278,332].map(x=>[x,lower])].map(point=>{
      const q=sharedAt(point);return {id:'masked-park:'+q.join(':'),p:q};
     });
     for(const peers of [peersInOrder,[...peersInOrder.slice(0,7),peersInOrder[8],peersInOrder[7]]]){
      const plan=new Map([[lead.id,source],...peers.map((actor,index)=>[actor.id,contacts[index]])]);
      if(roster.every(d=>canKeepRunway(d,plan.get(d.id))&&input.canPlace(d,plan.get(d.id),plan))&&acceptMaskedPlan(plan)){
       planned=plan;break;
      }
     }
     if(planned)break;
    }
    if(!planned)planned=planMaskedPaneSeats({actors:roster,lead,gate:sharedGates[0],parking,preferred,
     canPlace:(a,n,peers)=>canKeepRunway(a,n)&&input.canPlace(a,n,peers),standingPairFits:trailRuntime.standingPairFits,
     standingClass:a=>measurement?.footprints.get(a.id),admit:acceptMaskedPlan});
    if(!planned)return abandonShared(swarmCanFly?'hit':'seat');
    addTrailContacts(planned);
    coldSharedAdmission={owner:roomOwner,lead:lead.id,seats:new Map([...planned].map(([id,n])=>[id,n.id])),
     maskedPoints:new Map(planned),signature:JSON.stringify([p.width,p.height,localRect(geometry.clip)])};
   }else if(sharedRoom){
    const lead=roster.find(d=>d.initialFlight&&d.movable)??roster.find(d=>d.movable);
    const plan=new Map([[lead?.id,sharedGates[0]]]);
    let parking=0;
    for(const d of roster)if(d!==lead)plan.set(d.id,sharedParking[parking++]);
    if(!lead||!roster.every(d=>input.canPlace(d,plan.get(d.id),plan)))return abandonShared('seat');
    if(!nativeTrailHits(plan,{requireNative:true}))return abandonShared('hit');
    const probe=createGardenActors(key,elapsed);
    const probeRoster=roster.map(d=>d===lead?{...d,canFly:true}:d);
    probe.reconcile(probeRoster,[...plan.values()],(a,n)=>plan.get(a.id)===n);
    const trial=createGardenTrailRuntime(stage.dataset.gardenId,probe,terrain);
    trial.sync({generation:key,measurement});
    if(probe.actors.size!==roster.length||!trial.sharedPaneFlight(sharedGates,{paintable:routeFits}))
     return abandonShared('route');
    coldSharedAdmission={owner:roomOwner,lead:lead.id,seats:new Map([...plan].map(([id,n])=>[id,n.id])),
     signature:JSON.stringify([p.width,p.height,localRect(geometry.clip)])};
    planned=plan;
   }else{
    const measured={...input,standingPairFits:trailRuntime.standingPairFits,standingClass:a=>measurement?.footprints.get(a.id)};
    if(roster.length>=7&&measurement){
     planned=findResponsiveBands(measured);
     if(!planned)planned=pitchTrailStandingSeats({...measured,...measurement,knownSeats:input.seats,surface:terrain.surface,baseWidth:actorWidth,baseHeight:actorWidth*1000/850,
      safePoint:q=>safePoint(q,actorWidth,actorWidth*1000/850)});
     if(!planned&&roster.length===10&&(terrain.number===8||terrain.number===10))
      planned=contourTrailStandingSeats({...measured,...measurement,knownSeats:input.seats,surface:terrain.surface,
       safePoint:q=>safePoint(q,actorWidth,actorWidth*1000/850)});
     if(planned)addTrailContacts(planned);
    }
    if(!planned&&pairedVariant&&!model.actors.size){
     const gates=input.seats.filter(n=>n.id==='A'||n.id==='B');
     if(roster.length===2&&roster.every(d=>d.movable)&&gates.length===2&&new Set(gates.map(n=>n.id)).size===2)
      planned=assignTrailSeats({...input,seats:gates,accept(plan){
       return roster.every(d=>plan.has(d.id)&&input.canPlace(d,plan.get(d.id),plan))&&nativeTrailHits(plan,{requireNative:true});
      }});
     if(!planned)return retryCanonical();
    }
    if(!planned)planned=packTrailStandingSeats(measured);
    if(planned&&terrain.number===34&&roster.length===10&&!wideCrop&&!predator&&!settle){
     // A scratch model exercises the same pocket scheduler and route as a
     // live actor. There is no live seat, route, or reservation during this
     // optional first-placement preference.
     const findPocket=(seats,onlyId)=>{
      const probe=createGardenActors(key,elapsed);
      probe.reconcile(onlyId?roster.map(d=>d.id===onlyId?d:{...d,movable:false}):roster,
       [...seats.values()],(a,n)=>seats.get(a.id)===n);
      if(probe.actors.size!==10)return false;
      const run=createGardenTrailRuntime(stage.dataset.gardenId,probe,terrain);
      run.sync({generation:key,measurement});
      return !!run.localHop([],{minDistance:7.99,maxDistance:36.01,pocket:true,paintable:routeFits});
     };
     planned=preferColdPocketPlan(planned,roster,[...footholds,...trailPads],{
      canPlace:input.canPlace,hasPocket:findPocket,nativeHits:s=>nativeTrailHits(s,{requireNative:true}),
     });
    }
   }
   if(!planned)return reject('trail-blocked-placement');
  }
  model.reconcile(roster,trailRuntime?[...footholds,...trailPads]:footholds,(d,n,actors)=>{
   const b=bindings.get(d.id);
   if(trailRuntime&&!fixedFlight.has(d.id)&&planned?.get(d.id)!==n)return false;
   return [...actors.values()].every(other=>!other.route||routeSamples(other).every(f=>separated(n.p,[f.p[0],f.p[1]-f.height],b.width,b.height)));
  });
  if(trailRuntime&&model.actors.size!==roster.length)return reject('trail-blocked-placement');
  const trailStandingReflow=({requireNative=false}={})=>{
   // First placement was already accepted against this generation's measured
   // footprints; never run the Type I nominal-pixel reflow over that result.
   if(!requireNative&&planned&&fixedFlight.size===0)return true;
   const actors=[...model.actors.values()],preferred=new Map(actors.map(a=>[a.id,{id:a.node,p:a.p}]));
   const candidate=new Map(roster.map(d=>[d.id,d]));
   const input={actors,seats:layoutNodes,preferred,accept:plan=>nativeTrailHits(plan,{requireNative}),canPlace(a,n,partial){
    if(requireNative&&!safePoint(n.p,actorWidth,actorWidth*1000/850))return false;
    const occupied=new Map([...partial].map(([id,s])=>[id,{...candidate.get(id),p:s.p,route:null}]));
    return trailRuntime.canPlace(a,n,occupied);
   }};
   if(!requireNative&&denseResponsive&&new Set([...preferred.values()].map(n=>n.id)).size===actors.length&&
    actors.every(a=>{const n=preferred.get(a.id);return safePoint(n.p,actorWidth,actorWidth*1000/850)&&input.canPlace(a,n,preferred);})&&
    nativeTrailHits(preferred))return true;
   const responsive=denseResponsive?findResponsiveBands({...input,standingPairFits:trailRuntime.standingPairFits}):null;
   const plan=responsive||packTrailStandingSeats(input);
   if(!plan||!model.placeStanding(plan))return false;
   if(responsive)addTrailContacts(plan);
   return true;
  };
  const reflowed=reboundShared||!resized||(trailRuntime?(hadTrail?[...model.actors.values()].every(routeFits):trailStandingReflow()):model.reflow(layoutNodes,(a,n)=>{
   const b=bindings.get(a.id);
   if(!safePoint(n.p,b.width,b.height))return false;
   // A paused flight remains a real occupied corridor. Responsive reflow may
   // not assign a stationary bird under it, even while a dialog has focus.
   return [...model.actors.values()].every(other=>other.id===a.id||!other.route||!routeFits(other)||
    routeSamples(other).every(f=>
     separated(n.p,[f.p[0],f.p[1]-f.height],b.width,b.height)));
  },routeFits));
  const environment={safe:safeRoute,height:terrain.height,width:p.width};
  const heldIdleFits=a=>{
   const held=axisIdleHold;
   if(!held||held.signature!==signature||held.stage!==stage||held.world!==key||a.route||
      a.phase!=='ground'||a.height!==0||!wideCrop||predator||settle)return false;
   const seat=held.seats.get(a.id);
   return !!seat&&seat.node===bindings.get(a.id)?.node&&seat.site===a.node&&seat.p===a.p;
  };
  const fitsNow=()=>model.actors.size===roster.length&&[...model.actors.values()].every(a=>
   heldIdleFits(a)||pointFits(a,a.p,a.height));
  // Do not preserve a partially applicable flight generation. The selected
  // footholds are already pairwise-separated. In this fallback standing
  // positions cannot depend on old airborne reservations.
  const stand=()=>{
   const used=new Set(),plan=new Map();
   for(const a of model.actors.values()){
    const remaining=footholds.filter(n=>!used.has(n.id));
    const n=remaining.find(n=>n.id===a.node)||remaining.sort((x,y)=>Math.hypot(x.p[0]-a.p[0],x.p[1]-a.p[1])-Math.hypot(y.p[0]-a.p[0],y.p[1]-a.p[1]))[0];
    if(!n)return false;
    used.add(n.id);plan.set(a.id,n);
   }
   if(!model.placeStanding(plan))return false;
   model.reconcile(roster,footholds);
   return fitsNow();
  };
  // Newly present individuals are authoritative. If they obstruct an ongoing
  // corridor, acquire an alternative landing before releasing its old target.
  let routesFit=reflowed;
  if(!trailRuntime&&reflowed)for(const a of model.actors.values())if(a.route&&(resized||populationChanged)){
   const destination=footholds.find(n=>n.id===a.route.target);
   if(!destination||!safeRoute(a,destination,a.state,model.actors)){
    const alternatives=[...footholds].sort((x,y)=>(x.id===a.node?-1:y.id===a.node?1:Math.hypot(x.p[0]-a.p[0],x.p[1]-a.p[1])-Math.hypot(y.p[0]-a.p[0],y.p[1]-a.p[1])));
    if(!alternatives.some(n=>model.reroute(a,n,environment)))routesFit=false;
   }
  }
  if(trailRuntime){
   const pairedFlight=roster.length===2&&!!bay&&(pairedVariant||[12,28].includes(terrain.number));
   const state=trailRuntime.sync({generation:key,measurement,predator:predator||settle,...(pairedFlight?{paintable:routeFits}:{})});
   const recoveryIds=new Set(state.disposition.map(x=>x.id));
   if(settle||hadTrail&&resized&&!routesFit)for(const a of model.actors.values())if(a.route&&(settle||!routeFits(a)))recoveryIds.add(a.id);
   const tryTrail7AxisContinuation=()=>{
    if(terrain.number!==7||roster.length!==8||populationChanged||!resized||paintedWideCrop!==false||
       !wideCrop||predator||settle||state.active||recoveryIds.size!==1)return false;
    const actors=[...model.actors.values()],moving=actors.filter(a=>a.route),mover=moving[0];
    if(moving.length!==1||!recoveryIds.has(mover.id)||routeFits(mover))return false;
    const actorSafe=a=>{
     const b=bindings.get(a.id);
     return !!b&&safePoint(a.p,b.width,b.height,a.height*p.height,a.state==='fly');
    };
    const centerOutside=a=>{
     const b=bindings.get(a.id);if(!b)return false;
     const r=body(a.p,b.width,b.height,a.height*p.height),c=geometry.clip,x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
     return Number.isFinite(x+y)&&(x<c.left||x>=c.right||y<c.top||y>=c.bottom);
    };
    if(centerOutside(mover))return false;
    const members=actors.filter(a=>a!==mover&&!actorSafe(a)),bad=[],heldIds=new Set();
    for(const a of members){
     const b=bindings.get(a.id);if(!b||!inside(a.p,terrain.surface))return false;
     const r=body(a.p,b.width,b.height),c=geometry.clip;
     const policy=trail7IdleDisposition({
      ground:!a.route&&a.phase==='ground'&&a.height===0,nominal:false,centerOutside:centerOutside(a),
      controlContained:b.width>=43.99&&b.height>=43.99&&r.left>=c.left&&r.right<=c.right&&r.top>=c.top&&r.bottom<=c.bottom,
      nativeHit:true, // provisional; accept() requires an actual current native hit
     });
     if(policy==='deny')return false;
     if(policy==='rehome')bad.push(a);
     else heldIds.add(a.id);
    }
    if(!bad.length)return false;
    const affected=new Set(bad.map(a=>a.id)),seats=layoutNodes.filter(n=>n.id!=='bay'&&!model.reservations.has(n.id));
    const landings=seats.filter(n=>!actors.some(a=>a.node===n.id)).sort((a,b)=>
     Math.hypot(a.p[0]-mover.p[0],a.p[1]-mover.p[1])-Math.hypot(b.p[0]-mover.p[0],b.p[1]-mover.p[1]));
    for(const n of landings.slice(0,12)){
     const pending=model.previewAxisRecovery(mover,n);
     if(!pending||!routeFits(pending)||!trailRuntime.recoveryFits(pending,n,new Map()))continue;
     const retained=new Map(actors.filter(a=>!affected.has(a.id)).map(a=>[a.id,{id:a.node,p:a.p}]));
     const peers=partial=>new Map([...partial].map(([id,s])=>{
      const a=model.actors.get(id);
      return [id,id===mover.id?pending:affected.has(id)?{...a,p:s.p,node:s.id}:a];
     }));
     const plan=assignTrailSeats({actors,seats:seats.filter(s=>s.id!==n.id),retained,maxTries:320,maxProbes:3,
      canPlace(a,s,partial){
       const b=bindings.get(a.id);
       return !!b&&safePoint(s.p,b.width,b.height)&&trailRuntime.canPlace(a,s,peers(partial));
      },
      accept(candidate){
       return trailRuntime.recoveryFits(pending,n,peers(candidate))&&
        nativeTrailHits(candidate,{requireNative:true,lifts:new Map([[mover.id,mover.height]]),heldIds});
      }});
     if(!plan)continue;
     const changed=new Map([...plan].filter(([id])=>affected.has(id)));
     if(model.commitAxisRecovery(mover.id,n,changed,projected=>{
      const replacement=projected.get(mover.id);
      return [...projected.values()].every(a=>heldIds.has(a.id)||actorSafe(a))&&routeFits(replacement)&&trailRuntime.recoveryFits(replacement,n,projected);
     })){
      axisIdleHold={signature,stage,world:key,seats:new Map([...heldIds].map(id=>{
       const a=model.actors.get(id);return [id,{node:bindings.get(id).node,site:a.node,p:a.p}];
      }))};
      return true;
     }
    }
    return false;
   };
   if(recoveryIds.size&&tryTrail7AxisContinuation()){
    routesFit=true;standingOnly=false;nextTrail=Math.max(nextTrail,elapsed+1600);
   }else if(recoveryIds.size){
    const blocked=trailRuntime.recover([...recoveryIds],{reduced:settle});
    routesFit=[...model.actors.values()].every(routeFits);
    if(blocked.length||!routesFit||!fitsNow()){
     const fallback=clippedDenseCoverRecovery({
      changedAxis:denseResponsive&&resized&&paintedWideCrop!==null&&paintedWideCrop!==wideCrop&&!predator,
      actors:[...model.actors.values()],routeFits,
      currentFits(a){const b=bindings.get(a.id);return !!b&&safePoint(a.p,b.width,b.height,a.height*p.height,a.state==='fly');},
      replace:()=>trailStandingReflow({requireNative:true}),
     });
     const trail7Fallback=!fallback&&clippedTrail7CoverRecovery({
      gardenNumber:terrain.number,
      changedAxis:resized&&paintedWideCrop===false&&wideCrop&&!predator&&!settle&&!populationChanged,
      actors:[...model.actors.values()],routeFits,
      currentCenterVisible(a){
       const b=bindings.get(a.id),c=geometry.clip;
       if(!b)return true; // Unknown hit geometry is not proof that a bird disappeared.
       const r=body(a.p,b.width,b.height,a.height*p.height);
       const x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
       if(!Number.isFinite(x+y))return true;
       return x>=c.left&&x<c.right&&y>=c.top&&y<c.bottom;
      },
      replace:()=>trailStandingReflow({requireNative:true}),
     });
     if(!fallback&&!trail7Fallback){stage.dataset.actorMotion='trail-needs-recovery';return false;}
     routesFit=true;
     if(wideCrop)standingOnly=true;
     nextTrail=Math.min(nextTrail,elapsed+1600);
    }
   }else if(!reflowed||!fitsNow())return reject('trail-blocked-geometry');
   // A measured successful dense fit may animate actual safe short contacts.
   // The Type① heuristic "standing only" flag is not evidence here.
   if(standingOnly&&geometry.clip.bottom-geometry.clip.top>geometry.clip.right-geometry.clip.left&&
      trailRuntime.standingFits())standingOnly=false;
  }
  // Geometry invalidation must be resolved before advancing, never fly to an
  // invisible node after rotation. Keep positions if they are still legal.
  const recovered=!trailRuntime&&((standingOnly&&resized)||!routesFit||!fitsNow());
  if(recovered&&!stand())return reject('geometry-blocked');
  if(settle&&!geometryOnly&&!trailRuntime)model.settle();
  if(!geometryOnly){
   if(active&&!recovered&&!standingOnly){
    if(trailRuntime){
     model.advance(elapsed,layoutNodes,{...environment,safe:()=>false});
     const pairedFlight=roster.length===2&&!!bay&&(pairedVariant||[12,28].includes(terrain.number));
     const lane=trailRuntime.sync({generation:key,measurement,predator,...(pairedFlight?{paintable:routeFits}:{})}).active;
     const authoredShared=sharedRoom&&[...model.actors.values()].some(a=>sharedGates.some(g=>g.id===a.node));
     if(authoredShared){
      // Keep the measured source and peer pack intact while the decoder
      // warms, while a real route runs, or if the current geometry denies
      // a flight. A broad ground hop could permanently drain the source.
      if(elapsed>=nextTrail){
       const started=!lane&&trailRuntime.sharedPaneFlight(sharedGates,{paintable:routeFits});
       trailRetry=false;nextTrail=elapsed+(started?9000:240);
      }
     }else if(pairedFlight&&lane?.phase==='ready'&&elapsed<nextTrail){
      // A real grounded partner has freed the exit. Use the same rechecked
      // ticket; do not wait for a new request or downgrade it to walking.
      const admitted=trailRuntime.run();
      if(admitted){trailRetry=false;nextTrail=elapsed+9000;}
     }else if(elapsed>=nextTrail){
      let started=roster.length===1?trailRuntime.singletonInterior({paintable:routeFits,resumeOnly:true}):null;
      if(!started&&terrain.number===8&&roster.length===1)started=trailRuntime.singletonFlight(layoutNodes,{paintable:routeFits,keepVisitorSeat:true});
      let requestOrder=model.actors.values();
      if(!started&&!lane&&pairedFlight){
       const pair=[...model.actors.values()];
       if(pair.length===2&&new Set(pair.map(a=>a.node)).size===2&&pair.every(a=>
         (a.node==='A'||a.node==='B')&&a.movable&&!a.route&&a.phase==='ground'&&a.height===0)){
        const ready=pair.filter(a=>a.canFly&&model.time>=a.cooldown);
        if(ready.length)requestOrder=ready;
        else if(pair.some(a=>!a.canFly&&bindings.get(a.id)?.flight&&model.time<a.initialFlightDeadline))
         requestOrder=[];
       }
      }
      if(!started)for(const a of requestOrder)if(!a.route&&a.movable&&(a.node==='A'||a.node==='B')){
       if(a.initialFlight&&!a.canFly&&model.time<a.initialFlightDeadline)continue;
       const pairedBay=pairedFlight&&[...model.actors.values()].some(b=>b.id!==a.id&&b.node===(a.node==='A'?'B':'A')&&!b.route);
       if(pairedBay&&a.canFly&&model.time>=a.cooldown)trailRuntime.request(a.id,'fly');
       else if(!pairedBay||!a.canFly){
        if(a.canFly&&(!trailRetry||roster.length===1))trailRuntime.request(a.id,'fly');else trailRuntime.request(a.id,'walk');
       }
       break;
      }
      if(!started)started=trailRuntime.run(terrain.number===10&&roster.length===1?{paintable:routeFits}:undefined);
      if(!started&&roster.length===1)started=trailRuntime.singletonFlight(layoutNodes,{paintable:routeFits});
      if(!started&&roster.length===1)started=trailRuntime.singletonInterior({paintable:routeFits});
      // A lone actor seated off the authored terminal (e.g. the dock blocks
      // it after reflow) can still take a measured short hop. Prefer an
      // eligible terminal so future flights use the normal lane admission.
      if(!started&&roster.length===1)started=trailRuntime.localHop(layoutNodes,{singletonIngress:true});
      if(!started&&(roster.length>=7||(!bay&&roster.length>1)))started=trailRuntime.localHop(layoutNodes);
      if(!started&&terrain.number===34&&roster.length===10)started=trailRuntime.localHop([],
       {minDistance:7.99,maxDistance:36.01,pocket:true,paintable:routeFits});
      trailRetry=!started&&!trailRetry;nextTrail=elapsed+(started&&!started.ingress&&started.action!=='wait'?9000:1600);
     }
    }else model.advance(elapsed,footholds,environment);
   }else model.clearReactions();
  }
  if(!fitsNow()){
   if(trailRuntime||!stand())return reject('geometry-blocked');
  }
  for(const [id,a]of model.actors){
   const b=bindings.get(id),lift=a.height*p.height;
   // CSS's native negative controls-rise margin has already been replaced
   // by measured safe feet. Otherwise painted y = predicted y + native margin.
   b.node.style.marginBlockStart='0px';
   b.node.style.width=b.width+'px';b.node.style.height=b.height+'px';
   b.node.style.left=a.p[0]*100+'%';b.node.style.top=a.p[1]*100+'%';
   b.node.style.transform=`translate(-54%,-97.5%) translateY(${-lift}px)`;b.node.style.zIndex=String(Math.round(a.p[1]*1000));
   b.node.dataset.actorState=a.state;b.node.dataset.actorPhase=a.phase;b.node.dataset.actorNode=a.node;
   if(trailRuntime){if(a.route)b.node.dataset.actorLanding=a.route.target;else b.node.removeAttribute('data-actor-landing');}
   b.shadow.style.left=a.p[0]*100+'%';b.shadow.style.top=a.p[1]*100+'%';
   b.shadow.style.width=b.width*.54+'px';b.shadow.style.height=b.height*.07+'px';
   b.shadow.style.transform=`translate(-50%,-50%) scale(${Math.max(.65,1-lift/400)})`;b.shadow.style.opacity=String(Math.max(.25,1-lift/150));
   if(b.sprite){
    overrides.set(b.sprite,{pose:poseFor(a)});
    const t=a.route?Math.max(0,Math.min(1,(model.time-a.since)/a.route.duration)):0;
    const flying=a.state==='fly',tilt=flying?(t<.12?-10*Math.sin(t/.12*Math.PI):t>.7?10*Math.sin((t-.7)/.3*Math.PI):-7):0;
    const crouch=flying&&t<.12?3*Math.sin(t/.12*Math.PI):0;
    b.sprite.style.transformOrigin='54% 97.5%';b.sprite.style.transform=`translateY(${crouch}px) rotate(${tilt}deg)`;
   }
   b.flight?.paint(a,model.time);
   if(b.label){b.label.style.visibility=a.state==='fly'?'hidden':'';b.label.style.maxWidth=b.width+'px';}
  }
  // Commit only a safe painted native layout, not merely a forecast.
  if(coldSharedAdmission)sharedAdmission=coldSharedAdmission;
  if((coldSharedAdmission||reboundShared)&&sharedAdmission){
   sharedAdmission.owner=roomOwner;
   roomOwner.dataset.gardenSharedStatus='admitted';
   // Both admitted proof panes own an exact stage. #34's controller
   // consumes this lease only for clean same-markup redraws.
   if(sharedAdmission.stage&&sharedAdmission.stage!==stage)sharedStageLeases.delete(sharedAdmission.stage);
   sharedAdmission.stage=stage;
   sharedStageLeases.add(stage);
  }
  geometryKey=signature;rosterKey=nextRosterKey;paintedWideCrop=wideCrop;
  stage.dataset.actorMotion=trailRuntime?(standingOnly?'trail-standing':active?'trail-active':'trail-held'):active?'active':'held';
  return active&&!standingOnly; // one existing RAF drives every actor; no per-bird scheduler.
 }};
}
