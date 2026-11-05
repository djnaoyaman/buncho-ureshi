import {test,expect} from '@playwright/test';
const ids=['java-rice','bali-terrace','paris-unrest'];
async function stableRoster(page){
 await page.route(/\/src\/game\.js(?:\?.*)?$/,async route=>{
  const response=await route.fetch(),source=await response.text(),target='predatorRandom = Math.random';
  expect(source.split(target)).toHaveLength(2);
  await route.fulfill({response,body:source.replace(target,'predatorRandom = () => 1')});
 });
}
async function enter(page){
 await stableRoster(page);await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const controls=page.locator('.game-scene-controls-toggle');if(await controls.getAttribute('aria-expanded')!=='true')await controls.click();
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
}
const friends=page=>page.locator('[data-garden-friend]').evaluateAll(nodes=>nodes.map(n=>n.dataset.gardenFriend));
const ready=page=>expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
async function gardenState(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('buncho-ureshi-garden-v1',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,r=db.transaction('world').objectStore('world').get('current');r.onsuccess=()=>{const g=r.result.encounters.garden;db.close();resolve({id:g.id,visits:g.visits});};r.onerror=()=>reject(r.error);};}));}

test('real game scenes retain treetop, ocean and Notre-Dame across phone, desktop and rotation',async({page},info)=>{
 await enter(page);
 for(const id of ids){
  await page.locator(`[data-garden-select="${id}"]`).click();await ready(page);
  const before=await gardenState(page),guests=await friends(page);
  for(const [width,height] of [[390,844],[1280,800],[844,390],[390,844]]){
   await page.setViewportSize({width,height});await ready(page);
   const geometry=await page.locator('.finch-garden-stage').evaluate(stage=>{const r=stage.getBoundingClientRect(),p=stage.querySelector('.finch-garden-image-plane'),img=stage.querySelector('.finch-garden-background');return {ratio:r.width/r.height,variant:stage.dataset.gardenArt,src:img.getAttribute('src'),naturalWidth:img.naturalWidth,planeWidth:Number(p.dataset.imageWidth),anchor:p.style.getPropertyValue('--garden-anchor-y')};});
   expect(geometry.variant).toBe(geometry.ratio>=.8?'landscape':'portrait');expect(geometry.naturalWidth).toBe(geometry.planeWidth);expect(geometry.src).toContain(geometry.variant==='landscape'?`${id}-wide-v2.webp`:`${id}-v2.webp`);
   expect(await friends(page)).toEqual(guests);expect(await gardenState(page)).toEqual(before);
   await page.screenshot({path:info.outputPath(`${id}-${width}x${height}.jpg`),type:'jpeg',quality:88});
  }
 }
});

test('failed rotated art remains unavailable until retry and never changes a visit',async({page})=>{
 await enter(page);await page.locator('[data-garden-select="java-rice"]').click();await ready(page);
 const before=await gardenState(page),guests=await friends(page);let fail=true;
 await page.route(/java-rice-wide-v2\.webp/,async route=>{if(fail)await route.abort('failed');else await route.continue();});
 await page.setViewportSize({width:1280,height:800});await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','error');
 fail=false;await page.locator('.finch-garden-loading [data-media-retry]').click();await ready(page);
 expect(await friends(page)).toEqual(guests);expect(await gardenState(page)).toEqual(before);
 await page.setViewportSize({width:390,height:844});await ready(page);
 await page.locator('[data-encounter-back]').click();await expect(page.locator('.finch-notebook')).toBeVisible();
 await page.locator('[data-finch-go-garden]').click();await ready(page);expect(await friends(page)).toEqual(guests);expect(await gardenState(page)).toEqual(before);
});

test('ten birds remain on the revised terrain in portrait and landscape',async({page},info)=>{
 await page.route('**/buncho-ureshi/garden-art-qa/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="../src/encounter-ui.css"><style>html,body{margin:0;width:100%;height:100%}.finch-garden{position:relative}</style><body><main id="fixture"></main></body></html>'}));
 await page.goto('garden-art-qa/');
 for(const [width,height] of [[390,690],[900,600]])for(const id of ids){
  await page.setViewportSize({width,height});
  const state=await page.evaluate(async({id,width,height})=>{
   const [{createWorld},{renderFinchGarden},{mountEncounterMedia},{encounterSystem}]=await Promise.all(['engine.js','encounter-ui.js','encounter-media.js','encounters.js'].map(x=>import('/buncho-ureshi/src/'+x)));
   window.artMedia?.destroy();const w=createWorld(1000);w.encounters.garden.id=w.encounters.garden.guestGardenId=id;w.encounters.queue=[encounterSystem.catalog[0].id];
   for(let i=2;i<=5;i++)w.birds.push({...structuredClone(w.birds[0]),id:`b${i}`,name:`同行${i}`,color:'silver'});w.encounters.gardenFriends.companions=['b2','b3','b4','b5'];
   const root=document.querySelector('#fixture');root.style.width=width+'px';root.style.height=height+'px';root.innerHTML=renderFinchGarden(w);window.artMedia=mountEncounterMedia(root);window.artMedia.refresh();return JSON.stringify(w);
  },{id,width,height});
  await ready(page);await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-garden-count','10');
  const points=await page.locator('.finch-garden-image-plane').evaluate(p=>{const plane=p.getBoundingClientRect(),stage=p.closest('.finch-garden-stage').getBoundingClientRect();return [...p.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:(r.x+r.width*.54-plane.x)/plane.width,y:(r.y+r.height*.975-plane.y)/plane.height,w:r.width,h:r.height,inside:r.left>=stage.left&&r.right<=stage.right&&r.top>=stage.top&&r.bottom+16<=stage.bottom,hit:b===hit||b.contains(hit),box:{left:r.left,right:r.right,top:r.top,bottom:r.bottom}};});});
  for(const p of points){expect(p.w).toBeGreaterThanOrEqual(44);expect(p.h).toBeGreaterThanOrEqual(44);expect(p.inside).toBe(true);expect(p.hit).toBe(true);expect(p.x).toBeGreaterThan(.1);expect(p.x).toBeLessThan(.9);expect(p.y).toBeGreaterThan(.52);expect(p.y).toBeLessThan(.94);}
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){const a=points[i].box,b=points[j].box;expect(Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))).toBe(0);}
  expect(JSON.parse(state).encounters.garden.id).toBe(id);
  await page.screenshot({path:info.outputPath(`${id}-ten-${width}x${height}.jpg`),type:'jpeg',quality:88});
 }
});
