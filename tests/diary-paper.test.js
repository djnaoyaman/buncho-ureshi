import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createWorld, serializeWorld, eventText, advanceTicks } from '../src/engine.js';
import { renderDiaryPaper as render } from '../src/diary-paper.js';
const dom = html => { const win = new Window(); win.document.body.innerHTML = html; return win; };
const kinds = ['pair','egg','hatch','grow','adopt','movein','depart','welcome','play','user-feed'];
const fixture = (n = 240) => ({birds:[{id:'b1', name:'Ed',color:'white',stage:'adult'},{id:'b2',name:'長い名前'.repeat(16),color:'silver',stage:'adult',home:'departed'}],events:Array.from({length:n},(_,i)=>({id:`e${i+1}`,kind:kinds[i%kinds.length],ids:['b1','b2'],data:{stage:'juvenile'},tick:i,at:Date.UTC(2025,1,3)+i*15000,condition:`条件${i}`,result:`結果${i}`}))});
const portrait = b => `<span class="game-mini-bird" data-test-stage="${b.stage}"></span>`;
test('all 240 records and newest 12 important events retain exact order, text, detail keys and card targets',()=>{
 const w=fixture(),before=JSON.stringify(w),win=dom(render(w,{portrait})),d=win.document;
 const all=w.events.slice().reverse(),important=all.filter(e=>kinds.slice(0,7).includes(e.kind)).slice(0,12);
 for(const [scope,expected,selector] of [['all',all,'.diary-paper-all'],['milestone',important,'.diary-paper-pages']]){
  const rows=[...d.querySelector(selector).children];assert.equal(rows.length,expected.length);
  rows.forEach((row,i)=>{const e=expected[i];assert.equal(row.querySelector('.diary-paper-event').textContent,eventText(w,e));assert.equal(row.querySelector('details').dataset.gameDetails,`diary-${scope}-${e.id}`);assert.equal(row.querySelector('details p').textContent,`${e.condition}。${e.result}。`);assert.equal(row.querySelector('time').dateTime,new Date(e.at).toISOString());assert.equal(row.querySelector('button')?.dataset.gameEventArt,['egg','hatch','grow','pair'].includes(e.kind)?e.id:undefined);});
 }
 assert.equal(JSON.stringify(w),before);assert.equal(d.querySelector('.game-full-diary').open,false);assert.match(d.body.textContent,/すべての日記 · 240件/);assert.match(d.body.textContent,/新しい240件を保存/);win.happyDOM.abort();
});
test('actual historical date, not current date or prototype twelfth day',()=>{
 const w=fixture(1),win=dom(render(w));const time=win.document.querySelector('time');assert.equal(time.dateTime,'2025-02-03T00:00:00.000Z');assert.match(time.textContent,/1日目 0時/);assert.match(time.textContent,/2025\/2\/3/);win.happyDOM.abort();
});
test('missing historical subject never uses another current bird; event and card action survive',()=>{
 const w=fixture(3);w.events[2].ids=['archived'];const calls=[];const win=dom(render(w,{portrait:b=>{calls.push(b);return portrait(b);}}));const row=win.document.querySelector('.diary-paper-pages li');assert.match(row.textContent,/文鳥が卵からかえった/);assert.equal(row.querySelector('figure'),null);assert.equal(row.querySelector('button').dataset.gameEventArt,'e3');assert(calls.every(b=>b.id!=='archived'));win.happyDOM.abort();
});
test('historic growth and hatch portraits use event stage, not current adult; departed/dead bird stays exact ID',()=>{
 const w=fixture(4);w.events[3].ids=['b2'];w.birds[1].dead=true;const calls=[];render(w,{portrait:b=>{calls.push(b);return portrait(b);}});assert.equal(calls[0].id,'b2');assert.equal(calls[0].stage,'juvenile');assert.equal(calls[1].stage,'chick');assert.equal(calls[2].stage,'egg');
});
test('escaped text, names, conditions, result and IDs cannot introduce markup or event attributes',()=>{
 const w=fixture(4),bad='<img src=x onerror="bad">&\'';w.birds[0].name=bad;w.events[3].id='" onclick="bad';w.events[3].condition=bad;w.events[3].result=bad;const win=dom(render(w));assert.equal(win.document.querySelectorAll('img,script,[onclick],[onerror]').length,0);assert.match(win.document.body.textContent,/<img src=x/);assert.equal(win.document.querySelector('button').dataset.gameEventArt,'" onclick="bad');win.happyDOM.abort();
});
test('empty, legacy unknown kind, absent data, malformed timestamp and long content remain readable without mutation',()=>{
 for(const w of [{},{birds:[],events:[]},{birds:[],events:[{id:'old',kind:'old',ids:['missing'],result:'記録'.repeat(500),condition:'古い記録',at:'bad'}]},{birds:[],events:[{id:'old',kind:'grow',ids:['missing'],tick:10,at:9e20}]}]){
  const before=JSON.stringify(w),win=dom(render(w));assert.equal(JSON.stringify(w),before);assert.equal(win.document.querySelectorAll('[datetime="Invalid Date"]').length,0);if(w.events?.length){assert.match(win.document.body.textContent,/日時の記録なし/);assert.equal(win.document.querySelectorAll('.diary-paper-all>li').length,1);}else assert.match(win.document.body.textContent,/家族の節目が/);win.happyDOM.abort();
 }
});
test('native disclosure markup remains keyboard-capable, with no substitute buttons, tab traps or paging',()=>{
 const win=dom(render(fixture(4)));for(const detail of win.document.querySelectorAll('details')){assert.equal(detail.firstElementChild.tagName,'SUMMARY');assert.equal(detail.getAttribute('tabindex'),null);assert.equal(detail.querySelector('summary').getAttribute('role'),null);detail.open=true;assert.equal(detail.open,true);detail.open=false;}assert.equal(win.document.querySelectorAll('[onclick],[onkeydown],[hidden],nav').length,0);win.happyDOM.abort();
});
test('real saved world is byte-identical through repeated renders and visual callback receives no saved references',()=>{
 const w=createWorld(Date.UTC(2025,1,3),42);advanceTicks(w,200);const before=serializeWorld(w);for(let i=0;i<5;i++)render(w,{portrait:b=>{b.name='changed only local copy';return '';}});assert.equal(serializeWorld(w),before);
});

