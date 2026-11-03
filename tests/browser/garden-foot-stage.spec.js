import {test,expect} from '@playwright/test';
// Isolated QA preview of original PNGs while production readiness stays false.
const gardens=['komorebi','mizukagami','komugi','hanadokei','kazaguruma','yuyake','tsukiakari','shrine-grove','onsen'];
for(const [width,height] of [[900,440],[660,160],[390,600],[320,420],[390,690]])test(`garden original-art foot geometry ${width}x${height}`,async({page,browserName},testInfo)=>{
 test.skip(browserName==='firefox','Requested trial coverage is Chromium/Edge/WebKit.');
 await page.setViewportSize({width:Math.max(width+32,390),height:Math.max(height+32,240)});
 await page.route('**/buncho-ureshi/garden-foot-qa/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="../src/encounter-ui.css"><body style="margin:16px"><main id="fixture"></main></body></html>'}));
 await page.goto('garden-foot-qa/');
 for(const id of gardens){
  await page.evaluate(async({id,width,height})=>{const [{createWorld},{renderGardenStage},{gardenStageGeometry}]=await Promise.all(['engine.js','encounter-ui.js','data/gardens.js'].map(p=>import('/buncho-ureshi/src/'+p)));const w=createWorld(1000);w.encounters.garden.id=id;document.querySelector('#fixture').innerHTML=renderGardenStage(w,{previewBackgrounds:true});const stage=document.querySelector('.finch-garden-stage');stage.style.width=width+'px';stage.style.height=height+'px';window.stageQA={id,width,height,expected:gardenStageGeometry(id,width,height)};},{id,width,height});
  await expect.poll(()=>page.evaluate(()=>[...document.querySelectorAll('.finch-garden-background')].every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
  const result=await page.evaluate(()=>{const stage=document.querySelector('.finch-garden-stage'),r=stage.getBoundingClientRect(),carousel=stage.querySelector('.finch-garden-carousel'),compact=getComputedStyle(carousel).display!=='none',host=compact?carousel.querySelector('.finch-garden-slide'):stage.querySelector('.finch-garden-group'),plane=host.querySelector('.finch-garden-image-plane').getBoundingClientRect();return {compact,planeInside:plane.left>=r.left-1&&plane.right<=r.right+1&&plane.top>=r.top-1&&plane.bottom<=r.bottom+1,buttons:[...host.querySelectorAll('.finch-garden-friend')].map(b=>{const q=b.getBoundingClientRect(),[x,y]=b.dataset.footAnchor.split(',').map(Number);return {width:q.width,height:q.height,inside:q.left>=r.left-1&&q.right<=r.right+1&&q.top>=r.top-1&&q.bottom+18<=r.bottom+1,errorX:Math.abs((q.left+q.width/2)-(plane.left+x*plane.width)),errorY:Math.abs(q.bottom-(plane.top+y*plane.height))};})};});
  expect(result.planeInside).toBe(true);expect(result.compact).toBe(width<=479||height<=860);
  for(const b of result.buttons){expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);expect(b.inside).toBe(true);expect(b.errorX).toBeLessThan(1.5);expect(b.errorY).toBeLessThan(1.5);}
  await page.locator('.finch-garden-stage').screenshot({path:testInfo.outputPath(`${id}-${width}x${height}.png`)});
  if(result.compact){const rail=page.locator('.finch-garden-carousel');await rail.evaluate(r=>r.scrollTo({left:r.clientWidth,behavior:'instant'}));await expect.poll(()=>rail.evaluate(r=>r.scrollLeft)).toBeGreaterThan(width*.8);await page.keyboard.press('Tab');}
 }
});
