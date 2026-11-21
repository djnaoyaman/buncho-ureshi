import {presentationSeed} from './bird-poses.js';
import {createActorHopPath,createActorFlightPath,sampleActorFlightPath} from './garden-actor-path.js';

const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>t*t*(3-2*t);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const hermite=(p,q,v,t,duration)=>(2*t*t*t-3*t*t+1)*p+(t*t*t-2*t*t+t)*v*duration+(-2*t*t*t+3*t*t)*q;
export const ACTOR_WEIGHTS=Object.freeze({rest:3,look:2,peck:3,preen:3,hop:2,fly:4});
export function weightedActorAction(value,canFly,available=null){
 const list=Object.entries(ACTOR_WEIGHTS).filter(([k])=>(k!=='fly'||canFly)&&(!available||available.has(k)));
 let n=clamp(value)*list.reduce((s,[,w])=>s+w,0);
 for(const [k,w] of list){n-=w;if(n<0)return k;}return list.at(-1)[0];
}
/** Pure, ephemeral presentation state. No world, storage, game RNG or clock IO.
 * Callers supply already projected, validated footholds and route safety. */
export function createGardenActors(seed='',initialTime=0){
 const actors=new Map(),reservations=new Map(),reactions=[];
 let time=initialTime,randomState=presentationSeed(seed)||1;
 const random=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return(randomState>>>0)/4294967296;};
 const release=id=>{for(const [n,owner]of reservations)if(owner===id)reservations.delete(n);};
 const rest=(a,state,duration)=>{a.state=state;a.since=time;a.end=time+duration;a.route=null;a.height=0;a.phase='ground';};
 const free=(node,id)=>!reservations.has(node.id)&&![...actors.values()].some(a=>a.id!==id&&a.node===node.id);
 function reconcile(definitions,nodes,canPlace=()=>true){
  const ids=new Set(definitions.map(d=>d.id));
  for(const [id] of actors)if(!ids.has(id)){release(id);actors.delete(id);}
  for(let i=reactions.length-1;i>=0;i--)if(!ids.has(reactions[i].id)||!ids.has(reactions[i].source))reactions.splice(i,1);
  // Only the first placement prioritizes the existing accompanying lead. Its
  // rear foothold has an open take-off corridor in a normal five-bird group.
  // Existing actors never change slots because another individual arrives.
  const ordered=[...definitions].sort((a,b)=>Number(!!b.initialFlight)-Number(!!a.initialFlight));
  for(const d of ordered){
   const old=actors.get(d.id);if(old){old.canFly=d.canFly;old.movable=d.movable;continue;}
   const node=nodes.find(n=>free(n,d.id)&&canPlace(d,n,actors));if(!node)continue;
   actors.set(d.id,{...d,node:node.id,p:[...node.p],height:0,state:'rest',phase:'ground',initialFlightDeadline:time+3000,since:time,end:time+(d.initialFlight?1000:1000+(actors.size%5)*700),cooldown:0,route:null});
  }
 }
 function begin(a,node,kind,{safe,height,width}){
  if(!a||a.route||!free(node,a.id)||!safe(a,node,kind,actors))return false;
  // Destination reservation is acquired before movement; origin stays occupied.
  reservations.set(node.id,a.id);
  const duration=kind==='fly'?2800:Math.max(1150,Math.ceil(distance(a.p,node.p)*width/24)*300);
  a.state=kind;a.since=time;a.end=time+duration;if(kind==='fly')a.initialFlight=false;
  a.route={from:[...a.p],to:[...node.p],target:node.id,duration,height:kind==='fly'?height:.012,steps:Math.max(1,Math.ceil(distance(a.p,node.p)*width/24))};return true;
 }
 // Opt-in admission for a geometry adapter. Validate and reserve the same
 // candidate that frame()/sampleRoute() will paint; a rejected commit is inert.
 function previewPath(id,node,path,kind,{width,planeHeight,height}){
  const a=actors.get(id);
  if(!a?.movable||a.route||!node||node.id===a.node)return null;
  let route;
  if(kind==='hop'){
   const hops=createActorHopPath(a.p,node.p,path,width,planeHeight);
   if(!hops)return null;
   const steps=hops.length-1;
   route={duration:Math.max(1150,steps*300),height:.012,steps,hops};
  }else if(kind==='fly'){
   if(!a.canFly||time<a.cooldown||!Number.isFinite(height)||height<=0)return null;
   const flightPath=createActorFlightPath(a.p,node.p,path,width,planeHeight);
   if(!flightPath)return null;
   route={duration:Math.max(2300,Math.min(4300,1300+flightPath.distance*6)),height,flightPath};
  }else return null;
  Object.assign(route,{from:[...a.p],to:[...node.p],target:node.id});
  return {...a,state:kind,since:time,end:time+route.duration,initialFlight:kind==='fly'?false:a.initialFlight,route};
 }
 function beginPath(id,node,path,kind,geometry){
  if(!node||!free(node,id)||typeof geometry.safe!=='function')return false;
  const candidate=previewPath(id,node,path,kind,geometry);
  if(!candidate||!geometry.safe(candidate,node,kind,actors))return false;
  reservations.set(node.id,id);Object.assign(actors.get(id),candidate);return true;
 }
 const beginHopPath=(id,node,path,geometry)=>beginPath(id,node,path,'hop',geometry);
 const beginFlightPath=(id,node,path,geometry)=>beginPath(id,node,path,'fly',geometry);
 function frame(a,at=time){
  const r=a.route,t=clamp((at-a.since)/r.duration);
  if(r.reroute)return {p:r.from.map((v,i)=>hermite(v,r.to[i],r.velocity[i],t,r.duration)),height:Math.max(0,hermite(r.height0,0,r.heightVelocity,t,r.duration)),phase:t<.65?'brake':t<.9?'feet':'contact'};
  if(a.state==='hop'){
   const steps=r.steps||3,u=t*steps,part=u-Math.floor(u),progress=(Math.floor(u)+smooth(part))/steps;
   if(r.hops){
    if(t>=1)return {p:[...r.to],height:0,phase:'contact',dx:r.to[0]-r.hops.at(-2)[0]};
    const i=Math.floor(u),from=r.hops[i],to=r.hops[i+1];
    return {p:from.map((v,k)=>v+(to[k]-v)*smooth(part)),height:Math.sin(Math.PI*part)*r.height,dx:to[0]-from[0],
     phase:part===0&&i>0?'contact':part<.2?'push':part<.72?'hop':'contact'};
   }
   return {p:r.from.map((v,i)=>v+(r.to[i]-v)*progress),height:Math.sin(Math.PI*part)*r.height,phase:part<.2?'push':part<.72?'hop':'contact'};
  }
  const progress=smooth(clamp((t-.12)/.72));
  const trajectory=r.flightPath?sampleActorFlightPath(r.flightPath,progress):null;
  return {p:trajectory?.p??r.from.map((v,i)=>v+(r.to[i]-v)*progress),...(trajectory?{dx:trajectory.dx}:{}),height:t<.1||t>.88?0:r.height*Math.sin(Math.PI*clamp((t-.1)/.78)),phase:t<.1?'crouch':t<.2?'push':t<.36?'rise':t<.65?'flap':t<.8?'brake':t<.88?'feet':t<.96?'contact':'fold'};
 }
 function reroute(a,node,environment){
  if(!a?.route||!free(node,a.id))return false;
  const current=frame(a),next=frame(a,time+1),route={from:[...current.p],to:[...node.p],target:node.id,duration:1350,reroute:true,
   velocity:current.p.map((p,i)=>next.p[i]-p),height0:current.height,heightVelocity:next.height-current.height};
  const candidate={...a,p:current.p,height:current.height,since:time,route};
  if(!environment.safe(candidate,node,'fly',actors))return false;
  reservations.set(node.id,a.id);for(const [id,owner]of reservations)if(owner===a.id&&id!==node.id)reservations.delete(id);
  Object.assign(a,candidate,{end:time+route.duration,state:'fly'});return true;
 }
 function advance(elapsed,nodes,environment){
  time=Math.max(time,elapsed);
  for(const a of actors.values()){
   if(a.route){
    Object.assign(a,frame(a));
    if(time>=a.end){a.p=[...a.route.to];a.node=a.route.target;release(a.id);a.cooldown=time+8000;rest(a,'rest',2000+random()*3000);
     for(const b of actors.values())if(b.id!==a.id&&distance(b.p,a.p)<.3)reactions.push({id:b.id,source:a.id,due:time+400+random()*800});
    }
   }else if(a.movable&&time>=a.end){
    if(a.initialFlight&&!a.canFly&&time<a.initialFlightDeadline){a.state='look';a.end=time+100;continue;}
    if(a.initialFlight&&!a.canFly)a.initialFlight=false;
    // Filter by real footholds/corridors before the weighted choice. A blocked
    // flight is not silently converted to looking while a safe hop exists.
    const freeNodes=nodes.filter(n=>n.id!==a.node&&free(n,a.id));
    const options={hop:freeNodes.filter(n=>environment.safe(a,n,'hop',actors)),fly:a.canFly&&time>=a.cooldown?freeNodes.filter(n=>environment.safe(a,n,'fly',actors)):[]};
    const available=new Set(['rest','look','peck','preen',...Object.keys(options).filter(k=>options[k].length)]);
    let kind=a.initialFlight&&options.fly.length?'fly':weightedActorAction(random(),a.canFly&&time>=a.cooldown,available);
    if(kind==='fly'||kind==='hop'){
     const choices=options[kind];
     if(kind==='hop')choices.sort((x,y)=>distance(a.p,x.p)-distance(a.p,y.p));
     else{const start=Math.floor(random()*choices.length);choices.push(...choices.splice(0,start));}
     if(choices.some(n=>begin(a,n,kind,environment)))continue;
     kind='look';
    }
    rest(a,kind,2000+random()*4000);
   }
  }
  for(let i=reactions.length-1;i>=0;i--){const r=reactions[i];if(time<r.due)continue;reactions.splice(i,1);const a=actors.get(r.id),b=actors.get(r.source);if(a&&b&&a.movable&&!a.route&&distance(a.p,b.p)<.3)rest(a,'look',1100);}
 }
 function reflow(nodes,legal,preserve=()=>true){
  // Responsive layout only: first retain every still-valid foothold. A DOM
  // redraw does not call this; individual timers and random state are preserved.
  const used=new Set(),changes=[];
  for(const a of actors.values()){
   const current=nodes.find(n=>n.id===a.node);
   const available=n=>!reservations.has(n.id)||reservations.get(n.id)===a.id;
   if(current&&available(current)&&!used.has(current.id)&&legal(a,current)&&preserve(a)){used.add(current.id);continue;}
   changes.push(a);
  }
  const plans=[];
  for(const a of changes){const n=nodes.filter(n=>!used.has(n.id)&&(!reservations.has(n.id)||reservations.get(n.id)===a.id)&&legal(a,n)).sort((x,y)=>distance(a.p,x.p)-distance(a.p,y.p))[0];if(!n)return false;used.add(n.id);plans.push([a,n]);}
  for(const [a,n]of plans){release(a.id);a.p=[...n.p];a.node=n.id;a.route=null;a.height=0;a.state='rest';a.phase='ground';}
  return true;
 }
 // Last-resort responsive reflow after the caller has proved a complete,
 // separated standing layout. Do not let obsolete landing locks veto it.
 function placeStanding(placements){
  const plan=[...actors.values()].map(a=>[a,placements.get(a.id)]);
  if(plan.some(([,n])=>!n)||new Set(plan.map(([,n])=>n.id)).size!==plan.length)return false;
  for(const [a,n]of plan){
   release(a.id);
   if(a.route)rest(a,'rest',2000);
   a.p=[...n.p];a.node=n.id;
  }
  return true;
 }
 return {actors,reservations,reconcile,advance,begin,previewPath,beginHopPath,beginFlightPath,frame,reflow,reroute,placeStanding,
  sampleRoute(a,count=49){
   if(a.route.flightPath)count=Math.max(count,Math.ceil(a.route.flightPath.distance/2),97);
   if(a.route.hops){
    // Always include every contact and sample each arc; 49 global points can
    // miss an entire arc when a lane has several dozen short hops.
    const samplesPerHop=Math.max(12,Math.ceil((count-1)/a.route.steps));
    count=a.route.steps*samplesPerHop+1;
   }
   return Array.from({length:count},(_,i)=>frame(a,a.since+(i/(count-1))*a.route.duration));
  },
  settle(){for(const a of actors.values())if(a.route){a.p=[...a.route.to];a.node=a.route.target;release(a.id);a.cooldown=time+8000;rest(a,'rest',2000);}reactions.length=0;},
  clearReactions(){reactions.length=0;},
  clear(){actors.clear();reservations.clear();reactions.length=0;},
  get time(){return time;},
 };
}
