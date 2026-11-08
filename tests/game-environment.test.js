import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { supportsGameDevice, portraitGameDevice, mountGameEnvironment, GAME_DEVICE_CHOICE_KEY } from '../src/game-environment.js';

function fixture({ua='Desktop Chrome',platform='Linux',touch=0,direction='portrait-primary'}={}) {
  const window = new Window({url:'https://example.test/buncho-ureshi/game/'}), doc=window.document;
  doc.write('<html><body><nav class="world-game-controls"></nav><div id="game-root"></div></body></html>');
  Object.defineProperty(window.navigator,'userAgent',{value:ua,configurable:true});
  Object.defineProperty(window.navigator,'platform',{value:platform,configurable:true});
  Object.defineProperty(window.navigator,'maxTouchPoints',{value:touch,configurable:true});
  const orientation = new window.EventTarget(); orientation.type=direction;
  Object.defineProperty(window.screen,'orientation',{value:orientation,configurable:true});
  return {window,doc,orientation,root:doc.querySelector('#game-root')};
}
const exitURL='/buncho-ureshi/encyclopedia/';

test('device recommendation handles phones, Android tablets and desktop-UA iPads without using viewport width',()=>{
  for(const userAgent of ['iPhone','iPad','Mozilla Android 14']) assert.equal(supportsGameDevice({navigator:{userAgent,maxTouchPoints:5}}),true);
  assert.equal(supportsGameDevice({navigator:{userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5}}),true);
  assert.equal(supportsGameDevice({navigator:{userAgent:'Macintosh',maxTouchPoints:0},innerWidth:320}),false);
  assert.equal(supportsGameDevice({navigator:{userAgent:'Windows',maxTouchPoints:10},matchMedia:()=>({matches:true})}),false);
});
test('physical orientation stays portrait when a keyboard or split viewport reduces the height',()=>{
  assert.equal(portraitGameDevice({screen:{orientation:{type:'portrait-primary'}},innerWidth:390,innerHeight:240}),true);
  assert.equal(portraitGameDevice({screen:{orientation:{type:'landscape-primary'}}}),false);
  assert.equal(portraitGameDevice({orientation:90}),false);
  assert.equal(portraitGameDevice({orientation:180}),true);
  assert.equal(portraitGameDevice({screen:{width:768,height:1024},innerWidth:768,innerHeight:300}),true);
});
test('unsupported first visit does not start or touch a world until explicit continue, and cleanup runs once',async()=>{
  const f=fixture();let starts=0,stops=0;
  f.window.localStorage.setItem('world-sentinel','unchanged');
  const dispose=mountGameEnvironment(f.root,{exitURL,start:()=>{starts++;return()=>stops++;}});
  const dialog=f.doc.querySelector('.game-environment-notice');
  assert.equal(dialog.open,true);assert.equal(starts,0);assert.equal(dialog.dataset.reason,'device');
  assert.equal(dialog.querySelector('a').getAttribute('href'),exitURL);
  const event=new f.window.Event('cancel',{cancelable:true});dialog.dispatchEvent(event);assert.equal(event.defaultPrevented,true);
  dialog.querySelector('button').click();assert.equal(starts,1);assert.equal(dialog.open,false);
  f.window.dispatchEvent(new f.window.Event('resize'));assert.equal(starts,1);
  assert.equal(f.window.localStorage.getItem(GAME_DEVICE_CHOICE_KEY),null);
  assert.equal(f.window.localStorage.getItem('world-sentinel'),'unchanged');
  dispose();assert.equal(stops,1);assert.equal(f.doc.querySelector('dialog'),null);assert.equal(f.doc.body.hasAttribute('data-game-device'),false);
  await f.window.happyDOM.close();
});
test('remember choice writes only its own optional preference; malformed preference is not consent',async()=>{
  const f=fixture();f.root.innerHTML='<section class="game-settings"><p class="game-settings-intro"></p></section>';f.window.localStorage.setItem(GAME_DEVICE_CHOICE_KEY,'unexpected');
  const dispose=mountGameEnvironment(f.root,{exitURL,start:()=>{}});
  const dialog=f.doc.querySelector('dialog');assert.equal(dialog.open,true);
  dialog.querySelector('input').checked=true;dialog.querySelector('button').click();
  assert.equal(f.window.localStorage.getItem(GAME_DEVICE_CHOICE_KEY),'continue');const review=f.doc.querySelector('[data-game-device-review]');review.focus();f.doc.dispatchEvent(new f.window.CustomEvent('buncho-game-will-render'));f.doc.dispatchEvent(new f.window.CustomEvent('buncho-game-panel',{detail:'settings'}));assert.equal(f.doc.activeElement,review);dispose();
  let starts=0;const next=mountGameEnvironment(f.root,{exitURL,start:()=>starts++});
  assert.equal(starts,1);assert.equal(f.doc.querySelector('dialog').open,false);f.doc.querySelector('[data-game-device-review]').click();assert.equal(f.doc.querySelector('dialog').open,true);assert.equal(f.window.localStorage.getItem(GAME_DEVICE_CHOICE_KEY),null);next();await f.window.happyDOM.close();
});
test('portrait phone starts once; rotation preserves draft nodes and restores earlier dialog focus',async()=>{
  const f=fixture({ua:'iPhone',touch:5});let starts=0;const changes=[];
  f.doc.addEventListener('buncho-game-view-visibility',e=>changes.push(e.detail.blocked));
  const dispose=mountGameEnvironment(f.root,{exitURL,start:()=>{starts++;f.root.innerHTML='<input id="draft" value="書きかけの名前">';}});
  const input=f.doc.querySelector('#draft');input.focus();
  f.orientation.type='landscape-primary';f.orientation.dispatchEvent(new f.window.Event('change'));
  const dialog=f.doc.querySelector('dialog');assert.equal(dialog.open,true);assert.equal(dialog.dataset.reason,'orientation');
  assert.equal(dialog.querySelector('button').hidden,true);assert.equal(f.doc.body.dataset.gameViewBlocked,'orientation');
  f.orientation.type='portrait-primary';f.orientation.dispatchEvent(new f.window.Event('change'));
  assert.equal(dialog.open,false);assert.equal(f.doc.querySelector('#draft'),input);assert.equal(input.value,'書きかけの名前');assert.equal(starts,1);
  assert.deepEqual(changes,[true,false]);assert.equal(f.doc.body.hasAttribute('data-game-view-blocked'),false);
  dispose();await f.window.happyDOM.close();
});
test('landscape phone waits for portrait; disposed entry cannot start from late orientation events',async()=>{
  const f=fixture({ua:'Android Mobile',touch:5,direction:'landscape-primary'});let starts=0;
  const dispose=mountGameEnvironment(f.root,{exitURL,start:()=>starts++});assert.equal(starts,0);
  dispose();f.orientation.type='portrait-primary';f.orientation.dispatchEvent(new f.window.Event('change'));assert.equal(starts,0);
  await f.window.happyDOM.close();
});
