import {test,expect} from '@playwright/test';
import {createWorld,createBird,validateWorld} from '../../src/engine.js';
import {familyLayout} from '../../src/family-layout.js';
const now=Date.UTC(2026,10,3,12),dbName='buncho-ureshi-garden-v1';
async function record(page,world){return page.evaluate(({dbName,world})=>new Promise((resolve,reject)=>{const open=indexedDB.open(dbName,1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('world',world?'readwrite':'readonly'),store=tx.objectStore('world'),req=world?store.put(world,'current'):store.get('current');tx.oncomplete=()=>{db.close();resolve(req.result)};tx.onerror=()=>{db.close();reject(tx.error)}}}),{dbName,world});}
function fixture(kind){
 const w=createWorld(now);w.paused=true;w.settings.motion=false;
 if(kind!=='single'){
  const a=w.birds[0],b=createBird(w,{name:'ぴすたちお',sex:'male',color:'white',home:'resident'});a.partner=b.id;b.partner=a.id;a.pairTick=b.pairTick=0;
  if(kind==='generations')for(const child of [a,b]){const p=createBird(w,{name:'親１',sex:'female',home:'departed'}),q=createBird(w,{name:'親２',sex:'male',home:'departed'});p.partner=q.id;q.partner=p.id;p.pairTick=q.pairTick=0;child.parents=[p.id,q.id];child.generation=1;}
  for(let i=0;i<(kind==='generations'?12:2);i++)createBird(w,{name:'こども'+(i+1),parents:[a.id,b.id],generation:a.generation+1,home:i<2?'resident':'departed'});
 }
 expect(validateWorld(w).worldId).toBe(w.worldId);return w;
}
async function openFamily(page){await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bottom-dock [data-game-panel="family"]').click();await expect(page.locator('.game-family-canvas')).toBeVisible();}
async function geometry(page){return page.evaluate(()=>{
 const pan=document.querySelector('.game-family-pan'),stage=document.querySelector('.game-family-stage'),canvas=document.querySelector('.game-family-canvas'),panel=document.querySelector('.game-panel-overlay > .game-panel'),pr=pan.getBoundingClientRect(),sr=stage.getBoundingClientRect(),cr=canvas.getBoundingClientRect(),nodes=[...canvas.querySelectorAll('.game-family-node')].map(n=>n.getBoundingClientRect());
 const top=Math.min(...nodes.map(n=>n.top)),bottom=Math.max(...nodes.map(n=>n.bottom)),left=Math.min(...nodes.map(n=>n.left)),right=Math.max(...nodes.map(n=>n.right));
 return {contentWidth:right-left,leftGap:left-pr.left-pan.clientLeft,rightGap:pr.left+pan.clientLeft+pan.clientWidth-right,topGap:top-cr.top,bottomGap:cr.bottom-bottom,centerError:Math.abs(sr.left+sr.width/2-(pr.left+pr.width/2)),scale:cr.width/parseFloat(canvas.style.width),panWidth:pan.clientWidth,panScrollWidth:pan.scrollWidth,stageWidth:sr.width,panScroll:pan.scrollLeft,canvasHeight:cr.height,panelTop:panel.scrollTop,firstVisible:top<innerHeight,docWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
});}
async function balanced(page,expectedHeight){
 // Resizes are delivered on a later rendering frame in mobile WebKit.
 // Check the settled graph, allowing the browser to round scrollLeft to pixels.
 await expect.poll(async()=>(await geometry(page)).centerError).toBeLessThanOrEqual(1);
 await expect.poll(async()=>Math.abs((await geometry(page)).topGap-(await geometry(page)).bottomGap)).toBeLessThanOrEqual(1);
 const g=await geometry(page);expect(g.topGap).toBeCloseTo(24*g.scale,0);expect(g.bottomGap).toBeCloseTo(24*g.scale,0);expect(g.canvasHeight).toBeCloseTo(expectedHeight*g.scale,0);
 if(g.stageWidth<=g.panWidth)expect(g.centerError).toBeLessThanOrEqual(1);
 else expect(Math.abs(g.panScroll-(g.stageWidth-g.panWidth)/2)).toBeLessThanOrEqual(1);
 if(g.contentWidth<=g.panWidth){expect(g.leftGap).toBeGreaterThanOrEqual(-1);expect(g.rightGap).toBeGreaterThanOrEqual(-1);}
 expect(g.panScrollWidth).toBeLessThanOrEqual(Math.max(g.panWidth,g.stageWidth)+1);expect(g.docWidth).toBeLessThanOrEqual(g.viewportWidth+1);return g;
}
async function zoom(page,value){while(Number((await page.locator('.game-family-zoom output').textContent()).replace('%',''))!==value){const current=Number((await page.locator('.game-family-zoom output').textContent()).replace('%',''));await page.locator(`[data-family-zoom="${current<value?1:-1}"]`).click();}}
for(const kind of ['single','pair-children','generations'])test(`${kind}: compact balanced graph, responsive zoom, focus and save integrity`,async({page},info)=>{
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},now);
 await page.setViewportSize({width:320,height:568});await page.goto('');const original=fixture(kind);await record(page,original);await page.goto('game/');await openFamily(page);const baseline=await record(page);
 const graph=familyLayout(original,'b1');
 for(const size of [{width:320,height:568},{width:390,height:680},{width:844,height:390},{width:768,height:1024},{width:1440,height:900}]){
  await page.setViewportSize(size);await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));await zoom(page,100);const g=await balanced(page,graph.height);expect(g.firstVisible).toBe(true);
  await info.attach(`${kind}-${size.width}x${size.height}-100`,{body:await page.screenshot(),contentType:'image/png'});
  for(const z of [70,120,100]){await zoom(page,z);await balanced(page,graph.height);}
 }
 if(kind==='generations'){
  // Wide diagrams intentionally pan, but neither end card may be stranded.
  for(const id of [graph.children[0],graph.children.at(-1)]){const card=page.locator(`.game-family-node[data-family-focus="${id}"]`);await card.scrollIntoViewIfNeeded();expect(await card.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('.game-family-pan'),b=p.getBoundingClientRect();return r.left>=b.left+p.clientLeft-1&&r.right<=b.left+p.clientLeft+p.clientWidth+1})).toBe(true);}
  await zoom(page,90);await zoom(page,100);await balanced(page,graph.height);
 }
 if(kind!=='single'){
  const child=original.birds.find(b=>b.parents.includes('b1'));
  await page.locator(`.game-family-node[data-family-focus="${child.id}"]`).click();await expect(page.locator('.game-family-heading h3')).toHaveText(`${child.name}の家系図`);await balanced(page,360);
  await page.locator('.game-family-node[data-family-focus="b1"]').click();await expect(page.locator('.game-family-heading h3')).toHaveText('おもちの家系図');await balanced(page,graph.height);
 }
 // A real periodic redraw of this test-only record preserves scroll and zoom.
 if(kind==='generations'){
  await page.setViewportSize({width:390,height:680});await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));await zoom(page,100);await balanced(page,graph.height);await page.evaluate(()=>document.querySelector('.game-family-pan').scrollLeft=30);
  const before=await page.locator('.game-family-canvas').elementHandle(),peer=await record(page);peer.revision++;await record(page,peer);
  await expect.poll(()=>before.evaluate(e=>e.isConnected),{timeout:10000}).toBe(false);expect((await geometry(page)).panScroll).toBeCloseTo(30,0);
 }
 const after=await record(page);expect(after.birds).toEqual(baseline.birds);expect(after.decor).toEqual(baseline.decor);expect(after.economy).toEqual(baseline.economy);expect(after.worldId).toBe(baseline.worldId);
 await page.locator('[data-game-close-panel]').click();await page.locator('.game-bottom-dock [data-game-panel="family"]').click();await balanced(page,graph.height);
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect((await record(page)).birds).toEqual(baseline.birds);
});
