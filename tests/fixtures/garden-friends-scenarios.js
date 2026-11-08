// Valid persisted scenarios shared by real-app browser tests and Node fixture validation.
import {createWorld,createBird,validateWorld,serializeWorld,parseSave} from '../../src/engine.js';
import {encounterSystem} from '../../src/encounters.js';
import {gardenFriendRoster} from '../../src/data/gardens.js';
import {arriveGardenCrow} from '../../src/garden-crows.js';
import {arriveGardenRaptor} from '../../src/garden-raptors.js';
export const FRIENDS_NOW=Date.UTC(2026,10,8);
const token=w=>({worldId:w.worldId,revision:w.revision,gardenId:w.encounters.garden.id});
export function friendsScenario(kind='standard',garden='kazaguruma'){
 if(kind==='raptor-harmless')garden='mizukagami';
 const w=createWorld(FRIENDS_NOW,42);encounterSystem.enterGarden(w,token(w));encounterSystem.selectGarden(w,garden,token(w));w.settings.careSound=false;w.settings.motion=false;
 if(kind==='long-juvenile'){
  const bird=createBird(w,{name:'こもれびのこはく',home:'departed',stage:'juvenile',color:'cinnamon'});
  w.birds[0].relations[bird.id]={affection:80,trust:80,compatibility:50,meetings:1,lastTick:w.tick};
  for(let i=0;i<30&&!gardenFriendRoster(w,garden).some(f=>f.birdId===bird.id);i++){encounterSystem.leaveGarden(w,token(w));encounterSystem.selectGarden(w,garden,token(w));}
  // Engine-valid captured visit: one known juvenile and three actual regulars cover all four colors.
  w.encounters.gardenFriends.visits.find(v=>v.gardenId===garden).friendIds=[...['white','silver','sakura'].map(color=>w.encounters.gardenFriends.regulars.find(r=>r.appearance.color===color).id),`known-${bird.id}`];
  const roster=gardenFriendRoster(w,garden);if(!roster.some(f=>f.birdId===bird.id))throw Error('Fixture failed to draw juvenile');
  for(const f of roster){const bond=[...w.encounters.gardenFriends.regulars,...w.encounters.gardenFriends.references].find(r=>r.id===f.friendId);bond.affinity=f.birdId?100:2;bond.memories=Array.from({length:12},(_,i)=>({kind:'chat',tick:w.tick,gardenId:garden,text:`記録${i}：木漏れ日の庭で、親しい友達とゆっくりおしゃべりをして、風に揺れる木の葉を一緒に眺めた。`}));}
 }
 if(kind==='empty')w.encounters.gardenFriends.visits.find(v=>v.gardenId===garden).friendIds=[];
 if(kind==='crow-hostile'||kind==='raptor-hostile'){w.encounters.gardenFriends.accompany=true;w.encounters.gardenFriends.companions=['b1'];w.encounters.gardenFriends.attendees=['b1'];}
 if(kind.startsWith('crow-')){const result=arriveGardenCrow(w,'large-billed-crow',FRIENDS_NOW,token(w));if(!result.changed)throw Error('Crow fixture refused');}
 if(kind.startsWith('raptor-')){const result=arriveGardenRaptor(w,kind==='raptor-harmless'?'osprey':'black-kite',FRIENDS_NOW,token(w));if(!result.changed)throw Error('Raptor fixture refused');}
 w.paused=true;validateWorld(w);if(serializeWorld(parseSave(serializeWorld(w)))!==serializeWorld(w))throw Error('Fixture roundtrip changed');return w;
}
