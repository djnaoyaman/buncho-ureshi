import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {relationshipMapModel as model,renderRelationshipMap as render,navigateRelationships as navigate,bindRelationshipNavigation as bind} from '../src/relationship-map.js';
const make=n=>({birds:Array.from({length:n},(_,i)=>({id:`b${i}`,name:i%2?'そら':'おもち',color:i%2?'silver':'white',stage:'adult',home:i%2?'departed':'resident',relations:{}}))});
const linked=n=>{const w=make(n);for(const b of w.birds.slice(1)){w.birds[0].relations[b.id]={affection:80,trust:60,compatibility:92};b.relations.b0={affection:21,trust:30,compatibility:92};}return w;};
const label=(_w,a,b)=>a.relations[b.id]?.affection>65?'仲のよい友達':'顔見知り';
const docFor=(html)=>{const window=new Window();window.document.body.innerHTML=html;return window;};
for(const size of [0,1,12,128])test(`${size} birds: pure, bounded diagram with every contact reachable`,()=>{
 const w=linked(size),before=JSON.stringify(w),seen=[];const first=model(w,'b0');
 for(let page=0;page<first.pageCount;page++){const m=model(w,'b0',page);assert(m.peers.length<=2);assert.equal(m.edges.length,m.peers.length);seen.push(...m.peers.map(b=>b.id));}
 assert.equal(seen.length,Math.max(0,size-1));assert.equal(new Set(seen).size,seen.length);render(w,'b0',{label});assert.equal(JSON.stringify(w),before);
});
test('connector geometry lands exactly on CSS half-column centers, single centered',()=>{
 for(const n of [2,3,12,128]){const m=model(linked(n),'b0');for(const [i,e]of m.edges.entries()){assert.deepEqual([e.x1,e.y1,e.x2,e.y2],[50,0,m.peers.length===1?50:25+i*50,100]);assert(e.path.startsWith('M 50 0 C'));assert.equal(e.from,'b0');assert.equal(e.to,m.peers[i].id);for(const width of [280,320,350,390,636]){const x=e.x2/100*width;assert.equal(x,m.peers.length===1?width/2:width/4+i*width/2);}}}
});
test('zero contacts and absent selected ID are safe without imaginary edges',()=>{const w=make(3);assert.equal(model(w,'unknown').focus.id,'b0');assert.equal(model(w,'b0').edges.length,0);assert.match(render(w,'b0',{label}),/これから少しずつ/);assert.doesNotMatch(render(w,'b0',{label}),/<svg/);});
test('all directed labels and exact asymmetric scores remain distinct; numeric details closed',()=>{
 const w=linked(3),win=docFor(render(w,'b0',{label})),d=win.document;
 assert.equal(d.querySelectorAll('.buncho-rel-feeling strong')[0].textContent,'仲のよい友達');assert.equal(d.querySelectorAll('.buncho-rel-feeling strong')[1].textContent,'顔見知り');
 assert.match(d.querySelector('dl').textContent,/親しさ 80 ／ 信頼 60/);assert.match(d.querySelector('dl').textContent,/親しさ 21 ／ 信頼 30/);assert([...d.querySelectorAll('details')].every(x=>!x.open));win.happyDOM.abort();
});
test('inbound-only record visible; absent opposite scores never fabricated as zero',()=>{const w=make(2);w.birds[1].relations.b0={affection:43};assert.equal(model(w,'b0').total,1);const html=render(w,'b0',{label});assert.match(html,/親しさ 記録なし/);assert.match(html,/親しさ 43/);});
test('duplicate names carry real color, age and home context in accessible controls',()=>{const w=linked(3);w.birds[1].name=w.birds[2].name='そら';const win=docFor(render(w,'b0',{label}));const buttons=[...win.document.querySelectorAll('[data-rel-focus-id]')];assert.match(buttons[0].getAttribute("aria-label"),/そら（シルバー・成鳥・別の庭に巣立った仲間）/);assert.match(buttons[1].getAttribute("aria-label"),/そら（白文鳥・成鳥・この庭の仲間）/);assert.notEqual(buttons[0].dataset.relFocusId,buttons[1].dataset.relFocusId);win.happyDOM.abort();});
test('names, ids, context and labels are escaped; only trusted portrait callback is raw',()=>{const w=linked(2);w.birds[1].name='<img src=x onerror=alert(1)>';w.birds[1].id='x" onclick="bad';w.birds[0].relations[w.birds[1].id]={affection:1};const win=docFor(render(w,'b0',{label:()=>'<script>bad</script>',context:()=>'<b>text</b>'}));assert.equal(win.document.querySelectorAll('img,script,[onclick]').length,0);assert.match(win.document.body.textContent,/<script>bad/);win.happyDOM.abort();});
test('navigation wraps birds by stable ID; clamps peers; invalid input and removed contacts safe',()=>{const w=linked(12);assert.deepEqual(navigate(w,{selectedId:'b0',page:3},{type:'focus-step',step:-1}),{selectedId:'b11',page:0});assert.deepEqual(navigate(w,{selectedId:'b0',page:9},{type:'page-step',step:1}),{selectedId:'b0',page:5});assert.equal(navigate(w,{selectedId:'b0',page:0},{type:'page-step',step:-1}).page,0);assert.equal(model(w,'b0',Infinity).currentPage,0);assert.deepEqual(navigate({birds:[]},{},{type:'page-step',step:1}),{selectedId:null,page:0});});
test('keyboard, buttons, horizontal gesture, vertical/cancel gestures and cleanup',()=>{
 const win=docFor(render(linked(12),'b0',{label})),root=win.document.body,actions=[],dispose=bind(root,a=>actions.push(a));
 root.querySelector('[data-rel-page-step="1"]').click();assert.deepEqual(actions.pop(),{type:'page-step',step:1});root.querySelector('[data-rel-map]').dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(actions.pop().step,1);
 const area=root.querySelector('[data-rel-swipe="page"]');const drag=(x,y,type='pointerup')=>{area.dispatchEvent(new win.PointerEvent('pointerdown',{pointerId:1,isPrimary:true,clientX:100,clientY:100,bubbles:true}));win.document.dispatchEvent(new win.PointerEvent(type,{pointerId:1,isPrimary:true,clientX:x,clientY:y,bubbles:true}));};
 drag(20,105);assert.deepEqual(actions.pop(),{type:'page-step',step:1});drag(95,190);assert.equal(actions.length,0);drag(20,105,'pointercancel');assert.equal(actions.length,0);
 root.querySelector('[data-rel-focus-id]').click();assert.equal(actions.pop().type,'focus-id');dispose();drag(20,105);root.querySelector('[data-rel-page-step="1"]').click();assert.equal(actions.length,0);win.happyDOM.abort();
});

test("identical focal/contact names have visible upper/lower direction roles",()=>{const w=linked(2);w.birds[0].name=w.birds[1].name="そら";const html=render(w,"b0",{label});assert.match(html,/上のそら/);assert.match(html,/下のそら/);});
