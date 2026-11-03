import {test,expect} from '@playwright/test';
async function audioProbe(page){await page.addInitScript(()=>{
 window.__musicProbe={contexts:0,started:0,stopped:0,active:0,oscillators:0,decoded:[],connected:0};
 const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
 class Tracked extends C{
  constructor(...args){super(...args);window.__musicProbe.contexts++;}
  async decodeAudioData(bytes){const b=await super.decodeAudioData(bytes);const ch=b.getChannelData(0);let peak=0;for(let i=0;i<ch.length;i+=113)peak=Math.max(peak,Math.abs(ch[i]));window.__musicProbe.decoded.push({duration:b.duration,peak});return b;}
  createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s),stop=s.stop.bind(s);let live=false;s.start=(...a)=>{live=true;window.__musicProbe.started++;window.__musicProbe.active++;return start(...a)};s.stop=(...a)=>{if(live){live=false;window.__musicProbe.active--;window.__musicProbe.stopped++;}return stop(...a)};return s;}
  createGain(){const g=super.createGain(),connect=g.connect.bind(g);g.connect=(...a)=>{if(a[0]===this.destination)window.__musicProbe.connected++;return connect(...a)};return g;}
  createOscillator(){const o=super.createOscillator(),start=o.start.bind(o);o.start=(...a)=>{window.__musicProbe.oscillators++;return start(...a)};return o;}
 }
 window.AudioContext=Tracked;window.webkitAudioContext=Tracked;
});}
test('first real game tap enables original music; four tracks decode, switch, mute and route cleanup',async({page},info)=>{
 test.setTimeout(150000);
 await audioProbe(page);await page.setViewportSize({width:390,height:900});await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 expect(await page.evaluate(()=>__musicProbe.contexts)).toBe(0);
 await expect(page.locator('[data-game-open-bird]')).toBeVisible();await page.locator('#menu-toggle').click();await expect.poll(()=>page.evaluate(()=>__musicProbe.contexts)).toBe(2);await expect(page.locator('#site-search')).toHaveCount(0);await expect(page.locator('#menu [data-world-action=music]')).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('[data-game-open-bird]').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});
 await page.locator('[data-game-care="pet"]').click();await expect.poll(()=>page.evaluate(()=>__musicProbe.oscillators)).toBeGreaterThan(0);
 await page.locator('[data-game-close-bird]').click();await page.locator('.game-music summary').click();
 for(const id of ['meadow','orchard','lakeside','village']){
  await page.locator(`[data-music="${id}"]`).click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});await expect(page.locator(`[data-music="${id}"]`)).toHaveAttribute('aria-pressed','true');
 }
 const probe=await page.evaluate(()=>__musicProbe);expect(probe.decoded.length).toBeGreaterThanOrEqual(4);expect(probe.decoded.every(x=>x.duration>30&&x.peak>.001)).toBe(true);expect(probe.connected).toBeGreaterThan(3);expect(probe.active).toBe(1);
 await info.attach('game-audio-world-390',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 await page.locator('[data-music-off]').click();expect(await page.evaluate(()=>__musicProbe.active)).toBe(0);await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('[data-game-open-bird]').click();expect(await page.evaluate(()=>__musicProbe.started)).toBe(0);
 await page.locator('[data-game-care-sound]').uncheck();await page.locator('[data-game-close-bird]').click();await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('[data-game-open-bird]').click();await expect(page.locator('[data-game-care-sound]')).not.toBeChecked();await page.locator('[data-game-close-bird]').click();
 await page.locator('.game-music summary').click();await page.locator('[data-music="meadow"]').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});await page.locator('.game-world-exit').click();await expect(page.locator('#article-grid')).toBeVisible();await expect(page.locator('#site-search')).toHaveCount(1);expect(await page.evaluate(()=>__musicProbe.active)).toBe(0);
});
test('rapid song selection and OFF while loading never leave a later unwanted loop',async({page})=>{
 await audioProbe(page);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-music summary').click();
 await page.locator('[data-music="orchard"]').click();await page.locator('[data-music="lakeside"]').click();await page.locator('[data-music="village"]').click();await page.locator('[data-music-off]').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','off');await page.waitForTimeout(600);expect(await page.evaluate(()=>__musicProbe.active)).toBe(0);
 await page.locator('[data-music="village"]').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));expect(await page.evaluate(()=>__musicProbe.active)).toBe(0);await expect(page.locator('.game-music')).toHaveAttribute('data-status','paused');
});

test('separate game menu has only world controls, restores site search, and keeps keyboard focus on repeated entry',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 for(let visit=0;visit<2;visit++){
  await expect(page.locator('#site-search')).toHaveCount(0);await expect(page.locator('.game-world-exit')).toBeVisible();await expect(page.locator('.site-footer')).toBeHidden();await page.locator('#menu-toggle').click();await expect(page.locator('[data-world-action]')).toHaveCount(3);await expect(page.locator('#menu nav a')).toHaveCount(0);
  await page.locator('[data-world-action=settings]').click();await expect(page.locator('.game-settings h3')).toBeFocused();await expect(page.locator('#menu')).toBeHidden();await page.locator('#menu-toggle').click();await page.locator('[data-world-action=help]').click();await expect(page.locator('.game-help h3')).toBeFocused();
  await page.locator('#menu-toggle').click();await page.locator('[data-world-action=music]').click();await expect(page.locator('.game-music')).toHaveAttribute('open','');await expect(page.locator('[data-music]').first()).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('.game-music summary')).toBeFocused();
  await page.locator('.game-world-exit').click();await expect(page.locator('#article-grid')).toBeVisible();await expect(page.locator('#site-search')).toHaveCount(1);await expect(page.locator('.site-footer')).toBeVisible();await page.locator('#menu-toggle').click();await expect(page.locator('#site-search')).toBeVisible();await page.locator('#menu-toggle').click();
  await page.goBack();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await expect(page.locator('.world-menu-extras')).toHaveCount(1);
 }
});
