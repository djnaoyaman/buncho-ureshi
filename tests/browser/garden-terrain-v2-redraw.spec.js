import {test,expect} from '@playwright/test';
import {setup,measure,snapshotGarden} from '../fixtures/garden-terrain-browser.js';
test.use({hasTouch:true});
test('atomic measure rejects real occlusion and does not mistake a detached previous plane for the current revision',async({page})=>{
 await page.setContent('<section class="finch-garden" data-garden-revision="4"><div class="finch-garden-image-plane"><button data-garden-household="b1" style="position:fixed;left:20px;top:20px;width:44px;height:44px">bird</button></div></section>');
 const old=await page.locator('.finch-garden-image-plane').elementHandle();
 await page.evaluate(()=>{const p=document.querySelector('.finch-garden-image-plane');p.replaceWith(p.cloneNode(true));document.querySelector('.finch-garden').dataset.gardenRevision='6';});
 const detached=await old.evaluate(e=>{const n=e.querySelector('button'),r=n.getBoundingClientRect();return {connected:e.isConnected,hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
 expect(detached).toEqual({connected:false,hit:false});const current=await measure(page,{diagnostics:true});expect(current[0].connected).toBe(true);expect(current[0].revision).toBe('6');expect(current[0].hit).toBe(true);
 await page.evaluate(()=>{const n=document.createElement('div');n.style='position:fixed;inset:0;z-index:999;background:white';document.body.append(n);});expect((await measure(page,{diagnostics:true}))[0].hit).toBe(false);
});
for(const width of [375,402])test(`real saved redraw and tap retain current five targets ${width}`,async({page},info)=>{
 await setup(page,'bali-terrace',width,true,false,width===375?667:874);await page.clock.resume();const records=[];
 for(let round=0;round<8;round++){
  const revision=await page.locator('.finch-garden').getAttribute('data-garden-revision');
  await page.evaluate(async()=>{const url=n=>new URL('src/'+n+'.js',document.baseURI).href,engine=await import(url('engine')),{openGameStore}=await import(url('game-store')),store=await openGameStore();try{await store.transact(w=>{engine.bumpRevision(w);return w;});}finally{store.close();}});
  // Only wait for the committed revision, never a successful geometry/hit.
  await expect(page.locator('.finch-garden')).not.toHaveAttribute('data-garden-revision',revision);
  const birds=await measure(page,{diagnostics:true}),snap=await snapshotGarden(page);records.push({birds,snap});expect(birds).toHaveLength(5);expect(new Set(birds.map(b=>b.revision)).size).toBe(1);
  for(const b of birds){expect(b.connected).toBe(true);expect(b.hit,JSON.stringify({round,b,snap})).toBe(true);}
  await page.locator('.finch-garden-household').first().tap();await expect(page.locator('#game-sheet-title')).toContainText('エド');await expect(page.locator('.game-bird-sheet[open]')).toBeVisible();await page.locator('[data-game-close-bird]').tap();
 }
 await info.attach('eight-real-revisions-and-taps',{body:JSON.stringify(records),contentType:'application/json'});
});
