import {actorTerrainFor} from './data/garden-actor-terrain.js';
import {inside} from './garden-terrain-plan.js';
import {createGardenActors} from './garden-actor-state.js';
import {createActorFlight} from './garden-actor-flight.js';

const selector=':scope > .finch-garden-friend,:scope > .finch-garden-household,:scope > .finch-garden-visitor';
const rect=n=>n.getBoundingClientRect();
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const poseFor=a=>({rest:'rest',look:'tilt',peck:'peck',preen:'preen'})[a.state]||(a.route?.to[0]<a.route?.from[0]?'left':'right');
const reset='display:block;position:absolute;margin:0;padding:0;border:0;box-shadow:none;pointer-events:none;';
/** DOM adapter for the explicitly surveyed open-ground gardens. Owns no game state. */
export function createGardenActorMotion(root){
 const bindings=new Map(),routeCache=new WeakMap();let model=null,key='',geometryKey='',rosterKey='',footholds=[],geometry=null,terrain=null,overlayStyle=null;
 const routeSamples=a=>{
  let samples=routeCache.get(a.route);
  if(!samples){samples=model.sampleRoute(a);routeCache.set(a.route,samples);}
  return samples;
 };
 const restore=b=>{
  b.flight?.node.remove();b.shadow?.remove();
  for(const [node,style]of b.styles)style===null?node.removeAttribute('style'):node.setAttribute('style',style);
  b.pose?.removeAttribute('data-terrain-flight-active');
  for(const attr of ['data-actor-state','data-actor-phase','data-actor-node'])b.node.removeAttribute(attr);
 };
 const dispose=()=>{if(overlayStyle){const [node,value]=overlayStyle;value?node.style.setProperty('--game-viewport-height',value):node.style.removeProperty('--game-viewport-height');overlayStyle=null;}for(const b of bindings.values())restore(b);bindings.clear();model?.clear();model=null;key='';geometryKey='';rosterKey='';};
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
  const styles=new Map([[node,node.getAttribute('style')]]);if(sprite)styles.set(sprite,sprite.getAttribute('style'));if(pose)styles.set(pose,pose.getAttribute('style'));if(label)styles.set(label,label.getAttribute('style'));
  const r=rect(node),b={node,sprite,pose,label,styles,width:r.width,height:r.height,flight:null,shadow:null};
  if(sprite&&node.dataset.gardenActorFlight==='adult')b.flight=createActorFlight(sprite,sprite.dataset.color);
  const shadow=root.ownerDocument.createElement('i');shadow.className='garden-actor-shadow';shadow.setAttribute('aria-hidden','true');
  shadow.style.cssText=reset+'border-radius:50%;background:rgba(40,36,27,.18);z-index:1;';node.parentElement.append(shadow);b.shadow=shadow;
  bindings.set(id,b);return b;
 }
 return {dispose,step(elapsed,active,overrides,{settle=false}={}){
  const stage=root.querySelector('.finch-garden-stage');terrain=actorTerrainFor(stage?.dataset.gardenId);if(!terrain){dispose();return false;}
  if(stage.dataset.sceneState!=='ready')return false;
  const view=root.ownerDocument.defaultView;
  const plane=stage.querySelector('.finch-garden-image-plane'),slide=stage.querySelector('.finch-garden-slide');if(!plane||!slide)return false;
  const world=root.querySelector('.finch-garden')?.dataset.gardenWorld||root.dataset.gardenWorld||'',nextKey=world+':'+stage.dataset.gardenId;
  if(key!==nextKey){dispose();key=nextKey;model=createGardenActors(key,elapsed);}
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
  const nextRosterKey=[...ids].sort().join('|'),populationChanged=nextRosterKey!==rosterKey;rosterKey=nextRosterKey;
  for(const [id,b]of bindings)if(!ids.has(id)||definitions.find(d=>d.id===id)?.node!==b.node){restore(b);bindings.delete(id);}
  for(const d of definitions)if(!bindings.has(d.id))binding(d.node,d.id);
  // A saved-world render creates fresh native CSS dimensions. Reapply the same
  // presentation size even when the image plane geometry did not change.
  const actorWidth=definitions.length>6?44:64;
  for(const b of bindings.values()){b.width=actorWidth;b.height=actorWidth*1000/850;}
  const p=rect(plane),s=rect(slide),r=rect(stage),win=root.ownerDocument.defaultView;
  geometry={plane:p,clip:{left:Math.max(0,s.left,r.left),right:Math.min(win.innerWidth,s.right,r.right),top:Math.max(0,s.top,r.top),bottom:Math.min(win.innerHeight,s.bottom,r.bottom)},
   obstacles:[...root.querySelectorAll('.finch-garden > header,.finch-garden-selector-wrap,.finch-garden-dock,.finch-garden-family,.finch-garden > details > summary')].map(rect)};
  const signature=JSON.stringify([definitions.length,p.width,p.height,p.left,p.top,geometry.clip,geometry.obstacles.map(o=>[o.left,o.top,o.right,o.bottom])]);
  const resized=signature!==geometryKey;
  if(resized){
   geometryKey=signature;
   const width=definitions.length>6?44:64,height=width*1000/850;
   for(const b of bindings.values()){b.width=width;b.height=height;}
   footholds=[];
   // Dense scenes may use intermediate points on the same surveyed surface,
   // retaining the identical physical footprint and obstacle checks.
   const rows=definitions.length>6?terrain.denseRows.flatMap((y,i,all)=>i+1<all.length?[y,(y+all[i+1])/2]:[y]):terrain.rows;
   const order=definitions.length>6?rows.flatMap((_,r)=>[2,0,4,1,3].map(c=>[c,r])):[[2,0],[1,1],[3,1],[1,2],[3,2],[0,0],[4,0],[0,2],[4,2],[2,1],[2,2],[1,0],[3,0],[0,1],[4,1]];
   for(const [column,row]of order){const x=terrain.columns[column],y=rows[row],point=[x,y];if(safePoint(point,width,height))footholds.push({id:x+':'+y,p:point});}
   // Select alternating depth positions, retaining space for a second row.
   const selected=[];
   for(const n of footholds)if(selected.every(q=>separated(n.p,q.p,width,height)))selected.push(n);
   footholds=selected;
  }
  if(footholds.length<definitions.length){stage.dataset.actorMotion='insufficient-space';return false;}
  model.reconcile(definitions.map(d=>({id:d.id,initialFlight:d.node.dataset.gardenActorLead==='true'&&d.node.dataset.gardenActorFlight==='adult',movable:!!bindings.get(d.id).sprite,canFly:!!bindings.get(d.id).flight?.ready})),footholds,(d,n,actors)=>{
   const b=bindings.get(d.id);
   return [...actors.values()].every(other=>!other.route||routeSamples(other).every(f=>separated(n.p,[f.p[0],f.p[1]-f.height],b.width,b.height)));
  });
  if(settle)model.settle();
  const routeFits=a=>!a.route||routeSamples(a).every(f=>safePoint(f.p,bindings.get(a.id).width,bindings.get(a.id).height,f.height*p.height,a.state==='fly'));
  if(resized)model.reflow(footholds,(a,n)=>{
   const b=bindings.get(a.id);
   if(!safePoint(n.p,b.width,b.height))return false;
   // A paused flight remains a real occupied corridor. Responsive reflow may
   // not assign a stationary bird under it, even while a dialog has focus.
   return [...model.actors.values()].every(other=>other.id===a.id||!other.route||!routeFits(other)||
    routeSamples(other).every(f=>
     separated(n.p,[f.p[0],f.p[1]-f.height],b.width,b.height)));
  },routeFits);
  const environment={safe:safeRoute,height:terrain.height,width:p.width};
  // Newly present individuals are authoritative. If they obstruct an ongoing
  // corridor, acquire an alternative landing before releasing its old target.
  for(const a of model.actors.values())if(a.route&&(resized||populationChanged)){
   const destination=footholds.find(n=>n.id===a.route.target);
   if(!destination||!safeRoute(a,destination,a.state,model.actors)){
    const alternatives=[...footholds].sort((x,y)=>(x.id===a.node?-1:y.id===a.node?1:Math.hypot(x.p[0]-a.p[0],x.p[1]-a.p[1])-Math.hypot(y.p[0]-a.p[0],y.p[1]-a.p[1])));
    alternatives.some(n=>model.reroute(a,n,environment));
   }
  }
  // Geometry invalidation must be resolved before advancing, never fly to an
  // invisible node after rotation. Keep positions if they are still legal.
  if([...model.actors.values()].some(a=>!safePoint(a.p,bindings.get(a.id).width,bindings.get(a.id).height,a.height*p.height,a.state==='fly'))){
   stage.dataset.actorMotion='geometry-blocked';return false;
  }
  if(active)model.advance(elapsed,footholds,environment);else model.clearReactions();
  for(const [id,a]of model.actors){
   const b=bindings.get(id),lift=a.height*p.height;
   b.node.style.width=b.width+'px';b.node.style.height=b.height+'px';
   b.node.style.left=a.p[0]*100+'%';b.node.style.top=a.p[1]*100+'%';
   b.node.style.transform=`translate(-54%,-97.5%) translateY(${-lift}px)`;b.node.style.zIndex=String(Math.round(a.p[1]*1000));
   b.node.dataset.actorState=a.state;b.node.dataset.actorPhase=a.phase;b.node.dataset.actorNode=a.node;
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
  stage.dataset.actorMotion=active?'active':'held';
  return active; // one existing RAF drives every actor; no per-bird scheduler.
 }};
}
