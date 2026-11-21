import {writeFileSync} from 'node:fs';
import {basename,relative} from 'node:path';
const engineSet=new Set(['chrome','webkit']);
const groupFor=f=>f==='garden-trail-seven.spec.js'?'seven':
 f==='garden-trail-maximum-native.spec.js'?'max-ten':'legacy';
export default class Type2Verdict {
 onBegin(_,suite){
  this.entries=new Map();this.ordinals=new Map();
  const expected=new Set(JSON.parse(process.env.TYPE2_DIAG_SELECTED_FILES));
  for(const t of suite.allTests()){
   const engine=t.parent.project()?.name, file=relative(process.cwd(),t.location.file);
   if(engine!==process.env.TYPE2_DIAG_ENGINE||!engineSet.has(engine)||!expected.has(file))throw Error('outside reviewed manifest/projects');
   const suiteKey=engine+'/'+file, ordinal=(this.ordinals.get(suiteKey)||0)+1;this.ordinals.set(suiteKey,ordinal);
   if(this.entries.has(t.id))throw Error('duplicate native test identity');
   this.entries.set(t.id,{engine,file:basename(file),ordinal,group:groupFor(basename(file)),outcome:'not-run'});
  }
  this.expected=expected;
 }
 onTestEnd(t,r){
  const entry=this.entries.get(t.id);if(!entry||entry.outcome!=='not-run'||r.retry!==0)throw Error('unexpected native rerun');
  entry.outcome=['passed','failed','timedOut','skipped','interrupted'].includes(r.status)?r.status:'unknown';
 }
 onEnd(result){
  const rows=[...this.entries.values()];
  const engine=process.env.TYPE2_DIAG_ENGINE;
  const unionCoverage=[...this.expected].every(f=>(this.ordinals.get(engine+'/'+f)||0)>0);
  const nonpass=rows.filter(x=>x.outcome!=='passed').map(({file,ordinal,outcome})=>({file,ordinal,outcome}));
  writeFileSync(process.env.TYPE2_VERDICT_PATH,JSON.stringify({version:1,engine,group:process.env.TYPE2_DIAG_GROUP,
   status:result.status,unionCoverage,total:rows.length,nonpass})+'\n',{mode:0o600,flag:'wx'});
 }
}
