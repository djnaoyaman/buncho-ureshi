import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,createBird} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {gardenFriendRoster} from '../src/data/gardens.js';
import {RAPTOR_SPECIES,RAPTOR_RULES,arriveGardenRaptor,raptorToken,petGardenRaptor} from '../src/garden-raptors.js';
import {RAPTOR_ART,JAVA_LENGTH_AXIS} from '../src/data/raptor-art.js';
import {CROW_SPECIES,CROW_RULES,JAVA_LENGTH_CM,arriveGardenCrow,petGardenCrow} from '../src/garden-crows.js';
import {renderRaptorScene,renderRaptorNotice,updateRaptorNotice} from '../src/garden-raptor-ui.js';
import {CROW_ART,JAVA_ART_LENGTH,renderCrowScene,renderCrowNotice} from '../src/garden-crow-ui.js';
import {renderGardenStage,renderFinchGarden} from '../src/encounter-ui.js';

const NOW=Date.UTC(2026,10,7,9);
const token=w=>({...raptorToken(w),gardenId:w.encounters.garden.id});
function fixture({attendees=[]}={}){
 const w=createWorld(NOW,42);
 w.encounters.garden.open=true;w.field.place='park';
 w.encounters.gardenFriends.attendees=[...attendees];
 return w;
}
function dom(html,check){
 const win=new Window();
 try{win.document.body.innerHTML=html;check(win.document.body);}
 finally{win.happyDOM.abort();}
}
const scenarios=[
 {kind:'raptor',id:'black-kite',arrive:arriveGardenRaptor,render:w=>renderRaptorScene(w),notice:w=>renderRaptorNotice(w)},
 {kind:'crow',id:'large-billed-crow',arrive:arriveGardenCrow,render:w=>renderCrowScene(w,{now:NOW}),notice:w=>renderCrowNotice(w,{now:NOW})},
];

for(const s of RAPTOR_SPECIES)test(`targetless ${s.id} renders alone with the unchanged white Java scale baseline`,()=>{
 const w=fixture();w.birds[0].color='cinnamon';w.birds[0].name='お留守番の主人公';
 if(s.waterOnly)w.encounters.garden.id='mizukagami';
 assert.equal(arriveGardenRaptor(w,s.id,NOW,token(w)).changed,true);
 assert.equal(w.encounters.raptor.active.targetBirdId,null);
 const before=structuredClone(w);
 dom(renderRaptorScene(w),root=>{
  const scene=root.querySelector('.finch-raptor-scale-scene'),art=RAPTOR_ART[s.id];
  assert.ok(scene);assert.equal(scene.dataset.raptorSpecies,s.id);
  assert.equal(root.querySelector('.finch-raptor-java'),null);
  assert.equal(root.querySelectorAll('img').length,1);
  assert.equal(root.querySelector('.finch-raptor-actor img').getAttribute('src'),`/buncho-ureshi/game-art/raptors/${s.id}.webp`);
  assert.match(scene.getAttribute('aria-label'),/文鳥約14cmを基準/);
  assert.doesNotMatch(root.innerHTML,/お留守番の主人公|raptor-protagonist/);
  const ratio=s.lengthCm/JAVA_LENGTH_CM,canvas=ratio*JAVA_LENGTH_AXIS.white/(art.lengthPx/art.width);
  assert.equal(Number(scene.style.getPropertyValue('--raptor-canvas-ratio')),canvas);
  assert.equal(Number(scene.style.getPropertyValue('--raptor-span')),Math.max(2.6,1.5+canvas));
  assert.equal(Number(scene.style.getPropertyValue('--raptor-height')),Math.max(1.2,canvas*art.height/art.width*art.footY));
  assert.equal(scene.style.getPropertyValue('--raptor-aspect'),`${art.width}/${art.height}`);
  assert.equal(!!root.querySelector('.finch-raptor-fish'),s.harmless);
 });
 assert.deepEqual(w,before);
});

