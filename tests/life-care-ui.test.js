import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

// Isolate the pure renderer against its public lifecycle contract. Engine tests
// separately verify these selectors, migrations, clocks, and transactions.
const source=await readFile(new URL('../src/life-care-ui.js',import.meta.url),'utf8');
const memorialModule=new URL('../src/memorial-designs.js',import.meta.url).href;
const caretakerModule=new URL('../src/caretaker-recruitment-ui.js',import.meta.url).href;
const stub=`import {renderCaretakerRecruitment} from '${caretakerModule}';
import {memorialDesignForBird,renderMemorialArtwork} from '${memorialModule}';
const protagonistStatus=w=>({bird:w.birds[0]??null,generation:1,waiting:null,heir:null});
const LIFE_RULES={neglectMs:259200000,hospitalGold:12,caretakerDailyGold:24};
const lifeStatus=(w,b)=>b.life;
const isAlive=(w,b)=>!b.life.death;
const caretakerStatus=w=>w.contract;
const conditionName=k=>({respiratory:'呼吸器の病気',digestive:'おなかの病気',injury:'けが'}[k]||k);
const ageLabel=(w,b)=>b.age||'ゲーム内1歳';`;
const {renderLifeCarePanel,renderMemorialPanel,renderLifeSummary}=await import(`data:text/javascript;base64,${Buffer.from(stub+source.replace(/^import[^\n]+\n/gm,'')).toString('base64')}`);
const time=10000000;
function bird(id='one',patch={}){return{id,name:'おもち',home:'resident',color:'white',parents:[],partner:null,life:{condition:null,death:null,lastCareAt:time,incenseCount:0,prayerCount:0,lastIncenseAt:null,lastPrayerAt:null},...patch};}
function world(){return{birds:[bird()],economy:{gold:100},lifecycle:{seenAt:time},contract:{active:false,remainingMs:0,until:null}};}
function documentFor(html){const window=new Window();window.document.body.innerHTML=html;return window.document;}

