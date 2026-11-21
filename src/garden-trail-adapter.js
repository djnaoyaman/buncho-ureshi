import {createLane} from './garden-trail-lane.js';
import {trailTerrainFor} from './data/garden-trail-terrain.js';
const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<=0.000001;
const copyPath=path=>path.map(p=>[...p]);
// Every point is in source-image coordinates, not actorState's projected local coordinates.
// Rendering/placement supplies measured clearance; no optimistic default.
export function createGardenTrailAdapter(id,{intersectsLane,validate,protects}){
 const terrain=trailTerrainFor(id);
 if(!terrain)throw new TypeError('not a surveyed trail');
 const [A,B]=terrain.entryCandidates,[bay]=terrain.pullouts;
 const ab=[A,...terrain.lane,B],slots=bay?{A,B,bay}:{A,B};
 // Only an authored and measured branch to a dry bay may be accepted.
 const paths=(from,to)=>to==='bay'&&bay
  ?terrain.number===28&&from==='A'?[A,...terrain.lane.slice(0,2),bay]:[slots[from],bay]
  :from==='A'?ab:[...ab].reverse();
 for(const fn of [intersectsLane,validate,protects]) if(typeof fn!=='function')throw new TypeError('geometry callbacks required');
 let raw=new Map(),mode='normal',key,requested=new Map(),recovering=new Set(),pending=null;
 const planner=createLane({hasBay:!!bay,fits(id,from,to,kind){
   const actor=raw.get(id), path=paths(from,to), action=kind==='yield'?'hop':requested.get(id);
   // Renderer checks actual actors-in-route and UI; a legitimate terminal occupant is the
   // planner's sole yield candidate and may be ignored ONLY for prospective crossing.
   const phase=planner.snapshot().lock?.phase;
   const exitOccupant=kind==='cross'&&!phase?[...raw.values()].filter(a=>a.slot===to&&a.id!==id):[];
   return !!actor&&!actor.leaving&&!!action&&(action!=='fly'||actor.canFly)&&
     validate({id,action,kind,path:copyPath(path),from,to,actors:raw,
       prospectiveYieldId:exitOccupant.length===1?exitOccupant[0].id:null});
 }});
 function sync({epoch,actors,predator=false}){
   if(epoch!==key){key=epoch;requested.clear();recovering.clear();pending=null;}
   mode=predator?'predator':'normal';
   const lock=planner.snapshot().epoch===epoch?planner.snapshot().lock:null;
   const next=new Map();
   for(const a of actors){
     if(next.has(a.id))throw new Error('duplicate actor');
     const settled=a.phase==='ground'&&a.height===0&&!a.route;
     let slot=null;
     if(settled)slot=Object.keys(slots).find(s=>same(a.p,slots[s]))??null;
     if(!slot&&lock?.phase==='yield'&&a.id===lock.partner&&a.route)slot='yielding';
     if(!slot&&intersectsLane(a,copyPath(ab)))slot='lane';
     next.set(a.id,{...a,slot,movable:a.movable&&!a.leaving&&settled});
   }
   raw=next;
   for(const id of recovering)if(!raw.get(id)?.route)recovering.delete(id);
   planner.sync({key:epoch,actors:[...raw.values()],blocked:predator});
   const state=planner.snapshot();
   if(pending&&(state.lock?.ticket!==pending.ticket||state.lock.phase!==pending.phase)){
     // A late caller cannot finish or release a different transaction.
     if(raw.get(pending.actor)?.route)recovering.add(pending.actor);
     pending=null;
   }
   for(const id of requested.keys()){
     if(state.lock?.id!==id&&!state.queue.some(q=>q.id===id))requested.delete(id);
   }
   const impacted=lock?[lock.id,lock.partner].filter(id=>id&&raw.has(id)):[]; // never broadcast to unaffected birds
   if(predator||(lock&&!state.lock)||state.lock?.phase==='recover')
     for(const id of impacted)if(raw.get(id).route)recovering.add(id);
   return {active:state.lock,impacted,disposition:[...recovering].map(id=>({id,kind:'native-safe-recovery'}))};
 }
 function enqueue(id,action){
   const a=raw.get(id);
   if(!['walk','fly'].includes(action)||(action==='fly'&&!a?.canFly)||!planner.request(id))return false;
   if(!requested.has(id))requested.set(id,action);
   return true;
 }
 function admit(){
   if(recovering.size||pending)return null;
   const d=planner.admit();if(!d)return null;
   const {to,ticket,phase}=planner.snapshot().lock;
   const actor=d.kind==='yield'?d.actor:d.id;
   // Opaque identity spans duplicate/late completion and reused ticket numbers.
   const token=Object.freeze({});
   const from=d.kind==='yield'?to:d.from,target=d.kind==='yield'?'bay':d.to;
   const path=Object.freeze(copyPath(paths(from,target)).map(Object.freeze));
   const command=Object.freeze(d.kind==='yield'?
     {token,id:actor,kind:'yield',action:'hop',path,target,laneOwner:d.laneOwner}:
     {token,id:actor,kind:'cross',action:requested.get(actor),path,target});
   pending={command,token,actor,ticket,phase,from,target};
   return command;
 }
 // Must run synchronously in the same host frame as native beginHopPath.
 // Boolean false means no movement was started. If a route exists despite a
 // refusal or throws after mutation, retain protection and recover affected ID.
 function finish(token,accepted,nativeActor){
   if(!pending||pending.token!==token||typeof accepted!=='boolean')return false;
   const {actor,ticket,phase,from,target}=pending,lock=planner.snapshot().lock;
   if(nativeActor&&nativeActor.id!==actor)return false;
   if(!lock||lock.ticket!==ticket||lock.phase!==phase)return false;
   const route=nativeActor?.route;
   if(accepted&&(!route||route.target!==target||!route.from||!route.to||
     !same(route.from,slots[from])||!same(route.to,slots[target])))return false;
   pending=null;
   if(accepted)return true;
   if(route||raw.get(actor)?.route){
     recovering.add(actor);planner.recover({key,ticket,phase});return false;
   }
   const refused=planner.refuse({key,ticket,phase});
   if(refused)requested.delete(lock.id);
   return refused;
 }
 // Preferred host API. Never await inside the reservation handshake.
 function commit(command,start,actorFor){
   if(!pending||pending.command!==command)return false;
   try{
     if(start(command)===true&&finish(command.token,true,actorFor(command.id)))return true;
   }catch(error){
     finish(command.token,false,actorFor(command.id));
     throw error;
   }
   finish(command.token,false,actorFor(command.id));
   return false;
 }
 function canPlace(proposal){
   // Gate every non-admitted motion and newcomer before native placement. External
   // callers must present swept envelopes including body and gear, not just foot points.
   return mode==='normal'&&!recovering.size&&!protects(proposal,{path:copyPath(ab),slots:Object.fromEntries(Object.entries(slots).map(([s,p])=>[s,[...p]])),lock:planner.snapshot().lock});
 }
 return {sync,enqueue,admit,finish,commit,canPlace};
}
