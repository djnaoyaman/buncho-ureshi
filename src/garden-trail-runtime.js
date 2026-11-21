import {inside} from './garden-terrain-plan.js';
import {trailTerrainFor} from './data/garden-trail-terrain.js';
import {createGardenTrailAdapter} from './garden-trail-adapter.js';
import {createTrailClearance} from './garden-trail-clearance.js';
import {conflictSweeps,sweptHopSpans} from './garden-actor-path.js';

// Native host coordinator, before renderer activation. Uses the same native
// state machine, render timings and individual object references as Type①.
export function createGardenTrailRuntime(id,model){
 const terrain=trailTerrainFor(id);if(!terrain)throw Error('Unsuitable garden');
 const [A,B]=terrain.entryCandidates,[bay]=terrain.pullouts;
 const points=bay?{A,B,bay}:{A,B};
 const nodes=Object.fromEntries(Object.entries(points).map(([id,p])=>[id,{id,p}]));
 let current=null,proven=null,epoch=null,lastLocal=null,localFlightId=null,interior=null,interiorMiss=null;
 const allowInterior=terrain.number===10||terrain.number===14;
 const kind=action=>action==='fly'?'fly':'hop';
 const makeEnvironment=safe=>({safe,width:current.plane.width,planeHeight:current.plane.height,height:.043});
 const adapter=createGardenTrailAdapter(id,{
  intersectsLane(a){
   // Reserve against the largest observed shape, not a fixed nominal 44px.
   return !proven||proven.intersectsLane(a,current.envelope);
  },
  validate({id,action,kind:phase,path,to,actors,prospectiveYieldId}){
   if(!proven)return false;
   const a=actors.get(id),node=nodes[to],mode=kind(action);
   if(!a||!node)return false;
   if(a.route) return a.route.target===to&&proven.safe(a,node,mode,actors);
   const tentative=model.previewPath(id,node,path,mode,makeEnvironment(()=>false));
   return !!tentative&&proven.safe(tentative,node,mode,actors,{prospectiveYieldId:phase==='cross'?prospectiveYieldId:null});
  },
  protects(proposal,{path,lock}){
   if(!lock)return false;
   if(!proposal?.spans)return true;
   const e=current.envelope,plane=current.plane;
   const box=([x,y],lift)=>({left:plane.left+x*plane.width+e.left,right:plane.left+x*plane.width+e.right,
    top:plane.top+y*plane.height+e.top-lift,bottom:plane.top+y*plane.height+e.bottom-lift});
   const lane=sweptHopSpans(path,box,.043*plane.height);
   for(const s of [lock.from,lock.to,lock.partner?'bay':null])if(points[s])lane.push(box(points[s],0));
   return conflictSweeps(lane,proposal.spans);
  }
 });
 return {
  nodes:Object.values(nodes),
  sync({generation,measurement,actors=[...model.actors.values()],predator=false}){
   // Host must disposition any prior active routes before advancing epochs;
   // a null/unsafe measurement pauses new movement, not natural game events.
   if(current!==measurement||actors.length!==1||predator)interiorMiss=null;
   // A routine native redraw may resample the identical standing contact.
   // Keep the plan for the same bird until it can revalidate the latest layout.
   const [solo]=actors;
   if(interior&&(actors.length!==1||predator||!measurement?.envelope||solo.id!==interior.id||
      (solo.route?solo.route.target!==interior.source:solo.node!==interior.source)))interior=null;
   epoch=generation;current=measurement;
   proven=current?.envelope?createTrailClearance(id,current):null;
   const state=adapter.sync({epoch,actors,predator:predator||!proven});
   const local=actors.find(a=>a.id===localFlightId);
   if(!local?.route)localFlightId=null;
   // A bypass-free solo flight has no lane ticket; still recover it on
   // interruption before it can continue under a newly blocked geometry.
   if(localFlightId&&(predator||!proven||actors.length!==1)&&!state.disposition.some(x=>x.id===localFlightId)){
    state.disposition.push({id:localFlightId,kind:'native-safe-recovery'});
   }
   return state;
  },
  request(id,action){return !!proven&&adapter.enqueue(id,action);},
  run(){
   if(!proven)return null;
   const d=adapter.admit();if(!d)return null;
   const env=makeEnvironment((a,n,k,others)=>proven.safe(a,n,k,others));
   const start=c=>kind(c.action)==='fly'
     ?model.beginFlightPath(c.id,nodes[c.target],c.path,env)
     :model.beginHopPath(c.id,nodes[c.target],c.path,env);
   return adapter.commit(d,start,id=>model.actors.get(id))?d:null;
  },
  // Only in an otherwise empty garden: when the main gated route is
  // unavailable, allow a shorter curved native flight between two measured
  // dry contacts. It still owns a reservation and passes the same entire
  // wing/body sweep, clipping, and native UI checks as a lane crossing.
  singletonFlight(seats,{paintable=()=>true}={}){
   const roster=[...model.actors.values()],a=roster[0];
   if(!proven||roster.length!==1||!a.movable||!a.canFly||a.route||a.phase!=='ground')return null;
   const plane=current.plane;
   const distance=n=>Math.hypot((a.p[0]-n.p[0])*plane.width,(a.p[1]-n.p[1])*plane.height);
   const targets=seats.filter(n=>n.id!==a.node&&n.id!=='bay'&&distance(n)>=64&&distance(n)<=148);
   targets.sort((x,y)=>Math.abs(distance(x)-96)-Math.abs(distance(y)-96));
   const env=makeEnvironment((candidate,node,k,others)=>{
    if(!proven.safe(candidate,node,k,others)||!paintable(candidate))return false;
    const spans=proven.sweptRoute(candidate);
    return !!spans&&adapter.canPlace({spans});
   });
   for(const n of targets)if(model.beginFlightPath(a.id,n,[a.p,n.p],env)){
    localFlightId=a.id;
    return {id:a.id,target:n.id,action:'fly'};
   }
   return null;
  },
  // Two edge-gated surveys can have a legal standing contact where their
  // full flight envelope cannot launch. Find a dry interior pair, optionally
  // moving the same bird there via a separately reserved native ingress hop.
  singletonInterior({paintable=()=>true,resumeOnly=false}={}){
   const [a]=model.actors.values();
   if(!allowInterior||!proven||model.actors.size!==1||!a?.movable)return null;
   const pending=interior?.id===a.id&&(a.route?.target??a.node)===interior.source;
   if(pending&&(a.route||!a.canFly||a.phase!=='ground'||model.time<a.cooldown))return {id:a.id,action:'wait'};
   if((resumeOnly&&!pending)||!a.canFly||a.route||a.phase!=='ground')return null;
   const plane=current.plane,here={id:a.node,p:a.p};
   const delta=(u,v)=>Math.hypot((u.p[0]-v.p[0])*plane.width,(u.p[1]-v.p[1])*plane.height);
   const permitted=(c,n,k,peers)=>{
    if(!proven.safe(c,n,k,peers)||!paintable(c))return false;
    const spans=proven.sweptRoute(c);
    return !!spans&&adapter.canPlace({spans});
   };
   const env=makeEnvironment(permitted);
   const fly=n=>{
    if(!model.beginFlightPath(a.id,n,[a.p,n.p],env))return null;
    localFlightId=a.id;return {id:a.id,target:n.id,action:'fly'};
   };
   if(pending){
    const {target}=interior;interior=null;
    const launched=fly(target);if(launched||resumeOnly)return launched;
   }
   if(model.time<a.cooldown||interiorMiss===a.node)return null;
   const xs=terrain.surface.map(p=>p[0]*plane.width),ys=terrain.surface.map(p=>p[1]*plane.height);
   const sites=[];
   // The 24px projection is deterministic and only produces contacts inside
   // the existing survey. Keep at most two interleaved projected grids.
   for(const offset of [0,12])
    for(let y=Math.min(...ys)+offset;y<Math.max(...ys);y+=24)
     for(let x=Math.min(...xs)+offset;x<Math.max(...xs);x+=24){
      const p=[x/plane.width,y/plane.height];
      if(inside(p,terrain.surface)&&proven.canStand(a,p))sites.push({id:'interior:'+p.join(':'),p});
     }
   const sources=sites.filter(n=>delta(here,n)>=16&&delta(here,n)<=68)
    .sort((u,v)=>delta(here,u)-delta(here,v));
   const targets=from=>sites.filter(n=>delta(from,n)>=64&&delta(from,n)<=148)
    .sort((u,v)=>Math.abs(delta(from,u)-96)-Math.abs(delta(from,v)-96));
   for(const n of targets(here)){const direct=fly(n);if(direct)return direct;}
   for(const ingress of sources){
    const hop=model.previewPath(a.id,ingress,[a.p,ingress.p],'hop',env);
    if(!hop||!permitted(hop,ingress,'hop',model.actors))continue;
    for(const target of targets(ingress)){
     const flight=model.previewPath(a.id,target,[ingress.p,target.p],'fly',env,ingress);
     if(!flight||!permitted(flight,target,'fly',model.actors))continue;
     if(!model.beginHopPath(a.id,ingress,[a.p,ingress.p],env))continue;
     localFlightId=a.id;
     interior={id:a.id,source:ingress.id,target};
     return {id:a.id,target:ingress.id,action:'hop',ingress:true};
    }
   }
   interiorMiss=a.node;
   return null;
  },
  // When the whole narrow crossing is unavailable, try a smaller native
  // ground route without stealing any protected corridor or landing point.
  // There is no hop if no actual idle actor, alternate seat, or UI clearance.
  localHop(seats,{minDistance=16,maxDistance=68,singletonIngress=false}={}){
   if(!proven)return null;
   const roster=[...model.actors.values()];
   if(!roster.length)return null;
   const terminal=id=>id==='A'||id==='B';
   if(singletonIngress&&(roster.length!==1||terminal(roster[0].node)))return null;
   const first=(roster.findIndex(a=>a.id===lastLocal)+1)%roster.length;
   const rotated=roster.slice(first).concat(roster.slice(0,first));
   const delta=(a,b)=>Math.hypot((a[0]-b[0])*current.plane.width,(a[1]-b[1])*current.plane.height);
   const env=makeEnvironment((candidate,node,k,others)=>{
    if(!proven.safe(candidate,node,k,others))return false;
    const spans=proven.sweptRoute(candidate);
    return !!spans&&adapter.canPlace({spans});
   });
   for(const a of rotated){
    if(!a.movable||a.route||a.phase!=='ground')continue;
    const alternatives=seats.filter(n=>n.id!==a.node&&n.id!=='bay'&&
      !(nodes[n.id]&&nodes[a.node]&&!(singletonIngress&&terminal(n.id)))&&delta(a.p,n.p)>=minDistance&&delta(a.p,n.p)<=maxDistance)
      .sort((a1,b1)=>(singletonIngress?Number(terminal(b1.id))-Number(terminal(a1.id)):0)||
        delta(a.p,a1.p)-delta(a.p,b1.p));
    for(const n of alternatives)if(model.beginHopPath(a.id,n,[a.p,n.p],env)){lastLocal=a.id;return {id:a.id,target:n.id,action:'hop'};}
   }
   return null;
  },
  standingFits(){
   if(!proven)return false;
   const existing=[...model.actors.values()];
   const placed=[];
   for(const a of existing){
    if(a.route||!proven.canStand(a,a.p)||placed.some(p=>proven.placementConflicts(a,p)))return false;
    placed.push(a);
   }
   return true;
  },
  recover(actorIds,{reduced=false}={}){
   if(!proven)return actorIds.slice();
   const blocked=[];
   for(const id of actorIds){
    const a=model.actors.get(id);
    if(!a?.route||a.route.trailRecovery&&!reduced)continue;
    // Short presentation hops can reserve a surveyed pad outside A/B/bay.
    // Its coordinates are frozen into the native route when it is admitted;
    // the current measured clearance below still validates any recovery.
    const target=nodes[a.route.target]??{id:a.route.target,p:a.route.to};
    const contact=nodes[a.node]??{id:a.node,p:a.route.from};
    const choices=reduced?[target]:[target,contact];
    if(!choices.filter(Boolean).some(n=>model.recoverTrailPath(id,n,{reduced,safe:(b,node,k,peers)=>proven.safe(b,node,k,peers)})))blocked.push(id);
   }
   return blocked;
  },
  standingPairFits(a,aNode,b,bNode){
   return !!proven&&!proven.placementConflicts({...a,p:aNode.p,route:null},{...b,p:bNode.p,route:null});
  },
  canPlace(actor,node,peers){
   if(!proven||!proven.canStand(actor,node.p))return false;
   const candidate={...actor,p:node.p,route:null},s=proven.sweptRoute(candidate);
   if(!s)return false;
   for(const p of peers.values())if(p.id!==actor.id&&proven.placementConflicts(candidate,p))return false;
   return adapter.canPlace({spans:s});
  }
 };
}
