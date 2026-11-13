import test from 'node:test';import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,drawDecoration,decorDrawStatus,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS,validateWorld,serializeWorld,economyToken} from '../src/engine.js';
import {GACHA_MACHINES} from '../src/gacha-machines.js';
import {mountGachaMotion} from '../src/gacha-motion.js';
const now=1794182400000;
const ready=()=>{const w=createWorld(now);w.decor.points=w.decor.lifetimePoints=1000;return w;};
for(const machine of GACHA_MACHINES){
 test(`${machine.name}: cost, actual odds and repeated-click protection`,()=>{const w=ready(),odds=decorDrawStatus(w,'perch',machine.id).probabilities;assert.ok(Math.abs(odds.reduce((s,o)=>s+o.probability,0)-1)<1e-12);const token=economyToken(w),r=drawDecoration(w,'perch',machine.id,token);assert.equal(w.decor.points,1000-machine.cost+(r.duplicate?machine.refund:0));assert.equal(r.cost,machine.cost);const after=serializeWorld(w);assert.equal(drawDecoration(w,'perch',machine.id,token).changed,false);assert.equal(serializeWorld(w),after);validateWorld(w);});
 test(`${machine.name}: two duplicates refund correctly, then guarantee new`,()=>{const w=ready(),target='perch-sky-special';w.decor.inventory=DECOR_SLOTS.flatMap(s=>DECOR_COLORS.flatMap(c=>DECOR_TIERS.map(t=>({id:`${s.id}-${c.id}-${t.id}`,slot:s.id,color:c.id,tier:t.id})))).filter(i=>i.id!==target);w.seed=0;
  let paid=0;for(let i=0;i<2;i++){// Seed zero's first tier roll is ordinary for every machine except the round machine.
   // Make the sole missing variant a color that this deterministic draw cannot select.
   const clone=structuredClone(w),preview=drawDecoration(clone,'perch',machine.id);if(!preview.duplicate){w.seed++;i--;continue;}
   const r=drawDecoration(w,'perch',machine.id);assert.ok(r.duplicate);assert.equal(r.refund,machine.refund);paid+=machine.cost-machine.refund;w.tick++;
  }
  assert.ok(decorDrawStatus(w,'perch',machine.id).guaranteed);const r=drawDecoration(w,'perch',machine.id);assert.equal(r.item.id,target);assert.equal(r.duplicate,false);assert.equal(w.decor.points,1000-paid-machine.cost);validateWorld(w);
 });
 test(`${machine.name}: shortage or level restriction never spends or advances RNG`,()=>{const w=ready();w.decor.points=machine.cost-1;const before=serializeWorld(w);assert.throws(()=>drawDecoration(w,'perch',machine.id),/Gems/);assert.equal(serializeWorld(w),before);if(machine.level>1){const low=createWorld(now),old=serializeWorld(low);assert.equal(drawDecoration(low,'perch',machine.id).reason,'locked');assert.equal(serializeWorld(low),old);}});
}
test('higher-price machines increase top-tier probability',()=>{const w=ready(),p=GACHA_MACHINES.map(m=>decorDrawStatus(w,'perch',m.id).probabilities[2].probability);assert.ok(p[0]<p[1]&&p[1]<p[2]);});
test('muted and reduced motion produces the durable result without any audio or animation',async()=>{const win=new Window(),dialog=win.document.createElement('dialog');win.document.body.append(dialog);let contexts=0;win.AudioContext=class{constructor(){contexts++;}};const motion=mountGachaMotion(dialog,{motion:false,getSound:()=>false});assert.equal(dialog.querySelector('.gacha-mechanism').dataset.finished,'true');assert.equal(contexts,0);motion.destroy();assert.equal(dialog.children.length,0);await win.happyDOM.close();});
test('cancel and route destruction stop presentation with the body fixed',async()=>{const win=new Window(),dialog=win.document.createElement('dialog');win.document.body.append(dialog);const targets=[],cancelled=[];win.HTMLElement.prototype.animate=function(){targets.push(this.className);return{cancel(){cancelled.push(true);}};};const m=mountGachaMotion(dialog,{getSound:()=>false});assert.equal(targets.length,4);assert.ok(!targets.some(t=>t.includes('fixed-body')));dialog.querySelector('.gacha-skip').click();assert.equal(cancelled.length,4);m.destroy();assert.equal(dialog.children.length,0);await win.happyDOM.close();});

for(const machine of GACHA_MACHINES)for(const extra of [0,1])test(`${machine.id}: exact price and one extra Gem charge the selected machine`,()=>{
 const w=ready();w.decor.points=machine.cost+extra;
 const r=drawDecoration(w,'perch',machine.id);assert.equal(r.changed,true);assert.equal(r.cost,machine.cost);
 assert.equal(w.decor.points,extra+(r.duplicate?machine.refund:0));validateWorld(w);
});
for(const machine of GACHA_MACHINES)test(`${machine.id}: full collection never charges or advances the random sequence`,()=>{
 const w=ready();w.decor.inventory=DECOR_SLOTS.flatMap(s=>DECOR_COLORS.flatMap(c=>DECOR_TIERS.map(t=>({id:`${s.id}-${c.id}-${t.id}`,slot:s.id,color:c.id,tier:t.id}))));
 const before=serializeWorld(w);assert.equal(drawDecoration(w,'perch',machine.id).complete,true);assert.equal(serializeWorld(w),before);validateWorld(w);
});
