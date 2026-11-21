import {inside} from './garden-terrain-plan.js';
import {conflictSweeps,sweptHopSpans} from './garden-actor-path.js';
import {trailTerrainFor} from './data/garden-trail-terrain.js';

const projector=(plane,[x,y])=>[plane.left+x*plane.width,plane.top+y*plane.height];
const overlaps=(a,b)=>conflictSweeps([a],[b]);
function bodyAt(plane,shape,p,lift=0){
 const [x,y]=projector(plane,p);
 return {left:x+shape.left,right:x+shape.right,top:y+shape.top-lift,bottom:y+shape.bottom-lift};
}
const usable=({left,top,right,bottom})=>Number.isFinite(left+top+right+bottom)&&left<right&&top<bottom;
// Strict segment validation for concave dry-ground polygons. Touching a
// boundary is rejected as unsafe against reed/water/roots, even if sampled
// endpoints at an authored bend are both inside.
export function trailSegmentInside(a,b,polygon){
 if(!inside(a,polygon)||!inside(b,polygon))return false;
 const orientation=(u,v,w)=>(v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]);
 const near=(a,b,c,d)=> Math.max(Math.min(a,b),Math.min(c,d))<=Math.min(Math.max(a,b),Math.max(c,d))+1e-12;
 for(let i=0;i<polygon.length;i++){
  const c=polygon[i],d=polygon[(i+1)%polygon.length];
  if(!near(a[0],b[0],c[0],d[0])||!near(a[1],b[1],c[1],d[1]))continue;
  if(orientation(a,b,c)*orientation(a,b,d)<=0&&orientation(c,d,a)*orientation(c,d,b)<=0)return false;
 }
 return true;
}
const within=(a,b)=>a.left>=b.left+2&&a.right<=b.right-2&&a.top>=b.top+2&&a.bottom<=b.bottom-2;

// Input must be supplied by one DOM snapshot: per-actor offsets from ground
// foot to hit/art/label edges, clip and live control/button spans. No nominal
// dimensions, inferred selector widths, or viewport-normalized coordinates.
export function createTrailClearance(id,{plane,clip,controls,footprints,flightFootprints=footprints}){
 const terrain=trailTerrainFor(id);
 if(!terrain||!(plane?.width>0&&plane?.height>0)||!clip||!usable(clip)||!Array.isArray(controls)||!(footprints instanceof Map)||!(flightFootprints instanceof Map))return null;
 const [A,B]=terrain.entryCandidates,path=[A,...terrain.lane,B];
 const at=(a,p,shape=footprints.get(a.id))=>bodyAt(plane,shape,p);
 const spans=(shape,points,lift)=>sweptHopSpans(points,(p,h)=>bodyAt(plane,shape,p,h),lift);
 const canStand=(a,p)=>footprints.has(a.id)&&usable(footprints.get(a.id))&&inside(p,terrain.surface)&&
   within(at(a,p),clip)&&!controls.some(b=>overlaps(at(a,p),b));
 function sweptRoute(actor){
  if(!footprints.has(actor.id)||!usable(footprints.get(actor.id)))return null;
  const r=actor.route;
  if(!r)return [at(actor,actor.p)];
  const shape=actor.state==='fly'?flightFootprints.get(actor.id):footprints.get(actor.id);
  if(!shape||!usable(shape))return null;
  if(r.trailRecovery){
   // Hermite with a zero terminal tangent is exactly a cubic Bezier;
   // its projected body sweep is inside the convex control polygon.
   const control=r.from.map((v,i)=>v+r.velocity[i]*r.duration/3);
   const h=Math.max(0,r.height0,r.height0+r.heightVelocity*r.duration/3);
   if([[r.from,control],[control,r.to],[r.to,r.from]].some(([a,b])=>!trailSegmentInside(a,b,terrain.surface)))return null;
   const boxes=[r.from,control,r.to].map(p=>at(actor,p,shape));
   return [{left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),
    top:Math.min(...boxes.map(b=>b.top))-h*plane.height,bottom:Math.max(...boxes.map(b=>b.bottom))}];
  }
  if(r.reroute)return null; // unknown Hermite overshoot: decline under legacy reroute.
  const points=r.flightPath?.indexed.map(n=>n.p)??r.hops??[r.from,r.to];
  if(points.slice(1).some((p,i)=>!trailSegmentInside(points[i],p,terrain.surface)))return null;
  // Reserve the full swept flying box (not just same-time snapshots) and
  // preserve the foot-level path under it. Peak altitude is conservative.
  return spans(shape,points,r.height*plane.height);
 }
 function safe(candidate,node,kind,actors,{prospectiveYieldId=null}={}){
  if(!canStand(candidate,node.p))return false;
  const s=sweptRoute(candidate);
  if(!s||s.some(b=>!within(b,clip)||controls.some(c=>overlaps(b,c))))return false;
  for(const a of actors.values()){
   if(a.id===candidate.id||a.id===prospectiveYieldId)continue;
   const other=sweptRoute(a);
   if(!other||conflictSweeps(s,other))return false;
  }
  return true;
 }
 function intersectsLane(actor,ownerShape){
  if(!footprints.has(actor.id)||!usable(ownerShape))return true;
  const corridor=sweptHopSpans(path,(p,h)=>bodyAt(plane,ownerShape,p,h),.012*plane.height);
  const actorSweep=sweptRoute(actor);
  return !actorSweep||conflictSweeps(corridor,actorSweep);
 }
 return {canStand,safe,sweptRoute,intersectsLane};
}

