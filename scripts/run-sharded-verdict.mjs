import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const files=JSON.parse(process.env.BROWSER_TESTS_JSON||'[]');
const expected=JSON.parse((await import('node:fs')).readFileSync('.github/browser-checks.json','utf8')).tests;
const engine=process.env.QA_ENGINE, shard=Number(process.env.QA_SHARD);
if(!Array.isArray(files)||files.length!==17||JSON.stringify(files)!==JSON.stringify(expected)||files.some(p=>!/^tests\/browser\/[a-z0-9.-]+\.spec\.js$/.test(p)||!existsSync(p)))throw Error('Exact 17 reviewed specs required.');
if(!['chrome','webkit'].includes(engine)||!Number.isInteger(shard)||shard<1||shard>6)throw Error('Invalid diagnostic lane.');
const result=spawnSync('npx',['playwright','test',...files,'--config=playwright.verdict.config.js','--project='+engine,'--shard='+shard+'/6','--retries=0','--reporter=./scripts/sharded-verdict-reporter.mjs','--output=focused-test-results'],{stdio:'inherit'});
if(result.error)throw result.error;process.exit(result.status??1);
