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
 let current=null,proven=null,epoch=null;
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
   epoch=generation;current=measurement;
   proven=current?.envelope?createTrailClearance(id,current):null;
   return adapter.sync({epoch,actors,predator:predator||!proven});
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
  recover(actorIds,{reduced=false}={}){
   if(!proven)return actorIds.slice();
   const blocked=[];
   for(const id of actorIds){
    const a=model.actors.get(id);
    if(!a?.route||a.route.trailRecovery&&!reduced)continue;
    const byId=s=>nodes[s];
    const choices=reduced?[byId(a.route.target)]:[byId(a.route.target),byId(a.node)];
    if(!choices.filter(Boolean).some(n=>model.recoverTrailPath(id,n,{reduced,safe:(b,node,k,peers)=>proven.safe(b,node,k,peers)})))blocked.push(id);
   }
   return blocked;
  },
  canPlace(actor,node,peers){
   if(!proven||!proven.canStand(actor,node.p))return false;
   const s=proven.sweptRoute({...actor,p:node.p,route:null});
   if(!s)return false;
   for(const p of peers.values())if(p.id!==actor.id){
    const span=proven.sweptRoute(p);
    if(!span||conflictSweeps(s,span))return false;
   }
   return adapter.canPlace({spans:s});
  }
 };
}
