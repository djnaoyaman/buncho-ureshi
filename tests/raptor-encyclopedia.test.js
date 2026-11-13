import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,validateWorld,serializeWorld,parseSave} from '../src/engine.js';
import {RAPTOR_SPECIES,RAPTOR_RULES,arriveGardenRaptor,escapeGardenRaptor,remainWithGardenRaptor,petGardenRaptor,raptorToken,raptorFriendship,raptorReturnChoicePending,raptorScene,advanceRaptorState} from '../src/garden-raptors.js';
import {renderRaptorCatalog,renderRaptorNotebook,renderRaptorNotice} from '../src/garden-raptor-ui.js';
const NOW=Date.UTC(2026,10,13);
function garden(w){w.field.place='park';w.encounters.garden.open=true;w.encounters.garden.id='mizukagami';w.encounters.gardenFriends.attendees=['b1'];return w;}
function arrive(w,id,now=NOW){return arriveGardenRaptor(w,id,now,{...raptorToken(w),gardenId:w.encounters.garden.id});}
function documentFor(html){const win=new Window();win.document.body.innerHTML=html;return win;}
for(const species of RAPTOR_SPECIES)test(`${species.id}: arrival unlocks encyclopedia before choice; immediate home and save preserve discovery`,()=>{
 let w=garden(createWorld(NOW));let win=documentFor(renderRaptorCatalog(w));
 assert.equal(win.document.querySelector(`[data-raptor-entry="${species.id}"]`).disabled,true);win.happyDOM.abort();
 assert.equal(arrive(w,species.id).changed,true);assert.equal(raptorFriendship(w,species.id).discovered,true);
 assert.equal(raptorReturnChoicePending(w),!species.harmless);
 const visits=structuredClone(w.encounters.raptor.visits);
 assert.equal(escapeGardenRaptor(w,raptorToken(w)).changed,true);
 w=parseSave(serializeWorld(w));validateWorld(w);assert.deepEqual(w.encounters.raptor.visits,visits);assert.equal(w.field.place,'home');assert.equal(w.encounters.raptor.active,null);
 win=documentFor(renderRaptorCatalog(w)+renderRaptorNotebook(w,{id:species.id}));
 const card=win.document.querySelector(`[data-raptor-entry="${species.id}"]`);
 assert.equal(card.disabled,false);assert.equal(card.querySelector('img').classList.contains('is-silhouette'),false);assert.match(card.textContent,new RegExp(species.name));
 assert.ok(win.document.querySelector(`[data-encounter-rub="${species.id}"]`));assert.match(win.document.body.textContent,/庭で会った回数 1 回/);win.happyDOM.abort();
});
test('remaining permits friendship, friendly later visits retain the record without a danger question',()=>{
 let w=garden(createWorld(NOW));assert.equal(arrive(w,'black-kite').changed,true);
 assert.equal(remainWithGardenRaptor(w,NOW+1000,raptorToken(w)).changed,true);
 for(let i=0;i<13;i++)assert.equal(petGardenRaptor(w,'black-kite',8,raptorToken(w)).changed,true);
 assert.equal(raptorFriendship(w,'black-kite').friendly,true);assert.equal(raptorReturnChoicePending(w),false);assert.equal(raptorScene(w).phase,'visiting');
 assert.match(renderRaptorNotice(w),/もうなかよしだから、襲わないよ/);
 assert.equal(escapeGardenRaptor(w,raptorToken(w)).changed,true);
 w=parseSave(serializeWorld(w));garden(w);
 assert.equal(arrive(w,'black-kite',NOW+RAPTOR_RULES.visitCooldownMs-1).reason,'cooldown');
 assert.equal(arrive(w,'black-kite',NOW+RAPTOR_RULES.visitCooldownMs).changed,true);
 assert.equal(w.encounters.raptor.visits.length,1);assert.equal(w.encounters.raptor.visits[0].count,2);assert.equal(w.encounters.raptor.visits[0].petPoints,104);
 assert.equal(raptorScene(w).hostile,false);assert.equal(raptorReturnChoicePending(w),false);validateWorld(w);
});
test('harmless osprey still displays nonhostile water visitor and leaves naturally without losing its entry',()=>{
 let w=garden(createWorld(NOW));assert.equal(arrive(w,'osprey').changed,true);
 assert.equal(raptorReturnChoicePending(w),false);assert.match(renderRaptorNotice(w),/魚を捕る水辺の仲間。文鳥は襲わないよ/);
 assert.doesNotMatch(renderRaptorNotice(w),/あと <b/);
 for(let i=1;i<=18;i++)advanceRaptorState(w,1000,NOW+i*1000,raptorToken(w));
 assert.equal(w.encounters.raptor.active,null);w=parseSave(serializeWorld(w));validateWorld(w);
 assert.equal(raptorFriendship(w,'osprey').discovered,true);assert.match(renderRaptorNotebook(w,{id:'osprey'}),/ミサゴは最初から文鳥を襲いません/);
});
