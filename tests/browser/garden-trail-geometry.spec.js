import {appendFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';
import {readTrailGeometry} from '../fixtures/garden-trail-geometry-browser.js';
const id='bird-zebra-finch';
// Pinned source-image geometry for the unmodified #07 background only.
const survey={"sourceDimensions":[941,1672],"lane":[[0.46,0.576],[0.46,0.69],[0.455,0.812]],"entryCandidates":[[0.333,0.636],[0.628,0.791]],"pullouts":[[0.665,0.687]]};
function reportGeometry(info,geometry){
 const {GITHUB_STEP_SUMMARY:file,GITHUB_EVENT_NAME:event,GITHUB_REF:ref,GITHUB_SHA:sha}=process.env;
 // GitHub's supported summary file is distinct from logs/artifact downloads.
 // No token/network use; no summary outside a normal pull-request job.
 if(!file||event!=='pull_request'||!/^refs\/pull\/\d+\/merge$/.test(ref||'')||!/^[0-9a-f]{40}$/.test(sha||''))return;
 const envelope={event,ref,sha,project:info.project.name,case:info.title,geometry};
 const json=JSON.stringify(envelope,(_,v)=>typeof v==='number'?Math.round(v*100)/100:v);
 // Only controlled-fixture geometry, synthetic IDs, CSS classes and numbers.
 // Escape backticks so captured class names cannot end a Markdown fence.
 if(Buffer.byteLength(json,'utf8')>64000)throw Error('#07 geometry result exceeded its audit budget');
 appendFileSync(file,'\n### '+info.project.name+' '+info.title+'\n\n```json\n'+json.replaceAll('`','\\u0060')+'\n```\n','utf8');
}
test.use({hasTouch:true});
for(const [width,height] of [[375,667],[402,874]])for(const [density,count] of [['empty',0],[true,1],['maximum',10]])
test(`trail measured #07: ${width}×${height} ${count}`,async({page},info)=>{
 await setup(page,id,width,true,density);
 await page.setViewportSize({width,height});
 await page.clock.runFor(1000);
 const geometry=await page.evaluate(readTrailGeometry,{id,survey});
 reportGeometry(info,geometry);
 expect(geometry, 'correct native scene connected and ready').not.toBeNull();
 expect(geometry.plane.width).toBeGreaterThan(0);
 expect(geometry.native).toHaveLength(count);
 expect(new Set(geometry.native.map(b=>b.id)).size).toBe(count);
 for(const b of geometry.native){expect(b.id).toBeTruthy();expect(b.rect.width).toBeGreaterThan(0);expect(b.rect.height).toBeGreaterThan(0);}
 // This is a baseline capture, not a traffic or all-hits certificate. Native
 // clip, actor and overlay conflicts remain explicit in the job summary.
 expect(geometry.sweeps).toHaveLength(count);
 expect(geometry.native.every(b=>b.actorState===null)).toBe(true);
});
test('existing open-ground control #01 retains its actor overlay and tap',async({page})=>{
 await setup(page,'java-rice',375,true,true);await page.setViewportSize({width:375,height:667});await page.clock.runFor(1000);
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-actor-motion','active');
 const b=page.locator('.finch-garden-household');await expect(b).toHaveCount(1);
 await b.tap();await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
});
