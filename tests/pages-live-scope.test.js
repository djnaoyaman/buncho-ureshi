import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';
import {RELEASE,shouldVerifyLive} from '../scripts/pages-live-scope.mjs';
const current=RELEASE;
test('only the first main push containing this release is selected',()=>{
 assert.equal(shouldVerifyLive({eventName:'push',ref:'refs/heads/main',current,previous:null}),true);
 assert.equal(shouldVerifyLive({eventName:'push',ref:'refs/heads/main',current,previous:current}),false);
 for(const eventName of ['pull_request','workflow_dispatch','schedule'])assert.equal(shouldVerifyLive({eventName,ref:'refs/heads/main',current,previous:null}),false);
 assert.equal(shouldVerifyLive({eventName:'push',ref:'refs/heads/other',current,previous:null}),false);
 assert.equal(shouldVerifyLive({eventName:'push',ref:'refs/heads/main',current:'unrelated',previous:null}),false);
});
test('scope CLI compares actual previous commit, rejects unknown base, and skips PR without network',t=>{
 const dir=mkdtempSync(join(tmpdir(),'release-scope-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']});git('init');writeFileSync(join(dir,'fixture'),'base');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','base');const before=git('rev-parse','HEAD').trim();
 mkdirSync(join(dir,'.github'));writeFileSync(join(dir,'.github/pages-byte-verification.json'),JSON.stringify({release:RELEASE}));
 const event=join(dir,'event.json'),output=join(dir,'output');
 const run=(base,eventName='push')=>{writeFileSync(event,JSON.stringify({before:base}));writeFileSync(output,'');return spawnSync(process.execPath,[resolve('scripts/pages-live-scope.mjs')],{cwd:dir,env:{...process.env,GITHUB_EVENT_NAME:eventName,GITHUB_REF:'refs/heads/main',GITHUB_EVENT_PATH:event,GITHUB_OUTPUT:output},encoding:'utf8'});};
 assert.equal(run(before).status,0);assert.match(readFileSync(output,'utf8'),/enabled=true/);
 git('add','.github');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','release');const after=git('rev-parse','HEAD').trim();assert.equal(run(after).status,0);assert.match(readFileSync(output,'utf8'),/enabled=false/);
 assert.notEqual(run('0'.repeat(40)).status,0);assert.notEqual(run('f'.repeat(40)).status,0);
 assert.equal(run(null,'pull_request').status,0);assert.match(readFileSync(output,'utf8'),/enabled=false/);
});
test('same-run post-deploy verifier adds no write permissions or bypass of gates',()=>{
 const s=readFileSync('.github/workflows/pages.yml','utf8'),job=s.split('  verify_live:\n')[1];
 assert.ok(job);assert.match(job,/needs: \[build, verify, deploy\]/);assert.match(job,/needs.build.outputs.verify_live == 'true'/);assert.match(job,/needs.verify.result == 'success' && needs.deploy.result == 'success'/);assert.match(job,/github.ref == 'refs\/heads\/main'/);assert.match(job,/github.event_name != 'pull_request'/);
 assert.match(job,/permissions:\n      contents: read/);assert.doesNotMatch(job,/pages: write|id-token: write|continue-on-error|run-id:|upload-artifact|workflow_run/);
 assert.match(job,/name: verified-build-\$\{\{ github.sha \}\}/);assert.match(job,/sha256sum --check SHA256SUMS/);assert.match(job,/test "\$\(cat SOURCE_SHA\)" = "\$GITHUB_SHA"/);
 assert.match(s,/test "\$BUILD_RESULT" = success/);assert.match(s,/test "\$FOCUSED_RESULT" = success/);assert.match(s,/test "\$BROWSER_RESULT" = success/);
 assert.match(s,/deploy:\n    if: always\(\) && needs.verify.result == 'success'/);
});
test('ordinary PR build includes the verifier tests in the mandatory Node command',()=>{
 const pkg=JSON.parse(readFileSync('package.json','utf8'));assert.match(pkg.scripts.test,/tests\/\*\.test\.js/);
 const s=readFileSync('.github/workflows/pages.yml','utf8').split('  focused_browser:')[0];assert.match(s,/pull_request:/);assert.match(s,/- run: npm test/);
});
test('restoration shell rejects another source SHA and a modified sealed tar',t=>{
 const dir=mkdtempSync(join(tmpdir(),'release-seal-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));mkdirSync(join(dir,'dist'));mkdirSync(join(dir,'.verified-build'));writeFileSync(join(dir,'dist/.nojekyll'),'');
 execFileSync('tar',['-cf','.verified-build/dist.tar','dist'],{cwd:dir});writeFileSync(join(dir,'.verified-build/SOURCE_SHA'),'abc\n');writeFileSync(join(dir,'.verified-build/SHA256SUMS'),execFileSync('sha256sum',['dist.tar','SOURCE_SHA'],{cwd:join(dir,'.verified-build')}));
 const s=readFileSync('.github/workflows/pages.yml','utf8');const block=s.split("- name: Verify and restore this run's sealed build")[1].split('- name: Compare every')[0].split('run: |\n')[1].split('\n').filter(l=>l.trim()).map(l=>l.trimStart()).join('\n');
 const run=sha=>spawnSync('bash',['-e','-c',block],{cwd:dir,env:{...process.env,GITHUB_SHA:sha},stdio:'pipe'}).status;
 assert.equal(run('abc'),0);assert.notEqual(run('different'),0);writeFileSync(join(dir,'.verified-build/dist.tar'),'corrupt');assert.notEqual(run('abc'),0);
});
