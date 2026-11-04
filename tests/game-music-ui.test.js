import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountGameMusic} from '../src/game-music-ui.js';
import {GARDEN_ASSETS} from '../src/data/garden-assets.js';
function setup(gardenAssets={komorebi:{music:{themeId:'garden-komorebi',asset:'audio/gardens/komorebi.mp3',releaseReady:true,loopEndSeconds:11,loopStartSeconds:0}}}){
 const window=new Window({url:'https://example.test/buncho-ureshi/game/'}),document=window.document;
 document.body.innerHTML='<div data-game-title-slot></div><div id="game-root"><button id="care">ふれあう</button><div data-settings-music></div></div>';
 const docListeners=new Map(),shellListeners=new Map(),requests=[],started=[];let contexts=0,context;
 const originalAdd=document.addEventListener.bind(document),originalRemove=document.removeEventListener.bind(document);
 document.addEventListener=(type,fn,...args)=>{if(!docListeners.has(type))docListeners.set(type,new Set());docListeners.get(type).add(fn);return originalAdd(type,fn,...args);};
 document.removeEventListener=(type,fn,...args)=>{docListeners.get(type)?.delete(fn);return originalRemove(type,fn,...args);};
 const create=document.createElement.bind(document);document.createElement=(name,...args)=>{const element=create(name,...args);if(name==='details'){const add=element.addEventListener.bind(element);element.addEventListener=(type,fn,...rest)=>{shellListeners.set(type,fn);return add(type,fn,...rest);};}return element;};
 class Context{constructor(){contexts++;context=this;this.state='suspended';this.currentTime=0;this.destination={};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}decodeAudioData(){return Promise.resolve({duration:12});}createGain(){return{gain:{value:.18,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}},connect(){},disconnect(){}};}createBufferSource(){const s={connect(){},disconnect(){},start(){started.push(s);s.live=true;},stop(){s.live=false;s.onended?.();}};return s;}}
 const dispose=mountGameMusic(document.querySelector('[data-game-title-slot]'),{window,document,Context,fetcher:async url=>{requests.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};},gardenAssets});
 const trustedShell=selector=>shellListeners.get('click')({isTrusted:true,target:document.querySelector(selector)});
 const trustedField=()=>{for(const fn of docListeners.get('click')||[])fn({isTrusted:true,target:document.querySelector('#care')});};
 const emit=(name,detail)=>document.dispatchEvent(new window.CustomEvent(name,{detail}));
 return {window,document,docListeners,dispose,trustedShell,trustedField,emit,requests,started,contexts:()=>contexts,context:()=>context};
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
test('chooser is collapsed by default, keeps controls ahead of songs, and restores focus after selection and Escape',async()=>{
 const f=setup(),d=f.document;f.emit('buncho-game-panel','settings');
 const chooser=d.querySelector('[data-music-choose]'),choices=d.querySelector('.game-music-tracks');
 assert.equal(choices.hidden,true);assert.equal(chooser.getAttribute('aria-expanded'),'false');
 assert.ok(d.querySelector('[data-music-off]').compareDocumentPosition(choices)&f.window.Node.DOCUMENT_POSITION_FOLLOWING);
 assert.ok(d.querySelector('input').compareDocumentPosition(choices)&f.window.Node.DOCUMENT_POSITION_FOLLOWING);
 chooser.click();assert.equal(choices.hidden,true); // Synthetic event cannot unlock or select.
 f.trustedShell('[data-music-choose]');assert.equal(choices.hidden,false);
 d.querySelector('[data-music=village]').focus();f.trustedShell('[data-music=village]');await tick();
 assert.equal(choices.hidden,true);assert.equal(d.activeElement,chooser);assert.match(d.querySelector('.game-music-current').textContent,/村のワルツ/);
 f.trustedShell('[data-music-choose]');d.querySelector('[data-music=meadow]').focus();
 const escape=new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});d.activeElement.dispatchEvent(escape);
 assert.equal(escape.defaultPrevented,true);assert.equal(choices.hidden,true);assert.equal(d.activeElement,chooser);
 f.dispose();f.window.happyDOM.abort();
});
test('settings repaint retains open chooser and focused song; exit clears stale focus and reentry collapses songs',()=>{
 const f=setup(),d=f.document;f.emit('buncho-game-panel','settings');f.trustedShell('[data-music-choose]');
 const song=d.querySelector('[data-music=village]');song.focus();f.emit('buncho-game-will-render');f.emit('buncho-game-panel','settings');
 assert.equal(d.activeElement,song);assert.equal(d.querySelector('.game-music-tracks').hidden,false);
 f.emit('buncho-game-will-render');f.emit('buncho-game-panel','garden');d.querySelector('#care').focus();
 // Also tolerate panel-only transitions without the usual intervening repaint.
 f.emit('buncho-game-panel','settings');assert.equal(d.activeElement,d.querySelector('#care'));assert.equal(d.querySelector('.game-music-tracks').hidden,true);
 f.trustedShell('[data-music-choose]');f.trustedShell('[data-music-off]');assert.equal(d.querySelector('.game-music-tracks').hidden,true);assert.equal(d.querySelector('.game-music-current').textContent,'音楽はオフ');
 f.dispose();f.window.happyDOM.abort();
});

test('production catalogue retains all sixteen choices in the collapsed chooser',()=>{
 const f=setup(GARDEN_ASSETS);f.emit('buncho-game-panel','settings');
 assert.equal(f.document.querySelectorAll('[data-music]').length,16);
 assert.equal(f.document.querySelector('.game-music-tracks').hidden,true);
 f.trustedShell('[data-music-choose]');assert.equal(f.document.querySelectorAll('[data-music]').length,16);
 f.dispose();f.window.happyDOM.abort();
});

test('trusted game tap resumes an externally interrupted context',async()=>{
 const f=setup();f.emit('buncho-game-garden',{gardenId:'komorebi',worldId:'one'});f.trustedField();await tick();
 assert.equal(f.started.length,1);f.context().state='interrupted';f.trustedField();await tick();
 assert.equal(f.context().state,'running');assert.equal(f.started.length,2);assert.equal(f.started.filter(x=>x.live).length,1);
 f.dispose();f.window.happyDOM.abort();
});
