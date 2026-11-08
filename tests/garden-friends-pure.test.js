import {Window} from 'happy-dom';
import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,createBird,advanceTo,advanceTicks,validateWorld,serializeWorld,parseSave} from '../src/engine.js';import {createEncounterSystem} from '../src/encounters.js';import {ENCOUNTER_CANDIDATES} from '../src/data/encounter-catalog.js';import {GARDENS,gardenFriendRoster,gardenCompanionRoster} from '../src/data/gardens.js';import {GARDEN_REGULARS} from '../src/garden-friends.js';import {mountEncounterPanel} from '../src/encounter-controller.js';
import {renderFinchGarden} from '../src/encounter-ui.js';
const s=createEncounterSystem(ENCOUNTER_CANDIDATES),g=w=>({worldId:w.worldId,revision:w.revision});
const protectedState=w=>structuredClone({birds:w.birds,seed:w.seed,gems:w.gems,decor:w.decor,care:w.careSchedule,field:w.field});
test('each garden samples four distinct named friends and preserves their permanent identities',()=>{const now=1000,w=createWorld(now,842911);advanceTo(w,now+600000);assert.equal(GARDEN_REGULARS.length,18);for(const garden of GARDENS){s.selectGarden(w,garden.id,g(w));const roster=gardenFriendRoster(w,garden.id);assert.equal(roster.length,4);assert.equal(new Set(roster.map(r=>r.friendId)).size,4);for(const r of roster){assert.ok(r.name&&!/[0-9]/.test(r.name));assert.ok(w.encounters.gardenFriends.regulars.some(x=>x.id===r.friendId)||w.encounters.gardenFriends.references.some(x=>x.id===r.friendId));}}assert.equal(w.encounters.gardenFriends.regulars.length,18);validateWorld(w);});
test('all household birds becoming residents cannot erase friends or recorded acquaintance',()=>{const w=createWorld(1000);const close=createBird(w,{name:'こはく',home:'departed',stage:'adult'});w.birds[0].relations[close.id]={affection:80,trust:80,compatibility:50,meetings:1,lastTick:0};s.selectGarden(w,'komorebi',g(w));const known=w.encounters.gardenFriends.references[0],previous=structuredClone(known);for(const b of w.birds)b.home='resident';for(const garden of GARDENS){const roster=gardenFriendRoster(w,garden.id);assert.ok(roster.length>=3);assert.ok(!roster.some(r=>r.birdId===close.id));}assert.deepEqual(w.encounters.gardenFriends.references.find(r=>r.id===known.id),previous);assert.equal(w.encounters.gardenFriends.regulars.length,18);});
test('preferred activity earns real garden-only affinity with per-tick repeat protection and personal memory',()=>{const w=createWorld(1000);s.selectGarden(w,'komorebi',g(w));const regular=w.encounters.gardenFriends.regulars.find(r=>r.id===gardenFriendRoster(w,'komorebi')[0].friendId),before=protectedState(w);const result=s.meetGardenFriend(w,regular.id,regular.favorite,g(w));assert.equal(result.changed,true);assert.equal(result.affinityDelta,2);assert.equal(regular.affinity,2);assert.ok(regular.memories[0].text.includes(regular.preferredMemory));assert.equal(s.meetGardenFriend(w,regular.id,'chat',g(w)).reason,'repeat');assert.equal(regular.affinity,2);assert.deepEqual(protectedState(w),before);advanceTicks(w,1);const afterTick=protectedState(w);assert.equal(s.meetGardenFriend(w,regular.id,regular.favorite==='chat'?'watch':'chat',g(w)).affinityDelta,1);assert.equal(regular.affinity,3);assert.deepEqual(protectedState(w),afterTick);validateWorld(w);});
test('affinity capped and memory bounded, while other gardens and visit currencies stay independent',()=>{const w=createWorld(1000);s.selectGarden(w,'onsen',g(w));const r=w.encounters.gardenFriends.regulars.find(r=>r.id===gardenFriendRoster(w,'onsen')[0].friendId);r.affinity=99;assert.equal(s.meetGardenFriend(w,r.id,r.favorite,g(w)).affinityDelta,1);for(let i=0;i<16;i++){advanceTicks(w,1);s.meetGardenFriend(w,r.id,'chat',g(w));}assert.equal(r.affinity,100);assert.equal(r.memories.length,12);assert.ok(w.encounters.gardenFriends.regulars.filter(x=>x.id!==r.id).every(x=>x.affinity===0));});
test('family companions are separate and never change home, visitors or breeding records',()=>{const w=createWorld(1000);s.selectGarden(w,'komorebi',g(w));const before=protectedState(w);assert.ok(s.chooseCompanions(w,['b1'],g(w)).changed);assert.deepEqual(gardenCompanionRoster(w),[]);s.chooseAccompaniment(w,true,g(w));s.leaveGarden(w,g(w));s.enterGarden(w,g(w));assert.equal(gardenCompanionRoster(w)[0].birdId,'b1');assert.ok(!gardenFriendRoster(w,'komorebi').some(r=>r.birdId==='b1'));assert.deepEqual(protectedState(w),before);assert.equal(s.chooseCompanions(w,['not-a-bird'],g(w)).changed,false);assert.deepEqual(protectedState(w),before);});
test('friend state persists, malformed entries fail, full new world resets all bonds and rejects stale actions',()=>{const w=createWorld(1000);s.selectGarden(w,'komorebi',g(w));const r=w.encounters.gardenFriends.regulars[0];s.meetGardenFriend(w,r.id,'watch',g(w));const saved=parseSave(serializeWorld(w));assert.deepEqual(saved.encounters.gardenFriends,w.encounters.gardenFriends);const fresh=createWorld(2000);assert.ok(fresh.encounters.gardenFriends.regulars.every(x=>x.affinity===0&&x.memories.length===0));assert.equal(s.meetGardenFriend(fresh,r.id,'watch',g(w)).reason,'stale');const bad=structuredClone(w);bad.encounters.gardenFriends.regulars[0].affinity=101;assert.throws(()=>validateWorld(bad));});
test('render shows named regulars, actual garden affinity and separate family group without lookup crashes',()=>{const w=createWorld(1000);for(const garden of GARDENS){s.selectGarden(w,garden.id,g(w));const html=renderFinchGarden(w,{system:s});const win=new Window();try{win.document.body.innerHTML=html;const cards=win.document.querySelectorAll('[data-friend-card]');assert.equal(cards.length,gardenFriendRoster(w,garden.id).length);for(const card of cards){assert.ok(card.textContent.includes('庭のなかよし'));assert.equal(card.querySelector('meter').getAttribute('value'),'0');}}finally{win.happyDOM.abort();}assert.match(html,/いっしょに来た家族/);assert.ok(html.includes(gardenFriendRoster(w,garden.id)[0].name));assert.doesNotMatch(html,/undefined/);}});