test('complete left-pose atlas stays inside diary-only portrait allowances at every supported age/color',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {gameSpriteGeometry,gameBirdSvg}=await import('../src/game.js');
 const css=await readFile(new URL('../src/diary-paper.css',import.meta.url),'utf8');
 const selector='.diary-paper .diary-paper-portrait .game-sprite';
 assert.match(css,/\.diary-paper \.diary-paper-portrait \.game-sprite\{width:82%;height:auto;max-width:100%;flex:none;margin:0 16% 0 2%;overflow:visible;object-fit:contain\}/);
 assert.match(css,/\.diary-paper \.diary-paper-portrait \.game-mini-bird\{max-width:180px;padding-bottom:8px;box-sizing:border-box\}/);
 assert.equal([...css.matchAll(/([^{}]+)\{[^{}]*overflow:visible[^{}]*\}/g)].length,1);
 assert.equal([...css.matchAll(/([^{}]+)\{[^{}]*overflow:visible[^{}]*\}/g)][0][1].trim(),selector);
 assert.doesNotMatch(css,/clip-path:|\.game-pose-window\s*\{/);
 for(const color of ['white','sakura','cinnamon','silver'])for(const stage of ['adult','juvenile','chick','egg']){
  const g=gameSpriteGeometry(color,stage,'left'),box=g.window||{left:g.imageLeft,top:g.imageTop,width:g.imageWidth,height:g.height*g.scale/1000};
  for(const width of [110,150,180]){
   const frame=width*.82,left=width*.02+box.left*frame,right=width*.02+(box.left+box.width)*frame;
   assert(left>=-1e-8,`${color}/${stage} left edge`);assert(right<=width+1e-8,`${color}/${stage} tail edge`);
   const frameHeight=frame*1000/850;
   assert(box.top*frameHeight>=-1e-8);assert((box.top+box.height)*frameHeight<=frameHeight+8,`${color}/${stage} feet edge`);
  }
  const html=gameBirdSvg(color,stage,'left');
  assert.match(html,new RegExp(`data-stage="${stage}"`));
  if(g.clip)assert.match(html,/clip-path:polygon\(/); // Neighboring atlas poses stay masked.
 }
});
