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
