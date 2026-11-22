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
   ['qa-trail-contract',/^(?:native|landscape|portrait|movement|lane|lane-final|visitor|next-fly|palette):(?:count-(?:down|up)|blank|duplicate|order|replacement|size|viewport|occluded|native-ok|b1-absent|no-fly|bay-first|fly-before-bay-peer-(?:gate|elsewhere)|bayless-(?:gate-clear|peer-gate|peer-elsewhere)|bay-and-cross|bay-no-cross|no-bay):(?:loading|ready|other):(?:clear|(?:raptor|crow)-warning|raptor-visit|crow-(?:visit|quiet)):(?:shelter|open)$/],
   ['qa-landscape34',/^(?:insufficient|placement|geometry|recovery|final-geometry|active|held|standing|other):(?:dialog|bird|control|plane|stage|other|none|mixed):(?:moving|ground):(?:noninteractive|interactive):(?:[1-9]|10)$/],
   ['qa-landscape34-clip',/^(?:in|out|unknown):(?:in|out|unknown):(?:in|out|unknown):(?:hidden|whole|partial|unknown):(?:[0-9]|10):(?:reservation|no-reservation)$/],
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
  const profile=['visitor-fix','visitor-quiet','landscape','observe','quiet'].includes(process.env.QA_TRAIL_PROFILE)?process.env.QA_TRAIL_PROFILE:null;
  const body={v:1,engine:process.env.QA_ENGINE,shard:Number(process.env.QA_SHARD),...(profile?{profile}:{}),
   status:result.status,infrastructure:this.infrastructure??0,rows};
  writeFileSync('compact-browser-verdict.json',JSON.stringify(body)+'\n');
  console.log(JSON.stringify({engine:body.engine,shard:body.shard,status:body.status,selected:rows.length,infrastructure:body.infrastructure}));
 }
}
