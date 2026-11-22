import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const files=JSON.parse(process.env.BROWSER_TESTS_JSON||'[]');
const allowed=['tests/browser/garden-about-booklet.spec.js','tests/browser/garden-ground-motion.spec.js','tests/browser/garden-viewport-sync.spec.js'];
const shared='tests/browser/garden-zebra-shared-pane.spec.js';
const sharedAB='tests/browser/garden-zebra-shared-pane-ab.spec.js';
const retain='tests/browser/garden-zebra-ready-stage-retain.spec.js';
const engine=process.env.QA_ENGINE, input=process.env.BOOKLET_OPEN_STYLE;
const ab=['shared-ab-original','shared-ab-missed'].includes(input);
const sharedLane=input==='shared-pane'||ab;
const retentionLane=input==='shared-retain';
const requested=JSON.stringify(files);
const retainedManifest=JSON.stringify([...allowed,shared,sharedAB,retain]);
if((retentionLane?requested!==retainedManifest:requested!==JSON.stringify(ab?[...allowed,shared,sharedAB]:sharedLane?[...allowed,shared]:allowed)&&!(ab&&requested===retainedManifest))||!['chrome','webkit'].includes(engine)||!['split','locator','axis','comparison','shared-pane','shared-ab-original','shared-ab-missed','shared-retain'].includes(input))throw Error('Invalid focused diagnostic lane.');
const booklet=['layout bird-scaly-breasted-munia 320x740','assigned credit and audio continuity 375 fixed'];
const other=['safe roster bird-zebra-finch dense','ground holds and resumes java-rice','viewport synchronization java-rice dense','viewport synchronization bird-diamond-firetail (?:false|dense)','viewport synchronization bird-zebra-finch (?:true|dense)'];
const axis=['viewport synchronization bird-zebra-finch dense'];
const comparison=[
 'safe roster bird-zebra-finch dense','ground holds and resumes java-rice',
 'viewport synchronization java-rice dense','viewport synchronization bird-diamond-firetail (?:false|dense)','viewport synchronization bird-zebra-finch true',
 'old pixel-height control exposes the original offscreen hit while notification is pending',
 'atomic snapshot exposes a ready occluded target without waiting for success','atomic snapshot exposes ready zero geometry and offscreen targets',
];
const sharedTitles=[8,10].map(count=>`zebra shared pane retains the native ${count}-bird flight across rotation`);
const retentionTitles=['zebra companion UI redraw retains the original ready stage and shared flight','zebra busy garden action replaces the stage and reenables every native bird'];
const selection=retentionLane?retentionTitles:sharedLane?sharedTitles:input==='axis'?axis:input==='comparison'?comparison:input==='locator'?booklet:[...booklet,...other];
// Playwright imports selected files before filtering titles. Keep the
// booklet's split/locator setup contract out of the new geometry lanes.
const expected=(sharedLane||retentionLane)?2:input==='axis'?1:input==='comparison'?9:null;
const selectedFiles=retentionLane?[retain]:ab?[sharedAB]:sharedLane?[shared]:input==='axis'?[allowed[2]]:input==='comparison'?allowed.slice(1):files;
const common=['playwright','test',...selectedFiles,'--config=playwright.verdict.config.js','--project='+engine,
 '--grep','(?:'+selection.join('|')+')$','--retries=0','--output=focused-test-results'];
if(expected!==null){
 const list=spawnSync('npx',[...common,'--list','--reporter=json'],{encoding:'utf8',maxBuffer:1024*1024,timeout:30000});
 const stop=phase=>{
  const r={v:1,engine,input,status:'failed',infrastructure:1,phase,rows:[]};
  writeFileSync('compact-browser-verdict.json',JSON.stringify(r)+'\n');
  console.error(phase);process.exit(1);
 };
 if(list.error||list.status!==0)stop('discovery-command');
 let report;try{report=JSON.parse(list.stdout);}catch{stop('discovery-format');}
 const tests=s=>(s.specs??[]).flatMap(sp=>sp.tests??[]).concat((s.suites??[]).flatMap(tests));
 const cases=tests(report);
 if(report.errors?.length||cases.length!==expected||cases.some(t=>t.projectName!==engine))stop('discovery-selection');
 if(sharedLane||retentionLane){
  const specs=s=>(s.specs??[]).concat((s.suites??[]).flatMap(specs));
  const titles=specs(report).map(t=>t.title).sort();
  if(JSON.stringify(titles)!==JSON.stringify([...selection].sort()))stop('discovery-titles');
  if(process.argv.includes('--list-only')){
   console.log(JSON.stringify({engine,input,files:selectedFiles,titles}));process.exit(0);
  }
 }
}
const result=spawnSync('npx',[...common,'--reporter=./scripts/sharded-verdict-reporter.mjs'],{stdio:'inherit'});
if(result.error)throw result.error;process.exit(result.status??1);
