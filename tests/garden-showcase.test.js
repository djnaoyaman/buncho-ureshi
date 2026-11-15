import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../src/engine.js';
import {GARDEN_IDS} from '../src/data/gardens.js';
import {encounterSystem} from '../src/encounters.js';
import {leafEventStatus,leafEventToken,startLeafEvent,chooseLeafEvent,completeLeafEvent} from '../src/garden-leaf-event.js';
import {expeditionToken,startExpedition,chooseExpedition,completeExpedition} from '../src/garden-expedition.js';
import {SHOWCASE_THEMES,SHOWCASE_ITEMS,initialShowcase,showcaseToken,showcaseStatus,startShowcase,completeShowcase,buyShowcaseItem,validateShowcase} from '../src/garden-showcase.js';
const NOW=Date.parse('2026-11-13T12:00:00Z');
const ids=w=>w.encounters.gardenFriends.regulars.slice(0,2).map(r=>r.id);
function ready(){
 const w=createWorld(NOW,31);
 for(const id of GARDEN_IDS){encounterSystem.selectGarden(w,id,leafEventToken(w));if(leafEventStatus(w).available)break;}
 startLeafEvent(w,leafEventToken(w));chooseLeafEvent(w,'deliver',leafEventToken(w));encounterSystem.leaveGarden(w,leafEventToken(w));encounterSystem.enterGarden(w,leafEventToken(w));completeLeafEvent(w,leafEventToken(w));
 for(const r of w.encounters.gardenFriends.regulars)r.lastInteractionTick=0;
 startExpedition(w,'brook',ids(w),expeditionToken(w));chooseExpedition(w,'look',expeditionToken(w));completeExpedition(w,expeditionToken(w));
 assert.ok(showcaseStatus(w).unlocked);return w;
}
const start=(w,theme='song',itemId=null)=>{assert.equal(startShowcase(w,theme,ids(w),itemId,showcaseToken(w)).changed,true);return w;};
const finish=w=>{assert.equal(completeShowcase(w,showcaseToken(w)).changed,true);validateShowcase(w);return w;};
test('old saves remain untouched until valid action; unlock needs two known birds, leaf and expedition',()=>{
 const w=createWorld(NOW,31),before=structuredClone(w);assert.deepEqual(validateShowcase(w),initialShowcase());assert.equal(showcaseStatus(w).unlocked,false);assert.equal(startShowcase(w,'song',ids(w),null,showcaseToken(w)).changed,false);assert.equal(buyShowcaseItem(w,'bell','gold',showcaseToken(w)).changed,false);assert.deepEqual(w,before);
 for(const change of [w=>w.leafEvent.entry.completedTick=null,w=>w.expedition.entries=[],w=>w.encounters.gardenFriends.regulars.forEach(r=>r.lastInteractionTick=null)]){const x=ready();change(x);assert.equal(showcaseStatus(x).unlocked,false);assert.equal(startShowcase(x,'song',ids(x),null,showcaseToken(x)).changed,false);assert.equal(Object.hasOwn(x,'showcase'),false);}
});
test('free themes, no waiting, first all-theme completion awards five Gems once; replay cannot farm',()=>{
 const w=ready(),before=structuredClone(w),points=w.decor.points;
 for(const t of SHOWCASE_THEMES){start(w,t);finish(w);}
 assert.equal(w.decor.points,points+5);assert.equal(w.showcase.gemAward,5);assert.equal(w.showcase.entries.length,3);
 const earned=structuredClone(w);
 for(let n=0;n<100;n++){start(w,SHOWCASE_THEMES[n%3]);finish(w);}
 assert.deepEqual(w.showcase.entries,earned.showcase.entries);assert.equal(w.decor.points,points+5);assert.equal(w.economy.gold,before.economy.gold);assert.deepEqual(w.birds,before.birds);assert.deepEqual(w.gems,before.gems);assert.deepEqual(w.encounters,before.encounters);assert.deepEqual(w.expedition,before.expedition);assert.deepEqual(w.leafEvent,before.leafEvent);assert.equal(w.seed,before.seed);assert.equal(w.tick,before.tick);
});
test('stale and double claim tokens cannot mutate; different garden pauses until return',()=>{
 const w=ready(),old=showcaseToken(w);start(w);const before=structuredClone(w);
 assert.equal(completeShowcase(w,old).reason,'stale');assert.deepEqual(w,before);
 const garden=w.encounters.garden.id;w.encounters.garden.id=GARDEN_IDS.find(id=>id!==garden);assert.equal(completeShowcase(w,showcaseToken(w)).changed,false);w.encounters.garden.id=garden;finish(w);
 const completed=structuredClone(w);assert.equal(completeShowcase(w,showcaseToken(w)).changed,false);assert.deepEqual(w,completed);
});
test('pause, home, encounters and raptors preserve active stories without completing',()=>{
 for(const block of [w=>w.paused=true,w=>w.encounters.garden.open=false,w=>w.encounters.active={},w=>w.encounters.raptor.active={}]){const w=start(ready());block(w);const before=structuredClone(w);assert.equal(completeShowcase(w,showcaseToken(w)).changed,false);assert.equal(buyShowcaseItem(w,'bell','discovery',showcaseToken(w)).changed,false);assert.deepEqual(w,before);}
});
test('only two distinct interacted regulars and owned items may enter',()=>{
 const w=ready(),actors=ids(w);for(const bad of [[actors[0],actors[0]],[actors[0],'b1'],[actors[0]]])assert.equal(startShowcase(w,'song',bad,null,showcaseToken(w)).reason,'friends');
 assert.equal(startShowcase(w,'song',actors,'bell',showcaseToken(w)).reason,'item');assert.equal(startShowcase(w,'other',actors,null,showcaseToken(w)).changed,false);
 buyShowcaseItem(w,'bell','discovery',showcaseToken(w));start(w,'song','bell');assert.equal(w.showcase.active.discoveryId,'expedition-brook');finish(w);
});
test('three permanent props: affordable Gold OR discovery pattern; memories are never consumed',()=>{
 const w=ready(),expedition=structuredClone(w.expedition),startGold=w.economy.gold;
 assert.equal(buyShowcaseItem(w,'bell','gold',showcaseToken(w)).reason,'gold');
 assert.equal(buyShowcaseItem(w,'frame','discovery',showcaseToken(w)).reason,'discovery');
 assert.equal(buyShowcaseItem(w,'bell','discovery',showcaseToken(w)).changed,true);assert.equal(w.economy.gold,startGold);assert.deepEqual(w.expedition,expedition);
 w.economy.gold=12;w.economy.lifetimeGold=Math.max(12,w.economy.lifetimeGold);for(const id of ['frame','ribbon'])assert.equal(buyShowcaseItem(w,id,'gold',showcaseToken(w)).changed,true);
 assert.equal(w.economy.gold,0);validateShowcase(w);const before=structuredClone(w);
 for(const offer of SHOWCASE_ITEMS)for(const payment of ['gold','discovery'])assert.equal(buyShowcaseItem(w,offer.id,payment,showcaseToken(w)).changed,false);
 assert.deepEqual(w,before);assert.equal(buyShowcaseItem(w,'bell','resale',showcaseToken(w)).changed,false);
});
test('Gems cap cannot overflow or be claimed again after spending',()=>{
 const w=ready();w.decor.points=w.decor.lifetimePoints=999999999;for(const t of SHOWCASE_THEMES)finish(start(w,t));assert.equal(w.decor.points,1e9);assert.equal(w.showcase.gemAward,1);w.decor.points-=20;finish(start(w,'song'));assert.equal(w.decor.points,1e9-20);
});
test('strict schema rejects forged themes, props, purchases and outcomes',()=>{
 const source=finish(start(ready()));
 for(const change of [w=>w.showcase.extra=1,w=>w.showcase.entries[0].theme='fake',w=>w.showcase.entries.push(structuredClone(w.showcase.entries[0])),w=>w.showcase.entries[0].itemId='bell',w=>w.showcase.entries[0].discoveryId='fake',w=>w.showcase.entries[0].actorIds=['x','y'],w=>w.showcase.entries[0].completedTick=null,w=>w.showcase.gemAward=5,w=>w.showcase.active.startedTick=w.tick+1,w=>w.showcase.purchases.push({itemId:'bell',payment:'gold',goldPaid:0,discoveryId:null,tick:0})]){const w=structuredClone(source);change(w);assert.throws(()=>validateShowcase(w));}
});
test('fresh-state IndexedDB transactions prevent duplicate Gems and charges and roll back disk failure',async()=>{
 const {IDBFactory}=await import('fake-indexeddb');const {openGameStore}=await import('../src/game-store.js');const indexedDB=new IDBFactory(),a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});
 try{
  const w=ready();finish(start(w,'song'));finish(start(w,'discovery'));start(w,'style');await a.transact(()=>w);const before=await a.transact(w=>w),token=showcaseToken(before);let x,y;
  await assert.rejects(a.transact(w=>{completeShowcase(w,token);throw Error('disk full');}));assert.deepEqual(await b.transact(w=>w),before);
  await Promise.all([a.transact(w=>{x=completeShowcase(w,token);return w;}),b.transact(w=>{y=completeShowcase(w,token);return w;})]);assert.equal(Number(x.changed)+Number(y.changed),1);const after=await a.transact(w=>w);assert.equal(after.decor.points,before.decor.points+5);
  await a.transact(w=>{w.economy.gold=12;w.economy.lifetimeGold=Math.max(12,w.economy.lifetimeGold);w.revision++;return w;});const buyToken=showcaseToken(await a.transact(w=>w));await Promise.all([a.transact(w=>{x=buyShowcaseItem(w,'bell','gold',buyToken);return w;}),b.transact(w=>{y=buyShowcaseItem(w,'bell','gold',buyToken);return w;})]);assert.equal(Number(x.changed)+Number(y.changed),1);assert.equal((await a.transact(w=>w)).economy.gold,6);
 }finally{a.close();b.close();}
});