for(const s of CROW_SPECIES)test(`targetless ${s.id} renders alone with the unchanged white Java scale baseline`,()=>{
 const w=fixture();w.birds[0].color='cinnamon';w.birds[0].name='お留守番の主人公';
 assert.equal(arriveGardenCrow(w,s.id,NOW,token(w)).changed,true);
 assert.equal(w.encounters.crow.arrivalBirdId,null);
 const before=structuredClone(w);
 dom(renderCrowScene(w,{now:NOW}),root=>{
  const scene=root.querySelector('.finch-crow-scale-scene'),actor=root.querySelector('.finch-crow-actor');
  assert.ok(scene);assert.equal(scene.dataset.crowSpecies,s.id);
  assert.equal(root.querySelector('.finch-crow-java'),null);
  assert.equal(root.querySelectorAll('img').length,1);
  assert.equal(actor.querySelector('img').getAttribute('src'),`/buncho-ureshi/game-art/crows/${s.id}.webp`);
  assert.match(scene.getAttribute('aria-label'),/文鳥約14cmを基準/);
  assert.doesNotMatch(root.innerHTML,/お留守番の主人公|crow-omochi/);
  assert.equal(Number(actor.style.getPropertyValue('--crow-ratio')),s.lengthCm/JAVA_LENGTH_CM*JAVA_ART_LENGTH.white/CROW_ART[s.id].artWidthFraction);
  assert.equal(Number(actor.style.getPropertyValue('--crow-foot-y')),CROW_ART[s.id].footY);
 });
 assert.deepEqual(w,before);
});

for(const s of scenarios){
 test(`targetless ${s.kind} preserves every real companion, friend and guest without adding a protagonist`,()=>{
  const w=fixture(),other=createBird(w,{home:'resident',stage:'adult',name:'同行の家族',color:'silver'});
  w.encounters.gardenFriends.attendees=[other.id];
  const guest=encounterSystem.catalog[0];
  w.encounters.garden.lastGuest=guest.id;w.encounters.garden.guestGardenId=w.encounters.garden.id;
  const friends=gardenFriendRoster(w,w.encounters.garden.id).map(f=>f.friendId);
  assert.equal(s.arrive(w,s.id,NOW,token(w)).changed,true);
  const before=structuredClone(w);
  dom(renderGardenStage(w,{now:NOW}),root=>{
   assert.equal(root.querySelectorAll(`.finch-${s.kind}-actor`).length,1);
   assert.equal(root.querySelector(`.finch-${s.kind}-java`),null);
   assert.deepEqual([...root.querySelectorAll('[data-garden-household]')].map(n=>n.dataset.gardenHousehold),[other.id]);
   assert.deepEqual([...root.querySelectorAll('[data-garden-friend]')].map(n=>n.dataset.gardenFriend),friends);
   assert.equal(root.querySelector('.finch-garden-visitor').dataset.encounterPage,guest.id);
   assert.equal(Number(root.querySelector('[data-garden-count]').dataset.gardenCount),friends.length+2);
  });
  assert.deepEqual(w,before);
 });
 test(`saved targetless ${s.kind} never substitutes or hides a protagonist who attends later`,()=>{
  let w=fixture();assert.equal(s.arrive(w,s.id,NOW,token(w)).changed,true);
  w=JSON.parse(JSON.stringify(w));
  w.birds[0].name='あとから同行した主人公';w.birds[0].color='sakura';
  w.encounters.gardenFriends.attendees=['b1'];
  const before=structuredClone(w);
  dom(renderGardenStage(w,{now:NOW}),root=>{
   assert.equal(root.querySelector(`.finch-${s.kind}-java`),null);
   assert.equal(root.querySelectorAll('[data-garden-household="b1"]').length,1);
   assert.ok(root.querySelector(`.finch-${s.kind}-actor`));
   assert.doesNotMatch(root.querySelector(`.finch-${s.kind}-scale-scene`).getAttribute('aria-label'),/あとから同行した主人公/);
  });
  assert.doesNotMatch(s.notice(w),/なかよし|事故死|元気は半分|友達は安全な場所/);
  assert.deepEqual(w,before);
 });
 test(`targetless unfamiliar ${s.kind} uses neutral text and keeps its home action`,()=>{
  const w=fixture();assert.equal(s.arrive(w,s.id,NOW,token(w)).changed,true);
  const before=structuredClone(w);
  dom(s.notice(w),root=>{
   assert.match(root.textContent,/庭を訪れています/);
   assert.doesNotMatch(root.textContent,/なかよし|襲わない|事故死|元気は半分|友達は安全な場所/);
   assert.ok(root.querySelector(s.kind==='raptor'?'[data-game-raptor-home]':'[data-finch-go-home]'));
   assert.equal(root.querySelector('[data-raptor-seconds]'),null);
  });
  assert.deepEqual(w,before);
 });
 test(`an actually friendly targetless ${s.kind} keeps its friendly notice`,()=>{
  const w=fixture();s.arrive(w,s.id,NOW,token(w));
  for(let i=0;i<13;i++)(s.kind==='raptor'?petGardenRaptor:petGardenCrow)(w,s.id,8,token(w));
  assert.match(s.notice(w),/なかよし/);
  assert.doesNotMatch(s.notice(w),/事故死|元気は半分|庭を訪れています/);
  assert.doesNotMatch(s.render(w),new RegExp(`finch-${s.kind}-java`));
 });
}

