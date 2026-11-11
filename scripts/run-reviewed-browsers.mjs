import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const files=JSON.parse(process.env.BROWSER_TESTS_JSON||'[]');
if(!Array.isArray(files)||!files.length||files.some(p=>!/^tests\/browser\/[a-z0-9.-]+\.spec\.js$/.test(p)||!existsSync(p)))throw Error('確認済みのブラウザ検査を指定してください。');
console.log(process.env.BROWSER_REASON||'対象の画面・保存連携を確認');
const result=spawnSync('npx',['playwright','test',...files,'--project=chrome','--project=webkit','--retries=0','--output=focused-test-results'],{stdio:'inherit'});
if(result.error)throw result.error;process.exit(result.status??1);
