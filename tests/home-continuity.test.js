import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,createBird,treatBird,hireCaretaker,economyToken,advanceTo,prepareWorldReplacement,validateWorld,serializeWorld,parseSave,travelTo} from '../src/engine.js';
import {lifeStatus} from '../src/life-care.js';
import {homeAtmosphere,homeIdlePose} from '../src/home-atmosphere.js';
import {homeCareResponse} from '../src/home-care-response.js';
const NOW=Date.UTC(2026,10,16),DAY=86400000;
function world(){const w=createWorld(NOW,42);w.paused=true;w.economy.gold=w.economy.lifetimeGold=500;return w;}
function inspect(w){const before=serializeWorld(w);for(const b of w.birds)for(const panel of ['garden','diary','memorial','decorate','health','outdoors','friends','notebook','settings']){const a=homeAtmosphere(w,{selectedId:b.id,panel});homeIdlePose(w,b,12345,a.visible);if(panel!=='garden')assert(!a.visible);}assert.equal(serializeWorld(w),before);return homeAtmosphere(w,{selectedId:w.birds[0]?.id});}
test('treatment and caretaker expiry project current facts without extra history, reward or RNG',()=>{
 const w=world();lifeStatus(w,'b1').condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};assert.equal(inspect(w).state,'health');
 const control=structuredClone(w);treatBird(w,'b1',economyToken(w),NOW);treatBird(control,'b1',economyToken(control),NOW);assert.notEqual(inspect(w).state,'health');assert.deepEqual(w,control);
 hireCaretaker(w,1,economyToken(w),NOW);hireCaretaker(control,1,economyToken(control),NOW);inspect(w);assert.deepEqual(w,control);
 for(const at of [NOW+DAY,NOW+DAY+1,NOW+DAY-1]){advanceTo(w,at,{present:true});advanceTo(control,at,{present:true});inspect(w);assert.deepEqual(w,control);validateWorld(w);}
});
test('selected visitor health outranks ornament while resident and zero-bird/nest states remain pure',()=>{
 const w=world(),v=createBird(w,{home:'visitor'});lifeStatus(w,v).condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};assert.equal(homeAtmosphere(w,{selectedId:v.id}).state,'health');assert.equal(homeAtmosphere(w,{selectedId:v.id,error:true}).state,'storage');inspect(w);
 lifeStatus(w,v).condition=null;for(const b of w.birds)b.home='departed';assert.equal(inspect(w).state,'empty');w.birds[0].home='resident';w.birds[0].stage='egg';assert.equal(inspect(w).state,'nest');w.birds[0].stage='chick';assert.equal(inspect(w).state,'nest');
});
test('friend travel, restored worlds and endings cannot inherit old home atmosphere or a saved response',()=>{
 const w=world(),f=createBird(w,{home:'departed'});travelTo(w,'friend',f.id);assert.equal(inspect(w).state,'screen');assert.equal(homeCareResponse(w,{kind:'pet',birdId:'b1',reason:'full'},{saved:true}),null);travelTo(w,'home');assert.notEqual(inspect(w).state,'screen');
 const snapshot=parseSave(serializeWorld(w));const replacement=prepareWorldReplacement(w,snapshot,NOW+10*DAY,'garden-import-home-continuity');inspect(replacement);assert.equal(homeAtmosphere(replacement,{ending:true}).visible,false);assert.equal(homeAtmosphere(replacement,{memory:true}).visible,false);assert(!Object.keys(replacement).some(k=>/atmosphere|response/i.test(k)));
});
