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
  if(row.status!=='passed'&&row.status!=='skipped')row.fault=result.errors.map(fault).find(Boolean)??null;
 }
 onEnd(result){
  const rows=[...(this.rows??new Map()).values()];
  const body={v:1,engine:process.env.QA_ENGINE,shard:Number(process.env.QA_SHARD),status:result.status,infrastructure:this.infrastructure??0,rows};
  writeFileSync('compact-browser-verdict.json',JSON.stringify(body)+'\n');
  console.log(JSON.stringify({engine:body.engine,shard:body.shard,status:body.status,selected:rows.length,infrastructure:body.infrastructure}));
 }
}
