import {test,expect} from '@playwright/test';
import {GARDEN_IDS} from '../../src/data/gardens.js';

// Isolated rendering contract: all current guests share one cover-cropped terrain plane.
for(const [width,height] of [[900,440],[660,160],[390,600],[320,420],[390,690]])test(`garden original-art foot geometry ${width}x${height}`,async({page,browserName},testInfo)=>{
 test.skip(browserName==='firefox','Requested trial coverage is Chromium/Edge/WebKit.');
 await page.setViewportSize({width:Math.max(width+32,390),height:Math.max(height+32,240)});
 await page.route('**/buncho-ureshi/garden-foot-qa/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="../src/encounter-ui.css"><body style="margin:16px"><main id="fixture" class="finch-garden"></main></body></html>'}));
 await page.goto('garden-foot-qa/');
 for(const id of GARDEN_IDS){
  await page.evaluate(async({id,width,height})=>{
   const [{createWorld},{renderGardenStage},{gardenStageGeometry},{mountEncounterMedia}]=await Promise.all(['engine.js','encounter-ui.js','data/gardens.js','encounter-media.js'].map(p=>import('/buncho-ureshi/src/'+p)));
   const w=createWorld(1000);w.encounters.gardenFriends.attendees=['b1'];w.encounters.garden.id=id;
   window.gardenFootMedia?.destroy();const fixture=document.querySelector('#fixture');fixture.style.width=width+'px';fixture.style.height=height+'px';fixture.innerHTML=renderGardenStage(w,{previewBackgrounds:true});
   const stage=document.querySelector('.finch-garden-stage');stage.style.width=width+'px';stage.style.height=height+'px';window.gardenFootMedia=mountEncounterMedia(fixture);window.gardenFootMedia.refresh();
   window.stageQA={id,width,height,expected:gardenStageGeometry(id,width,height)};
  },{id,width,height});
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
  await expect(page.locator('.finch-garden-loading')).toBeHidden();
  const result=await page.evaluate(()=>{
   const {id,width,height,expected}=window.stageQA,stage=document.querySelector('.finch-garden-stage'),r=stage.getBoundingClientRect(),plane=stage.querySelector('.finch-garden-image-plane').getBoundingClientRect();
   const p=expected.friends[expected.selectedIndex],offsets=id==='mizukagami'?[[-1.15,-.65],[1.15,-.65],[-1.15,.15],[1.15,.15],[0,.15]]:[[-1.2,-.55],[1.2,-.55],[-1.2,.75],[1.2,.75],[0,.75]];
   return {containerType:getComputedStyle(stage).containerType,plane:{x:plane.left-r.left,y:plane.top-r.top,width:plane.width,height:plane.height},expected,buttons:[...stage.querySelectorAll('.finch-garden-friend,.finch-garden-household')].map((b,i)=>{
    const q=b.getBoundingClientRect(),[dx,dy]=offsets[i],hit=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);
    return {width:q.width,height:q.height,inside:q.left>=r.left-1&&q.right<=r.right+1&&q.top>=r.top-1&&q.bottom+18<=r.bottom+1,hit:b===hit||b.contains(hit),errorX:Math.abs(q.left+q.width*.54-r.left-p.x-dx*Math.min(width*.22,120)),errorY:Math.abs(q.top+q.height*.975-r.top-p.y-dy*Math.min(height*.17,110))};
   })};
  });
  expect(result.containerType).toBe('size');
  expect(result.plane.x).toBeCloseTo(result.expected.offsetX,0);expect(result.plane.y).toBeCloseTo(result.expected.offsetY,0);
  expect(result.plane.width).toBeCloseTo(result.expected.drawWidth,0);expect(result.plane.height).toBeCloseTo(result.expected.drawHeight,0);
  expect(result.buttons).toHaveLength(5);
  for(const b of result.buttons){expect(Math.round(b.width*1000)/1000).toBeGreaterThanOrEqual(44);expect(Math.round(b.height*1000)/1000).toBeGreaterThanOrEqual(44);expect(b.inside).toBe(true);expect(b.hit).toBe(true);expect(b.errorX).toBeLessThan(1.5);expect(b.errorY).toBeLessThan(1.5);}
  await page.locator('.finch-garden-stage').screenshot({path:testInfo.outputPath(`${id}-${width}x${height}.png`)});
 }
});
