import {test,expect} from '@playwright/test';
for(const size of [[320,568],[390,844],[844,390],[1280,800]])test(`enemy groups never clip or overlap at ${size.join('x')}`,async({page},info)=>{
 await page.setViewportSize({width:size[0],height:size[1]});
 await page.goto('game/');
 const base=new URL('../',page.url()).href;
 await page.setContent(`<link rel="stylesheet" href="${base}src/style.css"><link rel="stylesheet" href="${base}src/game.css"><link rel="stylesheet" href="${base}src/encounter-ui.css"><style>body{margin:0}#fixture{height:100dvh;width:100%;box-sizing:border-box;overflow:auto}</style><div id="fixture" class="game-encounter-host finch-overlay-content"></div>`);
 await page.evaluate(async base=>{const [{createWorld},{renderCrowNotebook}]=await Promise.all([import(base+'src/engine.js'),import(base+'src/garden-crow-ui.js')]);document.querySelector('#fixture').innerHTML=renderCrowNotebook(createWorld(Date.now()),{base});},base);
 await expect(page.locator('.finch-catalog')).toHaveCount(3);
 await page.locator('.finch-catalog img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 const before=await page.locator('#fixture').evaluate(root=>{
  const grids=[...root.querySelectorAll('.finch-catalog')];
  return grids.map(g=>{const b=g.getBoundingClientRect(),last=[...g.children].at(-1).getBoundingClientRect();const next=g.nextElementSibling?.getBoundingClientRect();return {client:g.clientHeight,scroll:g.scrollHeight,gridBottom:b.bottom,lastBottom:last.bottom,nextTop:next?.top};});
 });
 for(const g of before){expect(g.scroll).toBeLessThanOrEqual(g.client+1);expect(g.lastBottom).toBeLessThanOrEqual(g.gridBottom+1);if(g.nextTop!==undefined)expect(g.nextTop).toBeGreaterThanOrEqual(g.lastBottom);}
 const waterHeading=page.locator('.finch-raptor-catalog h4').last();await waterHeading.scrollIntoViewIfNeeded();
 const lastRaptor=page.locator('.finch-raptor-catalog .finch-catalog').first().locator('button').last();
 expect((await waterHeading.boundingBox()).y).toBeGreaterThanOrEqual((await lastRaptor.boundingBox()).y+(await lastRaptor.boundingBox()).height);
 expect(await page.locator('#fixture').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await info.attach('enemy-section-boundary',{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('[data-encounter-back]').scrollIntoViewIfNeeded();await expect(page.locator('[data-encounter-back]')).toBeInViewport();
});
for(const size of [[320,568],[390,844],[844,390]])test(`predator A cards keep original images, relationship and readable sources ${size.join('x')}`,async({page},info)=>{
 await page.setViewportSize({width:size[0],height:size[1]});await page.goto('game/');const base=new URL('../',page.url()).href;
 await page.setContent(`<link rel="stylesheet" href="${base}src/style.css"><link rel="stylesheet" href="${base}src/game.css"><link rel="stylesheet" href="${base}src/encounter-ui.css"><style>body{margin:0}#fixture{height:100dvh;overflow:auto;box-sizing:border-box;padding:12px}</style><body data-world="buncho"><main class="game-app"><div id="fixture" class="game-encounter-host finch-overlay-content"></div></main></body>`);
 for(const id of ['large-billed-crow','black-kite','osprey']){
  await page.evaluate(async({base,id})=>{const [{createWorld},{renderCrowNotebook},{renderRaptorNotebook}]=await Promise.all([import(base+'src/engine.js'),import(base+'src/garden-crow-ui.js'),import(base+'src/garden-raptor-ui.js')]);const w=createWorld(Date.now()),visit={id,firstTick:0,lastTick:0,count:2,petPoints:20};if(id==='large-billed-crow')w.encounters.crow.visits.push(visit);else w.encounters.raptor.visits.push(visit);document.querySelector('#fixture').innerHTML=(id==='large-billed-crow'?renderCrowNotebook:renderRaptorNotebook)(w,{base,id});}, {base,id});
  const card=page.locator('.finch-predator-record');await expect(card).toHaveCSS('background-color','rgb(255, 252, 245)');await expect(card.locator('.finch-friendship')).toHaveCSS('background-color','rgb(244, 201, 183)');
  await card.locator('.finch-record-portrait img').evaluate(img=>img.decode());await expect(card.locator('.finch-record-portrait img')).toHaveCSS('object-fit','contain');
  await expect(card.locator('.finch-friendship')).toContainText('庭で会った回数 2 回');if(id==='osprey')await expect(card.locator('.finch-predator-relation')).toHaveText('文鳥を襲わない、水辺の仲間');
  for(const key of ['ecology','sources']){await card.locator(`[data-notebook-reading=${key}]>summary`).click();await expect(card.locator(`[data-notebook-reading=${key}]`)).toHaveAttribute('open','');}
  for(const button of await card.locator('.finch-page-actions button').all()){await button.scrollIntoViewIfNeeded();const b=await button.boundingBox();expect(b.height).toBeGreaterThanOrEqual(44);expect(b.width).toBeGreaterThanOrEqual(44);expect(await button.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);}
  expect(await page.locator('#fixture').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await card.locator('h3').scrollIntoViewIfNeeded();await info.attach(`${id}-${size[0]}`,{body:await page.screenshot(),contentType:'image/png'});
 }
});
