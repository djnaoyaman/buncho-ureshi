import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderOmochi} from '../site/omochi.js';
test('observation presentation preserves form contract and truthful photo identity',()=>{
 const html=renderOmochi({url:p=>'/buncho-ureshi/'+p});
 assert.equal((html.match(/omochi\/omochi-original.jpeg/g)||[]).length,2);
 for(const contract of ['id="observation-form"','name="date"','name="note"','maxlength="600"','id="observations"','ゲームの出来事とは別の記録','同じ写真の部分拡大'])assert.ok(html.includes(contract),contract);
 assert.ok(html.indexOf('omochi-cover')<html.indexOf('omochi-look'));
 assert.ok(html.indexOf('omochi-look')<html.indexOf('omochi-about'));
 assert.ok(html.indexOf('omochi-about')<html.indexOf('omochi-notebook'));
 assert.doesNotMatch(renderOmochi({url:p=>p,interactive:false}),/<form/);
});
test('the isolated site entry replaces only the observation renderer',async()=>{
 const app=await readFile('dist/src/site-app.js','utf8');assert.match(app,/view = renderOmochi\(/);
 const legacy=await readFile('dist/src/app.js','utf8');assert.match(legacy,/view = omochi\(\)/);assert.doesNotMatch(legacy,/renderOmochi/);
 const page=await readFile('dist/omochi/index.html','utf8');assert.match(page,/この一羽を、/);
});
