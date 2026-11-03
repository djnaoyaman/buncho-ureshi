import { test, expect } from '@playwright/test';
import { morphAtlas } from '../../src/data/morphs.js';
import { morphPhotos, newMorphPhotos } from '../../src/data/morph-photos.js';
import { routeMetadata, BASE_PATH } from '../../src/metadata.js';

const routes = ['colors/', ...morphAtlas.profiles.map(profile => `colors/${profile.id}/`)];
const plainText = locator => locator.evaluate(node => {const copy=node.cloneNode(true);copy.querySelectorAll('rt,rp').forEach(n=>n.remove());return copy.textContent;});
const ready = async page => {await expect(page.locator('#page-share')).toBeVisible();await expect(page.locator('main .morph-atlas')).toBeVisible();};
async function decodePhotos(page) {
  return page.locator('main img').evaluateAll(async images => {
    images.forEach(image=>{image.loading='eager';});
    return Promise.all(images.map(async image=>{await image.decode();return {src:new URL(image.src).pathname,width:image.naturalWidth,height:image.naturalHeight,fit:getComputedStyle(image).objectFit};}));
  });
}
test.beforeEach(async ({ page }) => {
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i, route => route.abort());
});

test('atlas direct URLs and reloads show all six complete profiles, caveats, local decoded photographs and exact source licenses', async ({ page }) => {
  test.setTimeout(120000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for (const route of routes) {
    const response=await page.goto(route);expect(response.status()).toBe(200);
    await ready(page);await page.reload();await ready(page);
    const meta=routeMetadata(route);
    await expect(page).toHaveTitle(meta.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',meta.canonical);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',meta.description);
    expect(await page.locator('#site-jsonld').evaluate(node=>JSON.parse(node.textContent))).toEqual(meta.structuredData);
    await expect(page.locator('main h1')).toHaveCount(1);
    const decoded=await decodePhotos(page);expect(decoded.length).toBeGreaterThan(0);
    for(const item of decoded){expect(item.width).toBeGreaterThan(0);expect(item.height).toBeGreaterThan(0);expect(item.src.startsWith(BASE_PATH+'photos/')).toBe(true);expect(item.fit).toBe('contain');}
    const profile=morphAtlas.profiles.find(p=>route===`colors/${p.id}/`);
    if(profile){
      expect(await plainText(page.locator('main h1'))).toBe(profile.name);
      const text=await plainText(page.locator('main'));
      for(const excerpt of [profile.summary,profile.confidence,profile.ageNotes,...profile.levels.map(level=>level.text),...Object.values(profile.photoNotes)])expect(text).toContain(excerpt);
      for(const source of profile.sources)await expect(page.locator('#morph-sources a').filter({hasText:source.title}).first()).toHaveAttribute('href',source.url);
      for(const id of profile.photoIds){const photo=morphPhotos.find(p=>p.id===id);expect(text).toContain(photo.credit);await expect(page.locator(`main img[src="${BASE_PATH+photo.src.slice(1)}"]`).first()).toBeAttached();}
      await expect(page.locator('.morph-photo--primary .morph-observation-label')).toBeVisible();
    }else{await expect(page.locator('[data-morph-card]')).toHaveCount(5);await expect(page.locator('.morph-term')).toHaveCount(14);await expect(page.locator('.morph-term img')).toHaveCount(0);await expect(page.locator('.morph-gap')).toHaveCount(14);}
  }
  const missing=await page.goto("colors/not-a-profile/");expect(missing.status()).toBe(404);await expect(page.locator("#page-share")).toBeVisible();await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content","noindex, follow");
  expect(errors).toEqual([]);
});

test('atlas discovery, site-wide alias search and native Back/Forward restore real profile routes', async ({ page }) => {
  await page.goto('');await expect(page.locator('.morph-discovery-link')).toBeVisible();
  await page.locator('.morph-discovery-link').click();await ready(page);await expect(page).toHaveURL(/\/colors\/$/);
  await page.locator('[data-morph-card="white"] h3 a').click();await expect(page).toHaveURL(/\/colors\/white\/$/);
  await page.locator('.morph-related a[href="'+BASE_PATH+'colors/silver/"]').click();await expect(page).toHaveURL(/\/colors\/silver\/$/);
  await page.goBack();await expect(page).toHaveURL(/\/colors\/white\/$/);await expect(page.locator('[data-morph-profile]')).toHaveAttribute('data-morph-profile','white');
  await page.goBack();await expect(page).toHaveURL(/\/colors\/$/);await expect(page.locator('[data-morph-card]')).toHaveCount(5);
  await page.goForward();await expect(page).toHaveURL(/\/colors\/white\/$/);
  await page.locator('#menu-toggle').click();await page.locator('#global-query').fill('シルバー');await page.locator('#site-search button').click();
  await page.locator('#search-morph-results a[href="'+BASE_PATH+'colors/silver/"]').click();await expect(page).toHaveURL(/\/colors\/silver\/$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',routeMetadata('colors/silver/').canonical);
  await page.goto('encyclopedia/');await page.locator('.morph-discovery-link').click();await ready(page);
  await page.locator('#menu-toggle').click();await expect(page.locator('#menu a[href="'+BASE_PATH+'colors/"]')).toBeVisible();
  await expect(page.locator('.footer-links a[href="'+BASE_PATH+'colors/"]')).toHaveCount(1);
});

test('atlas filters handle aliases, zero results, keyboard submission and repeated reset without persisted state', async ({ page }) => {
  await page.goto('colors/');await ready(page);
  await page.locator('.morph-search-panel > summary').click();
  const search=page.locator('[data-morph-query]');
  await search.fill('ｓｉｌｖｅｒ');await search.press('Enter');await expect(page.locator('[data-morph-card]')).toHaveCount(1);await expect(page.locator('[data-morph-card="silver"]')).toHaveCount(1);
  await search.fill('NO_SUCH_BIRD_993');await expect(page.locator('[data-morph-card]')).toHaveCount(0);await expect(page.locator('[data-morph-result-count]')).toContainText('0');
  const reset=page.locator('[data-morph-reset]');await reset.focus();await page.keyboard.press('Enter');await expect(search).toBeFocused();await expect(search).toHaveValue('');await expect(page.locator('[data-morph-card]')).toHaveCount(5);
  await page.locator('[data-morph-filter]').selectOption('white');await expect(page.locator('[data-morph-card="white"]')).toHaveCount(1);await expect(page.locator('[data-morph-card]')).toHaveCount(1);
  await reset.click();await reset.click();await expect(page.locator('[data-morph-card]')).toHaveCount(5);
  await search.fill('ごましお');await expect(page.locator('[data-morph-card="sakura-pied"]')).toHaveCount(1);
  await page.reload();await ready(page);await expect(search).toHaveValue('');await expect(page.locator('[data-morph-card]')).toHaveCount(5);
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('morph')))).toEqual([]);
});

