import { test, expect } from './qa-test-fixture.js';
import { routeMetadata, PAGE_CATALOG, BASE_PATH } from '../../src/metadata.js';
import { SITE_NAME } from '../../src/visuals.js';

test.beforeEach(async ({ page }) => {
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i, route => route.abort());
});

test('Launch Package runtime metadata follows direct, SPA, search and 404 routes', async ({ page }) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__launchCsp=[];document.addEventListener('securitypolicyviolation',e=>window.__launchCsp.push(e.violatedDirective+': '+e.blockedURI));});
  const check=async(route,options={})=>{
    const meta=routeMetadata(route,options);
    await expect(page).toHaveTitle(meta.title);
    for(const [selector,value] of [
      ['link[rel="canonical"]',meta.canonical],
      ['meta[name="description"]',meta.description],
      ['meta[property="og:title"]',meta.title],
      ['meta[property="og:description"]',meta.description],
      ['meta[property="og:url"]',meta.canonical],
      ['meta[name="twitter:title"]',meta.title],
      ['meta[name="twitter:description"]',meta.description],
      ['meta[name="twitter:image"]',meta.imageURL],
      ['meta[name="twitter:image:alt"]',meta.imageAlt],
      ['meta[name="robots"]',meta.robots],
    ]) await expect(page.locator(selector)).toHaveAttribute(selector.startsWith('link')?'href':'content',value);
    expect(await page.locator('#site-jsonld').evaluate(node=>JSON.parse(node.textContent))).toEqual(meta.structuredData);
  };
  await page.goto('encyclopedia/beak/');await expect(page.locator('#page-share')).toBeVisible();await check('encyclopedia/beak/');
  await page.locator('.desktop-nav [data-nav="encyclopedia/"]').click();await check('encyclopedia/');
  await page.goBack();await check('encyclopedia/beak/');
  await page.locator('#menu-toggle').click();await page.locator('#global-query').fill('保存');await page.locator('#site-search button').click();await check('',{query:'保存'});
  const missing=await page.goto('not-a-real-launch-page/');expect(missing.status()).toBe(404);await expect(page.locator('#page-share')).toBeVisible();await check('not-a-real-launch-page/',{notFound:true});
  await page.locator('main a[href="'+BASE_PATH+'"]').click();await check('');
  expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__launchCsp)).toEqual([]);
});

test('Launch Package served manifest, icons, sitemap and LLM files match the project scope',async({page,request},info)=>{
  const root=new URL(info.project.use.baseURL);
  // Use the test target origin for bytes, while public canonical metadata stays production-only.
  const target=path=>new URL(path,root).href;
  const response=await request.get(target('manifest.webmanifest'));expect(response.status()).toBe(200);
  const manifest=await response.json();expect(manifest.name).toBe(SITE_NAME);expect(new URL(manifest.scope,response.url()).pathname).toBe(BASE_PATH);expect(new URL(manifest.start_url,response.url()).pathname).toBe(BASE_PATH);
  for(const icon of manifest.icons){const r=await request.get(new URL(icon.src,response.url()).href);expect(r.status()).toBe(200);const bytes=await r.body();expect(bytes.subarray(1,4).toString()).toBe('PNG');expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes);}
  for(const name of ['favicon.ico','favicon.svg','apple-touch-icon.png','safari-pinned-tab.svg','ogp.png']){const r=await request.get(target(name));expect(r.status()).toBe(200);expect((await r.body()).length).toBeGreaterThan(100);}
  const map=await request.get(target('sitemap.xml'));expect(map.status()).toBe(200);const xml=await map.text();expect([...xml.matchAll(/<loc>/g)]).toHaveLength(PAGE_CATALOG.length);expect(xml).not.toContain('404.html');
  for(const name of ['llms.txt','llms-full.txt']){const r=await request.get(target(name));expect(r.status()).toBe(200);const text=await r.text();expect(text).toContain(SITE_NAME);expect(text).toContain('本人の実写写真はこのサイトでは公開していません');}
  await page.goto('help/');await expect(page.locator('#help-access')).toContainText('オフライン');await expect(page.locator('#help-access')).toContainText('ブックマーク');
});

test('page sharing sends only the canonical URL and clipboard denial offers manual copy',async({page})=>{
  await page.addInitScript(()=>{
    window.__launchShares=[];window.__launchCopies=[];
    Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>window.__launchShares.push(payload)});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__launchCopies.push(text)}});
  });
  await page.goto('encyclopedia/eyes/?private-note=never-share#sources');await expect(page.locator('#page-share')).toBeVisible();
  await page.locator('#page-share').click();
  const shared=await page.evaluate(()=>window.__launchShares);expect(shared).toHaveLength(1);expect(shared[0].url).toBe(routeMetadata('encyclopedia/eyes/').canonical);expect(shared[0]).not.toHaveProperty('files');expect(JSON.stringify(shared)).not.toContain('private-note');
  await page.locator('#page-copy-url').click();expect(await page.evaluate(()=>window.__launchCopies)).toEqual([routeMetadata('encyclopedia/eyes/').canonical]);
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new DOMException('denied','NotAllowedError');}}});Object.defineProperty(navigator,'share',{configurable:true,value:undefined});});
  await page.locator('#page-share').click();await expect(page.locator('#page-share-fallback')).toBeVisible();await expect(page.locator('#page-share-url')).toHaveValue(routeMetadata('encyclopedia/eyes/').canonical);await expect(page.locator('#page-share-url')).toHaveAttribute('readonly','');
  await expect(page.locator('#page-share-status')).not.toBeEmpty();
});

test('ruby stays on, top control restores focus, and launch controls fit narrow screens',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('buncho-settings',JSON.stringify({ruby:false,motion:false})));
  await page.setViewportSize({width:375,height:812});await page.goto('help/');
  await expect(page.locator('#ruby-toggle')).toHaveCount(0);await expect(page.locator('html')).toHaveAttribute('data-ruby','on');await expect(page.locator('html')).toHaveAttribute('data-motion','off');
  await page.locator('#page-top').scrollIntoViewIfNeeded();await page.locator('#page-top').click();await expect(page.locator('#main')).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBeLessThanOrEqual(1);
  for(const id of ['page-top','page-copy-url','page-share']){const box=await page.locator('#'+id).boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-ruby','on');
});
