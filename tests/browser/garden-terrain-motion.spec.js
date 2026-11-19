import {test,expect} from '@playwright/test';
import {worldFor,NOW,engine} from '../fixtures/garden-about-world.js';
import {terrainFor,inside} from '../../src/garden-terrain-plan.js';
const ids=['yuyake','bird-eurasian-bullfinch','bird-white-winged-crossbill','bali-terrace'];
async function setup(page,id,width=390,motion=true,sparse=false){
  await page.setViewportSize({width,height:844});
  await page.route(/\/src\/game\.js(?:\?.*)?$/,async route=>{
    const response=await route.fetch(),source=await response.text();expect(source.split('predatorRandom = Math.random')).toHaveLength(2);
    await route.fulfill({response,body:source.replace('predatorRandom = Math.random','predatorRandom = () => 1')});
  });
  await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
  await page.goto('');await page.clock.install({time:NOW});await page.clock.pauseAt(NOW+1000);
  const world=worldFor('attending',id);world.settings.motion=motion;
  if(sparse)world.encounters.gardenFriends.visits=[{gardenId:id,visit:world.encounters.garden.visits[id],friendIds:[],returningIds:[]}];
  if(sparse==='empty')world.encounters.gardenFriends.attendees=[];
  if(sparse==='dense'){
    world.encounters.gardenFriends.visits=[];
    for(let i=0;i<3;i++){const b=engine.createBird(world,{home:'resident',stage:'adult'});world.encounters.gardenFriends.attendees.push(b.id);}
  }
  engine.validateWorld(world);
  await page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,t=db.transaction('world','readwrite');t.objectStore('world').put(w,'current');t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error)};}),world);
  await page.goto('game/');await page.clock.runFor(2500);
  await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-panel=outdoors]').click();
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
  await page.clock.runFor(1100);
}
async function measure(page){return page.locator('.finch-garden-image-plane').evaluate(e=>{
  const p=e.getBoundingClientRect();return [...e.querySelectorAll(':scope > button')].map(n=>{
    const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),sprite=n.querySelector('.garden-bird-sprite');
    return {id:n.dataset.gardenFriend||n.dataset.gardenHousehold||n.dataset.encounterOpen,width:r.width,height:r.height,hit:!!hit&&n.contains(hit),
      point:[parseFloat(n.style.left)/100,parseFloat(n.style.top)/100],style:n.getAttribute('style'),src:sprite?.querySelector('img')?.getAttribute('src'),filter:sprite?getComputedStyle(sprite).filter:'none',plane:[p.width,p.height]};
  });
});}
for(const id of ids)for(const width of [320,375,390,402,430])test(`surveyed terrain ${id} ${width}`,async({page},info)=>{
  await setup(page,id,width);await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-terrain-motion','grounded');
  const before=await measure(page);expect(before).toHaveLength(5);
  for(const b of before){expect(Math.round(b.width*1000)/1000).toBeGreaterThanOrEqual(44);expect(Math.round(b.height*1000)/1000).toBeGreaterThanOrEqual(44);expect(b.hit).toBe(true);expect(b.filter).toBe('none');expect(inside(b.point,terrainFor(id).surfaces[terrainFor(id).primary])).toBe(true);}
  await page.clock.runFor(3200);await page.screenshot({path:info.outputPath('grounded.png')});
  for(let i=0;i<4;i++){await page.clock.runFor(500);for(const b of await measure(page)){expect(b.hit).toBe(true);expect(b.filter).toBe('none');}}
  const bird=page.locator('.finch-garden-friend').first(),idBefore=await bird.getAttribute('data-garden-friend');
  await bird.focus();const held=await bird.getAttribute('style');await page.clock.runFor(3500);
  expect(await bird.getAttribute('data-garden-friend')).toBe(idBefore);expect(await bird.getAttribute('style')).toBe(held);await expect(bird).toBeFocused();
  await page.keyboard.press('Enter');await expect(page.locator('.finch-notice')).not.toBeEmpty();
  await page.locator('[data-garden-details=about] > summary').click();await expect(page.locator('[data-garden-track-credit]')).toHaveCount(1);
  await page.locator('[data-garden-details=about] > summary').click();await page.clock.runFor(22000);
  expect((await measure(page)).map(b=>b.id).sort()).toEqual(before.map(b=>b.id).sort());
});
for(const id of ids)test(`actual white flight or terrain-specific fallback ${id}`,async({page},info)=>{
  await setup(page,id,390,true,true);
  await expect(page.locator('.finch-garden-household')).toHaveCount(1);
  const bird=page.locator('.finch-garden-household');await expect(bird).toHaveAttribute('data-garden-flight','white-adult');
  await page.mouse.move(0,0);await page.locator('#finch-garden-title').focus();
  await page.clock.runFor(25000);
  if(id==='bird-eurasian-bullfinch'){await expect(page.locator('.garden-terrain-flight')).toHaveCount(0);return;}
  // Real decode is allowed to complete, then observe the normal scheduler's
  // next takeoff. No fabricated ended/loaded/animation events.
  let seen=false;
  for(let n=0;n<140;n++){
    await page.clock.runFor(250);
    seen=await page.evaluate(()=>[...document.querySelectorAll('.garden-terrain-flight')].some(e=>getComputedStyle(e).visibility==='visible'));
    if(seen)break;
  }
  expect(seen).toBe(true);
  await expect(page.locator('[data-flight-source]')).toHaveCount(4);
  expect(await bird.locator('.garden-bird-pose-window').evaluate(e=>getComputedStyle(e).visibility)).toBe('hidden');
  const before=await bird.boundingBox();await page.clock.runFor(80);const after=await bird.boundingBox();
  expect(await bird.locator('.garden-bird-pose-window').evaluate(e=>getComputedStyle(e).visibility)).toBe('hidden');
  expect(Math.hypot(after.x-before.x,after.y-before.y)).toBeGreaterThan(1);
  await page.screenshot({path:info.outputPath('flight.png')});
  await bird.focus();const held=await bird.getAttribute('style');await page.clock.runFor(2000);expect(await bird.getAttribute('style')).toBe(held);await expect(bird).toBeFocused();
  await page.locator('#finch-garden-title').focus();await page.clock.runFor(20000);
  expect(await bird.locator('.garden-bird-pose-window').evaluate(e=>getComputedStyle(e).visibility)).toBe('visible');
});
for(const density of ['empty','dense'])test(`unsupported ${density} roster remains safe`,async({page})=>{
  await setup(page,'yuyake',320,true,density);
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-terrain-motion','static');
  await expect(page.locator('.garden-terrain-flight')).toHaveCount(0);
  const before=await measure(page);expect(before.length).toBe(density==='empty'?0:8);
  await page.clock.runFor(30000);
  expect((await measure(page)).map(b=>b.style)).toEqual(before.map(b=>b.style));
  for(const b of await measure(page)){expect(b.hit).toBe(true);expect(Math.round(b.width*1000)/1000).toBeGreaterThanOrEqual(44);}
});
test('natural real-time flight retains the actual button and returns to native art',async({page},info)=>{
  test.setTimeout(100000);await setup(page,'yuyake',390,true,true);
  await page.mouse.move(0,0);await page.locator('#finch-garden-title').focus();
  await page.clock.resume();
  await expect.poll(()=>page.evaluate(()=>[...document.querySelectorAll('.garden-terrain-flight')].some(e=>getComputedStyle(e).visibility==='visible')),{timeout:65000,intervals:[50]}).toBe(true);
  await page.screenshot({path:info.outputPath('real-time-flight.png')});
  await expect.poll(()=>page.locator('.finch-garden-household .garden-bird-pose-window').evaluate(e=>getComputedStyle(e).visibility),{timeout:5000}).toBe('visible');
  await expect(page.locator('.finch-garden-household')).toHaveAttribute('data-garden-household','b1');
});
test('garden navigation, narrow landscape and simulated visibility interruption release motion ownership',async({page})=>{
  await setup(page,'yuyake');
  const prior=(await measure(page)).map(b=>b.id).sort();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const held=await measure(page);await page.clock.runFor(6000);expect(await measure(page)).toEqual(held);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(500);
  await page.setViewportSize({width:844,height:390});await page.clock.runFor(1500);
  for(const b of await measure(page)){expect(b.hit).toBe(true);expect(Math.round(b.width*1000)/1000).toBeGreaterThanOrEqual(44);}
  await page.setViewportSize({width:390,height:844});await page.clock.runFor(1500);
  expect((await measure(page)).map(b=>b.id).sort()).toEqual(prior);
  await page.locator('[data-garden-scroll=next]').click();await page.clock.runFor(1000);
  await expect(page.locator('.finch-garden-stage')).not.toHaveAttribute('data-garden-id','yuyake');
  await expect(page.locator('.garden-terrain-mask,.garden-terrain-shadow,.garden-terrain-flight')).toHaveCount(0);
  await page.locator('[data-garden-scroll=previous]').click();await page.clock.runFor(1500);
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-garden-id','yuyake');
  for(const b of await measure(page))expect(b.hit).toBe(true);
});
for(const reduced of [false,true])test(`surveyed motion holds for ${reduced?'OS reduction':'motion off'}`,async({page})=>{
  if(reduced)await page.emulateMedia({reducedMotion:'reduce'});
  await setup(page,'bali-terrace',390,reduced);const before=await measure(page);
  await page.clock.runFor(30000);expect(await measure(page)).toEqual(before);
  await expect(page.locator('.garden-terrain-flight:visible')).toHaveCount(0);
});
