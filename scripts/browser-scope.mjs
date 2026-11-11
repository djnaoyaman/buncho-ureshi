import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export function selectBrowserChecks({changed,base,review,full=false,exists=existsSync}){
 const relevant=changed.some(p=>/^(src\/|public\/|tests\/browser\/|playwright.*\.config\.js$|scripts\/build\.mjs$)/.test(p));
 if(!review||!Array.isArray(review.tests)||typeof review.reason!=='string'||!review.reason.trim()||review.reason.length>500)throw Error('ブラウザ検査の要否と理由を.github/browser-checks.jsonへ記録してください。');
 if(relevant&&(review.base!==base||!changed.includes('.github/browser-checks.json')))throw Error('実行コード・画面変更について、この変更のブラウザ検査範囲を確認してください。');
 if(new Set(review.tests).size!==review.tests.length||review.tests.some(p=>!/^tests\/browser\/[a-z0-9.-]+\.spec\.js$/.test(p)||!exists(p)))throw Error('ブラウザ検査ファイルの指定が不正です。');
 return {tests:relevant||full?review.tests:[],reason:review.reason};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const event=process.env.GITHUB_EVENT_PATH?JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')):{};
 const head=process.env.GITHUB_SHA||'HEAD';let base=event.before||event.pull_request?.base?.sha;
 if(!base||/^0+$/.test(base))base=execFileSync('git',['rev-parse',`${head}^`],{encoding:'utf8'}).trim();
 const changed=execFileSync('git',['diff','--name-only',base,head],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const review=JSON.parse(readFileSync('.github/browser-checks.json','utf8'));
 const result=selectBrowserChecks({changed,base,review,full:event.inputs?.full_browser===true||event.inputs?.full_browser==='true'});
 process.stdout.write(`${result.reason}\nSelected: ${JSON.stringify(result.tests)}\n`);
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`tests=${JSON.stringify(result.tests)}\nreason=${result.reason.replace(/[\r\n]/g,' ')}\n`);
}
