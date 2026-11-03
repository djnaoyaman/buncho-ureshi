import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountGameMusic} from '../src/game-music-ui.js';
function setup(){
 const window=new Window({url:'https://example.test/buncho-ureshi/game/'}),document=window.document;
 document.body.innerHTML='<div data-game-title-slot></div><div id="game-root"><button id="care">ふれあう</button><div data-settings-music></div></div>';
 const docListeners=new Map(),shellListeners=new Map(),requests=[],started=[];let contexts=0;
 const originalAdd=document.addEventListener.bind(document),originalRemove=document.removeEventListener.bind(document);
 document.addEventListener=(type,fn,...args)=>{if(!docListeners.has(type))docListeners.set(type,new Set());docListeners.get(type).add(fn);return originalAdd(type,fn,...args);};
 document.removeEventListener=(type,fn,...args)=>{docListeners.get(type)?.delete(fn);return originalRemove(type,fn,...args);};
 const create=document.createElement.bind(document);document.createElement=(name,...args)=>{const element=create(name,...args);if(name==='details'){const add=element.addEventListener.bind(element);element.addEventListener=(type,fn,...rest)=>{shellListeners.set(type,fn);return add(type,fn,...rest);};}return element;};
 class Context{constructor(){contexts++;this.state='suspended';this.currentTime=0;this.destination={};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}decodeAudioData(){return Promise.resolve({duration:12});}createGain(){return{gain:{value:.18,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}},connect(){},disconnect(){}};}createBufferSource(){const s={connect(){},disconnect(){},start(){started.push(s);s.live=true;},stop(){s.live=false;s.onended?.();}};return s;}}
 const dispose=mountGameMusic(document.querySelector('[data-game-title-slot]'),{window,document,Context,fetcher:async url=>{requests.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};},gardenAssets:{komorebi:{music:{themeId:'garden-komorebi',asset:'audio/gardens/komorebi.mp3',releaseReady:true,loopEndSeconds:11,loopStartSeconds:0}}}});
 const trustedShell=selector=>shellListeners.get('click')({isTrusted:true,target:document.querySelector(selector)});
 const trustedField=()=>{for(const fn of docListeners.get('click')||[])fn({isTrusted:true,target:document.querySelector('#care')});};
 const emit=(name,detail)=>document.dispatchEvent(new window.CustomEvent(name,{detail}));
 return {window,document,docListeners,dispose,trustedShell,trustedField,emit,requests,started,contexts:()=>contexts};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('music settings shell preserves native node/focus across game repaint then cleans all garden listeners',async()=>{
 const f=setup(),shell=f.document.querySelector('.game-music');assert.equal(shell.hidden,true);assert.equal(f.contexts(),0);
 f.emit('buncho-game-panel','settings');assert.equal(shell.hidden,false);assert.equal(shell.closest('[data-settings-music]')!==null,true);shell.querySelector('input').focus();
 f.emit('buncho-game-will-render');assert.equal(shell.hidden,true);assert.equal(shell.closest('[data-game-title-slot]')!==null,true);
 f.emit('buncho-game-panel','settings');assert.equal(f.document.activeElement,shell.querySelector('input'));assert.equal(f.document.querySelectorAll('.game-music').length,1);
 f.dispose();assert.equal(f.document.querySelectorAll('.game-music').length,0);for(const name of ['click','visibilitychange','buncho-game-garden','buncho-game-panel','buncho-game-will-render'])assert.equal(f.docListeners.get(name)?.size||0,0);f.emit('buncho-game-garden',{gardenId:'komorebi',worldId:'after-dispose'});await tick();assert.equal(f.contexts(),0);f.window.happyDOM.abort();
});
test('synthetic clicks cannot unlock; trusted tap unlocks current auto garden; off and fixed choices honored',async()=>{
 const f=setup();f.emit('buncho-game-garden',{gardenId:'komorebi',worldId:'one'});f.document.querySelector('#care').click();await tick();assert.equal(f.contexts(),0);
 f.trustedField();assert.equal(f.contexts(),1);await tick();assert.equal(f.requests[0],'audio/gardens/komorebi.mp3');
 f.emit('buncho-game-panel','settings');f.trustedShell('[data-music="village"]');await tick();assert.equal(f.requests.at(-1),'audio/04_village_waltz.wav');assert.equal(f.document.querySelector('[data-music="village"]').getAttribute('aria-pressed'),'true');
 f.trustedShell('[data-music-off]');assert.equal(f.started.filter(x=>x.live).length,0);f.emit('buncho-game-garden',{gardenId:null,worldId:'two'});f.trustedField();await tick();assert.equal(f.document.querySelector('[data-music-off]').getAttribute('aria-pressed'),'true');assert.equal(f.requests.length,2);
 f.trustedShell('[data-music-auto]');await tick();assert.equal(f.document.querySelector('[data-music-auto]').getAttribute('aria-pressed'),'true');f.dispose();f.window.happyDOM.abort();
});
