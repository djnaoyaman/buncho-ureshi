import {spawnSync} from 'node:child_process';
const test='tests/browser/garden-trail-postfilm-receipt.spec.js';
const visitor='#(?:07|08|10|12|14|28|34) real store visitor interrupts active native flight safely';
const predator='#(?:07|08|10|12|14|28|34) real store predator interrupts active native flight safely';
const hard=[
 '#08 wait outside with both gates taken',
 '#(?:07|14) yield reaches real bay before crossing',
 '#(?:07 cinnamon|12 white|28 cinnamon) exact native launch, flap and landing',
 '#34 native 10: real taps, two portraits, rotate without losing actors',
];
const profiles={
 'visitor-fix':{control:'visitor-ready',count:7,choices:[visitor]},
 observe:{control:'observe',count:21,choices:[visitor,predator,...hard]},
 quiet:{control:'quiet',count:14,choices:[visitor,...hard]},
};
const engine=process.env.QA_ENGINE,profile=process.env.QA_TRAIL_PROFILE;
if(!['chrome','webkit'].includes(engine)||!Object.hasOwn(profiles,profile))throw Error('Invalid private trail profile.');
const chosen=profiles[profile],grep=chosen.choices.map(x=>'('+x+')').join('|');
const flags=[test,'--config=playwright.verdict.config.js','--project='+engine,'--grep',grep,'--retries=0','--workers=2'];
const env={...process.env,TRAIL_QA_CONTROL:chosen.control,QA_TRAIL_EXPECTED:String(chosen.count)};
const verify=spawnSync('npx',['--no-install','playwright','test',...flags,'--list','--reporter=json'],{env,encoding:'utf8'});
if(verify.error||verify.status!==0)throw Error('Private trail discovery failed.');
const list=JSON.parse(verify.stdout);
const walk=s=>[...(s.specs??[]),...(s.suites??[]).flatMap(walk)];
const cases=list.suites.flatMap(walk);
if(cases.length!==chosen.count||cases.some(t=>t.tests.length!==1||t.tests[0].projectName!==engine))throw Error('Unexpected private trail selection cardinality or engine.');
if(process.argv.includes('--list-only')){console.log(JSON.stringify({engine,profile,selected:cases.length,titles:cases.map(t=>t.title)}));process.exit(0);}
const result=spawnSync('npx',['--no-install','playwright','test',...flags,'--reporter=./scripts/sharded-verdict-reporter.mjs','--output=focused-test-results'],{stdio:'inherit',env});
if(result.error)throw result.error;
process.exit(result.status??1);
