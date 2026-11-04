import test from 'node:test';
import assert from 'node:assert/strict';
import {createGardenCrowClock,CROW_RULES} from '../src/garden-crows.js';
import {createGardenRaptorClock,RAPTOR_RULES} from '../src/garden-raptors.js';
for(const [name,create,rules,kind] of [['crow',createGardenCrowClock,CROW_RULES,'warning'],['raptor',createGardenRaptorClock,RAPTOR_RULES,'arrive']]){
 const sample=(clock,now,extra={})=>clock.sample({key:'one',gardenId:'komorebi',now,eligible:true,...extra});
 test(`${name}: early encounter follows one visible second, not hidden/loading time`,()=>{
  const c=create({random:()=>0});assert.equal(sample(c,0),null);assert.equal(sample(c,500),null);assert.equal(sample(c,1000)?.kind,kind);
  if(name==='crow'){for(let t=2000;t<7000;t+=1000)assert.equal(sample(c,t),null);assert.equal(sample(c,7000)?.kind,'arrive');}
  const hidden=create({random:()=>0});sample(hidden,0);assert.equal(sample(hidden,10000),null);assert.equal(sample(hidden,11000,{eligible:false}),null);
 });
 test(`${name}: early draw keeps its small probability and old sustained-stay timing`,()=>{
  let calls=0;const c=create({random:()=>{calls++;return rules.earlyChance;}});sample(c,0);for(let t=1000;t<120000;t+=1000)sample(c,t);assert.equal(calls,1);
  sample(c,120000);assert.ok(calls>=2);
 });
 test(`${name}: opening overlays or switching gardens does not repeatedly roll early visits`,()=>{
  let calls=0;const c=create({random:()=>{calls++;return 1;}});sample(c,0);sample(c,1000);assert.equal(calls,1);
  c.reset();sample(c,2000,{key:'two'});sample(c,3000,{key:'two'});assert.equal(calls,1);
  c.reset();sample(c,122000);sample(c,123000);assert.equal(calls,2);
 });
 test(`${name}: occupied scenes suppress the early draw without spending RNG`,()=>{
  let calls=0;const c=create({random:()=>{calls++;return 0;}});sample(c,0);sample(c,1000,{available:false});assert.equal(calls,0);assert.equal(sample(c,2000)?.kind,kind);
 });
}
