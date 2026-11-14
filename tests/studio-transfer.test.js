import test from 'node:test';
import assert from 'node:assert/strict';
import {stageStudioTransfer,takeStudioTransfer} from '../src/studio-transfer.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
test('same-tab handoff preserves names/family and is consumed exactly once',()=>{const s=storage(),seed={title:'エドの家族',birds:[{name:'エド',color:'white',stage:'adult'}]};assert.equal(stageStudioTransfer(s,'/buncho-ureshi/',seed,1000),true);assert.equal(takeStudioTransfer(s,'/other/',1001),null);assert.deepEqual(takeStudioTransfer(s,'/buncho-ureshi/',1001),seed);assert.equal(takeStudioTransfer(s,'/buncho-ureshi/',1002),null)});
test('expired, future, invalid and oversized payloads are not applied',()=>{for(const at of [0,999999]){const s=storage();stageStudioTransfer(s,'/',{name:'x'},at);assert.equal(takeStudioTransfer(s,'/',400000),null)}const s=storage();s.setItem('buncho-studio-transfer:/','bad');assert.equal(takeStudioTransfer(s,'/'),null);assert.equal(stageStudioTransfer(s,'/',null),false);assert.equal(stageStudioTransfer(s,'/',{text:'x'.repeat(17000)}),false)});
test('unavailable storage fails safely without touching persistent game or studio data',()=>{const s={getItem(){throw Error('denied')},setItem(){throw Error('denied')},removeItem(){throw Error('denied')}};assert.equal(stageStudioTransfer(s,'/',{name:'x'}),false);assert.equal(takeStudioTransfer(s,'/'),null)});

test('invalid replacement clears stale handoff',()=>{const s=storage();stageStudioTransfer(s,'/',{name:'old'});assert.equal(stageStudioTransfer(s,'/',null),false);assert.equal(takeStudioTransfer(s,'/'),null)});

test('handoff import version matches helper content',async()=>{const {readFile}=await import('node:fs/promises');const{createHash}=await import('node:crypto');const hash=createHash('sha256').update(await readFile('src/studio-transfer.js')).digest('hex').slice(0,12);assert.ok((await readFile('src/app.js','utf8')).includes('./studio-transfer.js?v='+hash));});
