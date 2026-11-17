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
 if(!shared)holder.world.collectionEndings.entries=[{id:'garden',unlockedTick:0,acknowledged:false,lease:null,playback:'pending'}];
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
 d.querySelector('.game-ending-screen').requestFullscreen=undefined;v.webkitEnterFullscreen=()=>{enters++;v.webkitDisplayingFullscreen=true;};v.webkitExitFullscreen=()=>{exits++;v.webkitDisplayingFullscreen=false;v.dispatchEvent(new h.window.Event('webkitendfullscreen'));};
 h.root.querySelector('[data-ending-fullscreen]').click();assert.equal(enters,1);h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());assert.equal(exits,1);
});
test('denied or unavailable native fullscreen leaves the full viewport dialog playable',async t=>{
 const h=fixture(t);await h.p.open('garden');const d=h.root.querySelector('dialog');d.querySelector('.game-ending-screen').requestFullscreen=()=>Promise.reject(Error('NotAllowedError'));
 h.allowPlay();h.root.querySelector('[data-ending-play]').click();await until(()=>d.hasAttribute('data-playing'));await sleep();assert.ok(d.open);
 h.root.querySelector('video').dispatchEvent(new h.window.Event('pause'));assert.equal(d.hasAttribute('data-playing'),false);
 h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());
});
test('defer, real playing and ended are distinct durable records, with completed sticky on replay',async t=>{
 const h=fixture(t);await h.p.open('garden');h.root.querySelector('[data-ending-skip]').click();await until(()=>!h.p.active());assert.equal(h.holder.world.collectionEndings.entries[0].playback,'deferred');
 await h.p.open('garden');h.allowPlay();h.root.querySelector('[data-ending-play]').click();await until(()=>h.holder.world.collectionEndings.entries[0].playback==='started');
 h.root.querySelector('video').dispatchEvent(new h.window.Event('ended'));await until(()=>!h.p.active());assert.equal(h.holder.world.collectionEndings.entries[0].playback,'completed');
 await h.p.open('garden');await sleep();h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());assert.equal(h.holder.world.collectionEndings.entries[0].playback,'completed');
});
test('hidden document cannot acquire a pending movie lease, including manual replay',async t=>{
 const h=fixture(t);Object.defineProperty(h.doc,'hidden',{configurable:true,value:true});assert.equal(await h.p.open('garden'),false);h.p.sync();await sleep();assert.equal(h.holder.world.collectionEndings.entries[0].lease,null);
 Object.defineProperty(h.doc,'hidden',{configurable:true,value:false});h.doc.dispatchEvent(new h.window.Event('visibilitychange'));await until(()=>h.p.active());
});
test('approved tour waits for explicit sound/video start and pauses on pagehide and view obstruction',async t=>{
 const h=fixture(t);h.holder.world.collectionEndings.entries=[{id:'garden-tour',unlockedTick:0,acknowledged:false,lease:null,playback:'pending'}];await h.p.open('garden-tour');assert.equal(h.plays,0);assert.match(h.root.querySelector('video').src,/buncho-ending-01-rich-final-review.mp4$/);assert.match(h.root.querySelector('[role=status]').textContent,/訪問順や個体/);h.allowPlay();h.root.querySelector('[data-ending-play]').click();await until(()=>h.holder.world.collectionEndings.entries[0].playback==='started');const count=h.pauses;h.window.dispatchEvent(new h.window.Event('pagehide'));assert.equal(h.pauses,count+1);h.doc.body.dataset.gameViewBlocked='orientation';h.doc.dispatchEvent(new h.window.Event('buncho-game-view-visibility'));assert.equal(h.pauses,count+2);h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());assert.equal(h.holder.world.collectionEndings.entries[0].playback,'deferred');
});
test('four pending movies defer exactly once in established order with tour last',async t=>{const h=fixture(t);h.holder.world.collectionEndings.entries=['garden','crows','raptors','garden-tour'].map(id=>({id,unlockedTick:0,acknowledged:false,lease:null,playback:'pending'}));for(const id of ['garden','crows','raptors','garden-tour']){h.p.sync();await until(()=>h.root.querySelector('dialog'));assert.match(h.root.querySelector('video').src,id==='garden-tour'?/rich-final-review/:new RegExp(id+'-v1'));h.root.querySelector('[data-ending-skip]').click();await until(()=>!h.p.active());assert.equal(h.holder.world.collectionEndings.entries.find(e=>e.id===id).playback,'deferred');}h.p.sync();await sleep();assert.equal(h.p.active(),false);});
test('tour media error does not consume achievement; failed ended save retries completion on close',async t=>{const h=fixture(t,{failAck:true});h.holder.world.collectionEndings.entries=[{id:'garden-tour',unlockedTick:0,acknowledged:false,lease:null,playback:'pending'}];await h.p.open('garden-tour');h.root.querySelector('video').dispatchEvent(new h.window.Event('error'));assert.match(h.root.querySelector('[role=status]').textContent,/よみこめません/);assert.equal(h.holder.world.collectionEndings.entries[0].playback,'pending');h.root.querySelector('video').dispatchEvent(new h.window.Event('ended'));await sleep();await sleep();assert.equal(h.p.active(),true);assert.equal(h.holder.world.collectionEndings.entries[0].playback,'pending');h.allowSave();h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());assert.equal(h.holder.world.collectionEndings.entries[0].playback,'completed');});
test('retired video events cannot complete, pause or report errors on a new replay',async t=>{
 const h=fixture(t);await h.p.open('garden');const old=h.root.querySelector('video');h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());
 await h.p.open('garden');const dialog=h.root.querySelector('dialog'),before=JSON.stringify(h.holder.world),status=dialog.querySelector('[role=status]').textContent;
 for(const event of ['playing','pause','error','ended'])old.dispatchEvent(new h.window.Event(event));await sleep();await sleep();
 assert.equal(h.root.querySelector('dialog'),dialog);assert.equal(JSON.stringify(h.holder.world),before);assert.equal(dialog.querySelector('[role=status]').textContent,status);assert.equal(dialog.hasAttribute('data-playing'),false);
});
test('closing waits for an in-flight fullscreen request and exit before allowing replay',async t=>{
 const h=fixture(t);await h.p.open('garden');const d=h.root.querySelector('dialog'),screen=d.querySelector('.game-ending-screen');let enter,exit,exits=0;
 screen.requestFullscreen=()=>new Promise(r=>{enter=()=>{Object.defineProperty(h.doc,'fullscreenElement',{configurable:true,value:screen});r();};});
 h.doc.exitFullscreen=()=>{exits++;return new Promise(r=>{exit=r;});};h.root.querySelector('[data-ending-fullscreen]').click();h.root.querySelector('[data-ending-close]').click();await sleep();
 assert.equal(h.p.active(),true);assert.equal(await h.p.open('garden'),false);assert.equal(exits,0);enter();await until(()=>exits===1);assert.equal(await h.p.open('garden'),false);const plays=h.plays;h.root.querySelector('video').dispatchEvent(new h.window.Event('playing'));h.root.querySelector('[data-ending-play]').click();h.root.querySelector('[data-ending-fullscreen]').click();await sleep();assert.equal(h.plays,plays);assert.equal(h.holder.world.collectionEndings.entries[0].playback,'deferred');assert.equal(exits,1);exit();await until(()=>!h.p.active());assert.equal(await h.p.open('garden'),true);
});
test('old play rejection cannot overwrite status in a replacement replay',async t=>{
 const h=fixture(t);await h.p.open('garden');let reject;h.root.querySelector('video').play=()=>new Promise((_,r)=>{reject=r;});h.root.querySelector('[data-ending-play]').click();h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());
 h.holder.world.collectionEndings.entries.push({id:'garden-tour',unlockedTick:0,acknowledged:false,lease:null,playback:'pending'});await h.p.open('garden-tour');const text=h.root.querySelector('[role=status]').textContent;reject(Error('old play interrupted'));await sleep();assert.equal(h.root.querySelector('[role=status]').textContent,text);
});

