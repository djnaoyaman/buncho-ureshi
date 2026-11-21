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
const within=(a,b)=>a.left>=b.left+2&&a.right<=b.right-2&&a.top>=b.top+2&&a.bottom<=b.bottom-2;

// Input must be supplied by one DOM snapshot: per-actor offsets from ground
// foot to hit/art/label edges, clip and live control/button spans. No nominal
// dimensions, inferred selector widths, or viewport-normalized coordinates.
export function createTrailClearance(id,{plane,clip,controls,footprints}){
 const terrain=trailTerrainFor(id);
 if(!terrain||!(plane?.width>0&&plane?.height>0)||!clip||!usable(clip)||!Array.isArray(controls)||!(footprints instanceof Map))return null;
 const [A,B]=terrain.entryCandidates,path=[A,...terrain.lane,B];
 const at=(a,p)=>bodyAt(plane,footprints.get(a.id),p);
 const spans=(a,points,lift)=>sweptHopSpans(points,(p,h)=>bodyAt(plane,footprints.get(a.id),p,h),lift);
 const canStand=(a,p)=>footprints.has(a.id)&&usable(footprints.get(a.id))&&inside(p,terrain.surface)&&
   within(at(a,p),clip)&&!controls.some(b=>overlaps(at(a,p),b));
 function sweptRoute(actor){
  if(!footprints.has(actor.id)||!usable(footprints.get(actor.id)))return null;
  const r=actor.route;
  if(!r)return [at(actor,actor.p)];
  if(r.trailRecovery){
   // Hermite with a zero terminal tangent is exactly a cubic Bezier;
   // its projected body sweep is inside the convex control polygon.
   const control=r.from.map((v,i)=>v+r.velocity[i]*r.duration/3);
   const h=Math.max(0,r.height0,r.height0+r.heightVelocity*r.duration/3);
   if([r.from,control,r.to].some(p=>!inside(p,terrain.surface)))return null;
   const boxes=[r.from,control,r.to].map(p=>at(actor,p));
   return [{left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),
    top:Math.min(...boxes.map(b=>b.top))-h*plane.height,bottom:Math.max(...boxes.map(b=>b.bottom))}];
  }
  if(r.reroute)return null; // unknown Hermite overshoot: decline under legacy reroute.
  const points=r.flightPath?.indexed.map(n=>n.p)??r.hops??[r.from,r.to];
  if(points.some(p=>!inside(p,terrain.surface)))return null;
  // Reserve the full swept flying box (not just same-time snapshots) and
  // preserve the foot-level path under it. Peak altitude is conservative.
  return spans(actor,points,r.height*plane.height);
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

// Only assign unplaced native IDs. Existing valid seats (including an exact
// authored gate) never move to make room for arrivals. A blocked newcomer can
// keep the old display until the host finds a verified placement.
export function assignTrailSeats({actors,seats,retained,canPlace,maxTries=5000}){
 const plan=new Map(retained),used=new Set([...retained.values()].map(n=>n.id));
 if(used.size!==retained.size)return null;
 let tries=0;
 const waiting=actors.filter(a=>!plan.has(a.id));
 function assign(i){
  if(i===waiting.length)return true;
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
