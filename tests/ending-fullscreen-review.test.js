import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {mountCollectionEndingPlayer} from '../src/collection-ending-player.js';
import {createWorld} from '../src/engine.js';
const tick=()=>new Promise(r=>setTimeout(r,0));
function setup(t){
 const window=new Window({url:'https://example.test/game/'}),doc=window.document,root=doc.createElement('main');doc.body.append(root);
 let world=createWorld(Date.now(),7);world.collectionEndings.entries=[{id:'garden',unlockedTick:0,acknowledged:true,lease:null}];
 window.HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new window.Event('playing'));return Promise.resolve();};
 window.HTMLMediaElement.prototype.pause=function(){};window.HTMLMediaElement.prototype.load=function(){};
 const p=mountCollectionEndingPlayer(root,{getWorld:()=>world,transact:async fn=>{world=fn(world);return world;}});
 t.after(()=>{p.destroy();window.happyDOM.close();});return {p,window,doc,root};
}
test('fullscreen request targets an eligible element, never the dialog',async t=>{
 const h=setup(t);let target;
 h.window.HTMLElement.prototype.requestFullscreen=function(){target=this;return Promise.resolve();};
 await h.p.open('garden');h.root.querySelector('[data-ending-fullscreen]').click();
 assert.ok(target);assert.notEqual(target.tagName,'DIALOG');assert.ok(h.root.querySelector('dialog').contains(target));
});
test('playing does not leave the action panel focused over the movie',async t=>{
 const h=setup(t);await h.p.open('garden');await tick();
 assert.equal(h.root.querySelector('.game-ending-actions').contains(h.doc.activeElement),false);
});
test('cinema CSS removes card bounds and preserves the complete video frame',async()=>{
 const css=await readFile(new URL('../src/game.css',import.meta.url),'utf8');
 const rule=css.match(/\.game-ending-dialog\{([^}]+)\}/)?.[1]||'';
 assert.match(rule,/position:fixed/);assert.match(rule,/inset:0/);assert.match(rule,/height:100dvh/);assert.match(rule,/max-width:none/);assert.match(rule,/max-height:none/);assert.match(rule,/margin:0/);assert.match(rule,/padding:0/);
 const videoRule=css.match(/\.game-ending-dialog video\{([^}]+)\}/)?.[1]||'';
 assert.match(videoRule,/height:100%/);assert.match(videoRule,/object-fit:contain/);
});
