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
export function createTrailClearance(id,{plane,clip,controls,footprints,flightFootprints=footprints},terrain=trailTerrainFor(id)){
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
 // Only standing peers use real measured rectangles instead of their
 // filled bounding union. A malformed component set or any route is
 // conservatively checked with the pre-existing upper envelope.
 function standingSpans(actor){
  const shape=footprints.get(actor.id);
  if(actor.route||!shape||!usable(shape))return sweptRoute(actor);
  const parts=shape.parts;
  if(!Array.isArray(parts)||!parts.length||!parts.every(p=>usable(p)&&
     p.left>=shape.left&&p.right<=shape.right&&p.top>=shape.top&&p.bottom<=shape.bottom))
   return sweptRoute(actor);
  return parts.map(part=>at(actor,actor.p,part));
 }
 function placementConflicts(a,b){
  const spans=a.route||b.route?sweptRoute:standingSpans;
  const first=spans(a),second=spans(b);
  return !first||!second||conflictSweeps(first,second);
 }
 function intersectsLane(actor,ownerShape){
  if(!footprints.has(actor.id)||!usable(ownerShape))return true;
  const corridor=sweptHopSpans(path,(p,h)=>bodyAt(plane,ownerShape,p,h),.012*plane.height);
  const actorSweep=sweptRoute(actor);
  return !actorSweep||conflictSweeps(corridor,actorSweep);
 }
 return {canStand,safe,sweptRoute,intersectsLane,placementConflicts};
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
export function packTrailStandingSeats({actors,seats,preferred,canPlace,standingPairFits,standingClass,accept=()=>true,maxChecks=58000,maxProbes=4,maxBranches=12000}){
 const plan=new Map(),used=new Set(),safe=new Map(),choices=new Map();
 let checks=0,probes=0,branches=0;
 const check=(a,n,others)=>++checks<=maxChecks&&canPlace(a,n,others);
 for(const a of actors){
  const wanted=preferred.get(a.id);
  const ordered=wanted?[wanted,...seats.filter(n=>n.id!==wanted.id)
   .sort((x,y)=>Math.hypot(x.p[0]-wanted.p[0],x.p[1]-wanted.p[1])-Math.hypot(y.p[0]-wanted.p[0],y.p[1]-wanted.p[1]))]:seats;
  choices.set(a.id,ordered.filter(n=>check(a,n,safe)));
 }
 // On an empty stage the measured constraints separate into unary
 // dry ground/clip/controls/lane checks and symmetric standing-peer
 // collisions. Filter only against the newly assigned foot so deeper
 // states do not repeat the same geometry for every old assignment.
 if(standingPairFits){
  const cache=new Map(),classes=new Map(),firstInClass=new Map(),rank=new Map(seats.map((n,i)=>[n.id,i]));
  let serial=0,symmetry=true;
  const rejected=new Set();
  for(const a of actors){
   const shape=standingClass?.(a);
   const seats=choices.get(a.id);
   if(!shape||seats.some(n=>!rank.has(n.id)))continue;
   const key=JSON.stringify([shape,seats.map(n=>JSON.stringify([n.id,n.p])).sort()]);
   classes.set(a,key);
   if(!firstInClass.has(key))firstInClass.set(key,a);
  }
  const keyed=new Map();
  const domains=new Map(actors.map(a=>[a,choices.get(a.id).map(n=>{
   const key=JSON.stringify([classes.get(a)??null,classes.has(a)?null:a.id,n.id,n.p]);
   if(!keyed.has(key))keyed.set(key,serial++);
   return {a,n,i:keyed.get(key)};
  })]));
  const compatible=(a,b)=>{
   if(a.n.id===b.n.id)return false;
   const key=Math.min(a.i,b.i)*serial+Math.max(a.i,b.i);
   if(cache.has(key))return cache.get(key);
   if(checks>=maxChecks)return false;
   checks++;
   const fits=standingPairFits(a.a,a.n,b.a,b.n);
   cache.set(key,fits);
   return fits;
  };
  function advance(open){
   if(!open.size){
    if(probes>=maxProbes||actors.some(a=>!check(a,plan.get(a.id),plan)))return false;
    const signature=JSON.stringify(actors.map(a=>plan.get(a.id).id));
    if(rejected.has(signature))return false;
    if(++probes<=maxProbes&&accept(plan))return true;
    rejected.add(signature);return false;
   }
   // A real native mismatch is actor-specific. Stop the canonical pass,
   // then retry unrestricted using the same remaining budgets/cache.
   if(symmetry&&probes>0||checks>=maxChecks||probes>=maxProbes||++branches>maxBranches)return false;
   let actor=null,values=null;
   const seenClasses=new Set();
   for(const [a,seats] of open){
    if(!seats.length)return false;
    const group=classes.get(a);
    if(symmetry&&group&&seenClasses.has(group))continue;
    if(group)seenClasses.add(group);
    if(!values||seats.length<values.length){actor=a;values=seats;}
   }
   // Rank branches by their smallest remaining domain, avoiding the old
   // preference for center seats which block several neighbors at once.
   const options=[];
   const group=classes.get(actor);
   for(const seat of values){
    if(checks>=maxChecks||probes>=maxProbes||branches>maxBranches)return false;
    const next=new Map();let scarce=Infinity,total=0;
    for(const [a,alternatives] of open){
     if(a===actor)continue;
     const equivalent=symmetry&&group&&classes.get(a)===group;
     const viable=alternatives.filter(other=>(!equivalent||rank.get(other.n.id)>rank.get(seat.n.id))&&compatible(seat,other));
     if(!viable.length)break;
     next.set(a,viable);scarce=Math.min(scarce,viable.length);total+=viable.length;
    }
    if(next.size!==open.size-1)continue;
    if(!standingClass){
     // Without class equivalence proofs, try the first viable option before evaluating all alternatives.
     plan.set(actor.id,seat.n);
     if(advance(next))return true;
     plan.delete(actor.id);
    }else options.push({seat,next,scarce,total});
   }
   options.sort((a,b)=>b.scarce-a.scarce||b.total-a.total);
   for(const {seat,next} of options){
    if(symmetry&&probes>0||checks>=maxChecks||probes>=maxProbes||branches>maxBranches)return false;
    plan.set(actor.id,seat.n);
    if(advance(next))return true;
    plan.delete(actor.id);
   }
   return false;
  }
  const hasSymmetry=firstInClass.size<classes.size;
  symmetry=hasSymmetry;
  if(advance(domains))return plan;
  if(hasSymmetry&&probes>0){
   symmetry=false;
   if(advance(domains))return plan;
  }
  return null;
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

// Try coherent dense layouts before the much larger fine lattice. Pitches
// come from current native controls, not a wider website viewport or a
// smaller effective tap target. These points are suggestions: every seat,
// every peer pair, and the final complete native admission are unchanged.
export function pitchTrailStandingSeats({actors,plane,clip,surface,footprints,baseWidth,baseHeight,canPlace,standingPairFits,accept,safePoint,knownSeats=[],maxChecks=18000,maxProbes=3}){
 if(actors.length<7||!Number.isFinite(baseWidth+baseHeight)||!(baseWidth>=44&&baseHeight>=44)||!(plane.width>0&&plane.height>0))return null;
 if(actors.some(a=>!footprints.has(a.id)))return null;
 const minX=Math.max(clip.left,Math.min(...surface.map(p=>plane.left+p[0]*plane.width)));
 const minY=Math.max(clip.top,Math.min(...surface.map(p=>plane.top+p[1]*plane.height)));
 const maxX=Math.min(clip.right,Math.max(...surface.map(p=>plane.left+p[0]*plane.width)));
 const maxY=Math.min(clip.bottom,Math.max(...surface.map(p=>plane.top+p[1]*plane.height)));
 const typical=(list,fallback)=>{
  const values=list.filter(Number.isFinite).sort((a,b)=>a-b);
  return values[Math.floor(values.length/2)]??fallback;
 };
 const shapes=actors.map(a=>footprints.get(a.id)),width=typical(shapes.map(s=>s.right-s.left),baseWidth);
 // The lower invisible skirt remains protected for clip, controls, and
 // moving birds, but is not part of the resting peer measurement.
 const paintedHeight=typical(shapes.map(s=>s.parts?.length?
  Math.max(...s.parts.map(q=>q.bottom))-Math.min(...s.parts.map(q=>q.top)):s.bottom-s.top),baseHeight);
 const pointKey=p=>p.map(x=>x.toFixed(8)).join(':');
 const seeds=[],seen=new Set(),known=new Map(knownSeats.map(n=>[pointKey(n.p),n]));
 // Offset both axes relative to this garden's visible terrain, not the
 // viewport origin. A stagger explores diagonal space left between rows.
 for(const [dx,dy,stagger] of [
  [baseWidth+1,baseHeight+1,0],[baseWidth+1,baseHeight+1,.5],
  [baseWidth+1,paintedHeight+1,0],[baseWidth+1,paintedHeight+1,.5],
  [width+1,baseHeight+1,.5],[width+1,paintedHeight+1,0],
  [baseWidth+1,Math.max(37,baseHeight*.86),.5],[width+1,Math.max(37,baseHeight*.86),.5],
 ]){
  for(const fy of [0,.25,.5,.75])for(const fx of [0,.25,.5,.75]){
   const seats=[];
   for(let row=0,y=minY+dy*fy;y<=maxY;row++,y+=dy){
    const phase=(fx+(row%2)*stagger)%1;
    for(let x=minX+dx*phase;x<=maxX;x+=dx){
     const p=[+((x-plane.left)/plane.width).toFixed(8),+((y-plane.top)/plane.height).toFixed(8)];
     if(!inside(p,surface)||!safePoint(p))continue;
     const key=pointKey(p);
     if(!known.has(key))known.set(key,{id:'pitch:'+key,p});
     seats.push(known.get(key));
    }
   }
   if(seats.length<actors.length)continue;
   const signature=seats.map(n=>n.id).join('|');
   if(!seen.has(signature)){seen.add(signature);seeds.push(seats);}
  }
 }
 // Fewer candidates per phase makes a fit fast; stable phase order is the
 // second tie-break. The existing fine pack remains the final fallback.
 seeds.sort((a,b)=>a.length-b.length);
 const empty=new Map(),unary=new Map(),pair=new Map(),plan=new Map(),rejected=new Set();
 let checks=0,probes=0,branches=0;
 const admitted=(a,n)=>{
  const key=JSON.stringify([a.id,n.id]);
  if(unary.has(key))return unary.get(key);
  if(++checks>maxChecks)return false;
  const value=canPlace(a,n,empty);unary.set(key,value);return value;
 };
 const compatible=(a,n,b,m)=>{
  if(n===m)return false;
  const key=JSON.stringify([a.id,n.id,b.id,m.id]);
  if(pair.has(key))return pair.get(key);
  if(++checks>maxChecks)return false;
  const value=standingPairFits(a,n,b,m);pair.set(key,value);return value;
 };
 function fill(open){
  if(checks>=maxChecks||probes>=maxProbes||++branches>7000)return false;
  if(!open.size){
   const signature=JSON.stringify(actors.map(a=>plan.get(a.id).id));
   if(rejected.has(signature)||actors.some(a=>++checks>maxChecks||!canPlace(a,plan.get(a.id),plan)))return false;
   if(++probes<=maxProbes&&accept(plan))return true;
   rejected.add(signature);return false;
  }
  let actor=null,choices=null;
  for(const [a,ns] of open){
   if(!ns.length)return false;
   if(!choices||ns.length<choices.length){actor=a;choices=ns;}
  }
  for(const n of choices){
   if(checks>=maxChecks||probes>=maxProbes||branches>7000)return false;
   const next=new Map();
   for(const [a,ns] of open)if(a!==actor){
    const remaining=ns.filter(m=>compatible(actor,n,a,m));
    if(!remaining.length)break;
    next.set(a,remaining);
   }
   if(next.size!==open.size-1)continue;
   plan.set(actor.id,n);
   if(fill(next))return true;
   plan.delete(actor.id);
  }
  return false;
 }
 for(const seedsOfPhase of seeds){
  if(checks>=maxChecks||probes>=maxProbes||branches>7000)break;
  if(fill(new Map(actors.map(a=>[a,seedsOfPhase.filter(n=>admitted(a,n))]))))return plan;
 }
 return null;
}

// A sloping shoreline can require different vertical phases at neighboring
// contacts. Color-prune a bounded projected sample rather than assuming any
// single global pitch. An unfinished search never licenses a placement.
export function contourTrailStandingSeats({actors,plane,clip,surface,footprints,canPlace,standingPairFits,accept,safePoint,knownSeats=[],maxChecks=64000,maxWork=1100000,maxStates=3500,maxProbes=3}){
 if(actors.length!==10||!plane?.width||!plane?.height||actors.some(a=>!footprints.has(a.id)))return null;
 const xs=surface.map(q=>plane.left+q[0]*plane.width),ys=surface.map(q=>plane.top+q[1]*plane.height);
 const bounds=[Math.max(clip.left,Math.min(...xs)),Math.min(clip.right,Math.max(...xs)),
  Math.max(clip.top,Math.min(...ys)),Math.min(clip.bottom,Math.max(...ys))];
 let checks=0,work=0,states=0,probes=0;
 const budget=()=>checks<maxChecks&&work<maxWork&&states<maxStates&&probes<maxProbes;
 const empty=new Map(),failed=new Set(),known=new Map(knownSeats.map(n=>[n.p.join(':'),n]));
 for(const [shiftX,shiftY] of [[3,4],[1,0],[5,2],[7,6]]){
  if(!budget())break;
  const seats=[];
  for(let y=Math.floor(bounds[2]/8)*8+shiftY;y<=bounds[3]&&seats.length<440;y+=8)
   for(let x=Math.floor(bounds[0]/8)*8+shiftX;x<=bounds[1]&&seats.length<440;x+=8){
    const p=[(x-plane.left)/plane.width,(y-plane.top)/plane.height];
    if(inside(p,surface)&&safePoint(p)){const key=p.join(':');seats.push(known.get(key)??{id:'contour:'+key,p});}
   }
  if(seats.length<actors.length)continue;
  const groups=new Map();
  for(const a of actors){
   const ns=seats.filter(n=>checks++<maxChecks&&canPlace(a,n,empty));
   const key=JSON.stringify([footprints.get(a.id),ns.map(n=>n.id)]);
   if(!groups.has(key))groups.set(key,{members:[],ns});
   groups.get(key).members.push(a);
  }
  if([...groups.values()].some(g=>g.ns.length<g.members.length))continue;
  const verts=[...groups.values()].flatMap(g=>g.ns.map(n=>({g,n})));
  const width=verts.length,memo=new Map(),demand=new Map();
  function fit(i,j){
   work++;
   if(work>=maxWork||verts[i].n===verts[j].n)return false;
   const key=Math.min(i,j)*width+Math.max(i,j);
   if(memo.has(key))return memo.get(key);
   if(checks++>=maxChecks)return false;
   const a=verts[i],b=verts[j];
   const ok=standingPairFits(a.g.members[0],a.n,b.g.members[0],b.n);
   memo.set(key,ok);return ok;
  }
  function order(list){
   const classes=[],sorted=[],bounds=[];
   for(const i of list){
    let k=0;
    while(k<classes.length&&classes[k].some(j=>fit(i,j)))k++;
    if(!budget())break;
    (classes[k]??=[]).push(i);
   }
   for(const [i,c] of classes.entries())for(const v of c){sorted.push(v);bounds.push(i+1);}
   return [sorted,bounds];
  }
  function seek(path,list){
   if(!budget())return null;
   if(path.length===actors.length){
    const used=new Map(),plan=new Map();
    for(const i of path){
     const {g,n}=verts[i],idx=used.get(g)??0;
     plan.set(g.members[idx].id,n);used.set(g,idx+1);
    }
    const signature=JSON.stringify(actors.map(a=>plan.get(a.id).id));
    if(failed.has(signature)||actors.some(a=>checks++>=maxChecks||!canPlace(a,plan.get(a.id),plan)))return null;
    probes++;
    if(accept(plan))return plan;
    failed.add(signature);return null;
   }
   states++;
   const [sorted,caps]=order(list);
   for(let k=sorted.length-1;k>=0&&budget();k--){
    if(path.length+caps[k]<actors.length)return null;
    const v=sorted[k],g=verts[v].g,count=demand.get(g)??0;
    if(count>=g.members.length)continue;
    demand.set(g,count+1);
    const next=sorted.slice(0,k).filter(i=>(verts[i].g!==g||count+1<g.members.length)&&fit(v,i));
    const plan=seek([...path,v],next);
    if(plan)return plan;
    count?demand.set(g,count):demand.delete(g);
   }
   return null;
  }
  const result=seek([],verts.map((_,i)=>i));
  if(result)return result;
 }
 return null;
}

// Only guide the shape of the first search. These anchors trace surveyed dry
// bands in image space, not permission to stand on any of them. The clipped
// scene, measured art/label/tap rectangles and actual native tap still veto.
const TRAIL_TEN_BANDS={
 8:[
  [[171,388],[219,388],[267,380]],
  [[91,428],[179,460],[227,460],[275,452]],
  [[131,500],[179,532],[227,532]],
 ],
 10:[
  [[115,436],[163,436],[211,436],[259,436],[307,436]],
  [[99,508],[147,508],[195,508],[243,508],[291,508]],
 ],
};
export function surveyedBandTrailSeats(number,{actors,plane,footprints,knownSeats=[],canPlace,standingPairFits,accept,safePoint,maxProbes=3}){
 const bands=TRAIL_TEN_BANDS[number];
 if(!bands||actors.length!==10||!plane?.width||!plane?.height||actors.some(a=>!footprints.has(a.id)))return null;
 const known=new Map(knownSeats.map(n=>[n.p.join(':'),n])),empty=new Map(),tested=new Set();
 let probed=0;
 // The first pattern preserves survey coordinates. Subsequent small
 // screen-pixel shifts fit scroll clipping and irregular label widths.
 for(const [x,y,spread,stagger] of [
  [0,0,0,0],[0,-6,0,0],[0,6,0,0],[-6,0,0,0],[6,0,0,0],
  [0,-12,0,0],[0,12,0,0],[-10,0,0,0],[10,0,0,0],
  [0,0,4,0],[0,-6,4,0],[0,6,4,0],[0,0,-3,0],
  [0,0,0,6],[0,0,0,-6],[-6,-6,0,6],[6,-6,0,-6],
 ]){
  if(probed>=maxProbes)break;
  const seats=bands.flatMap((row,i)=>row.map(([u,v],j)=>{
   const p=[u/375+(x+(j-(row.length-1)/2)*spread)/plane.width,v/667+(y+(i%2?stagger:-stagger))/plane.height];
   const key=p.join(':');return known.get(key)??{id:'band:'+key,p};
  }));
  if(seats.some(n=>!safePoint(n.p)))continue;
  const preferred=new Map(actors.map((a,i)=>[a.id,seats[i]]));
  const plan=packTrailStandingSeats({actors,seats,preferred,canPlace,standingPairFits,
   standingClass:a=>footprints.get(a.id),maxChecks:3000,maxBranches:150,
   maxProbes:maxProbes-probed,accept(plan){
    const key=JSON.stringify(actors.map(a=>plan.get(a.id).id));
    if(tested.has(key)||probed>=maxProbes)return false;
    tested.add(key);probed++;return accept(plan);
   }});
  if(plan)return plan;
 }
 return null;
}

// Horizontally wide cover crops can hide the upper portrait banks. Work in
// the *measured screen-space projection* of this crop, then convert each
// proposed foot back into the same surveyed image polygon. This is a
// responsive standing layout, never an alternate ground or a motion path.
export function landscapeTrailStandingSeats(number,{actors,plane,clip,surface,footprints,knownSeats=[],canPlace,standingPairFits,accept,safePoint,maxProbes=3}){
 if(![8,10].includes(number)||actors.length!==10||clip.right-clip.left<=clip.bottom-clip.top||
    !(plane.width>0&&plane.height>0)||actors.some(a=>!footprints.has(a.id)))return null;
 const xs=surface.map(v=>plane.left+v[0]*plane.width),ys=surface.map(v=>plane.top+v[1]*plane.height);
 const minX=Math.max(clip.left,Math.min(...xs)),maxX=Math.min(clip.right,Math.max(...xs));
 const minY=Math.max(clip.top,Math.min(...ys)),maxY=Math.min(clip.bottom,Math.max(...ys));
 const known=new Map(knownSeats.map(n=>[n.p.join(':'),n])),tested=new Set(),banks=new Map();
 const middle=(minX+maxX)/2;
 const contact=(x,y)=>{
  const p=[(x-plane.left)/plane.width,(y-plane.top)/plane.height];
  if(!inside(p,surface)||!safePoint(p))return null;
  const key=p.join(':');return known.get(key)??{id:'landscape-band:'+key,p};
 };
 // Bounded rows: 8px vertical sampling, a few offsets around the painted
 // center, and 44px-and-up spacing proposals. Original measured guards
 // below decide the actual width required by each individual.
 for(let y=Math.ceil(minY/8)*8;y<=maxY&&banks.size<48;y+=8){
  for(const dx of [46,52,58])for(const offset of [0,-12,12,-24,24])for(const size of [5,4,6]){
   const row=Array.from({length:size},(_,j)=>contact(middle+offset+(j-(size-1)/2)*dx,y));
   const rows=banks.get(y)??[];
   if(row.every(Boolean)&&rows.filter(r=>r.length===size).length<6){rows.push(row);banks.set(y,rows);}
  }
 }
 let probes=0,attempts=0;
 for(const dy of [72,80,88,64,56])for(const [y,rows] of banks)for(const row of rows)for(const lower of banks.get(y+dy)??[]){
  if(lower.length+row.length!==actors.length)continue;
  if(++attempts>70||probes>=maxProbes)return null;
  const seats=row.concat(lower);
  const preferred=new Map(actors.map((a,i)=>[a.id,seats[i]]));
  const plan=packTrailStandingSeats({actors,seats,preferred,canPlace,standingPairFits,
   standingClass:a=>footprints.get(a.id),maxChecks:1300,maxBranches:100,maxProbes:maxProbes-probes,accept(plan){
    const key=JSON.stringify(actors.map(a=>plan.get(a.id).id));
    if(tested.has(key)||probes>=maxProbes)return false;
    tested.add(key);probes++;return accept(plan);
   }});
  if(plan)return plan;
 }
 return null;
}
