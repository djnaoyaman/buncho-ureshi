import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,validateWorld,readCompatibleWorld,serializeWorld,parseSave,advanceGardenRaptor} from '../src/engine.js';
import {openGameStore} from '../src/game-store.js';
import {arriveGardenRaptor,raptorToken,escapeGardenRaptor,remainWithGardenRaptor,petGardenRaptor} from '../src/garden-raptors.js';
import {mountRaptorReturnPrompt} from '../src/garden-raptor-return-prompt.js';
import {mountGardenRaptors} from '../src/garden-raptor-controller.js';
import {updateRaptorNotice} from '../src/garden-raptor-ui.js';
const NOW=Date.UTC(2026,10,13),sleep=()=>new Promise(r=>setTimeout(r,5));
function world(){const w=createWorld(NOW);w.field.place='park';w.encounters.garden.open=true;w.encounters.gardenFriends.attendees=['b1'];arriveGardenRaptor(w,'black-kite',NOW,{...raptorToken(w),gardenId:w.encounters.garden.id});return w;}
function setup(w=world(),options={}){
 const win=new Window();win.document.body.innerHTML='<main id="root"><div class="game-app"><button data-game-raptor-home>おうちへ</button></div></main>';const root=win.document.querySelector('#root');let home=0,stay=0;
 const prompt=mountRaptorReturnPrompt(root,{getWorld:()=>w,onHome:async valid=>{home++;if(valid()){escapeGardenRaptor(w,raptorToken(w));prompt.sync();assert.ok(valid(),'successful escape must not invalidate host completion');}return true;},onStay:async(token,valid)=>{stay++;if(valid())remainWithGardenRaptor(w,NOW+600000,token);return true;},...options});prompt.sync();
 return {win,root,prompt,w,get counts(){return {home,stay};},close(){prompt.destroy();win.happyDOM.abort();}};
}
test('saved pending choice pauses all countdown paths, reloads, and old warnings migrate without resetting seconds',()=>{
 let w=world();w.encounters.raptor.active.remainingMs=21000;
 for(let i=1;i<=600;i++)assert.equal(advanceGardenRaptor(w,1000,NOW+i*1000,raptorToken(w)).changed,false);
 w=parseSave(serializeWorld(w));assert.equal(w.encounters.raptor.active.returnChoicePending,true);assert.equal(w.encounters.raptor.active.remainingMs,21000);
 const old=structuredClone(w);old.encounters.version=14;delete old.encounters.raptor.active.returnChoicePending;const before=structuredClone(old);w=readCompatibleWorld(old,NOW);assert.deepEqual(old,before);assert.equal(w.encounters.version,15);assert.equal(w.encounters.raptor.active.returnChoicePending,true);assert.equal(w.encounters.raptor.active.remainingMs,21000);
 const projected=structuredClone(w);projected.encounters.version=14;delete projected.encounters.raptor.active.returnChoicePending;assert.deepEqual(projected,old);validateWorld(w);
});
test('remain resumes the remaining visible time only, saves the choice, and rejects duplicate/stale actions',()=>{
 let w=world();w.encounters.raptor.active.remainingMs=17000;const t=raptorToken(w);
 assert.equal(remainWithGardenRaptor(w,NOW+600000,t).changed,true);assert.equal(remainWithGardenRaptor(w,NOW+600001,t).reason,'stale');
 w=parseSave(serializeWorld(w));assert.equal(w.encounters.raptor.active.returnChoicePending,false);
 advanceGardenRaptor(w,1000,NOW+600500,raptorToken(w));assert.equal(w.encounters.raptor.active.remainingMs,16500);validateWorld(w);
});
test('two stores cannot advance an unanswered warning; remaining choice is shared',async()=>{
 const indexedDB=new IDBFactory(),a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});try{
 await a.transact(()=>world());await Promise.all([a,b].map(store=>store.transact(w=>{advanceGardenRaptor(w,1000,NOW+1000,raptorToken(w));return w;})));
 assert.equal((await a.transact(w=>w)).encounters.raptor.active.remainingMs,60000);
 await a.transact(w=>{remainWithGardenRaptor(w,NOW+2000,raptorToken(w));return w;});
 await b.transact(w=>{advanceGardenRaptor(w,1000,NOW+3000,raptorToken(w));return w;});
 assert.equal((await a.transact(w=>w)).encounters.raptor.active.remainingMs,59000);
 }finally{a.close();b.close();}
});
test('native modal is named, focuses safe choice, has no timer notice duplication, and survives redraw',()=>{
 const s=setup();try{const d=s.root.querySelector('dialog');assert.ok(d.open);assert.equal(d.getAttribute('aria-labelledby'),'game-raptor-return-title');assert.match(d.textContent,/おうちに かえりますか/);assert.equal(s.win.document.activeElement.dataset.raptorChoice,'home');const stay=d.querySelector('[data-raptor-choice=stay]');stay.focus();s.prompt.sync();updateRaptorNotice(s.root,s.w);assert.equal(s.root.querySelector('dialog'),d);assert.equal(s.win.document.activeElement,stay);assert.equal(d.querySelector('[data-raptor-notice]'),null);}finally{s.close();}
});
test('home and Escape safely return immediately and keep recorded bird history',async()=>{
 for(const kind of ['home','escape']){const s=setup(),before=structuredClone(s.w.encounters.raptor.visits);try{if(kind==='home')s.root.querySelector('[data-raptor-choice=home]').click();else s.root.querySelector('dialog').dispatchEvent(new s.win.Event('cancel',{cancelable:true}));await sleep();assert.equal(s.w.field.place,'home');assert.equal(s.w.encounters.raptor.active,null);assert.deepEqual(s.w.encounters.raptor.visits,before);assert.equal(s.root.querySelector('dialog'),null);assert.equal(s.counts.home,1);validateWorld(s.w);}finally{s.close();}}
});
test('remain closes the dialog, preserves the warning, and does not reprompt on refresh',async()=>{
 const s=setup();try{s.root.querySelector('[data-raptor-choice=stay]').click();await sleep();assert.equal(s.root.querySelector('dialog'),null);assert.equal(s.w.encounters.raptor.active.returnChoicePending,false);assert.equal(s.w.encounters.raptor.active.remainingMs,60000);s.prompt.sync();assert.equal(s.root.querySelector('dialog'),null);assert.equal(s.counts.stay,1);}finally{s.close();}
});
test('failed and repeated clicks keep the paused choice retryable, backdrop never remains',async()=>{
 let calls=0,reject;const s=setup(world(),{onStay:()=>{calls++;return new Promise((_,r)=>reject=r);}});try{const d=s.root.querySelector('dialog'),b=d.querySelector('[data-raptor-choice=stay]');d.click();assert.equal(calls,0);b.click();b.click();assert.equal(calls,1);assert.ok(b.disabled);reject(Error('disk'));await sleep();assert.ok(d.open);assert.equal(b.disabled,false);assert.equal(s.w.encounters.raptor.active.returnChoicePending,true);assert.equal(d.querySelector('[role=alert]').hidden,false);}finally{s.close();}
});
test('friendly, harmless and targetless visitors never block play; ended threats close prompt',()=>{
 const s=setup();try{for(let i=0;i<13;i++)petGardenRaptor(s.w,'black-kite',8,raptorToken(s.w));s.prompt.sync();assert.equal(s.root.querySelector('dialog'),null);}finally{s.close();}
 for(const kind of ['osprey','targetless']){const w=createWorld(NOW);w.field.place='park';w.encounters.garden.open=true;w.encounters.garden.id='mizukagami';if(kind==='osprey')w.encounters.gardenFriends.attendees=['b1'];arriveGardenRaptor(w,kind==='osprey'?'osprey':'black-kite',NOW,{...raptorToken(w),gardenId:w.encounters.garden.id});const s=setup(w);try{assert.equal(s.root.querySelector('dialog'),null);advanceGardenRaptor(w,1000,NOW+1000,raptorToken(w));assert.equal(w.encounters.raptor.active.remainingMs,17000);}finally{s.close();}}
});
test('controller does not issue repeated saves or deduct reading time while pending',async()=>{
 const s=setup();let elapsed=0,writes=0;Object.defineProperty(s.win.performance,'now',{value:()=>elapsed});s.win.setTimeout=()=>1;s.win.clearTimeout=()=>{};
 const c=mountGardenRaptors(s.root,{getWorld:()=>s.w,transact:async fn=>{writes++;return fn(s.w);}});
 try{for(let i=0;i<100;i++){elapsed+=1000;await c.poll();}assert.equal(writes,0);assert.equal(s.w.encounters.raptor.active.remainingMs,60000);}finally{c.destroy();s.close();}
});
test('invalid saved choice flags reject rather than silently unpausing',()=>{for(const flag of [null,0,1,'false',undefined]){const w=world();w.encounters.raptor.active.returnChoicePending=flag;assert.throws(()=>validateWorld(w));}});
