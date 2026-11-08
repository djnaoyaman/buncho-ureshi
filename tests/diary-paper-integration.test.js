import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {mountGame,gameBirdSvg} from '../src/game.js';
import {DB_NAME} from '../src/game-store.js';
import {eventText,serializeWorld,bumpRevision} from '../src/engine.js';
import {renderDiaryPaper} from '../src/diary-paper.js';
import {diaryFixture,validated,expectedDiary,detailSelector,summarySelector,FULL,CARD} from './fixtures/diary-paper.js';
async function record(indexedDB,value){
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('world');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction('world',value?'readwrite':'readonly');
    const request=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');
    tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
}
async function setup(t,kind){
  const win=new Window({url:'https://djnaoyaman.github.io/buncho-ureshi/game/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});
  const indexedDB=new IDBFactory(),globals=new Map(),timers=new Map();let dispose,nextTimer=0;
  const frozen=diaryFixture(kind).lastUpdated,originalNow=Date.now;Date.now=()=>frozen;
  const values={window:win,document:win.document,location:win.location,navigator:win.navigator,
    localStorage:win.localStorage,FormData:win.FormData,matchMedia:win.matchMedia.bind(win),indexedDB,
    BroadcastChannel:undefined,setInterval:callback=>{timers.set(++nextTimer,callback);return nextTimer;},clearInterval:id=>timers.delete(id)};
  for(const [key,value]of Object.entries(values)){
    globals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  }
  t.after(async()=>{
    dispose?.();await win.happyDOM.abort();await win.happyDOM.close();Date.now=originalNow;
    for(const [key,descriptor]of globals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  });
  win.localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
  const initial=diaryFixture(kind);await record(indexedDB,initial);
  const articles=[],art=[];const options={goArticle:id=>articles.push(id),goArt:value=>art.push(value)};
  const root=win.document.createElement('main');win.document.body.append(root);dispose=await mountGame(root,options);
  const open=()=>root.querySelector('#game-menu-diary').click();open();
  return {win,root,initial,open,articles,art,read:()=>record(indexedDB),write:value=>record(indexedDB,value),
    poll:()=>[...timers.values()].find(callback=>callback.name==='poll')(),
    remount:async()=>{dispose();dispose=await mountGame(root,options);open();}};
}
function one(root,selector){const nodes=root.querySelectorAll(selector);assert.equal(nodes.length,1,selector);return nodes[0];}
function preflight(root,w){
 const {all,important}=expectedDiary(w);
 one(root,'.diary-paper');one(root,'.diary-paper-heading h3');one(root,FULL);one(root,`${FULL} > summary`);
 assert.equal(root.querySelectorAll('.diary-paper-pages > .diary-paper-entry').length,important.length);
 assert.equal(root.querySelectorAll('.diary-paper-all > .diary-paper-entry').length,all.length);
 for(const [scope,events] of [['milestone',important],['all',all]])for(const e of events){
  const details=one(root,detailSelector(scope,e.id));one(root,summarySelector(scope,e.id));const row=details.parentElement;
  assert.equal(row.querySelector('.diary-paper-event').textContent,eventText(w,e));
  assert.equal(row.querySelector('time').dateTime,new Date(e.at).toISOString());
  assert.equal(details.querySelector('p').textContent,`${e.condition}。${e.result}。`);
  if(CARD.has(e.kind))one(root,`${scope==='all'?'.diary-paper-all':'.diary-paper-pages'} [data-game-event-art="${e.id}"]`);
  if(scope==='milestone')assert.equal(row.querySelector('figcaption').textContent,w.birds.find(b=>b.id===e.ids[0]).name);
 }
}
for(const kind of ['mixed','historical','manual-omochi','deceased','empty'])test(`diary integrated ${kind}: all browser selectors unique, real identity/date and unchanged valid save`,async t=>{
 const f=await setup(t,kind),before=serializeWorld(f.initial);preflight(f.root,f.initial);
 assert.equal(f.initial.birds[0].naming.source,kind==='manual-omochi'?'manual':'automatic');
 for(let i=0;i<2;i++){one(f.root,'[data-game-close-panel]').click();f.open();preflight(f.root,f.initial);}
 await f.remount();preflight(f.root,f.initial);assert.equal(serializeWorld(await f.read()),before);
});
test('native disclosures survive a peer rerender and card route forwards the exact event identity without changing save',async t=>{
 const f=await setup(t,'mixed'),{important}=expectedDiary(f.initial),e=important.find(e=>CARD.has(e.kind));
 const d=one(f.root,detailSelector('milestone',e.id));d.open=true;one(f.root,FULL).open=true;
 const peer=await f.read();bumpRevision(peer);validated(peer);await f.write(peer);await f.poll();
 assert.equal(one(f.root,detailSelector('milestone',e.id)).open,true);assert.equal(one(f.root,FULL).open,true);
 one(f.root,`.diary-paper-pages [data-game-event-art="${e.id}"]`).click();
 assert.equal(f.art.length,1);assert.equal(f.art[0].title,eventText(peer,e));assert.equal(f.art[0].birds[0].id,e.ids[0]);
 assert.deepEqual(await f.read(),peer);
});
test('renderer-only missing ID and literal empty history are safe, never imported as invalid saves',t=>{
 const win=new Window();t.after(()=>win.happyDOM.abort());const w=diaryFixture();w.events.at(-1).ids=['missing-historical-id'];
 const before=JSON.stringify(w);win.document.body.innerHTML=renderDiaryPaper(w,{portrait:b=>gameBirdSvg(b.color,b.stage,'left')});
 const row=one(win.document,detailSelector('milestone',w.events.at(-1).id)).parentElement;
 assert.equal(row.querySelector('figure'),null);assert.match(row.textContent,/文鳥/);assert.equal(JSON.stringify(w),before);
 win.document.body.innerHTML=renderDiaryPaper({birds:[],events:[]});one(win.document,'.diary-paper-empty');assert.equal(win.document.querySelectorAll('.diary-paper-all > li').length,0);
});
