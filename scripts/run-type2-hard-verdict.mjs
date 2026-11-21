import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
const base='934228a3e381a6608c5906c159e8422f4894be2d';
const file='tests/browser/garden-trail-seven.spec.js';
const cases={
 chrome:[['8-visitor','#08 real store visitor interrupts active native flight safely']],
 webkit:[['14-roster-10','#14 native 10: real taps, two portraits, rotate without losing actors'],['10-lane','#10 yield reaches real bay before crossing'],['8-lane','#08 wait outside with both gates taken']],
};
const engine=process.env.TYPE2_HARD_ENGINE,out=process.env.TYPE2_HARD_DIR,plan=cases[engine];
if(!out||!plan||process.env.TYPE2_DIAG_BASE!==base||JSON.stringify(JSON.parse(process.env.BROWSER_TESTS_JSON))!==JSON.stringify([file]))throw Error('exact hard QA scope required');
const allow=/^(?:setup|pass|native-enabled|first-mode|(?:first|landscape|portrait|gates|palette|visitor)-ready|entry-(?:tap|dialog|close)|movement-(?:sample|visible)|(?:first|landscape|portrait|movement|gates|lane|landing|visitor)-(?:identity|width|height|center|hit)|gates-ab|lane-sample|occupied-cross|bay-unseen|cross-unseen|no-bay|palette-(?:sample|color|texture|rise|flap|contact|frames)|landing-contact|visitor-(?:preflight|store-mutation|arrival|dom|sample|source|tap|dialog|media-ready|ready-state|reservation))$/;
mkdirSync(out,{recursive:true});
const args=['node_modules/@playwright/test/cli.js','test',file,'--project='+engine,'--retries=0','--grep',plan.map(p=>p[1]).join('|')];
const listing=spawnSync(process.execPath,[...args,'--list','--reporter=list'],{encoding:'utf8'});
const lines=(listing.stdout||'').split('\n').filter(l=>l.startsWith('  ['+engine+'] › ')).map(l=>l.split(' › ').at(-1));
const complete=listing.status===0&&lines.length===plan.length&&new Set(lines).size===lines.length&&plan.every(p=>lines.includes(p[1]));
const run=complete?spawnSync(process.execPath,[...args,'--reporter=dot','--output='+join(out,'tmp')],{stdio:'inherit'}):null;
const receipts={},audits={};let auditValid=true;
function need(v,options){if(!options.includes(v))throw Error('invalid bounded enum');return v;}
function parseAudit(key){
 const raw=readFileSync(join(out,engine+'-'+key),'utf8').trim();
 if(raw.length>280)throw Error('oversize bounded audit');
 const a=JSON.parse(raw);
 if(key.endsWith('visitor-audit')){
  const sample=x=>x===null?null:{ready:need(x.ready,['ready','loading','other']),
   phase:need(x.phase,['pass','hit','other','single']),victim:need(x.victim,['none','visitor','incumbent']),
   front:need(x.front,['none','loading-overlay','predator','peer','menu','other'])};
  return {immediate:sample(a.immediate),ready:sample(a.ready)};
 }
 if(a===null)return null;
 if(typeof a.shelter!=='boolean')throw Error('invalid shelter flag');
 return {failure:need(a.failure,['count-down','count-up','blank','duplicate','order','replacement']),
  stage:need(a.stage,['missing','loading','ready','other']),
  predator:need(a.predator,['none','raptor-warning','raptor-present','crow-warning','crow-quiet','crow-visiting']),
  shelter:a.shelter,revision:need(a.revision,['missing','same','changed'])};
}
for(const [key] of plan){
 let stage=complete?'receipt-unavailable':'wrong-test-collection';
 if(complete)try{const value=readFileSync(join(out,engine+'-'+key),'utf8').trim();if(value.length<40&&allow.test(value))stage=value;}catch{}
 receipts[key]=stage;
 const audit=key==='8-visitor'?'08-visitor-audit':key+'-identity-audit';
 try{audits[key]=parseAudit(audit);}catch{audits[key]='audit-unavailable';auditValid=false;}
}
const ok=run?.status===0&&auditValid&&Object.values(receipts).every(x=>x==='pass')||false;
writeFileSync(join(out,'verdict.json'),JSON.stringify({version:1,engine,collected:lines.length,expected:plan.length,ok,receipts,audits})+'\n',{mode:0o600,flag:'wx'});
process.exitCode=ok?0:1;
