import test from 'node:test';
import assert from 'node:assert/strict';
import {createGardenActors,weightedActorAction} from '../src/garden-actor-state.js';
const nodes=Array.from({length:12},(_,i)=>({id:String(i),p:[.2+(i%4)*.2,.6+Math.floor(i/4)*.1]}));
const env={safe:()=>true,height:.06,width:400};
const defs=n=>Array.from({length:n},(_,i)=>({id:'b'+i,movable:true,canFly:true}));
test('roster identity, zero, one, actual maximum ten, and unrelated arrivals retain timers',()=>{
 const m=createGardenActors('world');m.reconcile(defs(5),nodes);m.advance(800,nodes,env);
 const first=m.actors.get('b0'),snapshot=JSON.stringify(first);m.reconcile(defs(10),nodes);
 assert.equal(m.actors.size,10);assert.equal(m.actors.get('b0'),first);assert.equal(JSON.stringify(first),snapshot);
 m.reconcile(defs(1),nodes);assert.equal(m.actors.size,1);m.reconcile([],nodes);assert.equal(m.actors.size,0);assert.equal(m.reservations.size,0);
});
test('same landing atomically reserved once, occupied origin retained and release on removal',()=>{
 const m=createGardenActors();m.reconcile(defs(2),nodes);const [a,b]=m.actors.values();
 assert.equal(m.begin(a,nodes[3],'fly',env),true);assert.equal(m.begin(b,nodes[3],'fly',env),false);
 assert.equal(m.begin(b,nodes[0],'fly',env),false);m.reconcile([defs(2)[1]],nodes);assert.equal(m.reservations.size,0);
});
test('four colours can use identical flight phases without touching input definitions',()=>{
 const m=createGardenActors();const d=defs(4).map((v,i)=>({...v,color:['white','sakura','cinnamon','silver'][i]})),before=JSON.stringify(d);m.reconcile(d,nodes);
 for(const [i,a]of [...m.actors.values()].entries())assert.equal(m.begin(a,nodes[i+4],'fly',env),true);
 const phases=new Set();for(let t=0;t<=2800;t+=25){m.advance(t,nodes,env);for(const a of m.actors.values()){phases.add(a.phase);assert.ok(Number.isFinite(a.height)&&a.height>=0);}}
 for(const p of ['crouch','push','rise','flap','brake','feet','contact','fold'])assert.ok(phases.has(p),p);
 assert.equal(m.reservations.size,0);for(const a of m.actors.values()){assert.equal(a.height,0);assert.ok(a.cooldown>=10800);}
 assert.equal(JSON.stringify(d),before);
});
test('presentation random stream is deterministic and independent, weighted boundaries exclude flight while unavailable',()=>{
 const old=Math.random;Math.random=()=>{throw Error('game/global RNG called');};try{
 const a=createGardenActors('id'),b=createGardenActors('id');a.reconcile(defs(5),nodes);b.reconcile(defs(5),nodes);
 for(let t=0;t<60000;t+=40){a.advance(t,nodes,env);b.advance(t,nodes,env);}
 assert.deepEqual([...a.actors.values()],[...b.actors.values()]);
 for(let x=0;x<1;x+=.001)assert.notEqual(weightedActorAction(x,false),'fly');
 assert.equal(weightedActorAction(0,true),'rest');assert.equal(weightedActorAction(.99999,true),'fly');
 }finally{Math.random=old;}
});
test('unsafe route is refused before reservation or motion',()=>{
 const m=createGardenActors();m.reconcile(defs(1),nodes);const a=m.actors.get('b0'),before=JSON.stringify(a);
 assert.equal(m.begin(a,nodes[3],'fly',{...env,safe:()=>false}),false);assert.equal(JSON.stringify(a),before);assert.equal(m.reservations.size,0);
});
test('reroute acquires a new landing first and preserves position and first derivative',()=>{
 const m=createGardenActors();m.reconcile(defs(2),nodes);m.actors.get('b1').movable=false;const a=m.actors.get('b0');m.begin(a,nodes[3],'fly',env);m.advance(900,nodes,env);
 const now=m.frame(a),next=m.frame(a,m.time+1),oldTarget=a.route.target;
 assert.equal(m.reroute(a,nodes[5],{...env,safe:()=>false}),false);assert.equal(a.route.target,oldTarget);assert.equal(m.reservations.get(oldTarget),a.id);
 assert.equal(m.reroute(a,nodes[5],env),true);assert.deepEqual(m.frame(a).p,now.p);assert.equal(m.frame(a).height,now.height);
 const after=m.frame(a,m.time+1);for(let i=0;i<2;i++)assert.ok(Math.abs((after.p[i]-now.p[i])-(next.p[i]-now.p[i]))<.000002);
 assert.equal(m.reservations.has(oldTarget),false);assert.equal(m.reservations.get('5'),a.id);
 m.advance(2250,nodes,env);assert.deepEqual(a.p,nodes[5].p);assert.equal(a.height,0);assert.equal(m.reservations.size,0);
});
test('reduced motion settles only already reserved destinations and clears pending presentation work',()=>{
 const m=createGardenActors();m.reconcile(defs(2),nodes);const a=m.actors.get('b0');m.begin(a,nodes[3],'fly',env);m.advance(1000,nodes,env);m.settle();
 assert.deepEqual(a.p,nodes[3].p);assert.equal(a.height,0);assert.equal(a.route,null);assert.equal(m.reservations.size,0);
});
test('initial holds use milliseconds and only the existing lead has the approved first-flight preference',()=>{
 const m=createGardenActors('timing',4000);m.reconcile([{id:'lead',movable:true,canFly:true,initialFlight:true},...defs(2)],nodes);
 m.advance(4999,nodes,env);for(const a of m.actors.values())assert.equal(a.state,'rest');
 m.advance(5000,nodes,env);assert.equal(m.actors.get('lead').state,'fly');assert.equal(m.actors.get('b0').state,'rest');
 assert.equal(m.actors.get('b1').state,'rest');assert.equal(m.actors.get('lead').initialFlight,false);
});
test('responsive reflow cannot consume another individual’s reserved landing',()=>{
 const m=createGardenActors();m.reconcile(defs(2),nodes);const a=m.actors.get('b0'),b=m.actors.get('b1');
 m.begin(a,nodes[3],'fly',env);m.advance(500,nodes,env);
 const flight=JSON.stringify(a),reserved=a.route.target;
 assert.equal(m.reflow(nodes,(actor,n)=>actor===a?n.id===a.node:n.id!==b.node),true);
 assert.notEqual(b.node,reserved);assert.equal(JSON.stringify(a),flight);assert.equal(m.reservations.get(reserved),a.id);
});
test('weighted choice excludes unavailable movement before drawing without changing action weights',()=>{
 const allowed=new Set(['rest','look','peck','preen','hop']);
 for(let n=0;n<1000;n++)assert.notEqual(weightedActorAction(n/1000,true,allowed),'fly');
 const m=createGardenActors('availability');m.reconcile(defs(1),nodes);const calls=[];
 m.advance(1000,nodes,{...env,safe:(a,n,kind)=>{calls.push(kind);return kind==='hop';}});
 assert.ok(calls.includes('fly'));assert.ok(calls.includes('hop'));assert.notEqual(m.actors.get('b0').state,'fly');
});
test('normal DOM order does not trap the accompanying lead behind four stationary friends',()=>{
 const m=createGardenActors('normal');const d=[...defs(4),{id:'lead',movable:true,canFly:true,initialFlight:true}];m.reconcile(d,nodes);
 assert.equal(m.actors.get('lead').node,nodes[0].id);
 const positions=[...m.actors.values()].map(a=>[a.id,a.node]);m.reconcile([...d,{id:'new',movable:false}],nodes);
 assert.deepEqual([...m.actors.values()].slice(0,5).map(a=>[a.id,a.node]),positions);
});
test('an arriving individual uses a free place outside a live route without resetting existing actors',()=>{
 const m=createGardenActors('arrival');m.reconcile(defs(2),nodes);const a=m.actors.get('b0');m.begin(a,nodes[3],'fly',env);m.advance(500,nodes,env);
 const before=JSON.stringify([...m.actors.values()]);m.reconcile(defs(3),nodes,(d,n)=>n.id==='7');
 assert.equal(m.actors.get('b2').node,'7');assert.equal(JSON.stringify([...m.actors.values()].slice(0,2)),before);assert.equal(m.reservations.get('3'),'b0');
});
test('late texture decode retains the initial lead intention briefly, failed decode falls back without hiding the bird',()=>{
 const m=createGardenActors('decode'),d={id:'lead',movable:true,canFly:false,initialFlight:true};m.reconcile([d],nodes);m.advance(1100,nodes,env);
 assert.equal(m.actors.get('lead').initialFlight,true);assert.equal(m.actors.get('lead').state,'look');m.reconcile([{...d,canFly:true}],nodes);m.advance(1200,nodes,env);assert.equal(m.actors.get('lead').state,'fly');
 const failed=createGardenActors('failed');failed.reconcile([d],nodes);failed.advance(4000,nodes,env);assert.equal(failed.actors.get('lead').initialFlight,false);assert.notEqual(failed.actors.get('lead').state,'fly');
});
test('route samples cover actual intermediate times, not repeated clamped endpoints',()=>{
 const m=createGardenActors('sampling');m.reconcile(defs(1),nodes);const a=m.actors.get('b0');m.begin(a,nodes[3],'fly',env);
 const samples=m.sampleRoute(a);assert.equal(samples.length,49);assert.deepEqual(samples[0].p,nodes[0].p);assert.deepEqual(samples.at(-1).p,nodes[3].p);
 assert.ok(samples[24].p[0]>nodes[0].p[0]&&samples[24].p[0]<nodes[3].p[0]);assert.ok(samples[24].height>.04);assert.ok(new Set(samples.map(f=>f.p[0])).size>30);
});
