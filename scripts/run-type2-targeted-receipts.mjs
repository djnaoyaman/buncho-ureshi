import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const exact='934228a3e381a6608c5906c159e8422f4894be2d';
const specs=['garden-viewport-sync','garden-trail-maximum-34-receipt','garden-actors-natural'].map(s=>'tests/browser/'+s+'.spec.js');
const baseArgs=['node_modules/@playwright/test/cli.js','test',...specs,'--retries=0'];
const max='#34 production portrait: ten safe native actors through a complete route and real taps$';
const plans=[
 ['chrome','viewport synchronization bird-zebra-finch dense$|'+max,['chrome-07-viewport-dense','chrome-34-max']],
 ['webkit','viewport synchronization bird-zebra-finch false$|'+max+'|real-time normal five birds on entry 375$',['webkit-07-viewport-false','webkit-34-max','webkit-01-type1']],
];
const out=process.env.TYPE2_DIAG_DIR;
if(process.env.TYPE2_DIAG_BASE!==exact||!out||JSON.stringify(JSON.parse(process.env.BROWSER_TESTS_JSON))!==JSON.stringify(specs))
 throw Error('Expected exact non-merging diagnostic base and reviewed test paths only.');
mkdirSync(out);
const receipts={};let ok=true;
const viewportStage=['setup','viewport-set','scene-ready','overlay','center','hit','click','dialog','dismiss','notification','pass'];
const viewportMode=['unobserved','other','trail-active','trail-held','trail-standing','trail-needs-recovery','trail-blocked-geometry','trail-blocked-placement','geometry-blocked','insufficient-space'];
const type1=['viewport','seed','open','ready','sample','five-ready','center','hit','natural-motion','screenshot','storage-read','storage-identity','browser-errors','pass'];
function receipt(label){
 const raw=readFileSync(join(out,label),'utf8').trim();
 if(raw.length>180)throw Error('oversize receipt');
 if(label.includes('-07-')){
  const {phase,cycle,motion}=JSON.parse(raw);
  if(!viewportStage.includes(phase)||![-1,0,1,2,3].includes(cycle)||!viewportMode.includes(motion))throw Error('invalid viewport receipt');
  return {phase,cycle,motion};
 }
 if(label.endsWith('-01-type1')){
  if(!type1.includes(raw))throw Error('invalid Type I receipt');
  return {phase:raw};
 }
 // Fixed stage components only, no raw text, snippets or page data.
 const maxStages=/^(?:pass|seed|(?:viewport|storage|game|open)-setup|(?:first|frame|after|tap-(?:household|friend|waiting))-(?:read|ready|garden|count|unique|identity|ids|width|height|viewport|hit|id|kinds|stage|dimensions|center|native|tap-size|tap-hit|signature|garden-id|actor-id|unique-ids|size|order|(?:id|size|viewport|hit)-(?:household|friend|waiting|returning)|in-viewport|active|held|trail-active|trail-held|trail-standing|other|unknown|trail-blocked-geometry|trail-blocked-placement|trail-needs-recovery|geometry-blocked|insufficient-space)|frame-(?:tick|plane)|route-(?:origin|retarget|settlement|destination|projected-points|visible-intermediate|visible-landing|not-completed|origin-station-mismatch|no-ground-before|no-live-mover)|tap-(?:read|dispatch)-(?:household|friend|waiting)|tap-household-(?:dialog|close)|tap-friend-(?:read-before|persistence|memory|stage-ready)|tap-waiting-title)$/;
 if(!maxStages.test(raw))throw Error('unknown bounded max stage');
 return {phase:raw};
}
for(const [engine,filter,labels] of plans){
 const args=[...baseArgs,'--project='+engine,'--grep',filter];
 const listed=spawnSync(process.execPath,[...args,'--list','--reporter=list'],{encoding:'utf8'});
 const count=(listed.stdout||'').match(new RegExp('^  \\['+engine+'\\] ›','gm'))?.length??0;
 const collected=listed.status===0&&count===labels.length;
 if(!collected)ok=false;
 else{
  const run=spawnSync(process.execPath,[...args,'--reporter=dot','--output='+join(out,'tmp-'+engine)],{
   stdio:'inherit',env:{...process.env,TYPE2_CHECKPOINT_DIR:out}});
  if(run.status!==0)ok=false;
 }
 for(const label of labels){
  try{receipts[label]=receipt(label);}catch{receipts[label]={phase:collected?'receipt-unavailable':'collection-mismatch'};}
  if(receipts[label].phase!=='pass')ok=false;
 }
}
writeFileSync(join(out,'verdict.json'),JSON.stringify({version:1,expected:5,ok,receipts})+'\n',{mode:0o600,flag:'wx'});
process.exitCode=ok?0:1;
