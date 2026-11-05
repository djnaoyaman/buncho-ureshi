import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,independenceCandidates,acceptIndependence,economyToken,advanceTicks,validateWorld,serializeWorld,parseSave,inviteFriend,adoptBird,collectDropping,bumpRevision,setAdoptionMode,endHomeVisits} from '../src/engine.js';
import {lifeStatus} from '../src/life-care.js';
import {openGameStore,STORAGE_KEY} from '../src/game-store.js';
const NOW=Date.UTC(2026,10,5),DAY=86400000,clone=x=>structuredClone(x);
function family(count=6){const w=createWorld(NOW);for(let i=1;i<count;i++)createBird(w,{home:'resident',name:`家族${i}`,sex:i%2?'male':'female'});return w;}
function pair(w,a,b){a.partner=b.id;b.partner=a.id;a.pairTick=b.pairTick=w.tick;}
const choose=w=>independenceCandidates(w)[0];

test('six residents offer a read-only conversation and one accepted adult frees a slot without deletion',()=>{
 const w=family(),b=w.birds[1];b.parents=['b1','b3'];b.generation=1;w.birds[2].sex='male';
 b.memories=[{kind:'play',otherId:'b4',tick:0}];b.milestones=[{kind:'adopt',otherId:null,tick:0}];
 b.relations.b4={affection:80,trust:70,compatibility:60,meetings:4,lastTick:0};
 w.birds[0].action={kind:'play',target:b.id,startedTick:0};w.encounters.gardenFriends.companions=[b.id,'b3'];
 w.tick=2;w.gems.droppings=[{id:'drop-1',birdId:b.id,createdTick:2,location:'home'}];w.gems.nextDropId=2;b.gemCare.lastDropTick=2;
 const before=clone(w),g=choose(w);assert.deepEqual(w,before);assert.deepEqual(g.ids,[b.id]);
 const token=economyToken(w),r=acceptIndependence(w,g.ids,token,NOW);assert.equal(r.changed,true);assert.equal(w.birds.length,6);assert.equal(w.birds.filter(x=>x.home==='resident').length,5);
 for(const bird of w.birds){const prior=before.birds.find(x=>x.id===bird.id);for(const k of ['id','name','naming','parents','partner','pairTick','relations','needs','care','gemCare'])assert.deepEqual(bird[k],prior[k],k);}
 for(const key of ['gems','decor','economy','care','careSchedule','lifecycle','protagonist'])assert.deepEqual(w[key],before[key],key);
 assert.deepEqual(b.memories.slice(0,-1),before.birds[1].memories);assert.deepEqual(b.milestones.slice(0,-1),before.birds[1].milestones);assert.equal(b.milestones.at(-1).kind,'depart');
 assert.equal(w.events.at(-1).kind,'depart');assert.match(w.events.at(-1).condition,/承諾/);assert.equal(w.birds[0].action.target,null);assert.deepEqual(w.encounters.gardenFriends.companions,['b3']);
 assert.deepEqual(parseSave(serializeWorld(w)),w);validateWorld(w);
 const after=clone(w);assert.equal(acceptIndependence(w,g.ids,token,NOW).reason,'stale');assert.equal(acceptIndependence(w,g.ids,economyToken(w),NOW).changed,false);assert.deepEqual(w,after);
 assert.equal(collectDropping(w,'drop-1',w.revision).gemAward,8);const guest=createBird(w,{home:'visitor'});adoptBird(w,guest.id);assert.equal(w.birds.filter(x=>x.home==='resident').length,6);validateWorld(w);
});

test('time alone never moves residents, including preserved legacy households of seven to ten',()=>{
 for(const count of [6,7,8,9,10]){const w=family(count),ids=w.birds.map(b=>b.id);advanceTicks(w,500,NOW);assert.equal(w.birds.filter(b=>b.home==='resident').length,count);for(const id of ids)assert.equal(w.birds.find(b=>b.id===id).home,'resident');assert.deepEqual(parseSave(serializeWorld(w)).birds,w.birds);validateWorld(w);}
});

test('current protagonist and mate remain protected after succession and roster reordering',()=>{
 const w=family(),first=w.birds[0],next=w.birds[2],mate=w.birds[3];next.parents=[first.id,'b2'];next.generation=1;pair(w,next,mate);
 lifeStatus(w,first).death={cause:'accident',at:NOW,tick:0};first.home='departed';w.protagonist={version:2,birdId:next.id,lineage:['b1',next.id],familySelections:[]};createBird(w,{home:'resident'});w.birds.reverse();validateWorld(w);
 const ids=independenceCandidates(w).flatMap(g=>g.ids);assert.ok(!ids.includes(next.id));assert.ok(!ids.includes(mate.id));assert.ok(!ids.includes(first.id));assert.ok(ids.length);
});

test('living dependents protect both parents; eggs chicks juveniles and illness are not candidates',()=>{
 for(const stage of ['egg','chick','juvenile']){const w=family();const child=w.birds[3];child.stage=stage;child.parents=['b3','b2'];child.generation=1;w.birds[1].sex='male';w.birds[2].sex='female';let ids=independenceCandidates(w).flatMap(g=>g.ids);for(const id of ['b1','b2','b3',child.id])assert.ok(!ids.includes(id));lifeStatus(w,child).death={cause:'illness',at:NOW,tick:0};child.home='departed';createBird(w,{home:'resident'});ids=independenceCandidates(w).flatMap(g=>g.ids);assert.ok(ids.includes('b2'));assert.ok(ids.includes('b3'));validateWorld(w);}
 const w=family();lifeStatus(w,'b2').condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};assert.ok(!independenceCandidates(w).flatMap(g=>g.ids).includes('b2'));validateWorld(w);
});

