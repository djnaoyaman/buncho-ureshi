import {actorTerrainFor} from './data/garden-actor-terrain.js';
import {inside} from './garden-terrain-plan.js';
import {createGardenActors} from './garden-actor-state.js';
import {trailTerrainFor} from './data/garden-trail-terrain.js';
import {createGardenTrailRuntime} from './garden-trail-runtime.js';
import {assignTrailSeats,measuredNativeFoot,packTrailStandingSeats} from './garden-trail-clearance.js';
import {createActorFlight} from './garden-actor-flight.js';

export function actorTerrainForStage(stage){
 const existing=actorTerrainFor(stage?.dataset.gardenId);
 if(existing)return existing;
 if(stage?.dataset.gardenTrailPreview!=='true')return null;
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
export function createGardenActorMotion(root){
 let trailRuntime=null,nextTrail=0,trailRetry=false,trailMeasurement=null,trailPads=[];
 const bindings=new Map(),routeCache=new WeakMap();let model=null,key='',geometryKey='',rosterKey='',footholds=[],layoutWidth=64,standingOnly=false,geometry=null,terrain=null,overlayStyle=null,rejected=null;
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
 const dispose=()=>{if(overlayStyle){const [node,value]=overlayStyle;value?node.style.setProperty('--game-viewport-height',value):node.style.removeProperty('--game-viewport-height');overlayStyle=null;}for(const b of bindings.values())restore(b);bindings.clear();model?.clear();model=null;trailRuntime=null;nextTrail=0;trailRetry=false;trailMeasurement=null;trailPads=[];key='';geometryKey='';rosterKey='';rejected=null;};
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
  if(key!==nextKey){dispose();key=nextKey;model=createGardenActors(key,elapsed);if(terrain.trail)trailRuntime=createGardenTrailRuntime(stage.dataset.gardenId,model);}
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
  const signature=JSON.stringify([definitions.length,p.width,p.height,p.left,p.top,geometry.clip,geometry.obstacles.map(o=>[o.left,o.top,o.right,o.bottom]),trailRuntime?root.ownerDocument.fonts?.status:null]);
  const resized=signature!==geometryKey;
  // Native buttons retain their identity, events and focus. On a genuine
  // unsupported footprint remove the *whole* old presentation, not just its
  // diagnostics, and only try again when the measured inputs/stage change.
  const reject=reason=>{
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
   for(const [column,row]of order){const x=terrain.columns[column],y=rows[row],point=[x,y];if(safePoint(point,width,height))footholds.push({id:x+':'+y,p:point});}
   if(trailRuntime)footholds=[...trailRuntime.nodes.filter(n=>n.id!=='bay'&&safePoint(n.p,width,height)),...footholds];
   // Select alternating depth positions, retaining space for a second row.
   footholds=selectFootholds(footholds,definitions.length,(a,b)=>separated(a.p,b.p,width,height));layoutWidth=width;
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
  if(footholds.length+(trailRuntime?trailPads.length:0)<definitions.length)return reject('insufficient-space');
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
  if(trailRuntime&&(resized||populationChanged||changedBindings||!trailMeasurement))trailMeasurement=measureTrail();
  const measurement=trailRuntime?trailMeasurement:null;
  if(trailRuntime){
   // Apply the authoritative removals even when no seat can be allocated to
   // a different newcomer. An orphaned reservation cannot block future fit.
   model.reconcile(roster.filter(d=>fixedFlight.has(d.id)),[]);
   trailRuntime.sync({generation:key,measurement,predator});
  }
  const nativeTrailHits=plan=>{
   // Only probe the interactive stage. Dialogs and device/user holds own
   // pointer input until they close, not the resting bird arrangement.
   if(!active||typeof root.ownerDocument.elementFromPoint!=='function')return true;
   const saved=new Map();
   try{
    for(const [id,n]of plan){
     const b=bindings.get(id);if(!b)return false;
     saved.set(b.node,b.node.getAttribute('style'));
     Object.assign(b.node.style,{width:b.width+'px',height:b.height+'px',
      left:n.p[0]*100+'%',top:n.p[1]*100+'%',marginBlockStart:'0px',
      transform:'translate(-54%,-97.5%)',zIndex:String(Math.round(n.p[1]*1000)),transition:'none'});
    }
    for(const [id]of plan){
     const {node}=bindings.get(id),r=rect(node);
     const hit=root.ownerDocument.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
     if(r.width<43.99||r.height<43.99||!hit||!node.contains(hit))return false;
    }
    return true;
   }finally{
    for(const [node,style]of saved)style===null?node.removeAttribute('style'):node.setAttribute('style',style);
   }
  };
  let planned=null;
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
   planned=peers.size?assignTrailSeats(input):packTrailStandingSeats(input);
   if(!planned)return reject('trail-blocked-placement');
  }
  model.reconcile(roster,trailRuntime?[...footholds,...trailPads]:footholds,(d,n,actors)=>{
   const b=bindings.get(d.id);
   if(trailRuntime&&!fixedFlight.has(d.id)&&planned?.get(d.id)!==n)return false;
   return [...actors.values()].every(other=>!other.route||routeSamples(other).every(f=>separated(n.p,[f.p[0],f.p[1]-f.height],b.width,b.height)));
  });
  if(trailRuntime&&model.actors.size!==roster.length)return reject('trail-blocked-placement');
  const routeFits=a=>!a.route||routeSamples(a).every(f=>safePoint(f.p,bindings.get(a.id).width,bindings.get(a.id).height,f.height*p.height,a.state==='fly'));
  const trailStandingReflow=()=>{
   // First placement was already accepted against this generation's measured
   // footprints; never run the Type I nominal-pixel reflow over that result.
   if(planned&&fixedFlight.size===0)return true;
   const actors=[...model.actors.values()],preferred=new Map(actors.map(a=>[a.id,{id:a.node,p:a.p}]));
   const candidate=new Map(roster.map(d=>[d.id,d]));
   const plan=packTrailStandingSeats({actors,seats:layoutNodes,preferred,accept:nativeTrailHits,canPlace(a,n,partial){
    const occupied=new Map([...partial].map(([id,s])=>[id,{...candidate.get(id),p:s.p,route:null}]));
    return trailRuntime.canPlace(a,n,occupied);
   }});
   return !!plan&&model.placeStanding(plan);
  };
  const reflowed=!resized||(trailRuntime?(hadTrail?[...model.actors.values()].every(routeFits):trailStandingReflow()):model.reflow(layoutNodes,(a,n)=>{
   const b=bindings.get(a.id);
   if(!safePoint(n.p,b.width,b.height))return false;
   // A paused flight remains a real occupied corridor. Responsive reflow may
   // not assign a stationary bird under it, even while a dialog has focus.
   return [...model.actors.values()].every(other=>other.id===a.id||!other.route||!routeFits(other)||
    routeSamples(other).every(f=>
     separated(n.p,[f.p[0],f.p[1]-f.height],b.width,b.height)));
  },routeFits));
  const environment={safe:safeRoute,height:terrain.height,width:p.width};
  const fitsNow=()=>model.actors.size===roster.length&&[...model.actors.values()].every(a=>
   safePoint(a.p,bindings.get(a.id).width,bindings.get(a.id).height,a.height*p.height,a.state==='fly'));
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
   const state=trailRuntime.sync({generation:key,measurement,predator:predator||settle});
   const recoveryIds=new Set(state.disposition.map(x=>x.id));
   if(settle||hadTrail&&resized&&!routesFit)for(const a of model.actors.values())if(a.route&&(settle||!routeFits(a)))recoveryIds.add(a.id);
   if(recoveryIds.size){
    const blocked=trailRuntime.recover([...recoveryIds],{reduced:settle});
    if(blocked.length){stage.dataset.actorMotion='trail-needs-recovery';return false;}
    routesFit=[...model.actors.values()].every(routeFits);
    if(!routesFit||!fitsNow()){stage.dataset.actorMotion='trail-needs-recovery';return false;}
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
     trailRuntime.sync({generation:key,measurement,predator});
     if(elapsed>=nextTrail){
      for(const a of model.actors.values())if(!a.route&&a.movable&&(a.node==='A'||a.node==='B')){
       if(a.initialFlight&&!a.canFly&&model.time<a.initialFlightDeadline)continue;
       if(a.canFly&&(!trailRetry||roster.length===1))trailRuntime.request(a.id,'fly');else trailRuntime.request(a.id,'walk');
       break;
      }
      let started=trailRuntime.run();
      if(!started&&roster.length===1)started=trailRuntime.singletonFlight(layoutNodes,{paintable:routeFits});
      // A lone actor seated off the authored terminal (e.g. the dock blocks
      // it after reflow) can still take a measured short hop. Prefer an
      // eligible terminal so future flights use the normal lane admission.
      if(!started&&roster.length===1)started=trailRuntime.localHop(layoutNodes,{singletonIngress:true});
      if(!started&&(roster.length>=7||(!bay&&roster.length>1)))started=trailRuntime.localHop(layoutNodes);
      trailRetry=!started&&!trailRetry;nextTrail=elapsed+(started?9000:1600);
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
  geometryKey=signature;rosterKey=nextRosterKey;
  stage.dataset.actorMotion=trailRuntime?(standingOnly?'trail-standing':active?'trail-active':'trail-held'):active?'active':'held';
  return active&&!standingOnly; // one existing RAF drives every actor; no per-bird scheduler.
 }};
}
