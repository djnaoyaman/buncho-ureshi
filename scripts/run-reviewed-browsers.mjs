import {narrowReviewedFiles} from './type2-diagnostic-selection.mjs';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const files=JSON.parse(process.env.BROWSER_TESTS_JSON||'[]');
if(!Array.isArray(files)||!files.length||files.some(p=>!/^tests\/browser\/[a-z0-9.-]+\.spec\.js$/.test(p)||!existsSync(p)))throw Error('確認済みのブラウザ検査を指定してください。');
console.log(process.env.BROWSER_REASON||'対象の画面・保存連携を確認');
const group=process.env.TYPE2_DIAG_GROUP, engine=process.env.TYPE2_DIAG_ENGINE;
const diagnostic=!!process.env.TYPE2_VERDICT_PATH;
if(diagnostic&&!['chrome','webkit'].includes(engine))throw Error('Unknown diagnostic browser');
const list=diagnostic?narrowReviewedFiles(files,group):files;
if(diagnostic)process.env.TYPE2_DIAG_SELECTED_FILES=JSON.stringify(list);
const projects=diagnostic?['--project='+engine]:['--project=chrome','--project=webkit'];
const result=spawnSync('npx',['playwright','test',...list,...projects,'--retries=0','--output=focused-test-results',
  ...(diagnostic?['--reporter=./scripts/type2-compact-verdict.mjs']:[])],{stdio:'inherit'});
if(result.error)throw result.error;process.exit(result.status??1);