test('iOS native exit event completes before replay is enabled',async t=>{
 const h=fixture(t);await h.p.open('garden');const d=h.root.querySelector('dialog'),v=h.root.querySelector('video');d.querySelector('.game-ending-screen').requestFullscreen=undefined;v.webkitEnterFullscreen=()=>{v.webkitDisplayingFullscreen=true;};let exiting=false;v.webkitExitFullscreen=()=>{exiting=true;};h.root.querySelector('[data-ending-fullscreen]').click();h.root.querySelector('[data-ending-close]').click();await until(()=>exiting);assert.equal(await h.p.open('garden'),false);v.webkitDisplayingFullscreen=false;v.dispatchEvent(new h.window.Event('webkitendfullscreen'));await until(()=>!h.p.active());assert.equal(await h.p.open('garden'),true);
});

test('synchronous fullscreen refusal allows another explicit request',async t=>{const h=fixture(t);await h.p.open('garden');const screen=h.root.querySelector('.game-ending-screen');let requests=0;screen.requestFullscreen=()=>{requests++;if(requests===1)throw Error('NotAllowed');return Promise.resolve();};h.root.querySelector('[data-ending-fullscreen]').click();h.root.querySelector('[data-ending-fullscreen]').click();assert.equal(requests,2);});
test('fullscreen exit rejection retains dialog and durable record until retry succeeds',async t=>{
 const h=fixture(t);await h.p.open('garden');const d=h.root.querySelector('dialog'),screen=d.querySelector('.game-ending-screen');Object.defineProperty(h.doc,'fullscreenElement',{configurable:true,value:screen});h.doc.exitFullscreen=()=>Promise.reject(Error('exit refused'));h.root.querySelector('[data-ending-close]').click();await until(()=>/全画面を/.test(d.querySelector('[role=status]').textContent));assert.equal(h.holder.world.collectionEndings.entries[0].playback,'deferred');assert.equal(h.p.active(),true);h.doc.exitFullscreen=()=>Promise.resolve();h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());
});
test('iOS fullscreen timeout keeps close retryable without consuming completion',async t=>{
 const h=fixture(t);await h.p.open('garden');const d=h.root.querySelector('dialog'),v=d.querySelector('video');v.webkitDisplayingFullscreen=true;v.webkitExitFullscreen=()=>{};h.root.querySelector('[data-ending-close]').click();await new Promise(r=>setTimeout(r,2050));assert.match(d.querySelector('[role=status]').textContent,/全画面を/);assert.equal(h.p.active(),true);assert.equal(h.holder.world.collectionEndings.entries[0].playback,'deferred');v.webkitExitFullscreen=()=>{v.webkitDisplayingFullscreen=false;v.dispatchEvent(new h.window.Event('webkitendfullscreen'));};h.root.querySelector('[data-ending-close]').click();await until(()=>!h.p.active());
});