test('couples move atomically, preserving reciprocal pair links and history after reload',()=>{
 const w=family(),a=w.birds[1],b=w.birds[2];pair(w,a,b);const g=choose(w);assert.deepEqual(g.ids,[a.id,b.id]);
 for(const ids of [[a.id],[b.id],[a.id,a.id],[a.id,b.id,'b4'],['missing'],null]){const before=clone(w);assert.equal(acceptIndependence(w,ids,economyToken(w),NOW).changed,false);assert.deepEqual(w,before);}
 assert.equal(acceptIndependence(w,[b.id,a.id],economyToken(w),NOW).changed,true);assert.equal(a.home,'departed');assert.equal(b.home,'departed');assert.equal(a.partner,b.id);assert.equal(b.partner,a.id);assert.equal(w.events.filter(e=>e.kind==='depart').length,1);assert.deepEqual(parseSave(serializeWorld(w)),w);
});

test('a protected, ill or visiting partner excludes both members from a proposal',()=>{
 for(const kind of ['protagonist','ill','visitor']){const w=family(),a=w.birds[1],b=kind==='protagonist'?w.birds[0]:w.birds[2];pair(w,a,b);if(kind==='ill')lifeStatus(w,b).condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};if(kind==='visitor'){b.home='visitor';createBird(w,{home:'resident'});}assert.ok(!independenceCandidates(w).some(g=>g.ids.includes(a.id)));validateWorld(w);}
});

test('tokens, changed groups, garden danger and lower occupancy cannot authorize a move',()=>{
 for(const token of [undefined,{worldId:'another',revision:0},{worldId:family().worldId,revision:99}]){const w=family(),before=clone(w);assert.equal(acceptIndependence(w,['b2'],token,NOW).reason,'stale');assert.deepEqual(w,before);}
 for(const alter of [w=>w.field.place='park',w=>w.encounters.garden.open=true,w=>w.birds.pop(),w=>pair(w,w.birds[1],w.birds[2])]){const w=family();alter(w);const before=clone(w);assert.equal(acceptIndependence(w,['b2'],economyToken(w),NOW).changed,false);assert.deepEqual(w,before);}
 const w=family();w.revision=Number.MAX_SAFE_INTEGER;assert.equal(acceptIndependence(w,['b2'],economyToken(w),NOW).changed,true);assert.equal(w.revision,0);validateWorld(w);
});

test('fresh life synchronization blocks newly ill adults and cannot bypass death deadlines',()=>{
 const w=family();w.care.cleanliness=0;lifeStatus(w,'b2').dirtySinceAt=NOW-DAY;const r=acceptIndependence(w,['b2'],economyToken(w),NOW);assert.equal(r.changed,false);assert.equal(w.birds[1].home,'resident');assert.ok(lifeStatus(w,'b2').condition);assert.equal(w.events.some(e=>e.kind==='depart'),false);validateWorld(w);
 const overdue=family();assert.equal(acceptIndependence(overdue,['b2'],economyToken(overdue),NOW+3*DAY).changed,false);assert.equal(lifeStatus(overdue,'b2').death.cause,'neglect');assert.equal(overdue.events.some(e=>e.kind==='depart'),false);validateWorld(overdue);
});

test('independent friends can revisit but cannot silently move back in, even in auto mode',()=>{
 for(const mode of ['ask','auto']){const w=family();acceptIndependence(w,['b2'],economyToken(w),NOW);setAdoptionMode(w,mode,economyToken(w));endHomeVisits(w,economyToken(w),NOW);inviteFriend(w,'b2');const b=w.birds[1];b.personality.sociability=100;b.needs.play=0;for(const other of w.birds.filter(x=>x.home==='resident')){b.relations[other.id]={affection:90,trust:90,compatibility:90,meetings:20,lastTick:0};other.relations[b.id]=clone(b.relations[other.id]);}advanceTicks(w,30,NOW);assert.equal(b.home,'visitor');assert.notEqual(w.adoption.pending?.birdId,b.id);assert.ok(w.adoption.dismissed.includes(b.id));assert.deepEqual(parseSave(serializeWorld(w)),w);adoptBird(w,b.id);assert.equal(b.home,'resident');validateWorld(w);}
});

test('two IndexedDB acceptances commit once and a failed transaction preserves source',async()=>{
 const indexedDB=new IDBFactory(),a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});try{let w=await a.transact(()=>family());const token=economyToken(w);let changed=0;await Promise.all([a,b].map(s=>s.transact(x=>{changed+=Number(acceptIndependence(x,['b2'],token,NOW).changed);return x;})));w=await a.transact(x=>x);assert.equal(changed,1);assert.equal(w.events.filter(e=>e.kind==='depart').length,1);const before=await a.transact(()=>family());await assert.rejects(b.transact(x=>{acceptIndependence(x,['b2'],economyToken(x),NOW);throw Error('save failed');}));assert.deepEqual(await a.transact(x=>x),before);}finally{a.close();b.close();}
});

test('life synchronization protects the newly succeeded protagonist and mate before applying consent',()=>{
 const w=family(7),child=w.birds[2],mate=w.birds[3];child.parents=['b1','b2'];child.generation=1;pair(w,child,mate);lifeStatus(w,'b1').condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};validateWorld(w);
 assert.ok(independenceCandidates(w).some(g=>g.ids.includes(child.id)));const result=acceptIndependence(w,[child.id,mate.id],economyToken(w),NOW+DAY);
 assert.equal(result.changed,false);assert.equal(w.protagonist.birdId,child.id);assert.equal(child.home,'resident');assert.equal(mate.home,'resident');assert.equal(w.birds.filter(b=>b.home==='resident').length,6);assert.equal(w.events.some(e=>e.kind==='depart'),false);validateWorld(w);
});