test('atlas removes comparison controls and keeps both remaining destinations usable', async ({ page }, testInfo) => {
  await page.goto('colors/#morph-compare');await ready(page);
  await expect(page.locator('#morph-compare,[data-morph-compare],[data-morph-compare-id]')).toHaveCount(0);
  await expect(page.locator('.morph-entry-nav a')).toHaveCount(2);
  await expect(page.locator('[data-morph-card]')).toHaveCount(5);
  await page.locator('[data-morph-jump="morph-terms"]').click();
  await expect(page.locator('#morph-terms')).toHaveAttribute('open','');
  await expect(page.locator('#morph-terms > summary')).toContainText('02 名前を知る');
  await page.locator('[data-morph-jump="morph-profiles"]').click();
  await expect(page.locator('#morph-profiles')).toBeInViewport();
  await testInfo.attach('colors-without-comparison',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('atlas reading is user-triggered, stops on navigation and Back, and never hides ruby or private settings', async ({ page }) => {
  await page.addInitScript(()=>{
    window.__morphSpoken=[];window.__morphStops=0;
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel:()=>window.__morphStops++,speak:utterance=>window.__morphSpoken.push(utterance.text)}});
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:class {constructor(text){this.text=text;}}});
    localStorage.setItem('buncho-settings',JSON.stringify({ruby:false,motion:false}));
  });
  await page.goto('colors/white/');await ready(page);expect(await page.evaluate(()=>window.__morphSpoken)).toEqual([]);
  await page.locator('[data-morph-speak]').click();expect(await page.evaluate(()=>window.__morphSpoken)).toHaveLength(1);expect((await page.evaluate(()=>window.__morphSpoken))[0]).toContain('白文鳥');
  await page.locator('[data-morph-stop]').click();const before=await page.evaluate(()=>window.__morphStops);
  await page.locator('[data-morph-speak]').click();
  await page.locator('.morph-related a[href="'+BASE_PATH+'colors/"]').click();await ready(page);expect(await page.evaluate(()=>window.__morphStops)).toBeGreaterThan(before);
  await page.goBack();await expect(page.locator('[data-morph-profile]')).toHaveAttribute('data-morph-profile','white');
  await page.locator('[data-morph-speak]').click();expect(await page.evaluate(()=>window.__morphSpoken)).toHaveLength(3);
  await expect(page.locator('html')).toHaveAttribute('data-ruby','on');await expect(page.locator('html')).toHaveAttribute('data-motion','off');
  expect(await page.locator('main rt').first().evaluate(node=>getComputedStyle(node).display)).toBe('ruby-text');
  expect(await page.locator('main rt').first().evaluate(node=>getComputedStyle(node).visibility)).toBe('visible');
});

