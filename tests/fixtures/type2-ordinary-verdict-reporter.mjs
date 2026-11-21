import {writeFileSync} from 'node:fs';

const gardens=['07','08','10','12','14','28','34'];
const types=['native-0','native-1','native-10','lane','white','sakura','cinnamon','silver','visitor','predator'];
const engines=['chrome','webkit'];
const keys=new Set(engines.flatMap(e=>[
 ...gardens.flatMap(g=>types.map(t=>`${e}-${g}-${t}`)),
 `${e}-01-type-one-control`,`${e}-07-reduced-motion`,
]));
function identify(test){
 const engine=test.parent.project()?.name;
 if(!engines.includes(engine))return null;
 const title=test.title;
 if(title==='published Type① #01 remains independent with native touchdown control')return `${engine}-01-type-one-control`;
 if(title==='#07 active reduced-motion toggle retains the same verified contact')return `${engine}-07-reduced-motion`;
 const row=/^#(07|08|10|12|14|28|34) (.+)$/.exec(title);
 if(!row)return null;
 const [,garden,detail]=row;
 let kind=/^native (0|1|10): real taps, two portraits, rotate without losing actors$/.exec(detail)?.[1];
 if(kind)return `${engine}-${garden}-native-${kind}`;
 if(['yield reaches real bay before crossing','wait outside with both gates taken'].includes(detail))return `${engine}-${garden}-lane`;
 kind=/^(white|sakura|cinnamon|silver) exact native launch, flap and landing$/.exec(detail)?.[1];
 if(kind)return `${engine}-${garden}-${kind}`;
 kind=/^real store (visitor|predator) interrupts active native flight safely$/.exec(detail)?.[1];
 return kind?`${engine}-${garden}-${kind}`:null;
}
export default class VerdictOnly {
 printsToStdio(){return true;}
 onBegin(config,suite){
  this.ready=false;this.tests=new Map();this.status=new Map();
  for(const test of suite.allTests()){
   const key=identify(test);
   if(!key||!keys.has(key)||this.status.has(key))throw Error('Ordinary reviewed case list changed');
   this.tests.set(test.id,key);
   this.status.set(key,'not-run');
  }
  if(this.status.size!==keys.size)throw Error('All 144 reviewed engine/cases are required');
  this.ready=true;
 }
 onTestEnd(test,result){
  const key=this.tests.get(test.id);
  if(!key||result.retry!==0||this.status.get(key)!=='not-run')throw Error('Duplicate or unknown ordinary test outcome');
  this.status.set(key,result.status==='passed'?'pass':result.status==='skipped'?'not-run':'fail');
 }
 onError(){this.ready=false;}
 onEnd(result){
  if(!this.ready||!process.env.TYPE2_ORDINARY_VERDICTS||!['passed','failed'].includes(result.status))return;
  // In-job assertions consume an allowlisted key/default enum only. Never
  // store Playwright output, traces, messages, paths, timing or test data.
  writeFileSync(process.env.TYPE2_ORDINARY_VERDICTS,JSON.stringify(Object.fromEntries(this.status))+'\n',{mode:0o600,flag:'wx'});
 }
}
