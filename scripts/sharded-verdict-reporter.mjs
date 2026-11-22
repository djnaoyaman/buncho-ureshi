import {writeFileSync} from 'node:fs';
import {relative} from 'node:path';
const pathPattern=/^(?:tests\/(?:browser|fixtures)|src)\/[a-z0-9./-]+\.(?:m?js|ts)$/;
function location(file,line,column){
 if(typeof file!=='string'||!Number.isInteger(line)||line<1)return null;
 const path=file.startsWith('/')?relative(process.cwd(),file):file;
 return pathPattern.test(path)?[path,line,Number.isInteger(column)?column:0]:null;
}
function fault(error){
 const declared=location(error?.location?.file,error?.location?.line,error?.location?.column);
 if(declared)return declared;
 for(const row of (error?.stack??'').split('\n').slice(1,32)){
  const match=/((?:tests\/(?:browser|fixtures)|src)\/[a-z0-9./-]+\.(?:m?js|ts)):(\d+):(\d+)\)?$/.exec(row);
  if(match)return location(match[1],Number(match[2]),Number(match[3]));
 }
 return null;
}
export default class Verdict{
 printsToStdio(){return true;}
 onBegin(_config,suite){
  this.rows=new Map(suite.allTests().map(t=>[t.id,{id:t.id,at:location(t.location.file,t.location.line,t.location.column),status:'unreached',expected:t.expectedStatus}]));
  this.infrastructure=0;
 }
 onError(){this.infrastructure=(this.infrastructure??0)+1;}
 onTestEnd(test,result){
  const row=this.rows.get(test.id);
  if(!row)return;
  row.status=result.status;
  const schema=[
   ['qa-07-shared-flight',/^(?:8|10):(?:none|active|hidden-or-reduced|disabled|blocked|interacting|sheet|detached):(?:elapsed|short|stalled):(?:authored|no-gate|other|none):(?:no-renderer|ready|atlas-ready|atlas-bad|atlas-pending|none):(?:routed|ready|not-ready|missing|none):(?:held|wait|free|none):(?:precondition|no-source|begin-denied|sweep-denied|clearance-denied|paint-denied|adapter-denied|launched|none)$/],
   ['qa-07-shared-room',/^(?:8|10):(?:admitted|projection|chrome|seat|hit|route|measuring|roster|unknown)$/],
   ['qa-07-shared-ready',/^(?:8|10):(?:admitted|projection|chrome|seat|hit|route|measuring|roster|unknown):(?:admitted|projection|chrome|seat|hit|route|measuring|roster|unknown):(?:expected|short|extra):(?:no-motion|trail|other-motion):(?:clean|(?:bird|book|scroll|jog|dock)-(?:width|height|hit))$/],
   ['qa-07-shared-launch',/^(?:8|10):(?:sampled-rise-(?:painted|unpainted)|between-samples-rise|shared-route-only|other-flight|no-observed-flight):(?:air-seen|air-unseen):(?:replaced|same):(?:lead-missing|atlas-missing|atlas-not-loaded|atlas-and-wing-shell|atlas-only)$/],
   ['qa-07-shared-warning',/^(?:8|10):(?:predator|no-predator):(?:loading|no-loading):(?:system|no-system):(?:resumed-route|no-ready-rebind)$/],
   ['qa-07-axis',/^[0-3]:(?:unobserved|(?:recovery|no-recovery):(?:yes|no):(?:yes|no):(?:yes|no):(?:yes|no):(?:yes|no))$/],
   ['qa-viewport',/^[0-3]:(?:wide|tall):(?:outside|occluded):(?:not-ready|count-change|outside|occluded|native-clean):(?:trail-active|trail-held|trail-standing|trail-needs-recovery|trail-blocked-geometry|trail-blocked-placement|geometry-blocked|insufficient-space|active|held|static|grounded|other):(?:trail-active|trail-held|trail-standing|trail-needs-recovery|trail-blocked-geometry|trail-blocked-placement|geometry-blocked|insufficient-space|active|held|static|grounded|other):(?:lead|other):(?:none|peer|controls|loading|other)$/],
   ['qa-booklet-input',/^(?:split|locator):(?:no-key|summary-key|other-key):(?:focused|unfocused):(?:replaced|same):(?:opened|no-open):(?:still-open|closed):(?:modal|no-modal)$/],

   ['qa-ground-dry',/^(?:initial|during):(?:native|actor-ground|actor-air):(?:ulp-edge|css-edge|off-edge|unparseable)$/],
   ['qa-ground-media',/^(?:reduce|restore):(?:event|no-event):(?:match|mismatch|missing):(?:match|mismatch):(?:active|held|other)$/],
  ];
  for(const [type,validator] of schema){
   const a=(result.annotations??test.annotations).find(a=>a.type===type&&validator.test(a.description??''));
   if(a)(row.receipt??={})[type]=a.description;
  }
  if(row.status!=='passed'&&row.status!=='skipped')row.fault=result.errors.map(fault).find(Boolean)??null;
 }
 onEnd(result){
  const rows=[...(this.rows??new Map()).values()];
  const body={v:1,engine:process.env.QA_ENGINE,input:process.env.BOOKLET_OPEN_STYLE,status:result.status,infrastructure:this.infrastructure??0,rows};
  writeFileSync('compact-browser-verdict.json',JSON.stringify(body)+'\n');
  console.log(JSON.stringify({engine:body.engine,shard:body.shard,status:body.status,selected:rows.length,infrastructure:body.infrastructure}));
 }
}