test('health rendering is pure and states fictional real-time rules and prices',()=>{
 const w=world(),before=JSON.stringify(w),html=renderLifeCarePanel(w),doc=documentFor(html);
 assert.equal(JSON.stringify(w),before);
 assert.match(html,/ゲーム内10年/);assert.match(html,/実時間3日/);assert.match(html,/発症から実時間24時間/);assert.match(html,/鳥を診られる獣医師/);assert.match(html,/追加料金なし/);
 assert.equal(doc.querySelector('[data-life-hire="1"]').disabled,false);
 assert.equal(doc.querySelector('[data-life-hire="3"]').disabled,false);
 assert.equal(doc.querySelector('[data-life-hire="7"]').disabled,true);
 assert.match(doc.querySelector('[data-life-hire="7"]').textContent,/168 Gold/);
});
test('hospital action escapes ids and names and disables only unaffordable treatment',()=>{
 const w=world();w.birds[0].name='<img src=x onerror=alert(1)>';w.birds[0].id='x" autofocus="true';w.birds[0].life.condition={kind:'respiratory',deadlineAt:time+3600000};w.economy.gold=11;
 const doc=documentFor(renderLifeCarePanel(w)),button=doc.querySelector('[data-life-treat]');
 assert.equal(doc.querySelector('.life-bird-card img'),null);assert.equal(doc.querySelectorAll('img').length,1);assert.equal(doc.querySelector('img').getAttribute('src'),'./assets/caretaker-signboard-A-v2.png');const art=doc.querySelector('img');assert.equal(art.getAttribute('alt'),'');assert.deepEqual([...art.attributes].map(a=>[a.name,a.value]).sort(),[['alt',''],['height','1312'],['src','./assets/caretaker-signboard-A-v2.png'],['width','1199']]);assert.equal([...doc.querySelectorAll('*')].some(el=>[...el.attributes].some(a=>/^on/i.test(a.name))),false);assert.equal(button.getAttribute('autofocus'),null);assert.equal(button.dataset.lifeTreat,w.birds[0].id);assert.equal(button.disabled,true);assert.match(button.textContent,/12 Gold/);
 w.economy.gold=12;assert.equal(documentFor(renderLifeCarePanel(w)).querySelector('[data-life-treat]').disabled,false);
});
test('only living residents appear in health panel and active contracts say extension',()=>{
 const w=world();w.birds.push(bird('visitor',{home:'visitor'}),bird('dead',{life:{death:{cause:'lifespan'}}}));w.contract={active:true,remainingMs:29*86400000};w.economy.gold=999;
 const doc=documentFor(renderLifeCarePanel(w));assert.equal(doc.querySelectorAll('.life-bird-card').length,1);
 assert.match(doc.querySelector('[data-life-hire="1"]').textContent,/延長/);assert.equal(doc.querySelector('[data-life-hire="1"]').disabled,false);assert.equal(doc.querySelector('[data-life-hire="3"]').disabled,true);
});
test('memorial preserves names family color and provides free actions and card',()=>{
 const w=world();const b=w.birds[0];b.parents=['parent'];b.partner='partner';b.life.death={cause:'lifespan'};b.life.incenseCount=2;b.life.prayerCount=3;
 w.birds.push(bird('parent',{name:'親<&'}),bird('partner',{name:'つがい'}),bird('child',{name:'子',parents:[b.id]}));
 const before=JSON.stringify(w),doc=documentFor(renderMemorialPanel(w));assert.equal(JSON.stringify(w),before);
 assert.equal(doc.querySelectorAll('.life-grave').length,1);assert.match(doc.body.textContent,/白文鳥/);assert.match(doc.body.textContent,/親<&/);assert.match(doc.body.textContent,/子：子/);assert.match(doc.body.textContent,/寿命/);assert.match(doc.body.textContent,/煙を近づけない/);
 for(const attr of ['data-life-incense','data-life-pray','data-game-art'])assert.equal(doc.querySelector(`[${attr}]`).getAttribute(attr),b.id);
 assert.match(doc.body.textContent,/お線香 2回/);assert.match(doc.body.textContent,/お祈り 3回/);
});
test('memorial cooldowns are independent and expire at one minute',()=>{
 const w=world(),b=w.birds[0];b.life.death={cause:'illness'};b.life.lastIncenseAt=time-59999;b.life.lastPrayerAt=time-60000;
 const doc=documentFor(renderMemorialPanel(w));assert.equal(doc.querySelector('[data-life-incense]').disabled,true);assert.equal(doc.querySelector('[data-life-pray]').disabled,false);
 assert.match(renderLifeSummary(w,b),/思い出の庭/);
});
test('empty memorial and missing residents remain usable',()=>{
 const w=world();assert.match(renderMemorialPanel(w),/まだお墓はありません/);w.birds=[];
 const doc=documentFor(renderLifeCarePanel(w));assert.match(doc.body.textContent,/暮らしている文鳥はいません/);assert.ok([...doc.querySelectorAll('[data-life-hire]')].every(b=>b.disabled));
});

test('illness shows both independent deadlines in earliest-first order, including ties',()=>{
 for(const [foodHours,treatmentHours,first] of [[1,24,'feed'],[72,1,'treatment'],[24,24,'feed']]){
  const w=world();w.birds[0].life.lastCareAt=time+(foodHours-72)*3600000;w.birds[0].life.condition={kind:'injury',deadlineAt:time+treatmentHours*3600000};const before=JSON.stringify(w),doc=documentFor(renderLifeCarePanel(w));
  const deadlines=[...doc.querySelectorAll('[data-life-deadline]')];assert.equal(deadlines.length,2);assert.equal(deadlines[0].dataset.lifeDeadline,first);assert.match(deadlines.find(e=>e.dataset.lifeDeadline==='feed').textContent,/ごはんまで（実時間）/);assert.match(deadlines.find(e=>e.dataset.lifeDeadline==='treatment').textContent,/通院まで（実時間）/);
  if(foodHours===treatmentHours)assert.ok(deadlines.every(e=>e.textContent.startsWith('同じ時刻')));else{assert.ok(deadlines[0].textContent.startsWith('先に必要'));assert.ok(!deadlines[1].textContent.startsWith('先に必要'));}
  assert.match(doc.querySelector('.life-bird-card').textContent,/片方だけでは、もう片方の期限は延びません/);assert.equal(JSON.stringify(w),before);
 }
});
test('healthy feeding deadline stays explicit while caretaker coverage stays clear',()=>{
 const w=world();assert.match(documentFor(renderLifeCarePanel(w)).querySelector('.life-bird-card').textContent,/ごはんの期限まで：実時間 3日 0時間/);w.contract={active:true,remainingMs:7*86400000};const card=documentFor(renderLifeCarePanel(w)).querySelector('.life-bird-card');assert.match(card.textContent,/飼育員がお世話をしています/);assert.doesNotMatch(card.textContent,/ごはんの期限まで/);
});
