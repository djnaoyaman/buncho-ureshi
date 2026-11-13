import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountCollectionEndingPlayer,renderEndingDiary} from '../src/collection-ending-player.js';
import {createWorld} from '../src/engine.js';
const sleep=()=>new Promise(r=>setTimeout(r,0));
async function until(fn){for(let i=0;i<30;i++){if(fn())return;await sleep();}assert.fail('condition not reached');}
function fixture(t,{shared,canPresent=()=>true,failAck=false}={}){
 const window=new Window({url:'https://example.test/game/'}),doc=window.document,root=doc.createElement('main');doc.body.append(root);
 const holder=shared||{world:createWorld(Date.now(),7)};
 if(!shared)holder.world.collectionEndings.entries=[{id:'garden',unlockedTick:0,acknowledged:false,lease:null}];
 let plays=0,pauses=0,rejectPlay=true,fail=failAck;
 window.HTMLMediaElement.prototype.play=function(){plays++;if(rejectPlay)return Promise.reject(Error('NotAllowedError'));this.dispatchEvent(new window.Event('playing'));return Promise.resolve();};
 window.HTMLMediaElement.prototype.pause=function(){pauses++;};window.HTMLMediaElement.prototype.load=function(){};
 const p=mountCollectionEndingPlayer(root,{getWorld:()=>holder.world,canPresent,transact:async fn=>{const draft=structuredClone(holder.world);const before=JSON.stringify(draft);fn(draft);if(fail&&draft.collectionEndings.entries[0]?.acknowledged&&!holder.world.collectionEndings.entries[0]?.acknowledged)throw Error('disk full');holder.world=draft;return holder.world;}});
 t.after(()=>{p.destroy();window.happyDOM.close();});
 return {p,window,doc,root,holder,get plays(){return plays;},get pauses(){return pauses;},allowPlay(){rejectPlay=false;},allowSave(){fail=false;}};
}
test('automatic playback fallback remains available and is not marked seen until playing',async t=>{
 const h=fixture(t);h.p.sync();await until(()=>h.root.querySelector('dialog[open]'));await sleep();
 assert.equal(h.holder.world.collectionEndings.entries[0].acknowledged,false);
 assert.match(h.root.querySelector('[role=status]').textContent,/▶/);assert.ok(h.doc.body.hasAttribute('data-game-ending-active'));
 const v=h.root.querySelector('video');assert.equal(v.getAttribute('preload'),'none');assert.ok(v.hasAttribute('playsinline'));
 h.allowPlay();h.root.querySelector('[data-ending-play]').click();await until(()=>h.holder.world.collectionEndings.entries[0].acknowledged);
 assert.equal(h.root.querySelector('video'),v);
});
test('skip consumes first showing but the achieved diary entry can be replayed',async t=>{
 const h=fixture(t);await h.p.open('garden',{automatic:true});h.root.querySelector('[data-ending-skip]').click();await until(()=>!h.p.active());
 assert.equal(h.holder.world.collectionEndings.entries[0].acknowledged,true);h.p.sync();await sleep();assert.equal(h.root.querySelector('dialog'),null);
 assert.match(renderEndingDiary(h.holder.world),/data-ending-replay="garden"/);assert.doesNotMatch(renderEndingDiary(h.holder.world),/data-ending-replay="crows"/);
 assert.equal(await h.p.open('garden'),true);assert.equal(h.root.querySelectorAll('dialog').length,1);
});
test('two tabs claim the same pending ending only once',async t=>{
 const a=fixture(t),b=fixture(t,{shared:a.holder});await Promise.all([a.p.open('garden',{automatic:true}),b.p.open('garden',{automatic:true})]);
 assert.equal(a.root.querySelectorAll('dialog').length+b.root.querySelectorAll('dialog').length,1);
});
test('danger and other blocking flow defer the automatic ending without consuming it',async t=>{
 let safe=false;const h=fixture(t,{canPresent:()=>safe});h.p.sync();await sleep();assert.equal(h.root.querySelector('dialog'),null);assert.equal(h.holder.world.collectionEndings.entries[0].lease,null);
 safe=true;h.p.sync();await until(()=>h.root.querySelector('dialog'));
});
test('world replacement removes prior-world movie without changing new world',async t=>{
 const h=fixture(t);await h.p.open('garden');h.holder.world=createWorld(Date.now()+1,8);h.p.sync();assert.equal(h.root.querySelector('dialog'),null);assert.deepEqual(h.holder.world.collectionEndings.entries,[]);assert.equal(h.doc.body.hasAttribute('data-game-ending-active'),false);
});
test('failed save acknowledgment can retry on playing and close',async t=>{
 const h=fixture(t,{failAck:true});await h.p.open('garden');h.allowPlay();h.root.querySelector('[data-ending-play]').click();await sleep();await sleep();assert.equal(h.holder.world.collectionEndings.entries[0].acknowledged,false);
 h.allowSave();h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());assert.equal(h.holder.world.collectionEndings.entries[0].acknowledged,true);
});
test('player signals BGM pause while open and releases it on close',async t=>{
 const h=fixture(t),events=[];h.doc.addEventListener('buncho-game-ending',e=>events.push(e.detail.active));await h.p.open('garden');assert.deepEqual(events,[true]);h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());assert.deepEqual(events,[true,false]);assert.ok(h.pauses>0);
});
test('close save failure keeps dialog and error available until explicit retry succeeds',async t=>{
 const h=fixture(t,{failAck:true});await h.p.open('garden');h.root.querySelector('[data-ending-close]').click();await sleep();await sleep();
 assert.ok(h.p.active());assert.ok(h.root.querySelector('dialog[open]'));assert.match(h.root.querySelector('[role=status]').textContent,/ほぞんできません/);assert.equal(h.holder.world.collectionEndings.entries[0].acknowledged,false);
 h.allowSave();h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());assert.equal(h.holder.world.collectionEndings.entries[0].acknowledged,true);
});
test('failed modal setup cleans state and releases lease so a later attempt can open',async t=>{
 const h=fixture(t),original=h.window.HTMLDialogElement.prototype.showModal;h.window.HTMLDialogElement.prototype.showModal=function(){throw Error('dialog failure');};
 assert.equal(await h.p.open('garden'),false);await until(()=>h.holder.world.collectionEndings.entries[0].lease===null);
 assert.equal(h.p.active(),false);assert.equal(h.root.querySelector('dialog'),null);assert.equal(h.doc.body.hasAttribute('data-game-ending-active'),false);
 h.window.HTMLDialogElement.prototype.showModal=original;assert.equal(await h.p.open('garden'),true);
});
test('manual replay with another tab lease closes without consuming their automatic showing',async t=>{
 const a=fixture(t),b=fixture(t,{shared:a.holder});await a.p.open('garden',{automatic:true});assert.equal(await b.p.open('garden'),true);
 b.root.querySelector('[data-ending-close]').click();await until(()=>!b.p.active());assert.equal(a.holder.world.collectionEndings.entries[0].acknowledged,false);assert.ok(a.p.active());
 a.root.querySelector('[data-ending-close]').click();await until(()=>!a.p.active());assert.equal(a.holder.world.collectionEndings.entries[0].acknowledged,true);
});
test('fullscreen play requests the dialog fullscreen directly from a button and close exits',async t=>{
 const h=fixture(t);await h.p.open('garden');const d=h.root.querySelector('dialog');let enters=0,exits=0;
 d.querySelector('.game-ending-screen').requestFullscreen=()=>{enters++;Object.defineProperty(h.doc,'fullscreenElement',{configurable:true,value:d.querySelector('.game-ending-screen')});return Promise.resolve();};
 h.doc.exitFullscreen=()=>{exits++;return Promise.resolve();};h.allowPlay();h.root.querySelector('[data-ending-play]').click();
 await until(()=>d.hasAttribute('data-playing'));assert.equal(enters,1);assert.equal(h.doc.activeElement,h.root.querySelector('video'));
 h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());assert.equal(exits,1);
});
test('iOS video fullscreen fallback is requested on explicit tap and exited when closing',async t=>{
 const h=fixture(t);await h.p.open('garden');const d=h.root.querySelector('dialog'),v=h.root.querySelector('video');let enters=0,exits=0;
 d.querySelector('.game-ending-screen').requestFullscreen=undefined;v.webkitEnterFullscreen=()=>{enters++;v.webkitDisplayingFullscreen=true;};v.webkitExitFullscreen=()=>{exits++;};
 h.root.querySelector('[data-ending-fullscreen]').click();assert.equal(enters,1);h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());assert.equal(exits,1);
});
test('denied or unavailable native fullscreen leaves the full viewport dialog playable',async t=>{
 const h=fixture(t);await h.p.open('garden');const d=h.root.querySelector('dialog');d.querySelector('.game-ending-screen').requestFullscreen=()=>Promise.reject(Error('NotAllowedError'));
 h.allowPlay();h.root.querySelector('[data-ending-play]').click();await until(()=>d.hasAttribute('data-playing'));await sleep();assert.ok(d.open);
 h.root.querySelector('video').dispatchEvent(new h.window.Event('pause'));assert.equal(d.hasAttribute('data-playing'),false);
 h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());
});