test('atlas is readable without JavaScript and derived-still credit never inflates independent photos', async ({ browser }, info) => {
  const context=await browser.newContext({javaScriptEnabled:false,baseURL:info.project.use.baseURL});const page=await context.newPage();
  try{
    await page.goto('colors/cinnamon/');await expect(page.locator('main h1')).toBeVisible();
    const text=await plainText(page.locator('main'));expect(text).toContain('3.000秒');expect(text).toContain('CC BY-SA 3.0');expect(text).toContain(morphAtlas.profiles.find(p=>p.id==='cinnamon').confidence);
    await page.locator('.morph-related a[href="'+BASE_PATH+'colors/"]').click();await expect(page.locator('[data-morph-card]')).toHaveCount(5);await expect(page.locator('.morph-gap')).toHaveCount(14);
    await page.goto('credits/');expect(await plainText(page.locator('main'))).toContain(newMorphPhotos[0].credit);
    await expect(page.locator('main')).toContainText('42点');await expect(page.locator('main')).toContainText('静止画 1点');
  }finally{await context.close();}
});

for(const width of [320,375,768,1440])test(`atlas fits ${width}px with full-frame photographs and screenshot evidence`,async({page},info)=>{
  test.setTimeout(120000);await page.setViewportSize({width,height:900});
  for(const route of routes){
    await page.goto(route);await ready(page);await decodePhotos(page);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route).toBe(true);
    const overflowing=await page.locator('main .morph-atlas').evaluate(root=>[...root.querySelectorAll('h1,h2,h3,select,button,img,figure')].filter(node=>{const r=node.getBoundingClientRect(),gallery=node.closest('[data-morph-results]');if(gallery&&getComputedStyle(gallery).overflowX==='auto'){const g=gallery.getBoundingClientRect(),card=node.closest('[data-morph-card]'),c=card?.getBoundingClientRect();return g.left< -1||g.right>innerWidth+1||!!(c&&(r.left<c.left-1||r.right>c.right+1));}return r.width>0&&(r.left< -1||r.right>innerWidth+1);}).map(node=>({tag:node.tagName,text:node.textContent.slice(0,60)})));
    expect(overflowing,route).toEqual([]);
    if(info.project.name==='chrome'){
      const name=`atlas-${route.split('/')[1]||'overview'}-${width}.png`;
      await page.screenshot({path:info.outputPath(name),animations:'disabled',fullPage:false});
      if(route==='colors/'&&width===375)await page.screenshot({path:info.outputPath('atlas-overview-full-375.png'),animations:'disabled',fullPage:true});
    }
  }
});
