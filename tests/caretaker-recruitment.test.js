import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {renderCaretakerRecruitment} from '../src/caretaker-recruitment-ui.js';
import {createWorld,validateWorld,hireCaretaker,economyToken,advanceTo} from '../src/engine.js';
import {renderLifeCarePanel} from '../src/life-care-ui.js';
const now=1794096000000;
const parse=html=>{const w=new Window();w.document.body.innerHTML=html;return w.document;};
// Use baseline renderer as oracle: never reproduce price/time/eligibility formulas.
function fromBaseline(old){
 const section=old.querySelector('.life-caretaker');
 return {active:!!section.querySelector('.life-contract'),dailyGoldLabel:section.querySelector(':scope > p strong').textContent.replace(' Gold',''),goldLabel:section.lastElementChild.textContent.match(/所持金：(.*?) Gold/)[1],remainingLabel:section.querySelector('.life-contract strong')?.textContent.replace('実時間 ','')||'',insufficientGold:section.lastElementChild.textContent.includes('足りません'),options:[...section.querySelectorAll('[data-life-hire]')].map(b=>({days:Number(b.dataset.lifeHire),priceLabel:b.querySelector('strong').textContent.replace(' Gold',''),disabled:b.disabled}))};
}
for(const [name,gold,days,residents] of [['normal',200,0,true],['insufficient',0,0,true],['partial',25,0,true],['active',500,2,true],['cap',5000,29,true],['expired',500,-1,true],['empty',500,0,false]]){
 test(`baseline values and all existing labels retained: ${name}`,()=>{
 const world=createWorld(now,42);world.paused=true;world.economy.gold=world.economy.lifetimeGold=10000;
 if(days>0){let left=days;while(left){const n=left>=7?7:left>=3?3:1;assert.equal(hireCaretaker(world,n,economyToken(world),now).changed,true);left-=n;}}
 if(days<0){hireCaretaker(world,1,economyToken(world),now);advanceTo(world,now+2*86400000);}
 world.economy.gold=gold;if(!residents)world.birds.forEach(b=>b.home='departed');validateWorld(world);
 const original=JSON.stringify(world),old=parse(renderLifeCarePanel(world)),vm=fromBaseline(old),snapshot=JSON.stringify(vm),doc=parse(renderCaretakerRecruitment(vm));
 assert.equal(JSON.stringify(vm),snapshot);assert.equal(JSON.stringify(world),original);
 assert.equal(vm.active,days>0,name);assert.deepEqual(vm.options.map(o=>o.priceLabel),['24','72','168']);
 assert.deepEqual(vm.options.map(o=>o.disabled),!residents?[true,true,true]:days===29?[false,true,true]:gold===0?[true,true,true]:gold===25?[false,true,true]:[false,false,false]);
 const oldButtons=[...old.querySelectorAll('[data-life-hire]')],buttons=[...doc.querySelectorAll('[data-life-hire]')];assert.equal(buttons.length,3);
 buttons.forEach((b,i)=>{assert.equal(b.dataset.lifeHire,oldButtons[i].dataset.lifeHire);assert.equal(b.textContent,oldButtons[i].textContent);assert.equal(b.disabled,oldButtons[i].disabled);assert.equal(b.type,'button');});
 for(const p of old.querySelectorAll('.life-caretaker > p'))assert.ok(doc.querySelector('.caretaker-recruitment').textContent.includes(p.textContent),p.textContent);
 assert.equal(doc.querySelector('h4').textContent,old.querySelector('.life-caretaker h4').textContent);
 assert.equal(doc.querySelector('.life-badge').textContent,old.querySelector('.life-caretaker .life-badge').textContent);
 assert.equal(doc.querySelectorAll('input,select,textarea,script').length,0);
 assert.equal(doc.querySelector('img').getAttribute('src'),'./assets/caretaker-signboard-A-v2.png');
 });
}
test('all text payloads escaped, no raw HTML contract',()=>{
 const payload='"><img src=x onerror=alert(1)>&';const vm={active:true,dailyGoldLabel:payload,goldLabel:payload,remainingLabel:payload,insufficientGold:true,options:[1,3,7].map(days=>({days,priceLabel:payload,disabled:true}))};
 const doc=parse(renderCaretakerRecruitment(vm));assert.equal(doc.querySelectorAll('img').length,1);assert.equal(doc.querySelectorAll('[onerror],script').length,0);assert.ok(doc.body.textContent.includes(payload));assert.ok([...doc.querySelectorAll('button')].every(b=>b.disabled));
 assert.throws(()=>renderCaretakerRecruitment({...vm,options:[{days:'1" onclick="alert(1)'}]}));
});

test('approved signboard remains exact bytes',async()=>{
 const {readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto');
 const bytes=await readFile(new URL('../public/assets/caretaker-signboard-A-v2.png',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'76961de9b62e76d261d36dce3bc564fba84cd135b9e4461c2bf00ea1c76c389e');
});