test('targetless osprey keeps its harmless-water notice without claiming earned friendship',()=>{
 const w=fixture();w.encounters.garden.id='mizukagami';arriveGardenRaptor(w,'osprey',NOW,token(w));
 const notice=renderRaptorNotice(w);
 assert.match(notice,/が水辺に来たよ/);assert.match(notice,/魚を捕る水辺の仲間。文鳥は襲わない/);
 assert.doesNotMatch(notice,/もうなかよし|事故死|data-raptor-seconds/);
});

test('a targetless raptor notice updates when petting earns real friendship without changing phase',()=>{
 const w=fixture();arriveGardenRaptor(w,'black-kite',NOW,token(w));
 dom(renderRaptorNotice(w),root=>{
  assert.match(root.textContent,/庭を訪れています/);
  for(let i=0;i<13;i++)petGardenRaptor(w,'black-kite',8,token(w));
  updateRaptorNotice(root,w);
  assert.equal(root.querySelector('[data-raptor-notice]').dataset.raptorPhase,'visiting');
  assert.match(root.textContent,/もうなかよしだから、襲わない/);
  assert.doesNotMatch(root.textContent,/庭を訪れています/);
 });
});

test('existing hostile raptor keeps its exact target, countdown, danger instruction and home action',()=>{
 const w=fixture({attendees:['b1']}),name='本人<&';w.birds[0].name=name;w.birds[0].color='silver';
 assert.equal(arriveGardenRaptor(w,'black-kite',NOW,token(w)).hostile,true);
 dom(renderRaptorNotice(w),root=>{
  assert.equal(root.querySelector('[data-raptor-seconds]').textContent,String(RAPTOR_RULES.warningMs/1000));
  assert.match(root.textContent,/本人<&をおうちへ。間に合わないと事故死してしまいます。/);
  assert.ok(root.querySelector('.is-danger[data-raptor-phase="warning"]'));
  assert.ok(root.querySelector('[data-game-raptor-home]'));
 });
 dom(renderGardenStage(w,{now:NOW}),root=>{
  assert.equal(root.querySelectorAll('.finch-raptor-java').length,1);
  assert.match(root.querySelector('.finch-raptor-java').textContent,/本人<&/);
  assert.equal(root.querySelectorAll('[data-garden-household],[data-garden-friend]').length,0);
 });
});

test('existing hostile crow keeps its exact target, damage instruction, retreat and home action',()=>{
 const w=fixture({attendees:['b1']}),name='本人<&';w.birds[0].name=name;
 assert.equal(arriveGardenCrow(w,'large-billed-crow',NOW,token(w)).hostile,true);
 dom(renderCrowNotice(w,{now:NOW}),root=>{
  assert.match(root.textContent,/友達は安全な場所へ。本人<&の元気は半分に。/);
  assert.ok(root.querySelector('[data-finch-go-home]'));
 });
 dom(renderGardenStage(w,{now:NOW}),root=>{
  assert.equal(root.querySelectorAll('.finch-crow-java').length,1);
  assert.match(root.querySelector('.finch-crow-java').textContent,/本人<&/);
  assert.equal(root.querySelectorAll('[data-garden-household],[data-garden-friend]').length,0);
 });
 assert.equal(renderCrowScene(w,{now:NOW+CROW_RULES.visitMs}),'');
 assert.match(renderCrowNotice(w,{now:NOW+CROW_RULES.visitMs}),/友達は少し休んでいるよ/);
});

test('targetless crow departure does not invent a retreat or friendship',()=>{
 const w=fixture();arriveGardenCrow(w,'large-billed-crow',NOW,token(w));
 const now=NOW+CROW_RULES.visitMs;
 assert.equal(renderCrowScene(w,{now}),'');
 assert.match(renderCrowNotice(w,{now}),/カラスは飛んでいったよ/);
 assert.doesNotMatch(renderCrowNotice(w,{now}),/なかよし|元気は半分|友達は少し休んでいるよ/);
 assert.equal(renderCrowNotice(w,{now:NOW+CROW_RULES.retreatMs}),'');
});

test('garden help distinguishes arrival from the saved attending protagonist target',()=>{
 const w=fixture();
 dom(renderFinchGarden(w,{now:NOW}),root=>{
  const help=root.querySelector('[data-garden-details="about"]').textContent;
  assert.match(help,/カラスも猛禽類も、主人公が同行していない庭にも来ます/);
  assert.match(help,/来訪時に同行している主人公だけが標的になります/);
  assert.match(help,/おうちで留守番している文鳥は狙われません/);
 });
});
