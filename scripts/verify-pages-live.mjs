import {readdir,lstat,appendFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const PUBLIC_BASE='https://djnaoyaman.github.io/buncho-ureshi/';
export function publicFileURL(name){
 if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('invalid_path');
 const url=new URL(name.split('/').map(encodeURIComponent).join('/'),PUBLIC_BASE);
 if(url.origin!=='https://djnaoyaman.github.io'||!url.pathname.startsWith('/buncho-ureshi/'))throw Error('invalid_path');
 return url;
}
async function inventory(root,prefix=''){
 const files=[];
 for(const entry of await readdir(join(root,prefix),{withFileTypes:true})){
  const name=prefix?prefix+'/'+entry.name:entry.name;
  if(entry.isSymbolicLink())throw Error('invalid_inventory');
  if(entry.isDirectory())files.push(...await inventory(root,name));
  else if(entry.isFile())files.push(name);
  else throw Error('invalid_inventory');
 }
 return files.sort();
}
async function digest(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
/** Pure read-only comparison. No retry, redirect, upload or response-body logging. */
export async function verifyPages({root,timeoutMs=30000,concurrency=4,fetchImpl=fetch}){
 const files=await inventory(root);if(!files.length)throw Error('empty_inventory');
 const counts={expected:files.length,matched:0,httpFailed:0,networkFailed:0,sizeMismatch:0,hashMismatch:0};let cursor=0;
 await Promise.all(Array.from({length:Math.min(concurrency,files.length)},async()=>{
  for(;;){const index=cursor++;if(index>=files.length)return;
   const name=files[index],file=join(root,name),size=(await lstat(file)).size,expected=await digest(file);
   const url=publicFileURL(name);
   try{
    const response=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{'Accept-Encoding':'identity','Cache-Control':'no-cache'}});
    if(response.status!==200){counts.httpFailed++;await response.body?.cancel();continue;}
    const hash=createHash('sha256');let bytes=0;
    for await(const chunk of response.body){bytes+=chunk.length;if(bytes>size)break;hash.update(chunk);}
    if(bytes!==size){counts.sizeMismatch++;continue;}
    if(hash.digest('hex')!==expected){counts.hashMismatch++;continue;}
    counts.matched++;
   }catch{counts.networkFailed++;}
  }
 }));
 return {...counts,passed:counts.matched===counts.expected};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let result;
 try{result=await verifyPages({root:resolve('dist')});}
 catch{result={passed:false,inventoryFailed:1};}
 const line=JSON.stringify(result);console.log(line);
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'Pages byte verification: `'+line+'`\n');
 if(!result.passed)process.exitCode=1;
}
