import {readFileSync,appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export const RELEASE='garden-actors-type-one-pr256';
export function shouldVerifyLive({eventName,ref,current,previous}){
 return eventName==='push'&&ref==='refs/heads/main'&&current===RELEASE&&previous!==RELEASE;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let enabled=false;
 if(process.env.GITHUB_EVENT_NAME==='push'&&process.env.GITHUB_REF==='refs/heads/main'){
  const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')),before=event.before;
  if(!/^[0-9a-f]{40}$/.test(before)||/^0+$/.test(before))throw Error('A real previous main commit is required');
  execFileSync('git',['cat-file','-e',before+'^{commit}']);
  const file='.github/pages-byte-verification.json';
  const exists=execFileSync('git',['ls-tree','--name-only',before,'--',file],{encoding:'utf8'}).trim();
  const previous=exists?JSON.parse(execFileSync('git',['show',before+':'+file],{encoding:'utf8'})).release:null;
  const current=JSON.parse(readFileSync(file,'utf8')).release;
  if(current!==RELEASE)throw Error('Unknown release verification scope');
  enabled=shouldVerifyLive({eventName:process.env.GITHUB_EVENT_NAME,ref:process.env.GITHUB_REF,current,previous});
 }
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`enabled=${enabled}\n`);
 console.log(`Release byte verification selected: ${enabled}`);
}