// Adopt a painted native candidate only after the same caller that admits a
// new standing seat verifies its dry surface, viewport and controls. It is a
// preference for the measured solver, not registration or proof of a fit.
export function measuredNativeFoot(plane,hit,admits){
 if(!(plane?.width>0&&plane?.height>0&&hit?.width>=43.99&&hit?.height>=43.99))return null;
 const p=[(hit.left+.54*hit.width-plane.left)/plane.width,(hit.top+.975*hit.height-plane.top)/plane.height];
 if(!p.every(Number.isFinite)||!admits(p))return null;
 return p;
}

// Only assign unplaced native IDs. Existing valid seats (including an exact
// authored gate) never move to make room for arrivals. A blocked newcomer can
// keep the old display until the host finds a verified placement.
export function assignTrailSeats({actors,seats,retained,canPlace,accept=()=>true,maxTries=5000,maxProbes=4}){
 const plan=new Map(retained),used=new Set([...retained.values()].map(n=>n.id));
 if(used.size!==retained.size)return null;
 let tries=0,probes=0;
 const waiting=actors.filter(a=>!plan.has(a.id));
 function assign(i){
  if(probes>=maxProbes)return false;
  if(i===waiting.length){probes++;return accept(plan);}
  const a=waiting[i];
  for(const n of seats){
   if(++tries>maxTries)return false;
   if(used.has(n.id)||!canPlace(a,n,plan))continue;
   plan.set(a.id,n);used.add(n.id);
   if(assign(i+1))return true;
   plan.delete(a.id);used.delete(n.id);
  }
  return false;
 }
 return assign(0)?plan:null;
}

// For a geometry-only reseat, retain each still legal preferred foot when a
// full pack can coexist. A failure never moves an individual or a reservation.
export function packTrailStandingSeats({actors,seats,preferred,canPlace,accept=()=>true,maxChecks=58000,maxProbes=4}){
 const plan=new Map(),used=new Set(),safe=new Map(),choices=new Map();
 let checks=0,probes=0;
 const check=(a,n,others)=>++checks<=maxChecks&&canPlace(a,n,others);
 for(const a of actors){
  const wanted=preferred.get(a.id);
  const ordered=wanted?[wanted,...seats.filter(n=>n.id!==wanted.id)
   .sort((x,y)=>Math.hypot(x.p[0]-wanted.p[0],x.p[1]-wanted.p[1])-Math.hypot(y.p[0]-wanted.p[0],y.p[1]-wanted.p[1]))]:seats;
  choices.set(a.id,ordered.filter(n=>check(a,n,safe)));
 }
 function fill(waiting){
  if(!waiting.length)return ++probes<=maxProbes&&accept(plan);
  if(checks>=maxChecks||probes>=maxProbes)return false;
  // Avoid exponential permutations of equivalent small birds masking the
  // only legal placement for an unusually wide/tall encounter visitor.
  let picked=null,options=null;
  for(const a of waiting){
   const valid=choices.get(a.id).filter(n=>!used.has(n.id)&&check(a,n,plan));
   if(!valid.length)return false;
   if(!options||valid.length<options.length){picked=a;options=valid;}
  }
  const rest=waiting.filter(a=>a!==picked);
  for(const n of options){
   plan.set(picked.id,n);used.add(n.id);
   if(fill(rest))return true;
   plan.delete(picked.id);used.delete(n.id);
  }
  return false;
 }
 return fill(actors)?plan:null;
}