test('controller module is importable without starting host, sound or network',()=>{assert.equal(typeof mountEncounterPanel,'function');});

test('changing an unselected companion does not reroll unrelated guests in a visit',()=>{
 const w=createWorld(1000);const bird=createBird(w,{name:'こはく',home:'resident',stage:'adult'});
 const birdId=typeof bird==='string'?bird:bird.id;
 let original;
 for(let i=0;i<20;i++){
  s.leaveGarden(w,g(w));s.selectGarden(w,'komorebi',g(w));original=gardenFriendRoster(w,'komorebi').map(r=>r.friendId);
  if(!original.includes(`known-${birdId}`))break;
 }
 assert.ok(!original.includes(`known-${birdId}`));const visit=w.encounters.garden.visits.komorebi,seed=w.seed;
 assert.ok(s.chooseCompanions(w,['b1',birdId],g(w)).changed);
 assert.deepEqual(gardenFriendRoster(w,'komorebi').map(r=>r.friendId),original);
 assert.deepEqual(gardenFriendRoster(parseSave(serializeWorld(w)),'komorebi').map(r=>r.friendId),original);
 assert.equal(w.encounters.garden.visits.komorebi,visit);assert.equal(w.seed,seed);
});

test('an unavailable close acquaintance is removed without replacing or reshuffling guests',()=>{
 const w=createWorld(1000),bird=createBird(w,{name:'こはく',home:'departed',stage:'adult'}),birdId=bird.id;
 w.birds[0].relations[birdId]={affection:80,trust:80,compatibility:50,meetings:1,lastTick:0};
 let original;
 for(let i=0;i<20;i++){s.leaveGarden(w,g(w));s.selectGarden(w,'komorebi',g(w));original=gardenFriendRoster(w,'komorebi').map(r=>r.friendId);if(original.includes(`known-${birdId}`))break;}
 assert.ok(original.includes(`known-${birdId}`));bird.home='resident';
 s.chooseCompanions(w,[birdId],g(w));const next=gardenFriendRoster(w,'komorebi').map(r=>r.friendId);
 assert.deepEqual(next,original.filter(id=>id!==`known-${birdId}`));assert.equal(next.length,3);
 assert.deepEqual(gardenCompanionRoster(w),[]);
});

test('new visits draw fresh regulars while household members never enter the random friend pool',()=>{
 const w=createWorld(1000,69);for(let i=0;i<4;i++)createBird(w,{name:`友達${i}`,home:'resident',stage:'adult'});
 s.selectGarden(w,'paris-unrest',g(w));s.chooseCompanions(w,['b2','b3','b4','b5'],g(w));
 for(let i=1;i<8;i++){s.leaveGarden(w,g(w));s.selectGarden(w,'paris-unrest',g(w));}
 const first=gardenFriendRoster(w,'paris-unrest').map(r=>r.friendId);validateWorld(w);
 s.leaveGarden(w,g(w));s.selectGarden(w,'paris-unrest',g(w));
 const next=gardenFriendRoster(w,'paris-unrest').map(r=>r.friendId);
 assert.notDeepEqual(new Set(next),new Set(first));assert.deepEqual(gardenFriendRoster(parseSave(serializeWorld(w)),'paris-unrest').map(r=>r.friendId),next);
});
