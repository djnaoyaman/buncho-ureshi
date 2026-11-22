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
   ['qa-07-current-paint',/^[0-3]:(?:unobserved|(?:inside|left|right|top|bottom):(?:inside|left|right|top|bottom|unmeasured):(?:own|none|peer|other):(?:air|pose):(?:low|mid|high):(?:start|middle|end):(?:inside|dry|(?:body|skirt)-(?:left|right|top|bottom|control)):(?:clear|early|middle|late):(?:inside|left|right|top|bottom|dry|control|unmeasured):(?:safe|denied))$/],
   ['qa-07-transaction',/^[0-3]:(?:unobserved|scope|lane-lock|disposition-count|mover-count|other-disposition|existing-route-fits|mover-outside|no-bad-idle|bad-idle-still-visible|idle-contact-denied|idle-not-ground|idle-visible-box|no-landing|preview-denied|nominal-sweep|current-envelope|measured-sweep|pack-unentered|nominal-seat|measured-seat|pack-incomplete|peer-sweep|native-hit|atomic-precondition|atomic-validation|committed)$/],
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
